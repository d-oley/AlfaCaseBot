<template>
  <div class="container case-detail-page">
    <section v-if="caseLoading" class="card detail-card">
      <p>Загружаем кейс...</p>
    </section>

    <section v-else-if="caseItem" class="card detail-card">
      <router-link class="back-link" to="/dashboard">
        <span aria-hidden="true">←</span> К каталогу кейсов
      </router-link>
      <div class="title-row">
        <h1>{{ caseItem.title }}</h1>
        <button
          class="favorite-star"
          :class="{ active: isFavorite }"
          type="button"
          :disabled="favoriteSaving"
          :aria-label="isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'"
          @click="toggleFavorite"
        >
          <svg class="favorite-heart" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21C9.3 19.3 3 15.1 3 9.5A4.5 4.5 0 0 1 11.1 6.8L12 8l.9-1.2A4.5 4.5 0 0 1 21 9.5c0 5.6-6.3 9.8-9 11.5Z" />
          </svg>
        </button>
      </div>
      <p v-if="favoriteError" class="leaderboard-error" role="alert">{{ favoriteError }}</p>

      <div class="tags">
        <button
          class="tag difficulty-tag"
          type="button"
          @click="openCatalog({ difficulty: caseItem.difficulty })"
        >
          Сложность: {{ caseItem.difficulty || 'Не указана' }}
        </button>
        <button
          v-for="tag in caseItem.tags"
          :key="tag"
          class="tag"
          type="button"
          @click="openCatalog({ tag })"
        >{{ tag }}</button>
      </div>

      <div class="case-rating">
        <div class="case-rating-copy">
          <span class="description-label">Оценка кейса</span>
          <div class="average-rating" :aria-label="formattedCaseRating">
            <span class="average-stars" aria-hidden="true">
              <svg
                v-for="rating in 5"
                :key="rating"
                viewBox="0 0 24 24"
                :class="{ filled: roundedCaseRating >= rating }"
              >
                <path d="m12 2.8 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8Z" />
              </svg>
            </span>
            <strong>{{ formattedCaseRating }}</strong>
          </div>
          <span class="case-rating-note">Средняя оценка пользователей</span>
        </div>
        <div class="case-rating-actions">
          <span class="description-label">Ваша оценка</span>
          <div class="rating-buttons" role="group" aria-label="Оценить кейс от 1 до 5">
            <button
              v-for="rating in 5"
              :key="rating"
              class="rating-button"
              :class="{ active: userCaseRating >= rating }"
              type="button"
              :disabled="ratingSaving"
              :aria-label="`Поставить оценку ${rating} из 5`"
              @click="submitCaseRating(rating)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 2.8 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8Z" />
              </svg>
            </button>
          </div>
          <span v-if="ratingMessage" class="case-rating-status" role="status">{{ ratingMessage }}</span>
          <span v-if="ratingError" class="leaderboard-error" role="alert">{{ ratingError }}</span>
        </div>
      </div>

      <div class="description-block">
        <span class="description-label">Задача</span>
        <p class="description">{{ caseItem.fullDescription }}</p>
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="button" @click="goToChat">Решать</button>
        <a v-if="caseItem.pdfUrl" class="btn btn-secondary" :href="caseItem.pdfUrl" target="_blank" rel="noopener">
          Полные условия (PDF)
        </a>
      </div>
    </section>

    <section v-if="caseItem && theorySections.length" class="card theory-promo-card">
      <div>
        <p class="case-code">Подготовка к кейсу</p>
        <h2>Разберите теорию перед решением</h2>
        <p>К кейсу добавлено разделов: {{ theorySections.length }}. Изучайте их по порядку или выберите нужную тему.</p>
      </div>
      <router-link class="btn btn-secondary" :to="`/case/${caseId}/theory`">Пройти теорию</router-link>
    </section>

    <section v-if="caseItem" class="card perfect-solution-card">
      <p class="case-code">Эталонное решение</p>
      <h2>Сверьте свой подход с эталоном</h2>

      <p v-if="!appState.isAuthenticated" class="perfect-solution-note">
        Эталонное решение будет доступно после входа и завершения кейса.
      </p>
      <p v-else-if="solvingStateLoading" class="perfect-solution-note">
        Проверяем, завершён ли кейс...
      </p>
      <p v-else-if="solvingStateError" class="leaderboard-error" role="alert">
        {{ solvingStateError }}
      </p>
      <p v-else-if="!isCaseCompleted" class="perfect-solution-note">
        Эталонное решение будет доступно только после завершения кейса.
      </p>
      <template v-else>
        <button
          v-if="perfectSolution === null"
          class="btn btn-secondary"
          type="button"
          :disabled="perfectSolutionLoading"
          @click="loadPerfectSolution"
        >
          {{ perfectSolutionLoading ? 'Загружаем...' : 'Посмотреть эталонное решение' }}
        </button>
        <p v-if="perfectSolutionError" class="leaderboard-error" role="alert">
          {{ perfectSolutionError }}
        </p>
        <div v-if="perfectSolution !== null" class="perfect-solution-text">
          <p v-if="perfectSolution">{{ perfectSolution }}</p>
          <p v-else>Для этого кейса эталонное решение пока не добавлено.</p>
        </div>
      </template>
    </section>

    <p v-if="leaderboardError" class="leaderboard-error">{{ leaderboardError }}</p>
    <case-leaderboard v-if="caseItem" :entries="leaderboardEntries" />

    <section v-if="!caseLoading && !caseItem" class="card detail-card">
      <h1>Кейс не найден</h1>
      <p v-if="caseError" class="leaderboard-error">{{ caseError }}</p>
      <button class="btn btn-secondary" type="button" @click="$router.push('/dashboard')">
        К списку кейсов
      </button>
    </section>
  </div>
</template>

<script>
import CaseLeaderboard from '@/components/CaseLeaderboard.vue'
import {
  addFavoriteCase,
  getCaseAssetUrl,
  getCaseByIdRequest,
  getCasePerfectSolution,
  getCaseSolvingState,
  listCaseLeaderboard,
  listCaseTheory,
  rateCase,
  removeFavoriteCase,
} from '@/api/authApi'
import {
  appState,
  getCaseById,
  isCaseFavorite,
  markCaseViewed,
  setCaseFavorite,
  upsertCase,
} from '@/store/appState'

export default {
  name: 'CaseDetailPage',
  components: {
    CaseLeaderboard,
  },
  data() {
    return {
      appState,
      leaderboardEntries: [],
      leaderboardError: '',
      caseLoading: false,
      caseError: '',
      favoriteSaving: false,
      favoriteError: '',
      solvingStateLoading: false,
      solvingStateError: '',
      isCaseCompleted: false,
      perfectSolution: null,
      perfectSolutionLoading: false,
      perfectSolutionError: '',
      userCaseRating: 0,
      ratingSaving: false,
      ratingMessage: '',
      ratingError: '',
      theorySections: [],
    }
  },
  computed: {
    caseId() {
      return this.$route.params.caseId
    },
    caseItem() {
      return getCaseById(this.caseId)
    },
    isFavorite() {
      return isCaseFavorite(this.caseId)
    },
    formattedCaseRating() {
      const value = Number(this.caseItem?.caseRating || 0)
      return value > 0 ? `${value.toFixed(1)} / 5` : 'Пока нет оценок'
    },
    roundedCaseRating() {
      return Math.round(Number(this.caseItem?.caseRating || 0))
    },
  },
  watch: {
    'appState.isAuthenticated'(isAuthenticated) {
      this.resetPerfectSolutionState()
      if (isAuthenticated && this.caseId) this.loadSolvingState(this.caseId)
    },
    caseId: {
      immediate: true,
      async handler(value) {
        if (value) {
          markCaseViewed(value)
          this.resetPerfectSolutionState()
          this.userCaseRating = 0
          this.ratingMessage = ''
          this.ratingError = ''
          await Promise.all([
            this.loadCase(value),
            this.loadLeaderboard(value),
            this.loadSolvingState(value),
            this.loadTheory(value),
          ])
        }
      },
    },
  },
  methods: {
    openCatalog(query) {
      this.$router.push({ name: 'dashboard', query, hash: '#case-catalog' })
    },
    resetPerfectSolutionState() {
      this.solvingStateLoading = false
      this.solvingStateError = ''
      this.isCaseCompleted = false
      this.perfectSolution = null
      this.perfectSolutionError = ''
    },
    async loadSolvingState(caseId) {
      if (!appState.isAuthenticated) return
      this.solvingStateLoading = true
      this.solvingStateError = ''
      try {
        const state = await getCaseSolvingState(caseId)
        this.isCaseCompleted = Boolean(state?.completed)
      } catch (error) {
        this.solvingStateError = error?.message || 'Не удалось проверить состояние решения.'
      } finally {
        this.solvingStateLoading = false
      }
    },
    async loadPerfectSolution() {
      if (!this.isCaseCompleted || this.perfectSolutionLoading) return
      this.perfectSolutionLoading = true
      this.perfectSolutionError = ''
      try {
        const response = await getCasePerfectSolution(this.caseId)
        this.perfectSolution = String(response?.perfectSolution || '')
      } catch (error) {
        this.perfectSolutionError = error?.message || 'Не удалось загрузить эталонное решение.'
      } finally {
        this.perfectSolutionLoading = false
      }
    },
    async loadCase(caseId) {
      this.caseLoading = true
      this.caseError = ''
      try {
        upsertCase(await getCaseByIdRequest(caseId))
      } catch (error) {
        this.caseError = error?.message || 'Не удалось загрузить кейс.'
      } finally {
        this.caseLoading = false
      }
    },
    async loadLeaderboard(caseId) {
      this.leaderboardError = ''
      try {
        const users = await listCaseLeaderboard(caseId)
        this.leaderboardEntries = users.map((user, index) => ({
          id: user.userId ?? `case-leaderboard-${index}`,
          rank: user.placement ?? index + 1,
          fullName: user.firstName || user.nickName || 'Пользователь',
          city: user.cityName || '',
          score: user.score ?? 0,
          avatarUrl: getCaseAssetUrl(user.avatarUrl),
          isCurrentUser: Number(user.userId) === Number(appState.user.id),
        }))
      } catch (error) {
        this.leaderboardEntries = []
        this.leaderboardError = error?.message || 'Не удалось загрузить рейтинг по кейсу.'
      }
    },
    async loadTheory(caseId) {
      try {
        const response = await listCaseTheory(caseId)
        this.theorySections = response.materials
      } catch {
        this.theorySections = []
      }
    },
    goToChat() {
      this.$router.push(`/case/${this.caseId}/chat`)
    },
    async toggleFavorite() {
      if (this.favoriteSaving) return
      this.favoriteSaving = true
      this.favoriteError = ''
      const shouldBeFavorite = !this.isFavorite
      try {
        if (shouldBeFavorite) await addFavoriteCase(this.caseId)
        else await removeFavoriteCase(this.caseId)
        setCaseFavorite(this.caseId, shouldBeFavorite)
      } catch (error) {
        this.favoriteError = error?.message || 'Не удалось изменить избранное.'
      } finally {
        this.favoriteSaving = false
      }
    },
    async submitCaseRating(rating) {
      if (this.ratingSaving) return
      this.ratingSaving = true
      this.ratingMessage = ''
      this.ratingError = ''
      try {
        await rateCase(this.caseId, rating)
        this.userCaseRating = rating
        this.ratingMessage = 'Оценка сохранена'
      } catch (error) {
        this.ratingError = error?.message || 'Не удалось сохранить оценку.'
      } finally {
        this.ratingSaving = false
      }
    },
  },
}
</script>

<style scoped>
.case-detail-page {
  display: grid;
  gap: 28px;
}

.detail-card {
  padding: clamp(20px, 4vw, 48px);
  border-top-width: 5px;
}

.perfect-solution-card {
  padding: clamp(20px, 3vw, 34px);
  display: grid;
  justify-items: start;
  gap: 14px;
}

.theory-promo-card {
  padding: clamp(20px, 3vw, 34px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border-left: 5px solid var(--primary);
}

.theory-promo-card h2,
.theory-promo-card p { margin: 0; }
.theory-promo-card h2 { margin: 7px 0 9px; }
.theory-promo-card p:last-child { color: var(--text-muted); line-height: 1.5; }
.theory-promo-card .btn { flex: 0 0 auto; }

.perfect-solution-card .case-code,
.perfect-solution-card h2,
.perfect-solution-card p {
  margin: 0;
}

.perfect-solution-card h2 {
  font-size: clamp(1.5rem, 2.5vw, 2.4rem);
  text-transform: uppercase;
}

.perfect-solution-note {
  color: var(--text-muted);
  line-height: 1.5;
}

.perfect-solution-text {
  width: 100%;
  padding: 18px;
  border: 1px solid var(--border);
  background: var(--surface-bot-message);
}

.perfect-solution-text p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
}

.back-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-bottom: 26px;
  color: var(--text-main);
  font-family: var(--mono-font);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
}

.back-link span { margin-right: 8px; color: var(--primary); font-size: 1.2rem; }
.back-link:hover { text-decoration: underline; text-underline-offset: 5px; }
.case-code, .description-label {
  font-family: var(--mono-font);
  font-size: .74rem;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.case-code { margin: 0 0 28px; color: var(--primary); }

.leaderboard-error {
  margin: 0;
  color: #b42318;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

h1 {
  margin: 0 0 22px;
  max-width: 1000px;
  font-size: clamp(2.4rem, 4.5vw, 4.5rem);
  line-height: 1.04;
  text-transform: uppercase;
}

.favorite-star {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 2rem;
  line-height: 1;
  color: var(--text-muted);
  padding: 0;
  display: grid;
  place-items: center;
  transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.favorite-star:hover {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  transform: scale(1.06);
}

.favorite-star.active {
  color: var(--primary);
}

.favorite-heart {
  width: 29px;
  height: 29px;
  fill: transparent;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: fill 0.15s ease, stroke 0.15s ease;
}

.favorite-star.active .favorite-heart {
  fill: currentColor;
  stroke: currentColor;
}

.description {
  margin: 0;
  max-width: 850px;
  font-size: clamp(1rem, 1.45vw, 1.15rem);
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.description-block {
  margin: 34px 0;
  padding: 24px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.tag {
  font-size: 0.82rem;
  padding: 4px 9px;
  border-radius: 0;
  border: 1px solid var(--border);
  background: transparent;
  font-family: var(--mono-font);
  text-transform: uppercase;
  color: var(--text-main);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.case-rating {
  margin: 0 0 24px;
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.case-rating-copy,
.case-rating-actions {
  display: grid;
  gap: 7px;
}

.case-rating-copy strong {
  font-family: var(--display-font);
  font-size: 1rem;
  line-height: 1;
}

.average-rating,
.average-stars {
  display: flex;
  align-items: center;
}

.average-rating {
  gap: 10px;
}

.average-stars {
  gap: 3px;
}

.average-stars svg {
  width: 27px;
  height: 27px;
  fill: transparent;
  stroke: var(--text-muted);
  stroke-width: 1.5;
}

.average-stars svg.filled {
  fill: var(--primary);
  stroke: var(--primary);
}

.case-rating-note,
.case-rating-status {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.rating-buttons {
  display: flex;
  gap: 3px;
}

.rating-button {
  width: 32px;
  height: 32px;
  padding: 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.rating-button svg {
  width: 100%;
  height: 100%;
  fill: transparent;
  stroke: currentColor;
  stroke-width: 1.5;
}

.rating-button:hover,
.rating-button.active {
  color: var(--primary);
}

.rating-button.active svg {
  fill: currentColor;
}

.rating-button:disabled {
  cursor: wait;
}

.tag:hover {
  color: #fff;
  border-color: var(--primary);
  background: var(--primary);
}

@media (max-width: 700px) {
  .description-block { grid-template-columns: 1fr; gap: 10px; }
  .case-rating { align-items: flex-start; flex-direction: column; }
  .theory-promo-card { align-items: stretch; flex-direction: column; }
  h1 { font-size: clamp(2.2rem, 11vw, 4rem); }
}

@media (prefers-reduced-motion: reduce) {
  .favorite-star,
  .favorite-heart {
    transition: none;
  }
}

.difficulty-tag {
  border: 1px solid var(--border);
  font-weight: 700;
}
</style>
