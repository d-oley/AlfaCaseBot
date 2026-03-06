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
        <button class="btn btn-primary" type="submit">Войти</button>
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
          <p v-if="usersError" class="error-text">{{ usersError }}</p>
          <p v-if="userMessage" class="success-text">{{ userMessage }}</p>
          <div class="list">
            <div v-for="user in adminUsers" :key="user.id" class="list-item">
              <div>
                <p class="title">{{ user.login }}</p>
                <p class="meta">Email: {{ user.email }} | Роль: {{ user.role }} | Ранг: #{{ user.rank }}</p>
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
            <input id="user-role" v-model.trim="userForm.role" type="text" />

            <label for="user-birthdate">Дата рождения (для нового пользователя)</label>
            <input id="user-birthdate" v-model="userForm.birthDate" type="date" />

            <label for="user-city">Город (для нового пользователя)</label>
            <input id="user-city" v-model.trim="userForm.city" type="text" />

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
import {
  changeEmail,
  deleteUserByUsername,
  formatBirthdateForApi,
  isNotFoundError,
  listUsers,
  registerRequest,
} from '@/api/authApi'
import { appState } from '@/store/appState'

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'admin123'

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
  role: item?.role || 'Студент',
  rank: item?.rank ?? 1,
  city: item?.city || '',
  birthDate: item?.birthDate || '',
  password: '',
})

const toTagForm = (item = null) => ({
  id: item?.id || null,
  name: item?.name || '',
})

const createDemoUsers = () => [
  { id: 1, login: 'PupiKapi', email: 'pupikapi@example.com', role: 'Студент', rank: 1, city: '' },
  {
    id: 2,
    login: 'AlphaSamets',
    email: 'alphasamets@example.com',
    role: 'Учащийся 11 класса',
    rank: 2,
    city: '',
  },
  { id: 3, login: 'Theresnohope', email: 'theresnohope@example.com', role: 'Студент', rank: 3, city: '' },
]

const mapApiUserToAdminUser = (user, index) => ({
  id: user?.id ?? index + 1,
  login: user?.username || '',
  email: user?.email || '',
  role: user?.status || 'Не указан',
  rank: index + 1,
  city: user?.city || '',
  birthDate: user?.birthdate || '',
})

export default {
  name: 'AdminPage',
  data() {
    const tags = [...new Set(appState.cases.flatMap((item) => item.tags))]
    return {
      isAdminAuthorized: false,
      authError: '',
      credentials: {
        login: '',
        password: '',
      },
      activeTab: 'cases',
      adminCases: appState.cases.map((item) => ({ ...item, tags: [...item.tags] })),
      adminUsers: createDemoUsers(),
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
    this.loadUsersFromApi()
  },
  methods: {
    async handleAdminLogin() {
      if (this.credentials.login === ADMIN_LOGIN && this.credentials.password === ADMIN_PASSWORD) {
        this.isAdminAuthorized = true
        this.authError = ''
        this.credentials.password = ''
        await this.loadUsersFromApi()
        return
      }
      this.authError = 'Неверный логин или пароль.'
    },
    logoutAdmin() {
      this.isAdminAuthorized = false
      this.credentials.login = ''
      this.credentials.password = ''
      this.authError = ''
    },
    async loadUsersFromApi() {
      this.isUsersLoading = true
      this.usersError = ''

      try {
        const users = await listUsers()
        if (Array.isArray(users)) {
          this.adminUsers = users.map(mapApiUserToAdminUser)
        }
      } catch (error) {
        this.usersError =
          error?.message || 'Не удалось загрузить пользователей с сервера. Показаны локальные данные.'
      } finally {
        this.isUsersLoading = false
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
      this.userForm = toUserForm(user)
    },
    resetUserForm() {
      this.userMessage = ''
      this.usersError = ''
      this.userForm = toUserForm()
    },
    async saveUser() {
      if (!this.userForm.login || !this.userForm.email) {
        this.usersError = 'Заполните логин и email.'
        return
      }

      this.userMessage = ''
      this.usersError = ''

      const payload = {
        login: this.userForm.login,
        email: this.userForm.email,
        role: this.userForm.role,
        rank: Number(this.userForm.rank) || 1,
        city: this.userForm.city,
        birthDate: this.userForm.birthDate,
      }

      if (!this.userForm.id) {
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
            city: payload.city,
            birthdate: formatBirthdateForApi(payload.birthDate),
          })
          await this.loadUsersFromApi()
          this.resetUserForm()
          this.userMessage = 'Пользователь добавлен через API.'
          return
        } catch (error) {
          this.usersError =
            error?.message || 'Не удалось добавить пользователя через API. Пользователь не создан.'
          return
        }
      }

      const currentUser = this.adminUsers.find((item) => item.id === this.userForm.id)
      const isEmailChanged = payload.email !== (currentUser?.email || '')

      try {
        if (isEmailChanged) {
          await changeEmail({
            id: this.userForm.id,
            email: payload.email,
          })
        }

        this.adminUsers = this.adminUsers.map((item) =>
          item.id === this.userForm.id ? { ...item, ...payload } : item
        )

        if (isEmailChanged) {
          this.resetUserForm()
          this.userMessage =
            'Email обновлен на сервере. Логин/роль/ранг сохранены локально (для них пока нет endpoint).'
          return
        }

        this.resetUserForm()
        this.userMessage = 'Изменения сохранены локально.'
      } catch (error) {
        this.usersError = error?.message || 'Не удалось обновить пользователя.'
      }
    },
    async deleteUser(user) {
      this.userMessage = ''
      this.usersError = ''
      let successMessage = ''

      try {
        await deleteUserByUsername(user.login)
        await this.loadUsersFromApi()
        successMessage = 'Пользователь удален через API.'
      } catch (error) {
        if (isNotFoundError(error)) {
          this.adminUsers = this.adminUsers.filter((item) => item.id !== user.id)
          successMessage = 'Удалено локально (endpoint удаления недоступен или пользователь уже удален).'
        } else {
          this.usersError = error?.message || 'Не удалось удалить пользователя.'
          return
        }
      }

      if (this.userForm.id === user.id) {
        this.resetUserForm()
      }
      this.userMessage = successMessage
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
