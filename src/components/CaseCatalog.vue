<template>
  <section class="catalog">
    <div class="recommendation card">
      <h2>Рекомендуем вам:</h2>
      <button class="recommended-case" type="button" @click="$emit('open-case', recommendedCase.id)">
        <strong>{{ recommendedCase.title }}</strong>
        <span>{{ recommendedCase.description }}</span>
      </button>
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
    </div>

    <div class="cases-grid">
      <button
        v-for="item in filteredCases"
        :key="item.id"
        class="case-card card"
        type="button"
        @click="$emit('open-case', item.id)"
      >
        <h4>{{ item.title }}</h4>
        <p>{{ item.description }}</p>
        <div class="tags">
          <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script>
// CaseCatalog.vue: блок рекомендаций, фильтров и сетки кейсов на странице пользователя.
export default {
  name: 'CaseCatalog',
  props: {
    cases: {
      type: Array,
      default: () => [],
    },
    recommendedCaseId: {
      type: Number,
      default: 1,
    },
  },
  emits: ['open-case'],
  data() {
    return {
      selectedTag: 'Все',
    }
  },
  computed: {
    recommendedCase() {
      return this.cases.find((item) => item.id === this.recommendedCaseId) || this.cases[0] || {}
    },
    allTags() {
      return [...new Set(this.cases.flatMap((item) => item.tags))].sort()
    },
    filteredCases() {
      if (this.selectedTag === 'Все') {
        return this.cases
      }
      return this.cases.filter((item) => item.tags.includes(this.selectedTag))
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

.recommended-case {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  background: #f8faff;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  display: grid;
  gap: 6px;
}

.recommended-case span {
  color: var(--text-muted);
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
  background: #fff;
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
  background: #ecf1ff;
}
</style>
