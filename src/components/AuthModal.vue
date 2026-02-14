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
              <svg
                v-if="!showLoginPassword"
                class="eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 12C3.7 8.6 7.2 6 12 6C16.8 6 20.3 8.6 22 12C20.3 15.4 16.8 18 12 18C7.2 18 3.7 15.4 2 12Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
              </svg>
              <svg
                v-else
                class="eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path
                  d="M10.6 6.2C11.1 6.1 11.5 6 12 6C16.8 6 20.3 8.6 22 12C21.3 13.4 20.3 14.7 19 15.7"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M5 8.3C3.8 9.2 2.8 10.5 2 12C3.7 15.4 7.2 18 12 18C13.9 18 15.6 17.6 17 16.9"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
          <p v-if="loginPasswordInvalid" class="error-text">{{ passwordRuleText }}</p>

          <button class="btn btn-primary" type="submit" :disabled="isLoginDisabled || loading">
            {{ loading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h2>Регистрация</h2>
        <form class="modal-form" @submit.prevent="handleRegisterSubmit">
          <label for="register-login">Логин</label>
          <input
            id="register-login"
            v-model.trim="registerForm.login"
            type="text"
            placeholder="Введите логин"
          />
          <p v-if="registerLoginInvalid" class="error-text">{{ loginRuleText }}</p>

          <label for="register-email">Email</label>
          <input
            id="register-email"
            v-model.trim="registerForm.email"
            type="email"
            placeholder="you@example.com"
          />

          <label for="register-birthdate">Дата рождения</label>
          <input id="register-birthdate" v-model="registerForm.birthDate" type="date" />

          <label for="register-role">Статус</label>
          <select id="register-role" v-model="registerForm.role">
            <option value="" disabled>Выберите статус</option>
            <option v-for="role in roleOptions" :key="role" :value="role">
              {{ role }}
            </option>
          </select>

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
              <svg
                v-if="!showRegisterPassword"
                class="eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 12C3.7 8.6 7.2 6 12 6C16.8 6 20.3 8.6 22 12C20.3 15.4 16.8 18 12 18C7.2 18 3.7 15.4 2 12Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
              </svg>
              <svg
                v-else
                class="eye-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path
                  d="M10.6 6.2C11.1 6.1 11.5 6 12 6C16.8 6 20.3 8.6 22 12C21.3 13.4 20.3 14.7 19 15.7"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M5 8.3C3.8 9.2 2.8 10.5 2 12C3.7 15.4 7.2 18 12 18C13.9 18 15.6 17.6 17 16.9"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
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
// AuthModal.vue: модальное окно входа и регистрации с локальной валидацией формы.
import { getRoleOptions } from '@/store/appState'

const PASSWORD_REGEX = /^(?=.*[^A-Za-z0-9])[A-Za-z0-9\W]{8,}$/
const LOGIN_REGEX = /^[A-Za-z0-9]+$/

export default {
  name: 'AuthModal',
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
      showLoginPassword: false,
      showRegisterPassword: false,
      roleOptions: getRoleOptions(),
      loginForm: {
        username: '',
        password: '',
      },
      registerForm: {
        login: '',
        email: '',
        birthDate: '',
        role: '',
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
      return 'Пароль: минимум 8 символов, только латинские буквы, цифры и спецсимволы'
    },
    loginRuleText() {
      return 'Логин должен содержать только латинские буквы и цифры'
    },
    loginUsernameInvalid() {
      return this.loginForm.username.length > 0 && !this.isLoginValid(this.loginForm.username)
    },
    registerLoginInvalid() {
      return this.registerForm.login.length > 0 && !this.isLoginValid(this.registerForm.login)
    },
    loginPasswordInvalid() {
      return this.loginForm.password.length > 0 && !this.isPasswordValid(this.loginForm.password)
    },
    registerPasswordInvalid() {
      return this.registerForm.password.length > 0 && !this.isPasswordValid(this.registerForm.password)
    },
    isLoginDisabled() {
      return !this.isLoginValid(this.loginForm.username) || !this.isPasswordValid(this.loginForm.password)
    },
    isRegisterDisabled() {
      return (
        !this.isLoginValid(this.registerForm.login) ||
        !this.registerForm.email ||
        !this.registerForm.birthDate ||
        !this.registerForm.role ||
        !this.isPasswordValid(this.registerForm.password)
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
    isLoginValid(login) {
      return LOGIN_REGEX.test(login)
    },
    isPasswordValid(password) {
      return PASSWORD_REGEX.test(password)
    },
    async handleLoginSubmit() {
      if (this.isLoginDisabled || this.loading) {
        return
      }

      this.loading = true
      this.message = ''
      this.errorMessage = ''

      try {
        // TODO: После слияния проекта убрать заглушки ниже и раскомментировать реальные вызовы API.
        // const loginResult = await loginRequest({
        //   username: this.loginForm.username,
        //   password: this.loginForm.password,
        // })
        // if (!loginResult.success) {
        //   this.errorMessage = loginResult.errorText || 'Не удалось выполнить вход.'
        //   return
        // }
        // const profile = await getUserByUsername(this.loginForm.username)
        await new Promise((resolve) => setTimeout(resolve, 350))
        const profile = null

        this.$emit('login-success', {
          id: profile?.id || null,
          username: this.loginForm.username,
          login: this.loginForm.username,
          email: profile?.email || '',
          creationDate: profile?.creationDate || '',
        })
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
      this.message = ''
      this.errorMessage = ''

      try {
        // TODO: После слияния проекта убрать заглушки ниже и раскомментировать реальные вызовы API.
        // const registerResult = await registerRequest({
        //   username: this.registerForm.login,
        //   email: this.registerForm.email,
        //   password: this.registerForm.password,
        // })
        // if (!registerResult.success) {
        //   this.errorMessage = registerResult.errorText || 'Не удалось создать аккаунт.'
        //   return
        // }
        // const profile = await getUserByUsername(this.registerForm.login)
        await new Promise((resolve) => setTimeout(resolve, 350))
        const profile = null

        this.$emit('register-success', {
          id: profile?.id || null,
          username: this.registerForm.login,
          login: this.registerForm.login,
          email: this.registerForm.email,
          birthDate: this.registerForm.birthDate,
          role: this.registerForm.role,
          creationDate: profile?.creationDate || '',
        })
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
  background: rgba(8, 14, 31, 0.45);
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 16px);
}

.modal {
  position: relative;
  width: min(440px, 100%);
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
  background: #fff;
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
  background: #fff;
  width: 44px;
  height: 42px;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.eye-icon {
  width: 20px;
  height: 20px;
  color: #445779;
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


