<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal card">
      <button class="modal-close" type="button" aria-label="Закрыть" @click="handleClose">
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
              <span class="eye-icon">{{ showLoginPassword ? '🐵' : '🙈' }}</span>
            </button>
          </div>

          <button class="btn btn-primary" type="submit" :disabled="isLoginDisabled || loading">
            {{ loading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
      </template>

      <template v-else-if="isEmailVerification">
        <h2>Подтвердите email</h2>
        <form class="modal-form" @submit.prevent="handleVerificationSubmit">
          <p class="verification-hint">
            Мы отправили шестизначный код на {{ pendingVerification.email }}.
          </p>

          <label for="verification-code">Код из письма</label>
          <input
            id="verification-code"
            v-model.trim="verificationCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="123456"
          />

          <button class="btn btn-primary" type="submit" :disabled="!isVerificationCodeValid || loading">
            {{ loading ? 'Проверяем...' : 'Подтвердить и войти' }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="loading" @click="handleResendVerification">
            Отправить код ещё раз
          </button>
          <button class="btn btn-secondary" type="button" :disabled="loading" @click="resetVerification">
            Изменить данные регистрации
          </button>
          <button class="btn btn-link" type="button" :disabled="loading" @click="switchToLogin">
            Войти в другой аккаунт
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
              <span class="eye-icon">{{ showRegisterPassword ? '🐵' : '🙈' }}</span>
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
  getCurrentUserProfile,
  listCities,
  isBannedError,
  loginRequest,
  logoutRequest,
  mapApiProfileToState,
  registerRequest,
  resendVerificationEmail,
  verifyEmail,
} from '@/api/authApi'
import { getRoleOptions } from '@/store/appState'

const USERNAME_REGEX = /^\S{3,20}$/
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[!@#$%^&*()_\-+=;:/?|\\<>{}[\]])[\S]{8,30}$/

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
  emits: ['close', 'switch-mode', 'login-success', 'register-success', 'account-banned'],
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
      pendingVerification: null,
      verificationCode: '',
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
    isEmailVerification() {
      return Boolean(this.pendingVerification)
    },
    isVerificationCodeValid() {
      return /^\d{6}$/.test(this.verificationCode)
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
    resetVerification() {
      this.pendingVerification = null
      this.verificationCode = ''
    },
    handleClose() {
      this.$emit('close')
    },
    async clearPreAuthSession() {
      try {
        await logoutRequest()
      } catch {
        // The cookie can already be expired; local flow may continue.
      }
    },
    async switchToLogin() {
      if (this.loading) return

      this.loading = true
      this.resetMessages()
      await this.clearPreAuthSession()
      this.resetVerification()
      this.loading = false
      this.$emit('switch-mode', 'login')
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
    buildPendingVerification() {
      return {
        username: this.registerForm.login,
        password: this.registerForm.password,
        email: this.registerForm.email,
        profile: this.buildFallbackProfile({
          username: this.registerForm.login,
          login: this.registerForm.login,
          nickname: this.registerForm.login,
          email: this.registerForm.email,
          birthDate: this.registerForm.birthDate,
          role: this.registerForm.role,
          cityId: this.registerForm.cityId,
        }),
      }
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

      if (
        this.pendingVerification &&
        this.loginForm.username === this.pendingVerification.username
      ) {
        this.$emit('switch-mode', 'register')
        return
      }

      this.loading = true
      this.resetMessages()

      try {
        const credentials = {
          username: this.loginForm.username,
          password: this.loginForm.password,
        }

        if (this.pendingVerification) {
          await this.clearPreAuthSession()
          this.resetVerification()
        }

        try {
          await loginRequest(credentials)
        } catch (error) {
          const backendError = error?.body?.errorText
          const isStalePreAuthSession =
            backendError === 'You are already logged in' ||
            error?.message === 'Сначала выйдите из текущего аккаунта'

          if (!isStalePreAuthSession) throw error

          await this.clearPreAuthSession()
          await loginRequest(credentials)
        }
        const profile = await getCurrentUserProfile()

        this.$emit(
          'login-success',
          mapApiProfileToState(profile, this.buildFallbackProfile({
            username: this.loginForm.username,
            login: this.loginForm.username,
            nickname: this.loginForm.username,
          }))
        )
        this.message = 'Успешный вход.'
      } catch (error) {
        if (isBannedError(error)) {
          this.$emit('account-banned', error?.body?.errorText || error?.message)
          return
        }
        const message = error?.message || 'Не удалось выполнить вход.'
        this.errorMessage = message.includes('CORS') || message.includes('ERR_') 
          ? 'Не удалось выполнить вход. Попробуйте ещё раз.'
          : message
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
        const result = await registerRequest({
          username: this.registerForm.login,
          email: this.registerForm.email,
          password: this.registerForm.password,
          birthdate: formatBirthdateForApi(this.registerForm.birthDate),
          status: this.registerForm.role,
          cityId: this.registerForm.cityId,
          validationMethod: 'EMAIL',
        })

        if (!result?.id) {
          throw new Error('Не удалось начать подтверждение email.')
        }

        this.pendingVerification = {
          ...this.buildPendingVerification(),
          id: result.id,
        }
        this.verificationCode = ''
        this.message = 'Код подтверждения отправлен на email.'
      } catch (error) {
        const backendError = error?.body?.errorText
        if (
          backendError === 'This email address is already taken' ||
          backendError === 'This username is already taken'
        ) {
          this.pendingVerification = this.buildPendingVerification()
          this.verificationCode = ''
          this.message = 'Аккаунт уже создан. Введите ранее отправленный код подтверждения.'
          return
        }
        const message = error?.message || 'Не удалось зарегистрироваться.'
        this.errorMessage = message.includes('CORS') || message.includes('ERR_') 
          ? 'Не удалось зарегистрироваться. Попробуйте ещё раз.'
          : message
      } finally {
        this.loading = false
      }
    },
    async handleVerificationSubmit() {
      if (!this.isVerificationCodeValid || !this.pendingVerification || this.loading) {
        return
      }

      this.loading = true
      this.resetMessages()

      try {
        await verifyEmail({
          verification: Number(this.verificationCode),
        })
        await loginRequest({
          username: this.pendingVerification.username,
          password: this.pendingVerification.password,
        })
        const profile = await getCurrentUserProfile()
        const user = mapApiProfileToState(profile, this.pendingVerification.profile)

        this.resetVerification()
        this.$emit('register-success', user)
        this.message = 'Email подтвержден. Аккаунт успешно создан.'
      } catch (error) {
        const message = error?.message || 'Не удалось подтвердить email.'
        this.errorMessage = message.includes('CORS') || message.includes('ERR_')
          ? 'Не удалось подтвердить email. Попробуйте ещё раз.'
          : message
      } finally {
        this.loading = false
      }
    },
    async handleResendVerification() {
      if (!this.pendingVerification || this.loading) return

      this.loading = true
      this.resetMessages()
      try {
        const result = await resendVerificationEmail({
          username: this.pendingVerification.username,
          email: this.pendingVerification.email,
          password: this.pendingVerification.password,
        })
        this.pendingVerification = {
          ...this.pendingVerification,
          id: result?.id || this.pendingVerification.id,
        }
        this.verificationCode = ''
        this.message = 'Новый код подтверждения отправлен на email.'
      } catch (error) {
        this.errorMessage = error?.message || 'Не удалось повторно отправить код.'
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
  max-height: calc(100vh - 24px);
  max-height: calc(100dvh - 24px);
  padding: clamp(18px, 3vw, 24px);
  border-radius: 0;
  box-shadow: 10px 10px 0 var(--primary);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.modal h2 {
  margin: 0 0 18px;
  font-size: clamp(1.2rem, 2.7vw, 1.45rem);
}

.modal-close {
  position: sticky;
  top: 0;
  z-index: 2;
  float: right;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 0;
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
  border-radius: 0;
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
  border-radius: 0;
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

.modal-form .btn-link {
  margin-top: 2px;
  border: 0;
  background: transparent;
  color: var(--primary);
  padding: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.modal-form .btn-link:disabled {
  cursor: default;
  opacity: 0.6;
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
