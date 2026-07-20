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

            <label for="case-description">Короткое описание</label>
            <input id="case-description" v-model.trim="caseForm.description" type="text" />

            <label for="case-full-description">Полное описание</label>
            <textarea id="case-full-description" v-model.trim="caseForm.fullDescription" rows="4" />

            <label for="case-difficulty">Сложность</label>
            <select id="case-difficulty" v-model="caseForm.difficulty">
              <option value="Легкий">Легкий</option>
              <option value="Средний">Средний</option>
              <option value="Сложный">Сложный</option>
            </select>

            <label for="case-tags">Теги через запятую</label>
            <input id="case-tags" v-model.trim="caseForm.tagsText" type="text" placeholder="UX, Аналитика" />

            <label for="case-score">Средний балл</label>
            <input id="case-score" v-model.number="caseForm.solvedScore" type="number" step="0.1" min="0" max="10" />

            <div class="row-actions">
              <button class="btn btn-primary" type="submit">Сохранить</button>
              <button class="btn btn-secondary" type="button" @click="resetCaseForm">Сбросить</button>
            </div>
          </form>
        </article>
      </div>

      <div v-else-if="activeTab === 'users'" class="panel-grid">
        <article class="card panel-card">
          <div class="section-topbar">
            <h2>Пользователи</h2>
            <button class="btn btn-secondary" type="button" @click="loadUsersFromApi" :disabled="isUsersLoading">
              {{ isUsersLoading ? 'Обновление...' : 'Обновить из API' }}
            </button>
          </div>
          <p class="hint">
            Создание пользователя идет через публичный endpoint регистрации. Редактирование и удаление существующих
            записей пока сохраняются только локально, без backend-admin endpoint.
          </p>
          <p v-if="usersError" class="error-text">{{ usersError }}</p>
          <p v-if="userMessage" class="success-text">{{ userMessage }}</p>
          <div class="list">
            <div v-for="user in adminUsers" :key="user.id" class="list-item">
              <div>
                <p class="title">{{ user.login }}</p>
                <p class="meta">Email: {{ user.email }} | Роль: {{ getRoleText(user.role) }} | Ранг: #{{ user.rank }}</p>
              </div>
              <div class="row-actions">
                <button class="btn btn-secondary" type="button" @click="startUserEdit(user)">Изменить</button>
                <button class="btn btn-secondary" type="button" @click="deleteUser(user)">Удалить</button>
              </div>
            </div>
          </div>
        </article>

        <article class="card panel-card">
          <h2>{{ userForm.id ? 'Изменить пользователя' : 'Добавить пользователя' }}</h2>
          <form class="admin-form" @submit.prevent="saveUser">
            <label for="user-login">Логин</label>
            <input id="user-login" v-model.trim="userForm.login" type="text" />

            <label for="user-email">Email</label>
            <input id="user-email" v-model.trim="userForm.email" type="email" />

            <label for="user-role">Роль</label>
            <select id="user-role" v-model="userForm.role">
              <option value="" disabled>Выберите статус</option>
              <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </option>
            </select>

            <label for="user-birthdate">Дата рождения (для нового пользователя)</label>
            <input id="user-birthdate" v-model="userForm.birthDate" type="date" />

            <label for="user-city">Город (для нового пользователя)</label>
            <city-select
              id="user-city"
              v-model="userForm.cityId"
              :cities="cities"
              :loading="citiesLoading"
              :disabled="isUsersLoading"
              :backend-error="cityLoadError"
              :selected-city-label="selectedCityLabel"
              @search-change="handleCitySearch"
            />

            <label for="user-password">Пароль (для нового пользователя)</label>
            <input id="user-password" v-model.trim="userForm.password" type="password" />

            <label for="user-rank">Место в рейтинге</label>
            <input id="user-rank" v-model.number="userForm.rank" type="number" min="1" />

            <div class="row-actions">
              <button class="btn btn-primary" type="submit">Сохранить</button>
              <button class="btn btn-secondary" type="button" @click="resetUserForm">Сбросить</button>
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
  formatBirthdateForApi,
  loginRequest,
  listUsers,
  listCities,
  logoutRequest,
  parseBirthdateFromApi,
  registerRequest,
} from '@/api/authApi'
import { appState, getRoleLabel, getRoleOptions } from '@/store/appState'

const toCaseForm = (item = null) => ({
  id: item?.id || null,
  title: item?.title || '',
  description: item?.description || '',
  fullDescription: item?.fullDescription || '',
  difficulty: item?.difficulty || 'Средний',
  tagsText: item?.tags?.join(', ') || '',
  solvedScore: item?.solvedScore ?? 0,
})

const toUserForm = (item = null) => ({
  id: item?.id || null,
  login: item?.login || '',
  email: item?.email || '',
  role: item?.role || '',
  rank: item?.rank ?? 1,
  cityId: item?.cityId ?? null,
  city: item?.city || '',
  region: item?.region || '',
  birthDate: item?.birthDate || '',
  password: '',
})

const toTagForm = (item = null) => ({
  id: item?.id || null,
  name: item?.name || '',
})

const mapApiUserToAdminUser = (user, index) => ({
  id: user?.id ?? index + 1,
  login: user?.nickname || user?.username || '',
  email: user?.email || '',
  role: user?.status || user?.role || '',
  rank: index + 1,
  cityId: user?.cityId ?? null,
  city: user?.city || '',
  region: user?.region || '',
  birthDate: parseBirthdateFromApi(user?.birthdate || ''),
})

export default {
  name: 'AdminPage',
  components: {
    CitySelect,
  },
  data() {
    const tags = [...new Set(appState.cases.flatMap((item) => item.tags))]
    return {
      isAdminAuthorized: false,
      isAdminAuthLoading: false,
      authError: '',
      credentials: {
        login: '',
        password: '',
      },
      activeTab: 'cases',
      adminCases: appState.cases.map((item) => ({ ...item, tags: [...item.tags] })),
      adminUsers: [],
      roleOptions: getRoleOptions(),
      cities: [],
      citiesLoading: false,
      cityLoadError: '',
      isUsersLoading: false,
      usersError: '',
      userMessage: '',
      adminTags: tags.map((name, index) => ({ id: index + 1, name })),
      caseForm: toCaseForm(),
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
      const isLoaded = await this.loadUsersFromApi()
      this.isAdminAuthorized = isLoaded
      if (!isLoaded) {
        this.usersError = ''
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
        const isLoaded = await this.loadUsersFromApi()
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
      this.adminUsers = []
      this.credentials.login = ''
      this.credentials.password = ''
      this.authError = ''
    },
    async loadUsersFromApi() {
      this.isUsersLoading = true
      this.usersError = ''
      let isLoaded = false

      try {
        const users = await listUsers()
        if (Array.isArray(users)) {
          this.adminUsers = users.map(mapApiUserToAdminUser)
          isLoaded = true
        }
      } catch (error) {
        this.usersError =
          Number(error?.status) === 401 || Number(error?.status) === 403
            ? 'Список пользователей доступен только при реальной admin-сессии backend. Пока показаны локальные данные.'
            : error?.message || 'Не удалось загрузить пользователей с сервера. Показаны локальные данные.'
      } finally {
        this.isUsersLoading = false
      }

      return isLoaded
    },
    getSelectedCity() {
      return this.cities.find((item) => Number(item.id) === Number(this.userForm.cityId)) || null
    },
    getRoleText(role) {
      return getRoleLabel(role) === 'Не указан' ? role || 'Не указан' : getRoleLabel(role)
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
    parseTags(rawTags) {
      return [...new Set(rawTags.split(',').map((tag) => tag.trim()).filter(Boolean))]
    },
    nextId(items) {
      return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1
    },
    syncTagCatalogWithCases() {
      const tagSet = new Set(this.adminCases.flatMap((item) => item.tags))
      this.adminTags = [...tagSet].map((name, index) => ({ id: index + 1, name }))
    },
    startCaseEdit(item) {
      this.caseForm = toCaseForm(item)
    },
    resetCaseForm() {
      this.caseForm = toCaseForm()
    },
    saveCase() {
      if (!this.caseForm.title) {
        return
      }
      const tags = this.parseTags(this.caseForm.tagsText)
      const payload = {
        title: this.caseForm.title,
        description: this.caseForm.description,
        fullDescription: this.caseForm.fullDescription,
        difficulty: this.caseForm.difficulty,
        tags,
        solvedScore: Number(this.caseForm.solvedScore) || 0,
      }

      // TODO (DB/API версия):
      // await db.table('cases').upsert({
      //   id: this.caseForm.id,
      //   title: payload.title,
      //   description: payload.description,
      //   full_description: payload.fullDescription,
      //   difficulty: payload.difficulty,
      //   solved_score: payload.solvedScore,
      // })
      // TODO:
      // - обновить связующую таблицу case_tags (case_id, tag_id)
      // - получить свежий список кейсов через SELECT с JOIN

      if (this.caseForm.id) {
        this.adminCases = this.adminCases.map((item) =>
          item.id === this.caseForm.id ? { ...item, ...payload } : item
        )
      } else {
        this.adminCases = [...this.adminCases, { id: this.nextId(this.adminCases), ...payload }]
      }
      this.syncTagCatalogWithCases()
      this.resetCaseForm()
    },
    deleteCase(caseId) {
      // TODO (DB/API версия):
      // await db.table('cases').delete().where({ id: caseId })
      // TODO:
      // - каскадно очистить case_tags для удаленного кейса

      this.adminCases = this.adminCases.filter((item) => item.id !== caseId)
      this.syncTagCatalogWithCases()
      if (this.caseForm.id === caseId) {
        this.resetCaseForm()
      }
    },
    startUserEdit(user) {
      this.userMessage = ''
      this.usersError = ''
      this.cityLoadError = ''
      this.userForm = toUserForm(user)
    },
    resetUserForm() {
      this.userMessage = ''
      this.usersError = ''
      this.cityLoadError = ''
      this.cities = []
      this.userForm = toUserForm()
    },
    async saveUser() {
      if (!this.userForm.login || !this.userForm.email) {
        this.usersError = 'Заполните логин и email.'
        return
      }

      this.userMessage = ''
      this.usersError = ''
      const selectedCity = this.getSelectedCity()

      const payload = {
        login: this.userForm.login,
        email: this.userForm.email,
        role: this.userForm.role,
        rank: Number(this.userForm.rank) || 1,
        cityId: this.userForm.cityId ? Number(this.userForm.cityId) : null,
        city: selectedCity?.cityName || this.userForm.city || '',
        region: selectedCity?.regionName || this.userForm.region || '',
        birthDate: this.userForm.birthDate,
      }

      if (!this.userForm.id) {
        if (!payload.role || !payload.birthDate || !payload.cityId) {
          this.usersError = 'Для нового пользователя выберите статус, дату рождения и город.'
          return
        }

        if (!this.userForm.password) {
          this.usersError = 'Для нового пользователя укажите пароль.'
          return
        }

        try {
          await registerRequest({
            username: payload.login,
            email: payload.email,
            password: this.userForm.password,
            status: payload.role,
            cityId: payload.cityId,
            birthdate: formatBirthdateForApi(payload.birthDate),
          })
          const isLoaded = await this.loadUsersFromApi()
          if (!isLoaded) {
            this.adminUsers = [...this.adminUsers, { id: this.nextId(this.adminUsers), ...payload }]
          }
          this.resetUserForm()
          this.userMessage = isLoaded
            ? 'Пользователь добавлен через API.'
            : 'Пользователь добавлен через API. Список ниже обновлен локально, потому что admin endpoint чтения недоступен.'
          return
        } catch (error) {
          this.usersError =
            error?.message || 'Не удалось добавить пользователя через API. Пользователь не создан.'
          return
        }
      }

      try {
        this.adminUsers = this.adminUsers.map((item) =>
          item.id === this.userForm.id ? { ...item, ...payload } : item
        )
        this.resetUserForm()
        this.userMessage =
          'Изменения сохранены локально. Backend пока не умеет безопасно редактировать произвольного пользователя через эту админку.'
      } catch (error) {
        this.usersError = error?.message || 'Не удалось обновить пользователя.'
      }
    },
    async deleteUser(user) {
      this.userMessage = ''
      this.usersError = ''
      this.adminUsers = this.adminUsers.filter((item) => item.id !== user.id)

      if (this.userForm.id === user.id) {
        this.resetUserForm()
      }
      this.userMessage =
        'Пользователь удален только из локального списка. Серверный endpoint удаления пока не подключен.'
    },
    startTagEdit(tag) {
      this.tagForm = toTagForm(tag)
    },
    resetTagForm() {
      this.tagForm = toTagForm()
    },
    saveTag() {
      if (!this.tagForm.name) {
        return
      }
      const normalizedName = this.tagForm.name.trim()
      if (!normalizedName) {
        return
      }

      // TODO (DB/API версия):
      // await db.table('tags').upsert({
      //   id: this.tagForm.id,
      //   name: normalizedName,
      // })
      // TODO:
      // - при переименовании обновлять связи в case_tags

      if (this.tagForm.id) {
        const previousTag = this.adminTags.find((item) => item.id === this.tagForm.id)?.name
        this.adminTags = this.adminTags.map((item) =>
          item.id === this.tagForm.id ? { ...item, name: normalizedName } : item
        )
        if (previousTag && previousTag !== normalizedName) {
          this.adminCases = this.adminCases.map((item) => ({
            ...item,
            tags: item.tags.map((tag) => (tag === previousTag ? normalizedName : tag)),
          }))
        }
      } else if (!this.adminTags.some((item) => item.name === normalizedName)) {
        this.adminTags = [...this.adminTags, { id: this.nextId(this.adminTags), name: normalizedName }]
      }
      this.resetTagForm()
    },
    deleteTag(tagId) {
      const deletedTag = this.adminTags.find((item) => item.id === tagId)
      if (!deletedTag) {
        return
      }

      // TODO (DB/API версия):
      // await db.table('tags').delete().where({ id: tagId })
      // TODO:
      // - удалить или пересобрать связи в case_tags по удаленному тегу

      this.adminTags = this.adminTags.filter((item) => item.id !== tagId)
      this.adminCases = this.adminCases.map((item) => ({
        ...item,
        tags: item.tags.filter((tag) => tag !== deletedTag.name),
      }))
      if (this.tagForm.id === tagId) {
        this.resetTagForm()
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
}
</style>
