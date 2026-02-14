<template>
  <div class="container home-page">
    <home-hero @open-login="$emit('open-login')" @open-register="$emit('open-register')" />
    <benefits-section />
  </div>
</template>

<script>
// HomePage.vue: публичная главная страница для неавторизованных пользователей.
import BenefitsSection from '@/components/BenefitsSection.vue'
import HomeHero from '@/components/HomeHero.vue'
import { appState } from '@/store/appState'

export default {
  name: 'HomePage',
  components: {
    BenefitsSection,
    HomeHero,
  },
  emits: ['open-login', 'open-register'],
  data() {
    return {
      appState,
    }
  },
  created() {
    if (this.appState.isAuthenticated) {
      this.$router.replace('/dashboard')
    }
  },
}
</script>

<style scoped>
.home-page {
  display: grid;
  gap: 32px;
}
</style>


