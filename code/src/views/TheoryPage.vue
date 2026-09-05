<template>
  <div class="container theory-page">
    <router-link class="back-link" :to="`/case/${caseId}`">
      <span aria-hidden="true">←</span> К описанию кейса
    </router-link>

    <header class="theory-header">
      <p class="section-code">Теория по кейсу</p>
      <h1>{{ caseTitle }}</h1>
      <p>Выберите раздел, изучите материал и проверьте знания.</p>
    </header>

    <section v-if="sectionsLoading" class="card state-card">
      <p>Загружаем разделы теории...</p>
    </section>

    <section v-else-if="sectionsError" class="card state-card">
      <p class="error-text" role="alert">{{ sectionsError }}</p>
      <button class="btn btn-secondary" type="button" @click="loadSections">Повторить</button>
    </section>

    <section v-else-if="!sections.length" class="card state-card">
      <h2>Теория пока не добавлена</h2>
      <p>Для этого кейса ещё нет опубликованных разделов.</p>
    </section>

    <template v-else>
      <nav class="theory-tabs" aria-label="Разделы теории">
        <button
          v-for="section in sections"
          :key="section.id"
          class="theory-tab"
          :class="{ active: section.id === selectedMaterialId }"
          type="button"
          @click="selectSection(section.id)"
        >
          <span>{{ String(section.position).padStart(2, '0') }}</span>
          {{ section.title }}
        </button>
      </nav>

      <section class="card material-card">
        <p v-if="materialLoading">Загружаем раздел...</p>
        <p v-else-if="materialError" class="error-text" role="alert">{{ materialError }}</p>
        <template v-else-if="material">
          <p class="section-code">Раздел {{ material.position }}</p>
          <h2>{{ material.title }}</h2>
          <div class="material-text">{{ material.text }}</div>
        </template>
      </section>

      <section v-if="material && quizLoading" class="card quiz-card">
        <p>Загружаем тест...</p>
      </section>

      <section v-else-if="material && quizError && !quizNotFound" class="card quiz-card">
        <p class="error-text" role="alert">{{ quizError }}</p>
        <button class="btn btn-secondary" type="button" @click="loadQuiz(material.id)">Повторить</button>
      </section>

      <section v-else-if="material && quiz" class="card quiz-card">
        <div class="quiz-heading">
          <div>
            <p class="section-code">Проверка знаний</p>
            <h2>Тест по разделу</h2>
          </div>
          <div v-if="quizStatus" class="quiz-status" :class="{ solved: quizStatus.isSolved }">
            <strong>{{ quizStatus.isSolved ? 'Тест пройден' : 'Тест не пройден' }}</strong>
            <span>Попыток: {{ quizStatus.attemptsCount }}</span>
          </div>
          <span v-else-if="quizStatusLoading" class="quiz-status-note">Загружаем результат...</span>
        </div>

        <div v-if="quizStatusError" class="quiz-status-error">
          <p class="error-text" role="alert">{{ quizStatusError }}</p>
          <button class="btn btn-secondary" type="button" :disabled="quizStatusLoading" @click="loadQuizStatus">
            Повторить загрузку результата
          </button>
        </div>

        <form v-if="!displayedResult" class="quiz-form" @submit.prevent="submitQuiz">
          <fieldset v-for="question in quiz.questions" :key="question.id" class="quiz-question">
            <legend>
              <span>{{ question.position }}</span>
              {{ question.text }}
            </legend>
            <label v-for="option in question.options" :key="option.id" class="quiz-option">
              <input
                v-model="answers[question.id]"
                type="radio"
                :name="`question-${question.id}`"
                :value="option.id"
              />
              <span>{{ option.text }}</span>
            </label>
          </fieldset>

          <p v-if="submitError" class="error-text" role="alert">{{ submitError }}</p>
          <button class="btn btn-primary" type="submit" :disabled="submitting || !allQuestionsAnswered">
            {{ submitting ? 'Проверяем...' : 'Завершить тест' }}
          </button>
          <p v-if="!allQuestionsAnswered" class="form-note">Ответьте на все вопросы.</p>
        </form>

        <div v-else class="attempt-result" :class="{ solved: displayedResult.isSolved }" role="status">
          <p class="section-code">{{ attemptResult ? 'Результат попытки' : 'Лучший результат' }}</p>
          <h3>{{ displayedResult.isSolved ? 'Тест пройден' : 'Пока не пройден' }}</h3>
          <p v-if="attemptScorePercent !== null" class="attempt-score">
            <strong>{{ attemptScorePercent }}%</strong>
            <span>правильных ответов</span>
          </p>
          <p>
            {{ displayedResult.isSolved
              ? 'Материал усвоен. При желании тест можно пройти ещё раз.'
              : 'Вернитесь к теории и попробуйте пройти тест ещё раз.' }}
          </p>
          <button class="btn btn-secondary" type="button" @click="startNewAttempt">Пройти ещё раз</button>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import {
  getCaseByIdRequest,
  getTheoryMaterial,
  getTheoryQuiz,
  getTheoryQuizStatus,
  listCaseTheory,
  submitTheoryQuiz,
} from '@/api/authApi'
import { getCaseById, upsertCase } from '@/store/appState'

export default {
  name: 'TheoryPage',
  data() {
    return {
      sections: [],
      sectionsLoading: true,
      sectionsError: '',
      selectedMaterialId: null,
      material: null,
      materialLoading: false,
      materialError: '',
      quiz: null,
      quizStatus: null,
      quizStatusLoading: false,
      quizStatusError: '',
      quizLoading: false,
      quizError: '',
      quizNotFound: false,
      answers: {},
      submitting: false,
      submitError: '',
      attemptResult: null,
      isRetaking: false,
    }
  },
  computed: {
    caseId() {
      return Number(this.$route.params.caseId)
    },
    caseTitle() {
      return getCaseById(this.caseId)?.title || 'Кейс'
    },
    allQuestionsAnswered() {
      return Boolean(this.quiz?.questions?.length) && this.quiz.questions.every(
        (question) => this.answers[question.id] !== undefined
      )
    },
    displayedResult() {
      if (this.attemptResult) return this.attemptResult
      const attemptsCount = Number(this.quizStatus?.attemptsCount)
      const score = Number(this.quizStatus?.score)
      const hasStoredResult = (Number.isFinite(attemptsCount) && attemptsCount > 0) ||
        (Number.isFinite(score) && score > 0) || Boolean(this.quizStatus?.isSolved)
      if (this.isRetaking || !hasStoredResult) return null
      return {
        score: this.quizStatus.score,
        isSolved: Boolean(this.quizStatus.isSolved),
      }
    },
    attemptScorePercent() {
      if (this.displayedResult?.score === null || this.displayedResult?.score === undefined) return null
      const score = Number(this.displayedResult.score)
      return Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : null
    },
  },
  async created() {
    await Promise.all([this.loadCase(), this.loadSections()])
  },
  methods: {
    async loadCase() {
      if (getCaseById(this.caseId)) return
      try {
        upsertCase(await getCaseByIdRequest(this.caseId))
      } catch {
        // Название кейса не блокирует загрузку самой теории.
      }
    },
    async loadSections() {
      this.sectionsLoading = true
      this.sectionsError = ''
      try {
        const response = await listCaseTheory(this.caseId)
        this.sections = response.materials
        const requested = this.sections.find(section => Number(section.id) === Number(this.$route.query.material))
        if (this.sections.length) await this.selectSection((requested || this.sections[0]).id)
      } catch (error) {
        this.sections = []
        this.sectionsError = error?.message || 'Не удалось загрузить разделы теории.'
      } finally {
        this.sectionsLoading = false
      }
    },
    async selectSection(materialId) {
      if (this.materialLoading || Number(materialId) === Number(this.selectedMaterialId)) return
      this.selectedMaterialId = Number(materialId)
      this.material = null
      this.materialError = ''
      this.quiz = null
      this.quizStatus = null
      this.quizStatusError = ''
      this.quizError = ''
      this.quizNotFound = false
      this.attemptResult = null
      this.isRetaking = false
      this.answers = {}
      this.materialLoading = true
      try {
        this.material = await getTheoryMaterial(materialId)
        await this.loadQuiz(materialId)
      } catch (error) {
        this.materialError = error?.message || 'Не удалось загрузить раздел теории.'
      } finally {
        this.materialLoading = false
      }
    },
    async loadQuiz(materialId) {
      this.quizLoading = true
      this.quizError = ''
      this.quizNotFound = false
      try {
        this.quiz = await getTheoryQuiz(materialId)
        this.answers = {}
        await this.loadQuizStatus()
      } catch (error) {
        this.quiz = null
        this.quizNotFound = Number(error?.status) === 404
        if (!this.quizNotFound) this.quizError = error?.message || 'Не удалось загрузить тест.'
      } finally {
        this.quizLoading = false
      }
    },
    async loadQuizStatus() {
      if (!this.quiz?.id || this.quizStatusLoading) return
      this.quizStatusLoading = true
      this.quizStatusError = ''
      try {
        this.quizStatus = await getTheoryQuizStatus(this.quiz.id)
      } catch (error) {
        this.quizStatus = null
        this.quizStatusError = error?.message || 'Не удалось загрузить сохранённый результат теста.'
      } finally {
        this.quizStatusLoading = false
      }
    },
    async submitQuiz() {
      if (!this.allQuestionsAnswered || this.submitting) return
      this.submitting = true
      this.submitError = ''
      try {
        const answers = this.quiz.questions.map((question) => ({
          questionId: Number(question.id),
          answerOptionId: Number(this.answers[question.id]),
        }))
        this.attemptResult = await submitTheoryQuiz(this.quiz.id, answers)
        this.isRetaking = false
        await this.loadQuizStatus()
      } catch (error) {
        this.submitError = error?.message || 'Не удалось проверить тест.'
      } finally {
        this.submitting = false
      }
    },
    startNewAttempt() {
      this.answers = {}
      this.attemptResult = null
      this.isRetaking = true
      this.submitError = ''
    },
  },
}
</script>

<style scoped>
.theory-page { display: grid; gap: 18px; }
.theory-header { padding: 18px 0 6px; }
.theory-header h1 { margin: 4px 0 10px; font-size: clamp(2rem, 6vw, 4.8rem); }
.theory-header p:last-child { margin: 0; color: var(--text-muted); }
.section-code { margin: 0; color: var(--primary); font-family: var(--mono-font); font-size: .76rem; text-transform: uppercase; letter-spacing: .08em; }
.state-card, .material-card, .quiz-card { padding: clamp(20px, 4vw, 38px); }
.theory-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.theory-tab { min-width: 0; padding: 15px; border: 1px solid var(--border); background: var(--surface); color: var(--text-main); text-align: left; cursor: pointer; font: inherit; display: flex; gap: 10px; align-items: center; }
.theory-tab span { color: var(--primary); font-family: var(--mono-font); font-size: .75rem; }
.theory-tab:hover, .theory-tab.active { border-color: var(--primary); background: var(--primary); color: #fff; }
.theory-tab:hover span, .theory-tab.active span { color: #fff; }
.material-card h2, .quiz-card h2 { margin: 8px 0 20px; }
.material-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.quiz-heading { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.quiz-status { display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--border); color: var(--text-muted); }
.quiz-status.solved { border-color: #2f8f5b; color: #236b45; }
.quiz-status span { font-size: .78rem; }
.quiz-status-note { color: var(--text-muted); font-size: .82rem; }
.quiz-status-error { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 18px; }
.quiz-status-error p { margin: 0; }
.quiz-form { display: grid; gap: 22px; }
.quiz-question { margin: 0; padding: 18px 0; border: 0; border-top: 1px solid var(--border); }
.quiz-question legend { width: 100%; margin-bottom: 14px; font-weight: 700; line-height: 1.45; }
.quiz-question legend span { margin-right: 8px; color: var(--primary); font-family: var(--mono-font); }
.quiz-option { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--border); cursor: pointer; }
.quiz-option + .quiz-option { margin-top: 8px; }
.quiz-option:has(input:checked) { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
.quiz-option input { margin-top: 3px; accent-color: var(--primary); }
.form-note { margin: -12px 0 0; color: var(--text-muted); font-size: .82rem; }
.attempt-result { padding: 22px; border: 1px solid var(--border); }
.attempt-result.solved { border-color: #2f8f5b; }
.attempt-result h3 { margin: 8px 0; font-size: 1.55rem; }
.attempt-score { display: flex; align-items: baseline; gap: 10px; margin: 14px 0; }
.attempt-score strong { font-family: var(--display-font); font-size: clamp(2.4rem, 6vw, 4rem); line-height: .9; }
.attempt-score span { color: var(--text-muted); }
@media (max-width: 640px) { .quiz-heading { flex-direction: column; } .quiz-status { width: 100%; box-sizing: border-box; } }
</style>
