<template>
  <section class="catalog">
    <div class="recommendation card">
      <h2>Рекомендуемый кейс</h2>

      <button
        v-if="recommendedCase"
        class="recommended-case"
        type="button"
        @click="$emit('open-case', recommendedCase.id)"
      >
        <strong>{{ recommendedCase.title }}</strong>
        <span>{{ recommendedCase.description }}</span>
      </button>

      <p v-else class="recommendation-empty">
        Пока пусто. Выберите предпочтения по тегу или сложности, и здесь появится персональная рекомендация.
      </p>
    </div>

    <div class="filters card">
      <h3>Фильтр по тегам</h3>
      <div class="tag-list">
        <button
          class="tag-btn"
          :class="{ active: selectedTag === 'Все' }"
          type="button"
          @click="selectedTag = 'Все'"
        >
          Все
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag-btn"
          :class="{ active: selectedTag === tag }"
          type="button"
          @click="selectedTag = tag"
        >
          {{ tag }}
        </button>
      </div>

      <h3>Фильтр по сложности</h3>
      <div class="tag-list">
        <button
          class="tag-btn"
          :class="{ active: selectedDifficulty === 'Все' }"
          type="button"
          @click="selectedDifficulty = 'Все'"
        >
          Все
        </button>
        <button
          v-for="difficulty in allDifficulties"
          :key="difficulty"
          class="tag-btn"
          :class="{ active: selectedDifficulty === difficulty }"
          type="button"
          @click="selectedDifficulty = difficulty"
        >
          {{ difficulty }}
        </button>
      </div>
    </div>

    <div class="cases-grid">
      <button
        v-for="item in filteredCases"
        :key="item.id"
        class="case-card card"
        type="button"
        @click="$emit('open-case', item.id)"
      >
        <img v-if="item.iconUrl" class="case-icon" :src="item.iconUrl" :alt="''" />
        <h4>{{ item.title }}</h4>
        <p>{{ item.description }}</p>
        <div class="tags">
          <span class="difficulty-tag">Сложность: {{ item.difficulty || 'Не указана' }}</span>
          <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CaseCatalog',
  props: {
    cases: {
      type: Array,
      default: () => [],
    },
    recommendedCaseId: {
      type: Number,
      default: null,
    },
  },
  emits: ['open-case'],
  data() {
    return {
      selectedTag: 'Все',
      selectedDifficulty: 'Все',
    }
  },
  computed: {
    recommendedCase() {
      if (!this.recommendedCaseId) {
        return null
      }
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
        const isTagMatch = this.selectedTag === 'Все' || item.tags.includes(this.selectedTag)
        const isDifficultyMatch = this.selectedDifficulty === 'Все' || item.difficulty === this.selectedDifficulty
        return isTagMatch && isDifficultyMatch
      })
    },
  },
}
</script>

<style scoped>
.catalog {
  display: grid;
  gap: 16px;
}

.recommendation,
.filters {
  padding: 18px;
}

.recommendation h2,
.filters h3 {
  margin: 0 0 10px;
}

.filters h3:not(:first-child) {
  margin-top: 14px;
}

.recommended-case {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  display: grid;
  gap: 6px;
}

.recommended-case span,
.recommendation-empty {
  color: var(--text-muted);
}

.recommendation-empty {
  margin: 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--input-bg);
  color: var(--text-main);
  cursor: pointer;
}

.tag-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.case-card {
  border-radius: 0;
  border-width: 2px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 8px;
}

.case-icon {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 10px;
}

.case-card h4 {
  margin: 0;
}

.case-card p {
  margin: 0;
  color: var(--text-muted);
  min-height: 54px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span {
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--surface-subtle);
}

.difficulty-tag {
  border: 1px solid var(--border);
  font-weight: 700;
}
</style>
