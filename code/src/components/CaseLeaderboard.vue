<template>
  <section class="card leaderboard">
    <div class="header-row">
      <div>
        <p class="eyebrow">Leaderboard</p>
        <h2>Топ решений по кейсу</h2>
      </div>
    </div>

    <div v-if="entries.length" class="table">
      <div class="row row-head">
        <span>Место</span>
        <span>Участник</span>
        <span>Город</span>
        <span>Баллы</span>
      </div>

      <div
        v-for="entry in entries"
        :key="entry.id"
        class="row"
        :class="{ current: entry.isCurrentUser }"
      >
        <span>#{{ entry.rank }}</span>
        <span>{{ entry.fullName }}</span>
        <span>{{ entry.city || 'Не указан' }}</span>
        <span>{{ entry.score }}/100</span>
      </div>
    </div>

    <p v-else class="empty-state">Пока нет загруженных результатов по этому кейсу.</p>
  </section>
</template>

<script>
export default {
  name: 'CaseLeaderboard',
  props: {
    entries: {
      type: Array,
      default: () => [],
    },
  },
}
</script>

<style scoped>
.leaderboard {
  padding: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.eyebrow {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.header-row h2 {
  margin: 0;
}

.hint {
  margin: 0;
  color: var(--text-muted);
}

.table {
  display: grid;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1.6fr) minmax(0, 1fr) 110px;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  align-items: center;
}

.row-head {
  background: transparent;
  border: 0;
  padding: 0 2px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.row.current {
  border-color: var(--primary);
  background: var(--surface-tab-active);
}

.empty-state {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .row,
  .row-head {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
