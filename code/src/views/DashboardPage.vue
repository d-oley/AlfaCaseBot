<template>
  <div class="container dashboard-page">
    <user-podium :users="appState.topUsers" />
    <p v-if="appState.casesLoading" class="case-status">Загружаем кейсы...</p>
    <p v-else-if="appState.casesError" class="case-status error-text">{{ appState.casesError }}</p>
    <case-catalog
      v-else
      :cases="appState.cases"
      :recommended-case-id="appState.recommendedCaseId"
      @open-case="openCase"
    />
  </div>
</template>

<script>
// DashboardPage.vue: главная страница авторизованного пользователя (топ-3 + каталог кейсов).
import CaseCatalog from '@/components/CaseCatalog.vue'
import UserPodium from '@/components/UserPodium.vue'
import { getCaseAssetUrl, listLeaderboard } from '@/api/authApi'
import { appState, setLeaderboardUsers } from '@/store/appState'

export default {
  name: 'DashboardPage',
  components: {
    CaseCatalog,
    UserPodium,
  },
  data() {
    return {
      appState,
    }
  },
  created() {
    this.loadLeaderboard()
  },
  methods: {
    async loadLeaderboard() {
      try {
        const users = await listLeaderboard()
        setLeaderboardUsers(
          users.slice(0, 3).map((user, index) => ({
            id: user.userId ?? `leaderboard-${index}`,
            rank: user.placement ?? index + 1,
            login: user.nickName || 'Пользователь',
            firstName: user.firstName || '',
            lastName: '',
            city: user.cityName || '',
            points: user.score ?? 0,
            avatarUrl: getCaseAssetUrl(user.avatarUrl),
          }))
        )
      } catch {
        setLeaderboardUsers([])
      }
    },
    openCase(caseId) {
      this.$router.push(`/case/${caseId}`)
    },
  },
}
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
}

.case-status {
  margin: 0;
}
</style>


