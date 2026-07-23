<template>
  <div class="container case-detail-page">
    <section v-if="caseItem" class="card detail-card">
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

      <p class="description">{{ caseItem.fullDescription }}</p>

      <div class="actions">
        <button class="btn btn-primary" type="button" @click="goToChat">Решать</button>
        <a v-if="caseItem.pdfUrl" class="btn btn-secondary" :href="caseItem.pdfUrl" target="_blank" rel="noopener">
          Полные условия (PDF)
        </a>
      </div>
    </section>

    <p v-if="leaderboardError" class="leaderboard-error">{{ leaderboardError }}</p>
    <case-leaderboard v-if="caseItem" :entries="leaderboardEntries" />

    <section v-if="!caseItem" class="card detail-card">
      <h1>Кейс не найден</h1>
      <button class="btn btn-secondary" type="button" @click="$router.push('/dashboard')">
        К списку кейсов
      </button>
    </section>
  </div>
</template>

<script>
import CaseLeaderboard from '@/components/CaseLeaderboard.vue'
import { getUserAvatarUrl, listCaseLeaderboard } from '@/api/authApi'
import { appState, getCaseById, isCaseFavorite, markCaseViewed, toggleCaseFavorite } from '@/store/appState'

export default {
  name: 'CaseDetailPage',
  components: {
    CaseLeaderboard,
  },
  data() {
    return {
      leaderboardEntries: [],
      leaderboardError: '',
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
          await this.loadLeaderboard(value)
        }
      },
    },
  },
  methods: {
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
          avatarUrl: user.userId ? getUserAvatarUrl(user.userId) : '',
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
  gap: 16px;
}

.detail-card {
  padding: 24px;
}

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
  margin: 0 0 12px;
}

.favorite-star {
  border: 0;
  background: transparent;
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
  margin: 0 0 20px;
  line-height: 1.5;
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
  border-radius: 999px;
  background: var(--surface-subtle);
}

.difficulty-tag {
  border: 1px solid var(--border);
  font-weight: 700;
}
</style>
