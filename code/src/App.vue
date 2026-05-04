<template>
  <div class="app-shell">
    <app-header
      :is-authenticated="appState.isAuthenticated"
      :login="appState.user.login"
      :user-rank="appState.user.rank"
      :theme="theme"
      @open-login="openModal('login')"
      @open-register="openModal('register')"
      @logout="handleLogout"
      @toggle-theme="toggleTheme"
    />

    <main class="app-main">
      <router-view @open-login="openModal('login')" @open-register="openModal('register')" />
    </main>

    <app-footer />

    <auth-modal
      :mode="activeModal"
      @close="closeModal"
      @login-success="handleLoginSuccess"
      @register-success="handleRegisterSuccess"
    />

    <preference-modal
      :is-open="shouldShowPreferenceModal"
      :initial-preferences="appState.user.preferences"
      :tag-options="preferenceTagOptions"
      :difficulty-options="difficultyPreferenceOptions"
      @save="handlePreferenceSave"
      @skip="handlePreferenceSkip"
    />
  </div>
</template>

<script>
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import AuthModal from './components/AuthModal.vue'
import PreferenceModal from './components/PreferenceModal.vue'
import { logoutRequest } from './api/authApi'
import {
  appState,
  loginUser,
  logoutUser,
  registerUser,
  skipUserPreferences,
  updateUserPreferences,
  getDifficultyPreferenceOptions,
  getPreferenceTagOptions,
} from './store/appState'

export default {
  name: 'App',
  components: { AppFooter, AppHeader, AuthModal, PreferenceModal },
  data() {
    return {
      activeModal: null,
      appState,
      theme: localStorage.getItem('theme') || 'light',
      preferenceTagOptions: getPreferenceTagOptions(),
      difficultyPreferenceOptions: getDifficultyPreferenceOptions(),
    }
  },
  computed: {
    shouldShowPreferenceModal() {
      return (
        this.appState.isAuthenticated &&
        this.appState.shouldShowPreferencesOnboarding &&
        this.$route.name === 'dashboard'
      )
    },
  },
  created() {
    document.documentElement.setAttribute('data-theme', this.theme)
  },
  methods: {
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', this.theme)
      localStorage.setItem('theme', this.theme)
    },
    openModal(type) {
      this.activeModal = type
    },
    closeModal() {
      this.activeModal = null
    },
    handleLoginSuccess(payload) {
      loginUser(payload)
      this.closeModal()
      this.$router.push('/dashboard')
    },
    handleRegisterSuccess(payload) {
      registerUser(payload)
      this.closeModal()
      this.$router.push('/dashboard')
    },
    handlePreferenceSave(payload) {
      updateUserPreferences(payload)
    },
    handlePreferenceSkip() {
      skipUserPreferences()
    },
    async handleLogout() {
      try {
        await logoutRequest()
      } catch {
        // OK if session already ended
      }
      logoutUser()
      this.$router.push('/')
    },
  },
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  padding: clamp(12px, 3vw, 24px) 0;
  background:
    radial-gradient(circle at top right, var(--bg-accent), transparent 35%),
    linear-gradient(160deg, var(--bg-main) 0%, var(--bg-main-mid) 50%, var(--bg-main-end) 100%);
}
</style>
