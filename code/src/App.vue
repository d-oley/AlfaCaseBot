<template>
  <div class="app-shell">
    <app-header
      :is-authenticated="appState.isAuthenticated"
      :login="appState.user.login"
      @open-login="openModal('login')"
      @open-register="openModal('register')"
      @logout="handleLogout"
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
  </div>
</template>

<script>
// главынй компонент приложения:
// - отображает общий каркас (хедер, контент, футер)
// - управляет модальными окнами входа/регистрации
// - связывает результат авторизации с глобальным состоянием
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import AuthModal from './components/AuthModal.vue'
import { appState, loginUser, logoutUser, registerUser } from './store/appState'

export default {
  name: 'App',
  components: {
    AppFooter,
    AppHeader,
    AuthModal,
  },
  data() {
    return {
      activeModal: null,
      appState,
    }
  },
  methods: {
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
    handleLogout() {
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
    linear-gradient(160deg, var(--bg-main) 0%, #eef5ff 50%, #f7faff 100%);
}
</style>

