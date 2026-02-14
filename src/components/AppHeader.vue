<template>
  <header class="header">
    <div class="container header-inner">
      <router-link class="brand" :to="homeRoute">
        <img class="brand-logo" :src="logoSrc" alt="Логотип AlfaCaseBot" />
        <span class="brand-text">AlfaCaseBot</span>
      </router-link>

      <nav class="nav">
        <router-link class="nav-link" :to="homeRoute">Главная</router-link>
        <router-link v-if="isAuthenticated" class="nav-link" to="/profile">Личный кабинет</router-link>
      </nav>

      <div v-if="!isAuthenticated" class="header-actions">
        <button class="btn btn-secondary" type="button" @click="$emit('open-login')">
          Войти
        </button>
        <button class="btn btn-primary" type="button" @click="$emit('open-register')">
          Зарегистрироваться
        </button>
      </div>
      <div v-else class="header-actions header-actions-auth">
        <span class="user-login">{{ login || 'Пользователь' }}</span>
        <button class="btn btn-secondary" type="button" @click="$emit('logout')">Выйти</button>
      </div>
    </div>
  </header>
</template>

<script>
// AppHeader.vue: шапка приложения с навигацией и действиями входа/выхода.
import logoSrc from '@/assets/logo.png'

export default {
  name: 'AppHeader',
  props: {
    isAuthenticated: {
      type: Boolean,
      default: false,
    },
    login: {
      type: String,
      default: '',
    },
  },
  emits: ['open-login', 'open-register', 'logout'],
  data() {
    return {
      logoSrc,
    }
  },
  computed: {
    homeRoute() {
      return this.isAuthenticated ? '/dashboard' : '/'
    },
  },
}
</script>

<style scoped>
.header {
  border-bottom: 1px solid var(--border);
  background: #ffffffd9;
  backdrop-filter: blur(5px);
}

.header-inner {
  min-height: 74px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-logo {
  width: 36px;
  height: 36px;
  object-fit: cover;
}

.brand-text {
  font-weight: 700;
  font-size: 1.08rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 18px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
}

.nav-link.router-link-exact-active {
  color: var(--text-main);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-actions-auth {
  align-items: center;
}

.user-login {
  font-weight: 700;
}

@media (max-width: 900px) {
  .header-inner {
    flex-wrap: wrap;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .nav {
    order: 3;
    width: 100%;
  }
}

@media (max-width: 560px) {
  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }
}
</style>
