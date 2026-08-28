import logging
import os
import tempfile
from pathlib import Path


def build_run_log_path(base_log_path):
    log_dir = base_log_path.parent
    stem = base_log_path.stem
    suffix = base_log_path.suffix or ".log"
    pattern = f"{stem}_*{suffix}"
    max_index = 0

    for existing_path in log_dir.glob(pattern):
        suffix_part = existing_path.stem[len(stem) + 1 :]
        if suffix_part.isdigit():
            max_index = max(max_index, int(suffix_part))

    return log_dir / f"{stem}_{max_index + 1:04d}{suffix}"


def configure_numbered_file_logging(log_level, log_file):
    requested_path = Path(log_file).expanduser().resolve()
    candidate_paths = [requested_path]

    for candidate in (
        os.getenv("LOCALAPPDATA"),
        os.getenv("USERPROFILE"),
        os.getenv("TEMP"),
        os.getenv("TMP"),
    ):
        if candidate:
            candidate_paths.append(
                Path(candidate) / "alfacasebot" / "logs" / requested_path.name
            )

    try:
        candidate_paths.append(
            Path(tempfile.gettempdir()) / "alfacasebot" / "logs" / requested_path.name
        )
    except (FileNotFoundError, OSError):
        pass

    candidate_paths.append(Path.cwd() / requested_path.name)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    for base_candidate_path in candidate_paths:
        try:
            base_candidate_path.parent.mkdir(parents=True, exist_ok=True)
            candidate_path = build_run_log_path(base_candidate_path)
            file_handler = logging.FileHandler(candidate_path, encoding="utf-8")
            file_handler.setLevel(root_logger.level)
            file_handler.setFormatter(
                logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
            )
            root_logger.addHandler(file_handler)
            return candidate_path
        except OSError:
            continue

    return None
