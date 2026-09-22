<template>
  <div class="container solutions-page">
    <header>
      <router-link class="back-link" to="/profile">← В профиль</router-link>
      <h1>Все мои попытки</h1>
      <p>Здесь показаны сохранённые Java результаты, включая попытки ниже проходного балла.</p>
    </header>
    <section class="card solutions-card">
      <p v-if="loading" role="status">Загружаем попытки...</p>
      <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>
      <button v-if="error" class="btn btn-secondary" type="button" @click="load(page)">Повторить</button>
      <p v-else-if="!items.length">Сохранённых попыток пока нет.</p>
      <article v-for="item in items" :key="item.solutionId" class="solution-item">
        <header>
          <router-link :to="`/case/${item.caseId}`">{{ caseTitle(item.caseId) }}</router-link>
          <strong>{{ item.rating ?? '—' }} / 100</strong>
        </header>
        <p><span>Ваш ответ:</span> {{ item.solutionText }}</p>
        <p><span>Ответ системы:</span> {{ item.solutionResponse }}</p>
      </article>
      <nav v-if="totalPages > 1" class="pagination" aria-label="Страницы попыток">
        <button class="btn btn-secondary" :disabled="page <= 0 || loading" @click="load(page - 1)">Назад</button>
        <span>{{ page + 1 }} / {{ totalPages }}</span>
        <button class="btn btn-secondary" :disabled="page + 1 >= totalPages || loading" @click="load(page + 1)">Далее</button>
      </nav>
    </section>
  </div>
</template>

<script>
import { listMySolutions } from '@/api/authApi'
import { getCaseById } from '@/store/appState'

export default {
  name: 'SolutionsPage',
  data: () => ({ items: [], page: 0, totalPages: 0, loading: false, error: '' }),
  created() { this.load(0) },
  methods: {
    caseTitle(caseId) { return getCaseById(caseId)?.title || `Кейс ${caseId}` },
    async load(page) {
      if (this.loading || page < 0) return
      this.loading = true
      this.error = ''
      try {
        const result = await listMySolutions({ page, size: 25 })
        this.items = result.items || []
        this.page = result.page || 0
        this.totalPages = result.totalPages || 0
      } catch (error) {
        this.error = error?.message || 'Не удалось загрузить попытки.'
      } finally { this.loading = false }
    },
  },
}
</script>

<style scoped>
.solutions-page { display: grid; gap: 22px; }
.solutions-page h1 { margin: 10px 0; }
.solutions-card { padding: clamp(18px, 3vw, 30px); }
.solution-item { padding: 18px 0; border-bottom: 1px solid var(--border); }
.solution-item header, .pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.solution-item p { white-space: pre-wrap; overflow-wrap: anywhere; }
.solution-item span { font-weight: 700; }
.pagination { margin-top: 20px; justify-content: center; }
</style>
