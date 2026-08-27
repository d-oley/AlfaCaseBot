<template>
  <section id="case-catalog" class="catalog">
    <div class="recommendation">
      <p class="section-code">Персональный выбор / 01</p>
      <h2>Ваш<br />кейс</h2>
      <button
        v-if="recommendedCase"
        class="recommended-case"
        type="button"
        @click="$emit('open-case', recommendedCase.id)"
      >
        <span class="recommended-mark">Открыть ↗</span>
        <span class="recommended-content">
          <span class="recommended-visual" aria-hidden="true">
            <img v-if="recommendedCase.iconUrl" :src="recommendedCase.iconUrl" alt="" />
            <span v-else>CASE</span>
          </span>
          <span class="recommended-copy">
            <strong>{{ recommendedCase.title }}</strong>
            <span>{{ recommendedCase.description || 'Описание пока не добавлено.' }}</span>
            <span class="case-rating-value">★ {{ formatRating(recommendedCase.caseRating) }}</span>
          </span>
        </span>
      </button>
      <p v-else class="recommendation-empty">
        Выберите предпочтения, чтобы получить персональную рекомендацию.
      </p>
    </div>

    <div class="filters">
      <div class="filter-heading">
        <span>Фильтр</span>
        <span>{{ filteredCases.length }} / {{ cases.length }}</span>
      </div>
      <h3>Тематика</h3>
      <div class="tag-list">
        <button class="tag-btn" :class="{ active: selectedTag === 'Все' }" type="button" @click="selectedTag = 'Все'">Все</button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag-btn"
          :class="{ active: selectedTag === tag }"
          type="button"
          @click="selectedTag = tag"
        >{{ tag }}</button>
      </div>

      <h3>Сложность</h3>
      <div class="tag-list">
        <button class="tag-btn" :class="{ active: selectedDifficulty === 'Все' }" type="button" @click="selectedDifficulty = 'Все'">Все</button>
        <button
          v-for="difficulty in allDifficulties"
          :key="difficulty"
          class="tag-btn"
          :class="{ active: selectedDifficulty === difficulty }"
          type="button"
          @click="selectedDifficulty = difficulty"
        >{{ difficulty }}</button>
      </div>
    </div>

    <div class="cases-list">
      <button
        v-for="item in filteredCases"
        :key="item.id"
        class="case-row"
        type="button"
        @click="$emit('open-case', item.id)"
      >
        <span class="case-visual" aria-hidden="true">
          <img v-if="item.iconUrl" :src="item.iconUrl" alt="" />
          <span v-else>CASE</span>
        </span>
        <span class="case-main">
          <span class="case-kicker">{{ item.tags.join(' / ') || 'Без категории' }}</span>
          <strong>{{ item.title }}</strong>
          <span class="case-description">{{ item.description }}</span>
        </span>
        <span class="case-meta">
          <span>{{ item.difficulty || 'Не указана' }}</span>
          <span>{{ item.averageSolveMinutes || '—' }} мин</span>
          <span>★ {{ formatRating(item.caseRating) }}</span>
        </span>
        <span class="case-arrow" aria-hidden="true">↗</span>
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CaseCatalog',
  props: {
    cases: { type: Array, default: () => [] },
    recommendedCaseId: { type: Number, default: null },
  },
  emits: ['open-case'],
  data() {
    return { selectedTag: 'Все', selectedDifficulty: 'Все' }
  },
  watch: {
    '$route.query': {
      deep: true,
      handler() {
        this.applyRouteFilters()
      },
    },
  },
  mounted() {
    this.applyRouteFilters()
    if (this.$route.hash === '#case-catalog') {
      this.$nextTick(() => this.$el.scrollIntoView({ block: 'start' }))
    }
  },
  computed: {
    recommendedCase() {
      return this.cases.find((item) => item.id === this.recommendedCaseId) || null
    },
    allTags() {
      return [...new Set(this.cases.flatMap((item) => item.tags))].sort()
    },
    allDifficulties() {
      return [...new Set(this.cases.map((item) => item.difficulty).filter(Boolean))]
    },
    filteredCases() {
      return this.cases.filter((item) => {
        const tagMatch = this.selectedTag === 'Все' || item.tags.includes(this.selectedTag)
        const difficultyMatch = this.selectedDifficulty === 'Все' || item.difficulty === this.selectedDifficulty
        return tagMatch && difficultyMatch
      })
    },
  },
  methods: {
    formatRating(value) {
      const rating = Number(value || 0)
      return rating > 0 ? rating.toFixed(1) : 'нет оценок'
    },
    applyRouteFilters() {
      const requestedTag = String(this.$route.query.tag || '').trim().toLowerCase()
      const requestedDifficulty = String(this.$route.query.difficulty || '').trim().toLowerCase()
      const matchedTag = this.allTags.find((tag) => tag.toLowerCase() === requestedTag)
      const matchedDifficulty = this.allDifficulties.find(
        (difficulty) => difficulty.toLowerCase() === requestedDifficulty
      )
      this.selectedTag = matchedTag || 'Все'
      this.selectedDifficulty = matchedDifficulty || 'Все'
    },
  },
}
</script>

<style scoped>
.catalog {
  display: grid;
  grid-template-columns: minmax(270px, 0.38fr) minmax(0, 1fr);
  border-top: 4px solid var(--border);
  background: var(--card-bg);
}
.recommendation, .filters { padding: 24px; border-bottom: 1px solid var(--border); }
.recommendation {
  border-right: 1px solid var(--border);
  align-self: stretch;
}
.section-code, .filter-heading, .case-kicker, .case-meta {
  font-family: var(--mono-font);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.section-code { margin: 0 0 22px; color: var(--primary); }
.recommendation h2 {
  margin: 0;
  max-width: 100%;
  font-size: clamp(2rem, 2.8vw, 3rem);
  line-height: 1;
  text-transform: uppercase;
}
.recommended-case {
  width: 100%;
  margin-top: 22px;
  padding: 14px 0 0;
  border: 0;
  border-top: 1px solid var(--border);
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 12px;
}
.recommended-content {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}
.recommended-visual {
  width: 82px;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--mono-font);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
}
.recommended-visual img { width: 100%; height: 100%; object-fit: cover; }
.recommended-copy { min-width: 0; display: grid; gap: 6px; }
.recommended-copy strong {
  font-family: var(--display-font);
  font-size: 1.2rem;
  line-height: 1.05;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.recommended-copy > span { color: var(--text-muted); line-height: 1.4; }
.recommended-copy .case-rating-value { color: var(--text-main); font-family: var(--mono-font); font-size: 0.74rem; text-transform: uppercase; }
.recommended-case:hover .recommended-copy strong { color: var(--primary); }
.recommendation-empty { color: var(--text-muted); }
.recommended-mark { color: var(--primary); font-family: var(--mono-font); font-size: 0.72rem; text-transform: uppercase; }
.recommendation-empty { margin: 28px 0 0; }
.filter-heading { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.filters h3 { margin: 0 0 10px; font-size: 1rem; text-transform: uppercase; }
.filters h3:not(:first-of-type) { margin-top: 18px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 7px; }
.tag-btn {
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 7px 11px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  font-family: var(--mono-font);
  font-size: 0.75rem;
  text-transform: uppercase;
}
.tag-btn.active { color: #fff; background: var(--primary); border-color: var(--primary); }
.cases-list { grid-column: 1 / -1; display: grid; border-top: 1px solid var(--border); }
.case-row {
  min-height: 126px;
  border: 0;
  border-bottom: 1px solid var(--border);
  padding: 20px 24px;
  background: var(--card-bg);
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 105px 24px;
  gap: 18px;
  align-items: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.case-row:hover { background: var(--primary); color: #fff; }
.case-visual {
  width: 96px;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--mono-font);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
}
.case-visual img { width: 100%; height: 100%; object-fit: cover; }
.case-row:hover .case-visual { border-color: #fff; }
.case-main { display: grid; gap: 6px; }
.case-main strong { font-family: var(--display-font); font-size: clamp(1.2rem, 1.65vw, 1.8rem); text-transform: uppercase; line-height: 1; }
.case-description { color: var(--text-muted); max-width: 740px; }
.case-row:hover .case-description { color: rgba(255, 255, 255, 0.78); }
.case-meta { display: grid; gap: 7px; }
.case-arrow { font-size: 1.7rem; }

@media (max-width: 800px) {
  .catalog { grid-template-columns: 1fr; }
  .recommendation { border-right: 0; }
  .cases-list { grid-column: 1; }
  .case-row { grid-template-columns: 72px 1fr 24px; padding: 18px 12px; }
  .case-visual { width: 72px; }
  .case-meta { grid-column: 2; display: flex; gap: 14px; }
  .case-arrow { grid-column: 3; grid-row: 1 / span 2; }
}

@media (min-width: 801px) and (max-width: 1080px) {
  .catalog { grid-template-columns: 240px minmax(0, 1fr); }
  .recommendation, .filters { padding: 18px; }
  .recommendation h2 { font-size: 3rem; }
  .case-row { padding: 18px; gap: 12px; }
}
</style>
