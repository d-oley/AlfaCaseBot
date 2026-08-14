<template>
  <div class="container case-detail-page">
    <section v-if="caseLoading" class="card detail-card">
      <p>Загружаем кейс...</p>
    </section>

    <section v-else-if="caseItem" class="card detail-card">
      <p class="case-code">Кейс / {{ caseItem.id }} / {{ caseItem.difficulty || 'Без уровня' }}</p>
      <div class="title-row">
        <h1>{{ caseItem.title }}</h1>
        <button
          class="favorite-star"
          :class="{ active: isFavorite }"
          type="button"
          :aria-label="isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'"
          @click="toggleFavorite"
        >
          ★
        </button>
      </div>

      <div class="tags">
        <span class="tag difficulty-tag">Сложность: {{ caseItem.difficulty || 'Не указана' }}</span>
        <span v-for="tag in caseItem.tags" :key="tag" class="tag">{{ tag }}</span>
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
import { getCaseAssetUrl, getCaseByIdRequest, listCaseLeaderboard } from '@/api/authApi'
import {
  appState,
  getCaseById,
  isCaseFavorite,
  markCaseViewed,
  toggleCaseFavorite,
  upsertCase,
} from '@/store/appState'

export default {
  name: 'CaseDetailPage',
  components: {
    CaseLeaderboard,
  },
  data() {
    return {
      leaderboardEntries: [],
      leaderboardError: '',
      caseLoading: false,
      caseError: '',
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
  },
  watch: {
    caseId: {
      immediate: true,
      async handler(value) {
        if (value) {
          markCaseViewed(value)
          await Promise.all([this.loadCase(value), this.loadLeaderboard(value)])
        }
      },
    },
  },
  methods: {
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
    goToChat() {
      this.$router.push(`/case/${this.caseId}/chat`)
    },
    toggleFavorite() {
      toggleCaseFavorite(this.caseId)
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
  padding: clamp(24px, 5vw, 64px);
  border-top-width: 5px;
}
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
  font-size: clamp(3rem, 7vw, 7rem);
  line-height: .87;
  text-transform: uppercase;
}

.favorite-star {
  width: 56px;
  height: 56px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  font-size: 2rem;
  line-height: 1;
  color: #b8b8b8;
  padding: 0;
}

.favorite-star.active {
  color: #f3c01c;
}

.description {
  margin: 0;
  max-width: 850px;
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  line-height: 1.55;
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
}

@media (max-width: 700px) {
  .description-block { grid-template-columns: 1fr; gap: 10px; }
  h1 { font-size: clamp(2.6rem, 14vw, 5rem); }
}

.difficulty-tag {
  border: 1px solid var(--border);
  font-weight: 700;
}
</style>
