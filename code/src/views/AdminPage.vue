<template>
  <div class="container admin-page">
    <section v-if="!isAdminAuthorized" class="card admin-login">
      <h1>Админ-панель</h1>
      <p class="hint">Вход по логину и паролю администратора.</p>
      <form class="admin-form" @submit.prevent="handleAdminLogin">
        <label for="admin-login">Логин</label>
        <input id="admin-login" v-model.trim="credentials.login" type="text" placeholder="login" />

        <label for="admin-password">Пароль</label>
        <input
          id="admin-password"
          v-model.trim="credentials.password"
          type="password"
          placeholder="password"
        />

        <p v-if="authError" class="error-text">{{ authError }}</p>
        <button class="btn btn-primary" type="submit" :disabled="isAdminAuthLoading">
          {{ isAdminAuthLoading ? 'Проверка...' : 'Войти' }}
        </button>
      </form>
    </section>

    <section v-else class="card admin-console">
      <header class="admin-topbar">
        <h1>Админ-панель</h1>
        <button class="btn btn-secondary" type="button" @click="logoutAdmin">Выйти из админки</button>
      </header>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'">
          Кейсы
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
          Пользователи
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'tags' }" @click="activeTab = 'tags'">
          Теги
        </button>
      </div>

      <p v-if="adminActionError" class="error-text">{{ adminActionError }}</p>
      <p v-if="adminActionMessage" class="success-text">{{ adminActionMessage }}</p>

      <div v-if="activeTab === 'cases'" class="panel-grid">
        <article class="card panel-card">
          <h2>Кейсы</h2>
          <div class="list">
            <div v-for="item in adminCases" :key="item.id" class="list-item">
              <div>
                <p class="title">{{ item.title }}</p>
                <p class="meta">
                  Сложность: {{ item.difficulty }} | Теги: {{ item.tags.join(', ') || 'нет' }}
                </p>
              </div>
              <div class="row-actions">
                <button class="btn btn-secondary" type="button" @click="startCaseEdit(item)">Изменить</button>
                <button class="btn btn-secondary" type="button" @click="deleteCase(item.id)">Удалить</button>
              </div>
            </div>
          </div>
        </article>

        <article class="card panel-card">
          <h2>{{ caseForm.id ? 'Изменить кейс' : 'Добавить кейс' }}</h2>
          <form class="admin-form" @submit.prevent="saveCase">
            <label for="case-title">Название</label>
            <input id="case-title" v-model.trim="caseForm.title" type="text" />

            <label for="case-slug">Slug</label>
            <input id="case-slug" v-model.trim="caseForm.slug" type="text" />

            <label for="case-title-en">Название на английском</label>
            <input id="case-title-en" v-model.trim="caseForm.titleEn" type="text" />

            <label for="case-description">Короткое описание</label>
            <input id="case-description" v-model.trim="caseForm.description" type="text" />

            <label for="case-full-description">Полное описание</label>
            <textarea id="case-full-description" v-model.trim="caseForm.fullDescription" rows="4" />

            <label for="case-difficulty">Сложность</label>
            <select id="case-difficulty" v-model="caseForm.difficulty">
              <option value="Легко">Легко</option>
              <option value="Средне">Средне</option>
              <option value="Сложно">Сложно</option>
            </select>

            <label for="case-tags">Теги через запятую</label>
            <input id="case-tags" v-model.trim="caseForm.tagsText" type="text" readonly />
            <p class="hint">Привязка тегов к кейсу временно недоступна.</p>

            <label for="case-average-minutes">Среднее время решения, мин.</label>
            <input id="case-average-minutes" v-model.number="caseForm.averageSolveMinutes" type="number" min="0" />

            <label for="case-prompt">Английский контекст для модели</label>
            <textarea id="case-prompt" v-model.trim="caseForm.promptContextEn" rows="4" />

            <label for="case-pdf">PDF</label>
            <input id="case-pdf" type="file" accept="application/pdf" @change="handleCasePdfChange" />

            <label for="case-icon">Иконка JPEG</label>
            <input id="case-icon" type="file" accept="image/jpeg,image/jpg" @change="handleCaseIconChange" />

            <label class="checkbox-row">
              <input v-model="caseForm.active" type="checkbox" />
              Опубликован
            </label>

            <div class="row-actions">
              <button class="btn btn-primary" type="submit">Сохранить</button>
              <button class="btn btn-secondary" type="button" @click="resetCaseForm">Сбросить</button>
            </div>
          </form>
        </article>
      </div>

      <div v-else-if="activeTab === 'users'" class="panel-grid single-panel">
        <article class="card panel-card">
          <h2>{{ userForm.id ? 'Изменить пользователя' : 'Добавить пользователя' }}</h2>
          <p class="hint">Для изменения или удаления введите ID пользователя.</p>

          <div class="user-id-row">
            <div class="user-id-field">
              <label for="user-id">ID пользователя</label>
              <input id="user-id" v-model.number="userForm.id" type="number" min="1" />
            </div>
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="!userForm.id || isUserLoading"
              @click="loadUserById"
            >
              {{ isUserLoading ? 'Загрузка...' : 'Загрузить профиль' }}
            </button>
          </div>

          <form class="admin-form" @submit.prevent="saveUser">
            <label for="user-login">Логин (только для нового)</label>
            <input id="user-login" v-model.trim="userForm.login" type="text" :disabled="Boolean(userForm.id)" />

            <label for="user-email">Email</label>
            <input id="user-email" v-model.trim="userForm.email" type="email" />

            <label for="user-first-name">Имя</label>
            <input id="user-first-name" v-model.trim="userForm.firstName" type="text" />

            <label for="user-last-name">Фамилия</label>
            <input id="user-last-name" v-model.trim="userForm.lastName" type="text" />

            <label for="user-middle-name">Отчество</label>
            <input id="user-middle-name" v-model.trim="userForm.middleName" type="text" />

            <template v-if="userForm.id">
              <label for="user-nickname">Никнейм</label>
              <input id="user-nickname" v-model.trim="userForm.nickName" type="text" />
            </template>

            <label for="user-status">Статус</label>
            <select id="user-status" v-model="userForm.status">
              <option value="">Не изменять</option>
              <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </option>
            </select>

            <label for="user-account-role">Роль аккаунта</label>
            <select id="user-account-role" v-model="userForm.accountRole">
              <option value="">Не изменять</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <label for="user-gender">Пол</label>
            <select id="user-gender" v-model="userForm.gender">
              <option value="">Не изменять</option>
              <option value="NOT_STATED">Не указан</option>
              <option value="FEMALE">Женский</option>
              <option value="MALE">Мужской</option>
            </select>

            <template v-if="userForm.id">
              <label for="user-verified">Подтверждение аккаунта</label>
              <select id="user-verified" v-model="userForm.isVerified">
                <option value="">Не изменять</option>
                <option :value="true">Подтверждён</option>
                <option :value="false">Не подтверждён</option>
              </select>

              <label for="user-banned-until">Блокировка до</label>
              <input id="user-banned-until" v-model="userForm.bannedUntil" type="datetime-local" />
            </template>

            <label for="user-birthdate">Дата рождения</label>
            <input id="user-birthdate" v-model="userForm.birthDate" type="date" />

            <label for="user-city">Город</label>
            <city-select
              id="user-city"
              v-model="userForm.cityId"
              :cities="cities"
              :loading="citiesLoading"
              :disabled="isUserLoading"
              :backend-error="cityLoadError"
              :selected-city-label="selectedCityLabel"
              @search-change="handleCitySearch"
            />

            <label for="user-password">Пароль (только для нового)</label>
            <input id="user-password" v-model.trim="userForm.password" type="password" :disabled="Boolean(userForm.id)" />

            <p v-if="userError" class="error-text">{{ userError }}</p>
            <p v-if="userMessage" class="success-text">{{ userMessage }}</p>

            <div class="row-actions">
              <button class="btn btn-primary" type="submit" :disabled="isUserSaving">
                {{ isUserSaving ? 'Сохранение...' : 'Сохранить' }}
              </button>
              <button class="btn btn-secondary" type="button" @click="resetUserForm">Сбросить</button>
              <button
                v-if="userForm.id"
                class="btn btn-secondary"
                type="button"
                :disabled="isUserSaving"
                @click="deleteUser"
              >
                Удалить
              </button>
            </div>
          </form>
        </article>
      </div>

      <div v-else class="panel-grid">
        <article class="card panel-card">
          <h2>Теги</h2>
          <div class="list">
            <div v-for="tag in adminTags" :key="tag.id" class="list-item">
              <div>
                <p class="title">{{ tag.name }}</p>
              </div>
              <div class="row-actions">
                <button class="btn btn-secondary" type="button" @click="startTagEdit(tag)">Изменить</button>
                <button class="btn btn-secondary" type="button" @click="deleteTag(tag.id)">Удалить</button>
              </div>
            </div>
          </div>
        </article>

        <article class="card panel-card">
          <h2>{{ tagForm.id ? 'Изменить тег' : 'Добавить тег' }}</h2>
          <form class="admin-form" @submit.prevent="saveTag">
            <label for="tag-name">Название тега</label>
            <input id="tag-name" v-model.trim="tagForm.name" type="text" />

            <div class="row-actions">
              <button class="btn btn-primary" type="submit">Сохранить</button>
              <button class="btn btn-secondary" type="button" @click="resetTagForm">Сбросить</button>
            </div>
          </form>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import CitySelect from '@/components/CitySelect.vue'
import {
  createAdminUser,
  createCaseRequest,
  createCaseTag,
  deactivateCaseTag,
  deleteAdminUser,
  getUserCityById,
  getUserProfileById,
  loginRequest,
  listAdminCases,
  listCaseTags,
  listCities,
  logoutRequest,
  parseBirthdateFromApi,
  updateAdminUser,
  updateCaseRequest,
} from '@/api/authApi'
import { appState, getRoleOptions, setCases } from '@/store/appState'

const toCaseForm = (item = null) => ({
  id: item?.id || null,
  slug: item?.slug || '',
  title: item?.title || '',
  titleEn: item?.titleEn || '',
  description: item?.description || '',
  fullDescription: item?.fullDescription || '',
  difficulty: item?.difficulty || 'Средне',
  tagsText: item?.tags?.join(', ') || '',
  averageSolveMinutes: item?.averageSolveMinutes ?? 0,
  promptContextEn: item?.promptContextEn || '',
  active: item?.active ?? true,
})

const toTagForm = (item = null) => ({
  id: item?.id || null,
  name: item?.name || '',
})

const toUserForm = (item = null) => ({
  id: item?.id ?? null,
  login: item?.login || item?.username || '',
  email: item?.email || '',
  firstName: item?.firstName || '',
  lastName: item?.lastName || '',
  middleName: item?.middleName || '',
  nickName: item?.nickName || item?.nickname || '',
  birthDate: item?.birthDate || '',
  status: item?.status || '',
  accountRole: item?.accountRole || '',
  gender: item?.gender || '',
  isVerified: item?.isVerified ?? '',
  bannedUntil: item?.bannedUntil || '',
  cityId: item?.cityId ?? null,
  city: item?.city || '',
  region: item?.region || '',
  password: '',
})

export default {
  name: 'AdminPage',
  components: { CitySelect },
  data() {
    const tags = [...new Set(appState.cases.flatMap((item) => item.tags))]
    return {
      isAdminAuthorized: false,
      isAdminAuthLoading: false,
      authError: '',
      adminActionError: '',
      adminActionMessage: '',
      credentials: {
        login: '',
        password: '',
      },
      activeTab: 'cases',
      adminCases: appState.cases.map((item) => ({ ...item, tags: [...item.tags] })),
      roleOptions: getRoleOptions(),
      cities: [],
      citiesLoading: false,
      cityLoadError: '',
      isUserLoading: false,
      isUserSaving: false,
      userError: '',
      userMessage: '',
      adminTags: tags.map((name, index) => ({ id: index + 1, name })),
      caseForm: toCaseForm(),
      casePdfFile: null,
      caseIconFile: null,
      userForm: toUserForm(),
      tagForm: toTagForm(),
    }
  },
  created() {
    this.restoreAdminSession()
  },
  computed: {
    selectedCityLabel() {
      const selectedCity = this.cities.find((item) => Number(item.id) === Number(this.userForm.cityId))
      if (selectedCity) {
        return [selectedCity.cityName, selectedCity.regionName].filter(Boolean).join(', ')
      }
      return [this.userForm.city, this.userForm.region].filter(Boolean).join(', ')
    },
  },
  methods: {
    async restoreAdminSession() {
      const isLoaded = await this.loadAdminCases()
      this.isAdminAuthorized = isLoaded
      if (isLoaded) {
        await this.loadTagsFromApi()
      } else {
        this.adminActionError = ''
      }
    },
    async handleAdminLogin() {
      if (!this.credentials.login || !this.credentials.password || this.isAdminAuthLoading) {
        this.authError = 'Введите логин и пароль.'
        return
      }

      this.isAdminAuthLoading = true
      this.authError = ''
      try {
        await loginRequest({
          username: this.credentials.login,
          password: this.credentials.password,
        })
        const isLoaded = await this.loadAdminCases()
        if (!isLoaded) {
          try {
            await logoutRequest()
          } catch {
            // Сессию мог уже отклонить backend.
          }
          throw new Error('У аккаунта нет прав администратора.')
        }
        this.isAdminAuthorized = true
        this.credentials.password = ''
        await this.loadTagsFromApi()
      } catch (error) {
        this.isAdminAuthorized = false
        this.authError = error?.message || 'Не удалось войти в админ-панель.'
      } finally {
        this.isAdminAuthLoading = false
      }
    },
    async logoutAdmin() {
      try {
        await logoutRequest()
      } catch {
        // Локальное состояние админки очищаем и при истекшей backend-сессии.
      }
      this.isAdminAuthorized = false
      this.credentials.login = ''
      this.credentials.password = ''
      this.authError = ''
    },
    async loadAdminCases() {
      this.adminActionError = ''
      try {
        this.adminCases = await listAdminCases()
        setCases(this.adminCases.filter((item) => item.active))
        return true
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось загрузить кейсы.'
        return false
      }
    },
    async loadTagsFromApi() {
      try {
        const tags = await listCaseTags()
        this.adminTags = tags.map((tag, index) => ({ ...tag, id: tag.id ?? `tag-${index}` }))
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось загрузить теги.'
      }
    },
    async loadUserById() {
      const userId = Number(this.userForm.id)
      if (!userId || this.isUserLoading) return

      this.isUserLoading = true
      this.userError = ''
      this.userMessage = ''
      try {
        const [profile, city] = await Promise.all([
          getUserProfileById(userId),
          getUserCityById(userId).catch(() => null),
        ])
        this.userForm = toUserForm({
          ...profile,
          id: userId,
          login: profile?.username,
          birthDate: parseBirthdateFromApi(profile?.birthdate || ''),
          cityId: city?.cityId ?? profile?.cityId ?? null,
          city: city?.cityName || profile?.cityName || '',
          region: city?.regionName || profile?.regionName || '',
        })
        this.userMessage = 'Профиль загружен.'
      } catch (error) {
        this.userError = error?.message || 'Не удалось загрузить пользователя.'
      } finally {
        this.isUserLoading = false
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
        this.cities = await listCities(value)
      } catch (error) {
        this.cities = []
        this.cityLoadError = error?.message || 'Не удалось загрузить города.'
      } finally {
        this.citiesLoading = false
      }
    },
    resetUserForm() {
      this.userForm = toUserForm()
      this.cities = []
      this.cityLoadError = ''
      this.userError = ''
      this.userMessage = ''
    },
    async saveUser() {
      if (this.isUserSaving) return

      const isEditing = Boolean(this.userForm.id)
      if (!isEditing && (!this.userForm.login || !this.userForm.email || !this.userForm.password)) {
        this.userError = 'Для нового пользователя заполните логин, email и пароль.'
        return
      }

      this.isUserSaving = true
      this.userError = ''
      this.userMessage = ''
      try {
        if (isEditing) {
          const payload = {
            ...(this.userForm.email ? { email: this.userForm.email } : {}),
            ...(this.userForm.firstName ? { firstName: this.userForm.firstName } : {}),
            ...(this.userForm.lastName ? { lastName: this.userForm.lastName } : {}),
            ...(this.userForm.middleName ? { middleName: this.userForm.middleName } : {}),
            ...(this.userForm.nickName ? { nickName: this.userForm.nickName } : {}),
            ...(this.userForm.birthDate
              ? { birthdate: this.formatAdminBirthdate(this.userForm.birthDate) }
              : {}),
            ...(this.userForm.status ? { status: this.userForm.status } : {}),
            ...(this.userForm.accountRole ? { role: this.userForm.accountRole } : {}),
            ...(this.userForm.gender ? { gender: this.userForm.gender } : {}),
            ...(this.userForm.isVerified !== '' ? { isVerified: this.userForm.isVerified } : {}),
            ...(this.userForm.bannedUntil ? { bannedUntil: this.userForm.bannedUntil } : {}),
            ...(this.userForm.cityId ? { cityId: this.userForm.cityId } : {}),
          }
          await updateAdminUser(this.userForm.id, payload)
          this.userMessage = 'Изменения сохранены.'
        } else {
          const response = await createAdminUser({
            username: this.userForm.login,
            password: this.userForm.password,
            email: this.userForm.email,
            firstName: this.userForm.firstName || null,
            lastName: this.userForm.lastName || null,
            middleName: this.userForm.middleName || null,
            birthdate: this.userForm.birthDate
              ? this.formatAdminBirthdate(this.userForm.birthDate)
              : null,
            status: this.userForm.status || null,
            cityId: this.userForm.cityId,
            gender: this.userForm.gender || 'NOT_STATED',
            role: this.userForm.accountRole || 'USER',
          })
          this.userForm.id = response?.id ?? null
          this.userMessage = this.userForm.id
            ? `Пользователь создан. ID: ${this.userForm.id}`
            : 'Пользователь создан.'
        }
      } catch (error) {
        this.userError = error?.message || 'Не удалось сохранить пользователя.'
      } finally {
        this.isUserSaving = false
      }
    },
    async deleteUser() {
      const userId = Number(this.userForm.id)
      if (!userId || this.isUserSaving) return
      if (!window.confirm(`Удалить пользователя ${userId}?`)) return

      this.isUserSaving = true
      this.userError = ''
      this.userMessage = ''
      try {
        await deleteAdminUser(userId)
        this.resetUserForm()
        this.userMessage = 'Пользователь удалён.'
      } catch (error) {
        this.userError = error?.message || 'Не удалось удалить пользователя.'
      } finally {
        this.isUserSaving = false
      }
    },
    formatAdminBirthdate(value) {
      if (!value || !value.includes('-')) return value
      const [year, month, day] = value.split('-')
      return `${day}.${month}.${year}`
    },
    startCaseEdit(item) {
      this.adminActionError = ''
      this.adminActionMessage = ''
      this.caseForm = toCaseForm(item)
      this.casePdfFile = null
      this.caseIconFile = null
    },
    resetCaseForm() {
      this.caseForm = toCaseForm()
      this.casePdfFile = null
      this.caseIconFile = null
    },
    handleCasePdfChange(event) {
      this.casePdfFile = event.target.files?.[0] || null
    },
    handleCaseIconChange(event) {
      this.caseIconFile = event.target.files?.[0] || null
    },
    async saveCase() {
      this.adminActionError = ''
      this.adminActionMessage = ''
      if (!this.caseForm.slug || !this.caseForm.title || !this.caseForm.description) {
        this.adminActionError = 'Заполните slug, название и краткое описание.'
        return
      }

      try {
        const files = { pdfFile: this.casePdfFile, iconFile: this.caseIconFile }
        if (this.caseForm.id) {
          await updateCaseRequest(this.caseForm.id, this.caseForm, files)
        } else {
          await createCaseRequest(this.caseForm, files)
        }
        await this.loadAdminCases()
        this.resetCaseForm()
        this.adminActionMessage = 'Кейс сохранён.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось сохранить кейс.'
      }
    },
    async deleteCase(caseId) {
      this.adminActionError = ''
      this.adminActionMessage = ''
      const item = this.adminCases.find((caseItem) => Number(caseItem.id) === Number(caseId))
      if (!item) return
      try {
        await updateCaseRequest(caseId, { ...item, active: false })
        await this.loadAdminCases()
        this.adminActionMessage = 'Кейс снят с публикации.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось скрыть кейс.'
      }
    },
    startTagEdit(tag) {
      this.tagForm = toTagForm(tag)
    },
    resetTagForm() {
      this.tagForm = toTagForm()
    },
    async saveTag() {
      this.adminActionError = ''
      this.adminActionMessage = ''
      if (this.tagForm.id) {
        this.adminActionError = 'Переименование тегов пока недоступно.'
        return
      }
      try {
        await createCaseTag(this.tagForm.name)
        await this.loadTagsFromApi()
        this.resetTagForm()
        this.adminActionMessage = 'Тег создан.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось создать тег.'
      }
    },
    async deleteTag(tagId) {
      this.adminActionError = ''
      this.adminActionMessage = ''
      if (!Number.isFinite(Number(tagId))) {
        this.adminActionError = 'Тег нельзя деактивировать: не получен его идентификатор.'
        return
      }
      try {
        await deactivateCaseTag(tagId)
        await this.loadTagsFromApi()
        this.adminActionMessage = 'Тег деактивирован.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось деактивировать тег.'
      }
    },
  },
}
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-login,
.admin-console {
  padding: 20px;
}

h1,
h2 {
  margin: 0 0 10px;
}

.hint {
  margin: 0 0 14px;
  color: var(--text-muted);
}

.admin-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-btn {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-main);
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 600;
}

.tab-btn.active {
  border-color: var(--tab-active-border);
  background: var(--surface-tab-active);
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.single-panel {
  grid-template-columns: minmax(0, 720px);
}

.user-id-row {
  display: flex;
  align-items: end;
  gap: 10px;
  margin-bottom: 14px;
}

.user-id-field {
  flex: 1;
  display: grid;
  gap: 6px;
}

.panel-card {
  padding: 16px;
}

.section-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.list {
  display: grid;
  gap: 8px;
}

.list-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.title {
  margin: 0;
  font-weight: 700;
}

.meta {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.admin-form {
  display: grid;
  gap: 8px;
}

.admin-form input,
.admin-form textarea,
.admin-form select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-main);
  padding: 10px 12px;
  font-size: 0.95rem;
}

.checkbox-row {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  cursor: pointer;
  font-weight: 600;
}

.admin-form .checkbox-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  accent-color: var(--primary);
  cursor: pointer;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error-text {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #be2a2a;
}

.success-text {
  margin: 6px 0 0;
  font-size: 0.9rem;
  color: #2a5c17;
}

@media (max-width: 980px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .user-id-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
