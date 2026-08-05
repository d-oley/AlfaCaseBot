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

    <section v-if="appState.banNotice" class="ban-notice" role="alert">
      <div>
        <strong>Аккаунт заблокирован</strong>
        <p>{{ appState.banNotice.message }}</p>
      </div>
      <button type="button" aria-label="Закрыть уведомление о блокировке" @click="clearBanNotice">
        ×
      </button>
    </section>

    <main class="app-main">
      <router-view @open-login="openModal('login')" @open-register="openModal('register')" />
    </main>

    <app-footer />

    <auth-modal
      :mode="activeModal"
      @close="closeModal"
      @login-success="handleLoginSuccess"
      @register-success="handleRegisterSuccess"
      @account-banned="handleAccountBanned"
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
import { getCurrentUserProfile, listCases, logoutRequest, mapApiProfileToState } from './api/authApi'
import {
  appState,
  clearBanNotice,
  loginUser,
  logoutUser,
  registerUser,
  skipUserPreferences,
  showBanNotice,
  updateUserPreferences,
  getDifficultyPreferenceOptions,
  getPreferenceTagOptions,
  setCases,
  setCasesError,
  setCasesLoading,
} from './store/appState'

export default {
  name: 'App',
  components: { AppFooter, AppHeader, AuthModal, PreferenceModal },
  data() {
    return {
      activeModal: null,
      appState,
      theme: localStorage.getItem('theme') || 'light',
      difficultyPreferenceOptions: getDifficultyPreferenceOptions(),
    }
  },
  computed: {
    preferenceTagOptions() {
      return getPreferenceTagOptions()
    },
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
    this.loadCases()
    this.validateStoredSession()
  },
  methods: {
    async loadCases() {
      setCasesLoading(true)
      setCasesError('')
      try {
        setCases(await listCases())
      } catch (error) {
        setCases([])
        setCasesError(error?.message || 'Не удалось загрузить кейсы.')
      } finally {
        setCasesLoading(false)
      }
    },
    async validateStoredSession() {
      try {
        const profile = await getCurrentUserProfile()
        loginUser(mapApiProfileToState(profile, this.appState.user))
      } catch {
        if (this.appState.isAuthenticated) {
          logoutUser()
        }
        if (this.$route.meta.requiresAuth) {
          this.$router.replace('/')
        }
      }
    },
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
      clearBanNotice()
      loginUser(payload)
      this.closeModal()
      this.$router.push('/dashboard')
    },
    handleRegisterSuccess(payload) {
      registerUser(payload)
      this.closeModal()
      this.$router.push('/dashboard')
    },
    handleAccountBanned(message) {
      showBanNotice(message)
      this.closeModal()
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

.ban-notice {
  width: min(1120px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 12px 14px;
  border: 1px solid #f5a3a3;
  border-radius: 12px;
  background: #fff1f0;
  color: #7a1212;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.ban-notice strong,
.ban-notice p {
  margin: 0;
}

.ban-notice p {
  margin-top: 4px;
}

.ban-notice button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.35rem;
  line-height: 1;
}
</style>
