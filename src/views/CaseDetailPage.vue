<template>
  <div class="container case-detail-page">
    <section v-if="caseItem" class="card detail-card">
      <h1>{{ caseItem.title }}</h1>
      <p class="score">Решено на {{ caseItem.solvedScore }} / 10</p>
      <p class="description">{{ caseItem.fullDescription }}</p>
      <button class="btn btn-primary" type="button" @click="goToChat">Решать</button>
    </section>
    <section v-else class="card detail-card">
      <h1>Кейс не найден</h1>
      <button class="btn btn-secondary" type="button" @click="$router.push('/dashboard')">
        К списку кейсов
      </button>
    </section>
  </div>
</template>

<script>
// CaseDetailPage.vue: страница с описанием конкретного кейса и переходом в чат решения.
import { getCaseById } from '@/store/appState'

export default {
  name: 'CaseDetailPage',
  computed: {
    caseId() {
      return this.$route.params.caseId
    },
    caseItem() {
      return getCaseById(this.caseId)
    },
  },
  methods: {
    goToChat() {
      this.$router.push(`/case/${this.caseId}/chat`)
    },
  },
}
</script>

<style scoped>
.detail-card {
  padding: 24px;
}

h1 {
  margin: 0 0 12px;
}

.score {
  margin: 0 0 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.description {
  margin: 0 0 20px;
  line-height: 1.5;
}
</style>
