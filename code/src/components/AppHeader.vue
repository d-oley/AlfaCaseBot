<template>
  <header class="header">
    <div class="container header-inner">
      <router-link class="brand" :to="homeRoute">
        <img class="brand-logo" :src="logoSrc" alt="Логотип Alfa" />
        <span class="brand-text">AlfaCaseBot</span>
      </router-link>

      <nav class="nav">
        <router-link class="nav-link" :to="homeRoute">Главная</router-link>
        <router-link v-if="isAuthenticated" class="nav-link" to="/profile">Личный кабинет</router-link>
      </nav>

      <div class="header-controls">
        <button
          class="theme-toggle"
          type="button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="$emit('toggle-theme')"
        >
          <svg
            v-if="theme === 'dark'"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M12 2.8V5.2M12 18.8V21.2M21.2 12H18.8M5.2 12H2.8M18.5 5.5L16.8 7.2M7.2 16.8L5.5 18.5M18.5 18.5L16.8 16.8M7.2 7.2L5.5 5.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M20 14.7C19.2 15 18.4 15.2 17.5 15.2C13.8 15.2 10.8 12.2 10.8 8.5C10.8 7.6 11 6.8 11.3 6C8.1 6.4 5.6 9.1 5.6 12.4C5.6 16 8.6 19 12.2 19C15.5 19 18.2 16.5 18.6 13.3C18.9 13.8 19.4 14.3 20 14.7Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </button>

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
          <span class="user-rank">Место: #{{ userRank }}</span>
          <button class="btn btn-secondary" type="button" @click="$emit('logout')">Выйти</button>
        </div>
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
    userRank: {
      type: Number,
      default: null,
    },
    theme: {
      type: String,
      default: 'light',
    },
  },
  emits: ['open-login', 'open-register', 'logout', 'toggle-theme'],
  data() {
    return {
      logoSrc,
    }
  },
  computed: {
    homeRoute() {
      return this.isAuthenticated ? '/dashboard' : '/'
    },
    themeToggleLabel() {
      return this.theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'
    },
  },
}
</script>

<style scoped>
.header {
  border-bottom: 1px solid var(--border);
  background: var(--header-bg);
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-main);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
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

.user-rank {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  font-size: 0.85rem;
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
  .header-controls {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }
}
</style>
