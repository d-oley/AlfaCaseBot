#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import random
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence
from xml.etree import ElementTree

try:
    from lxml import html
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Не установлен lxml. Выполните: python -m pip install 'lxml>=5,<7'"
    ) from exc


BASE_URL = "https://www.e-xecutive.ru"
SITEMAP_URL = f"{BASE_URL}/sitemap.xml"
ROBOTS_URL = f"{BASE_URL}/robots.txt"
USER_AGENT = "AlfaCaseBotResearch/2.0 (educational dataset collector)"
SOURCE_SITE = "Executive.ru"
LANGUAGE = "ru"

ARTICLE_PATH_RE = re.compile(r"^/education/cases/(\d+)(?:-([^/?#]+))?/?$")
SOLUTION_SUFFIX_RE = re.compile(
    r"-(?:reshenie|resheniya)(?:-biznes)?-keisa$", re.IGNORECASE
)
SPACE_RE = re.compile(r"\s+")
CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
LETTER_RE = re.compile(r"[A-Za-zА-Яа-яЁё]")

# Точные служебные хвосты: такие блоки можно безопасно выкидывать в любом месте.
HARD_SKIP_BLOCK_RE = re.compile(
    r"^(?:"
    r"фото\s*:|источник\s+изображения\s*:|"
    r"(?:все|лучшие)_+решения_+кейса|"
    r"текст\s*:\s*[^.]{2,120}$|"
    r"расскажите\s+коллегам\s*:|теги\s*:"
    r")",
    re.IGNORECASE,
)

# Административный текст конкурса. Важный момент: мы УДАЛЯЕМ такие блоки, а не
# прекращаем парсинг. На старых страницах правила конкурса часто стоят ДО кейса.
EDITORIAL_BLOCK_PATTERNS = [
    re.compile(r"\b(?:решения|ответы|предложения)\s+(?:кейса\s+)?принимаются\b", re.I),
    re.compile(r"\bчтобы\s+(?:отправить|прислать).{0,80}\b(?:решение|ответ)\b", re.I),
    re.compile(r"\bзаполните\s+форму.{0,80}\b(?:решение|ответ)\b", re.I),
    re.compile(r"\bответы?,?\s+присланн(?:ые|ый).{0,60}\bопоздан", re.I),
    re.compile(r"\bредакция\s+оставляет\s+за\s+собой\s+право\b", re.I),
    re.compile(r"\bрешения?,?\s+оставленн(?:ые|ый)\s+в\s+комментар", re.I),
    re.compile(r"\bв\s+качестве\s+приза\b", re.I),
    re.compile(r"\bпобедител(?:ь|и|ю|ям|я)\b.{0,140}\b(?:приз|книг|сертификат|подписк|наград)", re.I),
    re.compile(r"\bпобедител(?:ей|я|ям)?\s+ждут\s+приз", re.I),
    re.compile(r"\bв\s+состав\s+комиссии\s+конкурса\b", re.I),
    re.compile(r"\b(?:все\s+)?решения\s+кейса.{0,90}\bбудут\s+опубликован", re.I),
    re.compile(r"\bмы\s+попросили\s+участников.{0,90}\bпредложить\s+сво[её]\s+решение", re.I),
    re.compile(r"\bсегодня\s+мы\s+представляем.{0,90}\bрешени", re.I),
    re.compile(r"\bпредставляем\s+(?:работы|решения).{0,90}\b(?:конкурс|прислан)", re.I),
]

INLINE_EDITORIAL_RE = re.compile(
    r"\s*(?:"
    r"Присылайте(?:\s+нам)?\s+(?:ваши|свои)\s+(?:варианты|решения|ответы)"
    r"|Чтобы\s+отправить\s+(?:в\s+редакцию\s+)?решение.{0,250}"
    r")\s*[.!]*\s*$",
    re.IGNORECASE,
)

SOLUTION_FOOTER_RE = re.compile(
    r"^(?:"
    r"(?:все|лучшие)_+решения_+кейса|"
    r"другие\s+решения\s+кейса|"
    r"решения,?\s+присланные\s+на\s+[^:]+:?|"
    r"в\s+текстах(?:\s+решений)?\s+сохранена\s+авторская\s+орфография|"
    r"фото\s*:|источник\s+изображения\s*:|"
    r"расскажите\s+коллегам\s*:|теги\s*:"
    r")",
    re.IGNORECASE,
)

GENERIC_SOLUTION_SECTION_RE = re.compile(
    r"^(?:"
    r"победител(?:ь|и)|"
    r"решения\s+победителей|"
    r"лучшие\s+решения|"
    r"решения\s+участников|"
    r"решения\s+кейса|"
    r"представляем\s+(?:все\s+)?решения\s+кейса.*|"
    r"номинаци[яи]\s+[«\"].{1,100}[»\"]\s*:?"
    r")$",
    re.IGNORECASE,
)

# ФИО в начале блока. Используется только внутри явно распознанной секции
# решений, поэтому риск принять случайное упоминание человека за границу низок.
NAME_TOKEN = r"[А-ЯЁ][а-яё]+(?:[-‐‑–—][А-ЯЁ]?[а-яё]+)?"
PERSON_ONLY_RE = re.compile(rf"^(?P<name>{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})\s*:?$")
PERSON_PREFIX_RE = re.compile(
    rf"^(?P<name>{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})"
    rf"(?P<tail>(?:\s*,\s*[^:]{{2,180}})?\s*:\s*.*)$"
)
PERSON_ROLE_RE = re.compile(
    rf"^(?P<name>{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})\s*,\s*[^.!?]{{2,180}}[.)]?$"
)

CSV_FIELDS = [
    "source_site",
    "language",
    "case_id",
    "case_title",
    "case_text",
    "case_url",
    "solution_page_id",
    "solution_page_url",
    "solution_index",
    "solution_title",
    "solution_author_raw",
    "solution_text",
    "is_winner",
    "parser_mode",
    "case_parser_mode",
    "needs_review",
    "retrieved_at",
    "score_logic",
    "score_structure",
    "score_analysis",
    "score_sources",
    "score_validity",
]


def normalize_space(value: str) -> str:
    return SPACE_RE.sub(" ", value.replace("\xa0", " ")).strip()


def normalize_lines(value: str) -> str:
    return "\n".join(normalize_space(line) for line in value.splitlines() if normalize_space(line))


def canonical_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    path = re.sub(r"/{2,}", "/", parsed.path)
    return urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, "", ""))


def article_match(url: str):
    return ARTICLE_PATH_RE.match(urllib.parse.urlsplit(url).path)


def article_id(url: str) -> str:
    match = article_match(url)
    return match.group(1) if match else ""


def article_slug(url: str) -> str:
    match = article_match(url)
    return (match.group(2) or "").lower() if match else ""


def solution_base_slug(url: str) -> str:
    return SOLUTION_SUFFIX_RE.sub("", article_slug(url)).strip("-")


def is_solution_publication_url(url: str) -> bool:
    slug = article_slug(url)
    return bool(slug and SOLUTION_SUFFIX_RE.search(slug))


def russian_ratio(text: str) -> float:
    letters = LETTER_RE.findall(text)
    if not letters:
        return 0.0
    return len(CYRILLIC_RE.findall(text)) / len(letters)


def looks_russian(text: str, *, min_cyrillic: int = 60) -> bool:
    return len(CYRILLIC_RE.findall(text)) >= min_cyrillic and russian_ratio(text) >= 0.50


def unique_keep_order(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


class FetchError(RuntimeError):
    pass


def robots_can_fetch(robots_text: str, url: str, user_agent: str) -> bool:
    """Минимальная проверка robots.txt с поддержкой *, $ и буквального ?."""

    groups: list[tuple[list[str], list[tuple[bool, str]]]] = []
    agents: list[str] = []
    rules: list[tuple[bool, str]] = []
    seen_rule = False

    def flush() -> None:
        nonlocal agents, rules, seen_rule
        if agents:
            groups.append((agents, rules))
        agents, rules, seen_rule = [], [], False

    for raw_line in robots_text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        field, value = (part.strip() for part in line.split(":", 1))
        field = field.casefold()
        if field == "user-agent":
            if seen_rule:
                flush()
            agents.append(value.casefold())
        elif field in {"allow", "disallow"} and agents:
            seen_rule = True
            if value:
                rules.append((field == "allow", value))
    flush()

    product = user_agent.split("/", 1)[0].casefold()
    matching: list[tuple[int, list[tuple[bool, str]]]] = []
    for group_agents, group_rules in groups:
        for agent in group_agents:
            if agent == "*" or agent in product:
                matching.append((0 if agent == "*" else len(agent), group_rules))
                break
    if not matching:
        return True

    best_agent_length = max(length for length, _ in matching)
    selected_rules = [
        rule
        for length, group_rules in matching
        if length == best_agent_length
        for rule in group_rules
    ]

    parsed = urllib.parse.urlsplit(url)
    target = parsed.path or "/"
    if parsed.query:
        target += "?" + parsed.query

    matches: list[tuple[int, bool]] = []
    for allowed, pattern in selected_rules:
        end_anchored = pattern.endswith("$")
        if end_anchored:
            pattern = pattern[:-1]
        regex = re.escape(pattern).replace(r"\*", ".*")
        regex = "^" + regex + ("$" if end_anchored else "")
        if re.search(regex, target):
            matches.append((len(pattern), allowed))
    if not matches:
        return True
    longest = max(length for length, _ in matches)
    return any(allowed for length, allowed in matches if length == longest)


class RespectfulHttpClient:
    """HTTP-клиент с задержкой, retry, cache и проверкой robots.txt."""

    def __init__(self, delay: float, timeout: float, retries: int, cache_dir: Path):
        self.delay = max(0.0, delay)
        self.timeout = timeout
        self.retries = max(1, retries)
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._last_request_at = 0.0
        self._robots_text: str | None = None

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.bin"

    def _wait(self) -> None:
        remaining = self.delay - (time.monotonic() - self._last_request_at)
        if remaining > 0:
            time.sleep(remaining)

    def fetch_bytes(self, url: str, *, use_cache: bool = True) -> bytes:
        url = canonical_url(url) if "?" not in url else url
        cache_path = self._cache_path(url)
        if use_cache and cache_path.exists():
            return cache_path.read_bytes()

        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            self._wait()
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml,application/zip,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    payload = response.read()
                self._last_request_at = time.monotonic()
                cache_path.write_bytes(payload)
                return payload
            except urllib.error.HTTPError as exc:
                self._last_request_at = time.monotonic()
                last_error = exc
                if exc.code not in {408, 425, 429, 500, 502, 503, 504}:
                    break
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                self._last_request_at = time.monotonic()
                last_error = exc

            if attempt < self.retries:
                time.sleep(min(2 ** (attempt - 1) + random.random(), 10.0))

        raise FetchError(f"Не удалось загрузить {url}: {last_error}")

    def robots_text(self) -> str:
        if self._robots_text is None:
            payload = self.fetch_bytes(ROBOTS_URL, use_cache=False)
            self._robots_text = payload.decode("utf-8", errors="replace")
        return self._robots_text

    def assert_allowed(self, url: str) -> None:
        if not robots_can_fetch(self.robots_text(), url, USER_AGENT):
            raise FetchError(f"robots.txt запрещает загрузку: {url}")

    def fetch_article(self, url: str) -> bytes:
        self.assert_allowed(url)
        return self.fetch_bytes(url)

    def fetch_attachment(self, url: str) -> bytes:
        self.assert_allowed(url)
        return self.fetch_bytes(url)


@dataclass
class ParsedSolution:
    title: str
    author_raw: str
    text: str
    is_winner: bool
    parser_mode: str
    needs_review: bool


@dataclass
class ParsedCase:
    title: str
    text: str
    url: str
    parser_mode: str
    needs_review: bool = False


@dataclass
class DatasetRow:
    source_site: str
    language: str
    case_id: str
    case_title: str
    case_text: str
    case_url: str
    solution_page_id: str
    solution_page_url: str
    solution_index: int
    solution_title: str
    solution_author_raw: str
    solution_text: str
    is_winner: bool
    parser_mode: str
    case_parser_mode: str
    needs_review: bool
    retrieved_at: str
    score_logic: str = ""
    score_structure: str = ""
    score_analysis: str = ""
    score_sources: str = ""
    score_validity: str = ""


@dataclass
class ArticleCatalog:
    solution_urls: list[str]
    case_urls_by_slug: dict[str, list[str]]
    article_urls: list[str]

    def case_candidates_for_solution(self, solution_url: str) -> list[str]:
        key = solution_base_slug(solution_url)
        return list(self.case_urls_by_slug.get(key, []))


@dataclass
class Marker:
    title: str
    author: str
    winner: bool
    generic: bool = False


def parse_html(payload: bytes):
    document = html.fromstring(payload.decode("utf-8", errors="replace"))
    for unwanted in document.xpath("//script|//style|//noscript|//template|//svg"):
        unwanted.drop_tree()
    return document


def find_article_content(document):
    candidates = document.xpath(
        '//*[contains(concat(" ", normalize-space(@class), " "), " b-article-content ")]'
    )
    if not candidates:
        # Небольшой запас на будущую смену верстки: ищем <article>, но только если
        # это один содержательный контейнер.
        candidates = document.xpath("//article")
    if not candidates:
        raise ValueError("Не найден контейнер статьи")
    return max(candidates, key=lambda node: len(normalize_space(node.text_content())))


def page_title(document) -> str:
    headings = document.xpath("//h1")
    if headings:
        return normalize_space(headings[0].text_content())
    titles = document.xpath("//title/text()")
    return normalize_space(titles[0]) if titles else ""


def element_to_block(element) -> str:
    tag = str(element.tag).lower()
    if tag in {"ul", "ol"}:
        items = [normalize_space(li.text_content()) for li in element.xpath("./li")]
        return "\n".join(f"- {item}" for item in items if item)
    if tag == "table":
        lines: list[str] = []
        for row in element.xpath(".//tr"):
            cells = [normalize_space(cell.text_content()) for cell in row.xpath("./th|./td")]
            if any(cells):
                lines.append(" | ".join(cells))
        return "\n".join(lines)
    return normalize_space(element.text_content())


def semantic_blocks(container) -> list:
    """Вернуть смысловые блоки в DOM-порядке без дублирования вложенного текста.

    Старые версии CMS иногда кладут текст прямо в div/section без <p>. Такие
    leaf-контейнеры тоже считаем блоками, но только если внутри них уже нет
    нормальных p/h*/ul/table — иначе получили бы дубликаты.
    """
    tags = {"p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "pre", "table"}
    wrapper_tags = {"div", "section"}
    result = []
    for element in container.iterdescendants():
        if not isinstance(element.tag, str):
            continue
        tag = element.tag.lower()
        is_semantic = tag in tags
        is_leaf_wrapper = False
        if tag in wrapper_tags:
            has_semantic_descendant = any(
                isinstance(desc.tag, str) and desc.tag.lower() in tags
                for desc in element.iterdescendants()
            )
            is_leaf_wrapper = not has_semantic_descendant and bool(normalize_space(element.text_content()))
        if not (is_semantic or is_leaf_wrapper):
            continue

        parent = element.getparent()
        nested = False
        while parent is not None and parent is not container:
            if parent in result:
                nested = True
                break
            parent = parent.getparent()
        if not nested:
            result.append(element)
    return result


def block_texts(container) -> list[str]:
    values = [element_to_block(block) for block in semantic_blocks(container)]
    return [value for value in values if normalize_space(value)]


def is_hard_skip_block(text: str) -> bool:
    return bool(HARD_SKIP_BLOCK_RE.match(normalize_space(text)))


def is_editorial_block(text: str) -> bool:
    compact = normalize_space(text)
    if not compact or is_hard_skip_block(compact):
        return True
    return any(pattern.search(compact) for pattern in EDITORIAL_BLOCK_PATTERNS)


def strip_inline_editorial(text: str) -> str:
    return INLINE_EDITORIAL_RE.sub("", text).strip()


def trim_case_block(raw: str) -> str:
    value = raw.strip()
    if not value or is_hard_skip_block(value):
        return ""

    # Если служебная инструкция приклеена к концу содержательного абзаца,
    # сохраняем содержательную часть. Если служебный текст занимает весь блок —
    # выбрасываем его. Это устраняет потерю вопроса + «решения принимаются...»
    # внутри одного <p>.
    earliest: int | None = None
    for pattern in EDITORIAL_BLOCK_PATTERNS:
        match = pattern.search(value)
        if match and (earliest is None or match.start() < earliest):
            earliest = match.start()
    if earliest is not None:
        prefix = value[:earliest].strip(" \t\n.;:–—-")
        prefix = value[:earliest].strip(" \t\n.;:–—-")
        if len(prefix) >= 40 and len(CYRILLIC_RE.findall(prefix)) >= 20:
            value = prefix
        else:
            return ""

    value = strip_inline_editorial(value)
    return value.strip()


def clean_case_blocks(blocks: Sequence[str]) -> list[str]:
    cleaned: list[str] = []
    for raw in blocks:
        value = trim_case_block(raw)
        if not value:
            continue
        # Снимаем точные повторы соседних блоков, встречающиеся после миграций CMS.
        if cleaned and normalize_space(cleaned[-1]).casefold() == normalize_space(value).casefold():
            continue
        cleaned.append(value)
    return cleaned


def validate_case_text(title: str, text: str) -> None:
    # 300 символов были слишком жёстким порогом: на сайте есть полноценные
    # короткие кейсы. Отсекаем только очевидно пустые/битые страницы.
    if len(text) < 120:
        raise ValueError(f"Слишком короткое условие кейса: {len(text)} символов")
    if not looks_russian(f"{title}\n{text}", min_cyrillic=60):
        raise ValueError("Условие не прошло проверку русского языка")


def parse_case_page(payload: bytes) -> tuple[str, str]:
    document = parse_html(payload)
    lang = normalize_space(document.get("lang") or "").lower()
    title = page_title(document)
    container = find_article_content(document)
    cleaned = clean_case_blocks(block_texts(container))
    text = "\n\n".join(cleaned).strip()
    if lang and not lang.startswith("ru"):
        raise ValueError(f"Страница объявлена не русскоязычной: lang={lang!r}")
    validate_case_text(title, text)
    return title, text


def strip_solution_suffix_from_title(title: str) -> str:
    return re.sub(
        r"\s*[.?!:]?\s*Решени[ея](?:\s+бизнес)?[- ]кейса\s*$",
        "",
        title,
        flags=re.IGNORECASE,
    ).strip(" .:-–—")


def explicit_original_case_urls(solution_url: str, solution_document) -> list[str]:
    container = find_article_content(solution_document)
    candidates: list[str] = []
    for anchor in container.xpath(".//a[@href]"):
        href = anchor.get("href") or ""
        candidate = canonical_url(urllib.parse.urljoin(solution_url, href))
        if candidate == canonical_url(solution_url):
            continue
        parsed = urllib.parse.urlsplit(candidate)
        if parsed.netloc.lower() not in {"www.e-xecutive.ru", "e-xecutive.ru"}:
            continue
        if ARTICLE_PATH_RE.match(parsed.path) and not is_solution_publication_url(candidate):
            candidates.append(candidate)
    return unique_keep_order(candidates)


def marker_from_text(text: str) -> Marker | None:
    compact = normalize_space(text).strip(" \t")
    if not compact or len(compact) > 240:
        return None

    if GENERIC_SOLUTION_SECTION_RE.match(compact.rstrip(": ")):
        return Marker(title=compact, author="", winner="побед" in compact.casefold(), generic=True)

    # «Решения победителей» намеренно НЕ попадает сюда: только единственное число.
    patterns = [
        re.compile(
            r"^Решение\s*[-–—]?\s*победител(?:ь|я)(?:\s+кейса)?\s*[,;:–—-]*\s*(?P<author>.*)$",
            re.I,
        ),
        re.compile(r"^Решение(?:\s+кейса)?\s+предлагает\s+(?P<author>.+)$", re.I),
        re.compile(r"^Решение\s+(?P<author>.+)$", re.I),
    ]
    for index, pattern in enumerate(patterns):
        match = pattern.match(compact.rstrip())
        if not match:
            continue
        author = match.group("author").strip(" .:;–—-")
        # Очевидные секционные подписи не являются авторами.
        if author.casefold() in {
            "победитель", "победителя", "победителей", "кейса", "бизнес-кейса",
            "участников", "читателей",
        }:
            author = ""
        # Длинная законченная фраза после «Решение ...» скорее обычный абзац.
        if author and len(author) > 180:
            return None
        winner = index == 0 or "побед" in compact.casefold()
        return Marker(title=compact, author=author, winner=winner, generic=not bool(author))
    return None


def secondary_author(text: str) -> tuple[str, str] | None:
    compact = normalize_space(text)
    match = PERSON_PREFIX_RE.match(compact)
    if match:
        name = match.group("name")
        return name, compact
    match = PERSON_ROLE_RE.match(compact)
    if match:
        return match.group("name"), compact
    match = PERSON_ONLY_RE.match(compact.rstrip(":"))
    if match:
        return match.group("name"), compact
    return None


def clean_solution_blocks(blocks: Sequence[str]) -> list[str]:
    result: list[str] = []
    for raw in blocks:
        value = raw.strip()
        if not value:
            continue
        compact = normalize_space(value)
        if SOLUTION_FOOTER_RE.match(compact):
            break
        if is_hard_skip_block(compact):
            break
        if result and normalize_space(result[-1]).casefold() == compact.casefold():
            continue
        result.append(value)
    return result


def make_solution(
    marker: Marker,
    body_blocks: Sequence[str],
    *,
    parser_mode: str,
    force_review: bool = False,
) -> ParsedSolution | None:
    cleaned = clean_solution_blocks(body_blocks)
    if not cleaned:
        return None

    author = marker.author
    # Для «Решение победителя» без имени пытаемся снять ФИО с первого блока.
    # Саму подпись автора из solution_text удаляем.
    if not author:
        inferred = secondary_author(cleaned[0])
        if inferred:
            author = inferred[0]
            first = normalize_space(cleaned[0])
            colon = first.find(":")
            if colon >= 0 and len(first[colon + 1 :].strip()) >= 20:
                cleaned[0] = first[colon + 1 :].strip()
            else:
                cleaned = cleaned[1:]
            if not cleaned:
                return None

    text = "\n\n".join(cleaned).strip()
    if len(text) < 100 or not looks_russian(text, min_cyrillic=50):
        return None

    return ParsedSolution(
        title=marker.title,
        author_raw=author,
        text=text,
        is_winner=marker.winner,
        parser_mode=parser_mode,
        needs_review=force_review or not bool(author),
    )


def split_generic_region(marker: Marker, region: Sequence[str], mode: str) -> list[ParsedSolution]:
    """Разделить секцию «Решения победителей» по ФИО внутри секции."""
    points: list[tuple[int, str, str]] = []
    for idx, text in enumerate(region):
        found = secondary_author(text)
        if found:
            name, label = found
            points.append((idx, name, label))

    # Без двух явных авторских границ безопаснее считать секцию одним ответом.
    if len(points) < 2:
        solution = make_solution(marker, region, parser_mode=mode, force_review=True)
        return [solution] if solution else []

    solutions: list[ParsedSolution] = []
    for point_index, (start, author, label) in enumerate(points):
        end = points[point_index + 1][0] if point_index + 1 < len(points) else len(region)
        body = list(region[start:end])
        # Первый блок — подпись автора. Оставляем содержательную часть после
        # двоеточия, если она есть; иначе убираем подпись целиком.
        first = normalize_space(body[0])
        colon = first.find(":")
        if colon >= 0 and len(first[colon + 1 :].strip()) >= 20:
            body[0] = first[colon + 1 :].strip()
        else:
            body = body[1:]
        local_marker = Marker(
            title=f"Решение {author}",
            author=author,
            winner=marker.winner,
            generic=False,
        )
        parsed = make_solution(local_marker, body, parser_mode=mode, force_review=False)
        if parsed:
            solutions.append(parsed)
    return solutions


def parse_solution_blocks(
    blocks: Sequence[str],
    *,
    include_combined: bool,
    parser_mode_prefix: str,
) -> list[ParsedSolution]:
    markers: list[tuple[int, Marker]] = []
    for index, text in enumerate(blocks):
        marker = marker_from_text(text)
        if marker:
            markers.append((index, marker))

    solutions: list[ParsedSolution] = []
    for marker_index, (start, marker) in enumerate(markers):
        end = markers[marker_index + 1][0] if marker_index + 1 < len(markers) else len(blocks)
        region = blocks[start + 1 : end]
        if marker.generic:
            solutions.extend(
                split_generic_region(
                    marker,
                    region,
                    mode=f"{parser_mode_prefix}_generic_section",
                )
            )
        else:
            solution = make_solution(
                marker,
                region,
                parser_mode=f"{parser_mode_prefix}_heading",
            )
            if solution:
                solutions.append(solution)

    if solutions or not include_combined:
        return solutions

    combined = clean_solution_blocks(blocks)
    text = "\n\n".join(combined).strip()
    if len(text) >= 300 and looks_russian(text):
        return [
            ParsedSolution(
                title="Объединённая статья с решениями",
                author_raw="",
                text=text,
                is_winner=False,
                parser_mode=f"{parser_mode_prefix}_combined",
                needs_review=True,
            )
        ]
    return []


def find_solution_attachments(solution_url: str, document) -> list[str]:
    container = find_article_content(document)
    links: list[str] = []
    for anchor in container.xpath(".//a[@href]"):
        href = anchor.get("href") or ""
        joined = urllib.parse.urljoin(solution_url, href)
        path = urllib.parse.urlsplit(joined).path.casefold()
        text = normalize_space(anchor.text_content()).casefold()
        if path.endswith(".docx") and ("решен" in text or "solution" in text or "решен" in path):
            links.append(joined)
    return unique_keep_order(links)


def docx_paragraphs(payload: bytes) -> list[str]:
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            xml_payload = archive.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError) as exc:
        raise ValueError(f"Некорректный DOCX: {exc}") from exc

    root = ElementTree.fromstring(xml_payload)
    paragraphs: list[str] = []
    for paragraph in root.iter():
        if paragraph.tag.rsplit("}", 1)[-1] != "p":
            continue
        parts: list[str] = []
        for node in paragraph.iter():
            local = node.tag.rsplit("}", 1)[-1]
            if local == "t" and node.text:
                parts.append(node.text)
            elif local in {"tab"}:
                parts.append("\t")
            elif local in {"br", "cr"}:
                parts.append("\n")
        text = normalize_lines("".join(parts))
        if text:
            paragraphs.append(text)
    return paragraphs


def name_signature(value: str) -> tuple[str, ...]:
    """Грубая сигнатура ФИО, устойчивая к русским падежным окончаниям."""
    tokens = re.findall(r"[А-ЯЁа-яё]{3,}", value.casefold())
    # Первых 4 букв обычно достаточно: Ринат/Рината, Иванов/Иванова и т.п.
    return tuple(token[:4] for token in tokens[:3])


def declared_winner_names(blocks: Sequence[str]) -> list[str]:
    prefix: list[str] = []
    for block in blocks:
        if marker_from_text(block):
            break
        prefix.append(block)

    names: list[str] = []
    direct_re = re.compile(
        rf"\bпобедител(?:ем|ьницей|ь)\b.{{0,100}}?\b(?:стал|стала|становится)\s+"
        rf"(?P<name>{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})",
        re.I,
    )
    capture_following = 0
    for block in prefix:
        compact = normalize_space(block)
        match = direct_re.search(compact)
        if match:
            names.append(match.group("name"))

        if re.search(r"\bпоздравляем\b.{0,80}\b(?:с\s+победой|победител)", compact, re.I):
            capture_following = 3
            continue

        if capture_following > 0:
            capture_following -= 1
            for line in block.splitlines():
                line = normalize_space(line).lstrip("-•–— ")
                m = re.match(rf"^(?P<name>{NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})", line)
                if m and len(line) <= 180:
                    names.append(m.group("name"))
    return unique_keep_order(names)


def apply_declared_winners(solutions: Sequence[ParsedSolution], names: Sequence[str]) -> None:
    signatures = [name_signature(name) for name in names if name_signature(name)]
    for solution in solutions:
        sig = name_signature(solution.author_raw)
        if not sig:
            continue
        for winner_sig in signatures:
            common = min(len(sig), len(winner_sig), 2)
            if common >= 2 and sig[:common] == winner_sig[:common]:
                solution.is_winner = True
                break


def parse_unheaded_author_solutions(
    blocks: Sequence[str],
    *,
    parser_mode: str,
) -> list[ParsedSolution]:
    """Fallback для DOCX, где ответы идут как «ФИО» + текст без слова Решение."""
    points: list[tuple[int, str]] = []
    for idx, block in enumerate(blocks):
        found = secondary_author(block)
        if found and len(normalize_space(block)) <= 190:
            points.append((idx, found[0]))
    if len(points) < 2:
        return []

    result: list[ParsedSolution] = []
    for point_index, (start, author) in enumerate(points):
        end = points[point_index + 1][0] if point_index + 1 < len(points) else len(blocks)
        body = list(blocks[start + 1 : end])
        marker = Marker(title=f"Решение {author}", author=author, winner=False, generic=False)
        parsed = make_solution(marker, body, parser_mode=parser_mode, force_review=True)
        if parsed:
            result.append(parsed)
    return result if len(result) >= 2 else []


def parse_solutions(
    payload: bytes,
    *,
    solution_url: str,
    client: RespectfulHttpClient,
    include_combined: bool,
) -> tuple[object, list[ParsedSolution], list[dict]]:
    document = parse_html(payload)
    container = find_article_content(document)
    blocks = block_texts(container)
    solutions = parse_solution_blocks(
        blocks,
        include_combined=False,
        parser_mode_prefix="html",
    )
    apply_declared_winners(solutions, declared_winner_names(blocks))
    recoveries: list[dict] = []

    # Если HTML не дал решений, пробуем официальный DOCX-вложение.
    if not solutions:
        for attachment_url in find_solution_attachments(solution_url, document):
            try:
                docx_payload = client.fetch_attachment(attachment_url)
                paragraphs = docx_paragraphs(docx_payload)
                parsed = parse_solution_blocks(
                    paragraphs,
                    include_combined=False,
                    parser_mode_prefix="docx",
                )
                if not parsed:
                    parsed = parse_unheaded_author_solutions(
                        paragraphs,
                        parser_mode="docx_author_boundaries",
                    )
                if parsed:
                    solutions.extend(parsed)
                    recoveries.append(
                        {
                            "solution_page_url": solution_url,
                            "kind": "solutions_from_docx",
                            "attachment_url": attachment_url,
                            "solutions": len(parsed),
                        }
                    )
                    break
            except Exception as exc:
                recoveries.append(
                    {
                        "solution_page_url": solution_url,
                        "kind": "docx_failed",
                        "attachment_url": attachment_url,
                        "reason": f"{type(exc).__name__}: {exc}",
                    }
                )

    if not solutions and include_combined:
        solutions = parse_solution_blocks(
            blocks,
            include_combined=True,
            parser_mode_prefix="html",
        )
    return document, solutions, recoveries


def embedded_case_from_solution_page(solution_url: str, document) -> ParsedCase:
    """Последний fallback: взять описание задачи из вступления страницы решений."""
    container = find_article_content(document)
    blocks = block_texts(container)
    prefix: list[str] = []
    for block in blocks:
        if marker_from_text(block):
            break
        prefix.append(block)
    cleaned = clean_case_blocks(prefix)

    # Убираем секционные/поздравительные строки, если они пережили общую очистку.
    filtered = []
    for block in cleaned:
        compact = normalize_space(block)
        if re.search(r"\b(?:поздравляем|представляем\s+работы|автор\s+проблемы)\b", compact, re.I):
            continue
        if GENERIC_SOLUTION_SECTION_RE.match(compact.rstrip(": ")):
            break
        filtered.append(block)

    title = strip_solution_suffix_from_title(page_title(document))
    text = "\n\n".join(filtered).strip()
    validate_case_text(title, text)
    return ParsedCase(
        title=title,
        text=text,
        url=solution_url,
        parser_mode="embedded_solution_page",
        needs_review=True,
    )


def sitemap_locations(payload: bytes) -> tuple[str, list[str]]:
    root = ElementTree.fromstring(payload)
    kind = root.tag.rsplit("}", 1)[-1]
    locations = [
        normalize_space(node.text or "")
        for node in root.iter()
        if node.tag.rsplit("}", 1)[-1] == "loc"
    ]
    return kind, [location for location in locations if location]


def discover_article_catalog(client: RespectfulHttpClient) -> ArticleCatalog:
    kind, sitemap_urls = sitemap_locations(client.fetch_bytes(SITEMAP_URL))
    if kind != "sitemapindex":
        raise FetchError(f"Ожидался sitemapindex, получен {kind}")

    found_articles: list[str] = []
    found_case_segment = False
    empty_after_case_segments = 0

    # Ищем непрерывный хвост sitemap-ов с /education/cases/. В отличие от старой
    # версии сохраняем ВСЕ article URL из этих сегментов, чтобы потом сопоставлять
    # solution -> исходный кейс даже без HTML-ссылки.
    for sitemap_url in reversed(sitemap_urls):
        _, urls = sitemap_locations(client.fetch_bytes(sitemap_url))
        articles: list[str] = []
        for url in urls:
            canonical = canonical_url(url)
            parsed = urllib.parse.urlsplit(canonical)
            if parsed.netloc.lower() not in {"www.e-xecutive.ru", "e-xecutive.ru"}:
                continue
            if ARTICLE_PATH_RE.match(parsed.path):
                articles.append(canonical)

        if articles:
            found_case_segment = True
            empty_after_case_segments = 0
            found_articles.extend(articles)
        elif found_case_segment:
            empty_after_case_segments += 1
            # Два пустых соседних sitemap-а вместо одного делают поиск устойчивее
            # к одиночному разрыву сегмента и почти не увеличивают трафик.
            if empty_after_case_segments >= 2:
                break

    article_urls = unique_keep_order(found_articles)
    if not article_urls:
        raise FetchError("В sitemap не найдены публикации /education/cases/")

    solution_urls = [url for url in article_urls if is_solution_publication_url(url)]
    if not solution_urls:
        raise FetchError("В sitemap не найдены публикации с решениями кейсов")
    solution_urls.sort(key=lambda url: int(article_id(url) or 0), reverse=True)

    by_slug: dict[str, list[str]] = defaultdict(list)
    for url in article_urls:
        if is_solution_publication_url(url):
            continue
        slug = article_slug(url)
        if slug:
            by_slug[slug].append(url)
    for urls in by_slug.values():
        urls.sort(key=lambda url: int(article_id(url) or 0), reverse=True)

    return ArticleCatalog(
        solution_urls=solution_urls,
        case_urls_by_slug=dict(by_slug),
        article_urls=article_urls,
    )


def resolve_case(
    client: RespectfulHttpClient,
    catalog: ArticleCatalog,
    solution_url: str,
    solution_document,
) -> tuple[ParsedCase, list[dict]]:
    recoveries: list[dict] = []
    explicit = explicit_original_case_urls(solution_url, solution_document)
    slug_candidates = catalog.case_candidates_for_solution(solution_url)
    candidates = unique_keep_order(explicit + slug_candidates)

    candidate_errors: list[str] = []
    for candidate in candidates:
        try:
            payload = client.fetch_article(candidate)
            title, text = parse_case_page(payload)
            mode = "linked_page" if candidate in explicit else "catalog_slug_match"
            if mode == "catalog_slug_match":
                recoveries.append(
                    {
                        "solution_page_url": solution_url,
                        "kind": "case_url_from_sitemap_slug",
                        "case_url": candidate,
                    }
                )
            return ParsedCase(title, text, candidate, mode, False), recoveries
        except Exception as exc:
            candidate_errors.append(f"{candidate} -> {type(exc).__name__}: {exc}")

    # Если ссылка отсутствовала, устарела или вела на 404, сохраняем хотя бы
    # явно изложенную постановку задачи со страницы решений. Это лучше потери
    # всей публикации, но provenance делает такой fallback видимым.
    try:
        embedded = embedded_case_from_solution_page(solution_url, solution_document)
        recoveries.append(
            {
                "solution_page_url": solution_url,
                "kind": "case_from_solution_intro",
                "failed_candidates": candidate_errors,
            }
        )
        return embedded, recoveries
    except Exception as exc:
        details = "; ".join(candidate_errors[-3:])
        raise ValueError(
            "Не удалось получить исходный кейс"
            + (f"; кандидаты: {details}" if details else "")
            + f"; fallback: {type(exc).__name__}: {exc}"
        ) from exc


def normalize_for_dedup(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).casefold()
    return re.sub(r"[^a-zа-яё0-9]+", " ", value).strip()


def collect(
    client: RespectfulHttpClient,
    catalog: ArticleCatalog,
    include_combined: bool,
    max_articles: int | None,
) -> tuple[list[DatasetRow], list[dict], list[dict]]:
    rows: list[DatasetRow] = []
    issues: list[dict] = []
    recoveries: list[dict] = []
    seen_solution_hashes: set[str] = set()
    retrieved_at = datetime.now(timezone.utc).isoformat()

    urls = list(catalog.solution_urls[:max_articles] if max_articles else catalog.solution_urls)
    total = len(urls)
    for position, solution_url in enumerate(urls, start=1):
        print(f"[{position}/{total}] {solution_url}", file=sys.stderr)
        try:
            solution_payload = client.fetch_article(solution_url)
            solution_document, solutions, solution_recoveries = parse_solutions(
                solution_payload,
                solution_url=solution_url,
                client=client,
                include_combined=include_combined,
            )
            recoveries.extend(solution_recoveries)

            case, case_recoveries = resolve_case(
                client,
                catalog,
                solution_url,
                solution_document,
            )
            recoveries.extend(case_recoveries)

            if not solutions:
                issues.append(
                    {
                        "solution_page_url": solution_url,
                        "reason": "Не удалось надёжно отделить отдельные решения",
                    }
                )
                continue

            written_index = 0
            for solution in solutions:
                digest = hashlib.sha256(
                    normalize_for_dedup(solution.text).encode("utf-8")
                ).hexdigest()
                if digest in seen_solution_hashes:
                    issues.append(
                        {
                            "solution_page_url": solution_url,
                            "solution_title": solution.title,
                            "reason": "Дубликат текста решения",
                        }
                    )
                    continue
                seen_solution_hashes.add(digest)
                written_index += 1
                rows.append(
                    DatasetRow(
                        source_site=SOURCE_SITE,
                        language=LANGUAGE,
                        case_id=(article_id(case.url) or f"embedded-{article_id(solution_url)}"),
                        case_title=case.title,
                        case_text=case.text,
                        case_url=case.url,
                        solution_page_id=article_id(solution_url),
                        solution_page_url=solution_url,
                        solution_index=written_index,
                        solution_title=solution.title,
                        solution_author_raw=solution.author_raw,
                        solution_text=solution.text,
                        is_winner=solution.is_winner,
                        parser_mode=solution.parser_mode,
                        case_parser_mode=case.parser_mode,
                        needs_review=(solution.needs_review or case.needs_review),
                        retrieved_at=retrieved_at,
                    )
                )
        except Exception as exc:
            issues.append(
                {
                    "solution_page_url": solution_url,
                    "reason": f"{type(exc).__name__}: {exc}",
                }
            )

    return rows, issues, recoveries


def issue_category(reason: str) -> str:
    lowered = reason.casefold()
    if "дубликат" in lowered:
        return "duplicate_solution"
    if "отделить отдельные решения" in lowered:
        return "solution_split_failed"
    if "исходный кейс" in lowered:
        return "case_resolution_failed"
    if "fetcherror" in lowered or "http error" in lowered:
        return "fetch_failed"
    return "other"


def write_outputs(
    output_dir: Path,
    rows: Sequence[DatasetRow],
    issues: Sequence[dict],
    recoveries: Sequence[dict],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "business_case_solutions_ru.csv"
    jsonl_path = output_dir / "business_case_solutions_ru.jsonl"
    report_path = output_dir / "parser_report.json"

    with csv_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    with jsonl_path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(asdict(row), ensure_ascii=False) + "\n")

    issue_counts = Counter(issue_category(item.get("reason", "")) for item in issues)
    solution_modes = Counter(row.parser_mode for row in rows)
    case_modes = Counter(row.case_parser_mode for row in rows)
    report = {
        "source": SOURCE_SITE,
        "language": LANGUAGE,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "rows_written": len(rows),
        "unique_cases": len({row.case_id for row in rows}),
        "winner_rows": sum(row.is_winner for row in rows),
        "needs_review_rows": sum(row.needs_review for row in rows),
        "solution_parser_modes": dict(solution_modes),
        "case_parser_modes": dict(case_modes),
        "issues_count": len(issues),
        "issue_categories": dict(issue_counts),
        "issues": list(issues),
        "recoveries_count": len(recoveries),
        "recoveries": list(recoveries),
    }
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def self_test() -> None:
    robots_fixture = """
    User-agent: *
    Disallow: /education/cases?
    Disallow: /private/*
    Allow: /private/public$
    """
    assert robots_can_fetch(robots_fixture, f"{BASE_URL}/education/cases/100-case", USER_AGENT)
    assert not robots_can_fetch(robots_fixture, f"{BASE_URL}/education/cases?page=2", USER_AGENT)
    assert robots_can_fetch(robots_fixture, f"{BASE_URL}/private/public", USER_AGENT)

    # Регрессия: редакционный блок стоит ДО основного условия. Старая версия
    # прекращала чтение и ошибочно получала «слишком короткий кейс».
    case_html = """
    <html lang="ru"><body><h1>Тестовый кейс</h1>
    <div class="b-article-content">
      <p>Executive.ru предлагает проверить силы. Все решения кейса будут опубликованы, а победитель получит приз – книгу.</p>
      <h2>Описание ситуации</h2>
      <p>Российская компания выводит новый продукт на насыщенный рынок. Продажи старой линейки падают, бюджет ограничен, а команда не понимает, какой сегмент клиентов выбрать первым.</p>
      <p>Руководству необходимо определить аудиторию, каналы продвижения, бюджет пилота и показатели эффективности.</p>
      <h2>Задание</h2>
      <p>Какие действия следует предпринять в течение первого года и как контролировать основные риски реализации стратегии?</p>
      <p>Чтобы отправить в редакцию решение кейса, заполните форму. Сделать это необходимо до 30 апреля 2019 года.</p>
    </div></body></html>
    """.encode()
    title, case_text = parse_case_page(case_html)
    assert title == "Тестовый кейс"
    assert "Российская компания" in case_text
    assert "Какие действия" in case_text
    assert "победитель получит приз" not in case_text.casefold()
    assert "заполните форму" not in case_text.casefold()
    mixed = clean_case_blocks([
        "Как компании увеличить продажи и не потерять ключевых клиентов? Решения принимаются в течение недели со дня публикации задания."
    ])
    assert mixed == ["Как компании увеличить продажи и не потерять ключевых клиентов?"]

    # Современная разметка.
    solution_html = """
    <html lang="ru"><body><h1>Тестовый кейс. Решение кейса</h1>
    <div class="b-article-content">
      <p><a href="/education/cases/100-testovyi-keis">Этот кейс</a> решали читатели.</p>
      <h2>Решение-победитель Анны Ивановой</h2>
      <p>Сначала необходимо сегментировать аудиторию и проверить спрос интервью с клиентами. Затем следует запустить ограниченный пилот и измерить конверсию.</p>
      <p>Основные риски связаны с неверной оценкой спроса, поэтому инвестиции надо увеличивать поэтапно и сравнивать фактические показатели с планом.</p>
      <h2>Решение Петра Петрова</h2>
      <p>Компания должна сравнить каналы привлечения и рассчитать стоимость нового клиента. Результаты пилота нужно сопоставить с маржинальностью продукта.</p>
      <p>Стратегию следует пересматривать ежемесячно на основании фактических показателей продаж и обратной связи от клиентов.</p>
      <p>Все__решения_кейса__присланные_участниками_Сообщества_Executive.ru.docx</p>
    </div></body></html>
    """.encode()
    doc = parse_html(solution_html)
    sols = parse_solution_blocks(block_texts(find_article_content(doc)), include_combined=False, parser_mode_prefix="html")
    assert len(sols) == 2
    assert sols[0].is_winner is True
    assert sols[1].author_raw == "Петра Петрова"
    assert "Все__решения" not in sols[1].text
    assert explicit_original_case_urls(f"{BASE_URL}/education/cases/101-testovyi-keis-reshenie-keisa", doc) == [
        f"{BASE_URL}/education/cases/100-testovyi-keis"
    ]

    # Старая разметка: «Решения победителей» не должна превращаться в автора
    # «победителей»; два ФИО внутри секции должны стать двумя решениями.
    old_blocks = [
        "Решения победителей",
        "Наталья Чечулина: Правила будут работать только на тех, кто в них верит",
        "Управление задолженностью начинается с оценки риска, выбора схемы сотрудничества и контроля сроков оплаты. Нужно заранее определить лимиты и ответственных сотрудников.",
        "Ринат Фахреев: Проанализировать продажи за последний год",
        "До ответа на вопрос необходимо проанализировать продажи в разрезе клиентов, маржу, сроки оплаты и структуру просроченной задолженности. После этого клиентов нужно сегментировать по риску.",
        "Фото: pixabay.com",
    ]
    old_solutions = parse_solution_blocks(old_blocks, include_combined=False, parser_mode_prefix="html")
    assert len(old_solutions) == 2
    assert [s.author_raw for s in old_solutions] == ["Наталья Чечулина", "Ринат Фахреев"]
    assert all(s.is_winner for s in old_solutions)

    legacy_blocks = [
        "Победитель",
        "Андрей Пятышин, брэнд-мастерская Ideabox",
        "Предлагается выделить несколько перспективных сегментов, проверить каналы продаж и протестировать позиционирование продукта на ограниченной аудитории перед масштабированием.",
        "Представляем все решения кейса, присланные участниками Сообщества",
        "В текстах решений сохранена авторская орфография и пунктуация",
        "Булат Галяутдинов",
        "Следует начать с туристического сегмента и специализированных магазинов, затем проверить спрос через небольшие партии и партнёрские продажи. Это снизит риск больших вложений.",
        "Павел Юдин",
        "Розничные сети дают быстрый охват, но требуют большого бюджета. Поэтому сначала стоит использовать более дешёвые каналы и сравнить экономику привлечения клиентов.",
        "Фото: архив",
    ]
    legacy = parse_solution_blocks(legacy_blocks, include_combined=False, parser_mode_prefix="html")
    assert len(legacy) == 3
    assert legacy[0].author_raw == "Андрей Пятышин" and legacy[0].is_winner
    assert [s.author_raw for s in legacy[1:]] == ["Булат Галяутдинов", "Павел Юдин"]

    docx_style = parse_unheaded_author_solutions([
        "Анна Иванова",
        "Предлагается провести интервью с клиентами, затем запустить пилот и сравнить показатели спроса с экономикой продукта. После пилота решение масштабируется поэтапно.",
        "Петр Петров",
        "Сначала нужно сегментировать клиентов по ценности и риску, затем проверить несколько каналов продаж и оставить те, где стоимость привлечения ниже маржинального дохода.",
    ], parser_mode="docx_author_boundaries")
    assert len(docx_style) == 2 and all(x.needs_review for x in docx_style)

    # Сопоставление исходного кейса по slug из sitemap.
    catalog = ArticleCatalog(
        solution_urls=[f"{BASE_URL}/education/cases/200-kak-prodavat-reshenie-keisa"],
        case_urls_by_slug={"kak-prodavat": [f"{BASE_URL}/education/cases/190-kak-prodavat"]},
        article_urls=[],
    )
    assert catalog.case_candidates_for_solution(catalog.solution_urls[0]) == [
        f"{BASE_URL}/education/cases/190-kak-prodavat"
    ]

    print("Self-test: OK")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Собрать русскоязычные бизнес-кейсы и решения Executive.ru в CSV/JSONL."
    )
    parser.add_argument("--output-dir", type=Path, default=Path("parsed_cases"))
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache_alfacase_parser"))
    parser.add_argument("--max-articles", type=int, default=None, help="Ограничение для тестового прогона")
    parser.add_argument("--delay", type=float, default=1.5, help="Пауза между HTTP-запросами")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument(
        "--include-combined",
        action="store_true",
        help="Последним fallback включать смешанные статьи; needs_review=true",
    )
    parser.add_argument("--self-test", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.self_test:
        self_test()
        return 0

    client = RespectfulHttpClient(
        delay=args.delay,
        timeout=args.timeout,
        retries=args.retries,
        cache_dir=args.cache_dir,
    )
    try:
        catalog = discover_article_catalog(client)
        print(f"Найдено публикаций с решениями: {len(catalog.solution_urls)}", file=sys.stderr)
        rows, issues, recoveries = collect(
            client=client,
            catalog=catalog,
            include_combined=args.include_combined,
            max_articles=args.max_articles,
        )
        write_outputs(args.output_dir, rows, issues, recoveries)
    except KeyboardInterrupt:
        print("Остановлено пользователем", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Ошибка: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    print(
        f"Готово: {len(rows)} решений, {len({row.case_id for row in rows})} кейсов, "
        f"{len(issues)} ошибок/пропусков, {len(recoveries)} восстановлений. Каталог: {args.output_dir}",
        file=sys.stderr,
    )
    return 0 if rows else 2


if __name__ == "__main__":
    raise SystemExit(main())
