<template>
  <div class="container dashboard-page">
    <user-podium :users="appState.topUsers" :fallback-avatar="appState.noPhotoImage" />
    <case-catalog
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
import { appState } from '@/store/appState'

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
  methods: {
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
</style>


