<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal card">
      <button class="modal-close" type="button" aria-label="Закрыть" @click="$emit('close')">
        ×
      </button>

      <template v-if="isLogin">
        <h2>Вход</h2>
        <form class="modal-form" @submit.prevent="handleLoginSubmit">
          <label for="login-username">Логин</label>
          <input id="login-username" v-model.trim="loginForm.username" type="text" placeholder="Введите логин" />
          <p v-if="loginUsernameInvalid" class="error-text">{{ loginRuleText }}</p>

          <label for="login-password">Пароль</label>
          <div class="password-field">
            <input
              id="login-password"
              v-model.trim="loginForm.password"
              :type="showLoginPassword ? 'text' : 'password'"
              placeholder="Введите пароль"
              minlength="8"
              autocomplete="current-password"
            />
            <button
              class="toggle-password"
              type="button"
              :aria-label="showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'"
              @click="showLoginPassword = !showLoginPassword"
            >
              <span class="eye-icon">{{ showLoginPassword ? '🙈' : '👁' }}</span>
            </button>
          </div>

          <button class="btn btn-primary" type="submit" :disabled="isLoginDisabled || loading">
            {{ loading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h2>Регистрация</h2>
        <form class="modal-form" @submit.prevent="handleRegisterSubmit">
          <label for="register-login">Логин</label>
          <input id="register-login" v-model.trim="registerForm.login" type="text" placeholder="Введите логин" />
          <p v-if="registerLoginInvalid" class="error-text">{{ loginRuleText }}</p>

          <label for="register-email">Email</label>
          <input id="register-email" v-model.trim="registerForm.email" type="email" placeholder="you@example.com" />

          <label for="register-birthdate">Дата рождения</label>
          <input id="register-birthdate" v-model="registerForm.birthDate" type="date" />

          <label for="register-role">Статус</label>
          <select id="register-role" v-model="registerForm.role">
            <option value="" disabled>Выберите статус</option>
            <option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>

          <label for="register-city">Город</label>
          <city-select
            id="register-city"
            v-model="registerForm.cityId"
            :cities="cities"
            :loading="citiesLoading"
            :disabled="loading"
            :backend-error="cityLoadError"
            :selected-city-label="selectedCityLabel"
            @search-change="handleCitySearch"
          />

          <label for="register-password">Пароль</label>
          <div class="password-field">
            <input
              id="register-password"
              v-model.trim="registerForm.password"
              :type="showRegisterPassword ? 'text' : 'password'"
              placeholder="Придумайте пароль"
              minlength="8"
              autocomplete="new-password"
            />
            <button
              class="toggle-password"
              type="button"
              :aria-label="showRegisterPassword ? 'Скрыть пароль' : 'Показать пароль'"
              @click="showRegisterPassword = !showRegisterPassword"
            >
              <span class="eye-icon">{{ showRegisterPassword ? '🙈' : '👁' }}</span>
            </button>
          </div>
          <p v-if="registerPasswordInvalid" class="error-text">{{ passwordRuleText }}</p>

          <button class="btn btn-primary" type="submit" :disabled="isRegisterDisabled || loading">
            {{ loading ? 'Регистрация...' : 'Создать аккаунт' }}
          </button>
        </form>
      </template>

      <p v-if="errorMessage" class="error-text global-error">{{ errorMessage }}</p>
      <p v-if="message" class="modal-message">{{ message }}</p>
    </div>
  </div>
</template>

<script>
import CitySelect from '@/components/CitySelect.vue'
import {
  formatBirthdateForApi,
  getUserByUsername,
  listCities,
  loginRequest,
  parseBirthdateFromApi,
  registerRequest,
} from '@/api/authApi'
import { getRoleOptions } from '@/store/appState'

const USERNAME_REGEX = /^\S{3,20}$/
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[!@#$%^&*()_\-+=;:/?|\\<>{}[\]])[\S]{8,30}$/

const mapApiProfileToState = (profile, fallback = {}) => ({
  id: profile?.id || fallback.id || null,
  username: profile?.username || fallback.username || '',
  login: profile?.nickname || profile?.username || fallback.login || fallback.username || '',
  nickname: profile?.nickname || profile?.username || fallback.login || fallback.username || '',
  email: profile?.email || fallback.email || '',
  firstName: fallback.firstName || '',
  lastName: fallback.lastName || '',
  birthDate: parseBirthdateFromApi(profile?.birthdate || fallback.birthDate || ''),
  role: profile?.status || fallback.role || '',
  cityId: profile?.cityId ?? fallback.cityId ?? null,
  city: profile?.city || fallback.city || '',
  region: profile?.region || fallback.region || '',
  creationDate: profile?.creationDate || fallback.creationDate || '',
})

const isRestrictedProfileLookupError = (error) => {
  const status = Number(error?.status || 0)
  return status === 401 || status === 403
}

export default {
  name: 'AuthModal',
  components: {
    CitySelect,
  },
  props: {
    mode: {
      type: String,
      default: null,
    },
  },
  emits: ['close', 'login-success', 'register-success'],
  data() {
    return {
      message: '',
      errorMessage: '',
      loading: false,
      citiesLoading: false,
      cityLoadError: '',
      showLoginPassword: false,
      showRegisterPassword: false,
      roleOptions: getRoleOptions(),
      cities: [],
      loginForm: {
        username: '',
        password: '',
      },
      registerForm: {
        login: '',
        email: '',
        birthDate: '',
        role: '',
        cityId: null,
        password: '',
      },
    }
  },
  computed: {
    isOpen() {
      return this.mode === 'login' || this.mode === 'register'
    },
    isLogin() {
      return this.mode === 'login'
    },
    passwordRuleText() {
      return 'Пароль: 8-30 символов, минимум одна цифра и один спецсимвол'
    },
    loginRuleText() {
      return 'Логин: 3-20 символов, без пробелов'
    },
    loginUsernameInvalid() {
      return this.loginForm.username.length > 0 && !this.isUsernameValid(this.loginForm.username)
    },
    registerLoginInvalid() {
      return this.registerForm.login.length > 0 && !this.isUsernameValid(this.registerForm.login)
    },
    registerPasswordInvalid() {
      return this.registerForm.password.length > 0 && !this.isRegisterPasswordValid(this.registerForm.password)
    },
    selectedCityLabel() {
      const selectedCity = this.cities.find((item) => Number(item.id) === Number(this.registerForm.cityId))
      return selectedCity ? [selectedCity.cityName, selectedCity.regionName].filter(Boolean).join(', ') : ''
    },
    isLoginDisabled() {
      return !this.isUsernameValid(this.loginForm.username) || !this.isLoginPasswordValid(this.loginForm.password)
    },
    isRegisterDisabled() {
      return (
        !this.isUsernameValid(this.registerForm.login) ||
        !this.registerForm.email ||
        !this.registerForm.birthDate ||
        !this.registerForm.role ||
        !this.registerForm.cityId ||
        !this.isRegisterPasswordValid(this.registerForm.password)
      )
    },
  },
  watch: {
    mode() {
      this.message = ''
      this.errorMessage = ''
    },
  },
  methods: {
    resetMessages() {
      this.message = ''
      this.errorMessage = ''
    },
    buildFallbackProfile(overrides = {}) {
      const selectedCity = this.cities.find((item) => Number(item.id) === Number(overrides.cityId))
      return mapApiProfileToState(null, {
        ...overrides,
        cityId: overrides.cityId ?? null,
        city: selectedCity?.cityName || overrides.city || '',
        region: selectedCity?.regionName || overrides.region || '',
      })
    },
    async handleCitySearch(value) {
      this.cityLoadError = ''

      if (!value || value.trim().length < 2) {
        this.cities = []
        return
      }

      this.citiesLoading = true
      try {
        const cities = await listCities(value)
        this.cities = Array.isArray(cities) ? cities : []
      } catch (error) {
        this.cities = []
        this.cityLoadError = error?.message || 'Не удалось загрузить список городов.'
      } finally {
        this.citiesLoading = false
      }
    },
    isUsernameValid(username) {
      return USERNAME_REGEX.test(username)
    },
    isLoginPasswordValid(password) {
      return Boolean(password && password.trim())
    },
    isRegisterPasswordValid(password) {
      return PASSWORD_REGEX.test(password)
    },
    async handleLoginSubmit() {
      if (this.isLoginDisabled || this.loading) {
        return
      }

      this.loading = true
      this.resetMessages()

      try {
        await loginRequest({
          username: this.loginForm.username,
          password: this.loginForm.password,
        })

        let profile = null
        try {
          profile = await getUserByUsername(this.loginForm.username)
        } catch (error) {
          if (!isRestrictedProfileLookupError(error)) {
            throw error
          }
        }

        this.$emit(
          'login-success',
          profile
            ? mapApiProfileToState(profile, {
                username: this.loginForm.username,
                login: profile?.nickname || this.loginForm.username,
              })
            : this.buildFallbackProfile({
                username: this.loginForm.username,
                login: this.loginForm.username,
                nickname: this.loginForm.username,
              })
        )
        this.message = 'Успешный вход.'
      } catch (error) {
        this.errorMessage = error?.message || 'Ошибка подключения к серверу.'
      } finally {
        this.loading = false
      }
    },
    async handleRegisterSubmit() {
      if (this.isRegisterDisabled || this.loading) {
        return
      }

      this.loading = true
      this.resetMessages()

      try {
        await registerRequest({
          username: this.registerForm.login,
          email: this.registerForm.email,
          password: this.registerForm.password,
          birthdate: formatBirthdateForApi(this.registerForm.birthDate),
          status: this.registerForm.role,
          cityId: this.registerForm.cityId,
        })

        this.$emit(
          'register-success',
          this.buildFallbackProfile({
            username: this.registerForm.login,
            login: this.registerForm.login,
            nickname: this.registerForm.login,
            email: this.registerForm.email,
            birthDate: this.registerForm.birthDate,
            role: this.registerForm.role,
            cityId: this.registerForm.cityId,
          })
        )
        this.message = 'Аккаунт успешно создан.'
      } catch (error) {
        this.errorMessage = error?.message || 'Ошибка подключения к серверу.'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 16px);
  z-index: 40;
}

.modal {
  position: relative;
  width: min(480px, 100%);
  padding: clamp(18px, 3vw, 24px);
  border-radius: 16px;
}

.modal h2 {
  margin: 0 0 18px;
  font-size: clamp(1.2rem, 2.7vw, 1.45rem);
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--secondary-bg);
  color: var(--text-main);
  cursor: pointer;
  font-size: 1.1rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-form label {
  margin-top: 6px;
  font-weight: 600;
  font-size: 0.9rem;
}

.modal-form input,
.modal-form select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--input-bg);
  color: var(--text-main);
}

.password-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.toggle-password {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  width: 44px;
  height: 42px;
  padding: 0;
  color: var(--text-main);
  cursor: pointer;
}

.eye-icon {
  font-size: 1rem;
}

.modal-form .btn {
  margin-top: 14px;
}

.error-text {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #be2a2a;
}

.global-error {
  margin-top: 12px;
}

.modal-message {
  margin: 10px 0 0;
  color: #2a5c17;
  font-weight: 600;
}

@media (max-width: 520px) {
  .password-field {
    grid-template-columns: 1fr;
  }
}
</style>
