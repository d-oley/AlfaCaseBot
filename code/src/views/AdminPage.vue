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
            <div v-for="item in adminCases" :key="item.id" class="list-item case-list-item">
              <div class="case-list-copy">
                <p class="title">{{ item.title }}</p>
                <p class="meta">
                  Сложность: {{ item.difficulty }} | Теги: {{ item.tags.join(', ') || 'нет' }}
                </p>
              </div>
              <div class="row-actions">
                <button class="btn btn-secondary" type="button" @click="startCaseEdit(item)">Изменить</button>
                <button
                  v-if="item.active"
                  class="btn btn-secondary"
                  type="button"
                  @click="deactivateCase(item.id)"
                >
                  Деактивировать
                </button>
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

            <fieldset class="tag-picker">
              <legend>Теги</legend>
              <label v-for="tag in caseTagOptions" :key="tag.id" class="checkbox-row tag-option">
                <input v-model="caseForm.selectedTagIds" type="checkbox" :value="Number(tag.id)" />
                {{ tag.name }}
              </label>
              <p v-if="!adminTags.length" class="hint">Сначала добавьте хотя бы один тег.</p>
            </fieldset>

            <label for="case-average-minutes">Среднее время решения, мин.</label>
            <input id="case-average-minutes" v-model.number="caseForm.averageSolveMinutes" type="number" min="1" />

            <label for="case-prompt">Английский контекст для модели</label>
            <textarea id="case-prompt" v-model.trim="caseForm.promptContextEn" rows="4" />

            <label for="case-perfect-solution">Эталонное решение</label>
            <textarea
              id="case-perfect-solution"
              v-model="caseForm.perfectSolution"
              rows="6"
              maxlength="10000"
              placeholder="Станет доступно пользователю после завершения кейса"
            />
            <p class="hint case-field-hint">
              До завершения кейса пользователь не сможет получить этот текст.
              Чтобы удалить сохранённое решение, очистите поле и сохраните кейс.
            </p>

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
          <p v-if="caseSaveMessage" class="success-text case-save-message">
            {{ caseSaveMessage }}
          </p>
        </article>
      </div>

      <div v-else-if="activeTab === 'users'" class="panel-grid">
        <article class="card panel-card">
          <div class="section-topbar">
            <h2>Пользователи</h2>
            <span class="meta">Всего: {{ usersPage.totalElements }}</span>
          </div>
          <form class="user-search" @submit.prevent="searchUsers">
            <input v-model.trim="userSearch" type="search" placeholder="Логин, никнейм или email" />
            <button class="btn btn-secondary" type="submit" :disabled="isUsersListLoading">
              Найти
            </button>
          </form>
          <div class="list users-list">
            <button
              v-for="user in adminUsers"
              :key="user.id"
              class="user-list-item"
              type="button"
              @click="selectUser(user.id)"
            >
              <span>
                <strong>{{ user.nickName || user.username || `ID ${user.id}` }}</strong>
                <small>{{ user.email || 'Email не указан' }}</small>
              </span>
              <span class="user-list-meta">{{ user.role || 'USER' }} · {{ user.status || '—' }}</span>
            </button>
          </div>
          <p v-if="!isUsersListLoading && !adminUsers.length" class="hint">Пользователи не найдены.</p>
          <div class="pagination-actions">
            <button class="btn btn-secondary" type="button" :disabled="usersPage.page <= 0 || isUsersListLoading" @click="changeUsersPage(-1)">←</button>
            <span>{{ usersPage.totalPages ? usersPage.page + 1 : 0 }} / {{ usersPage.totalPages }}</span>
            <button class="btn btn-secondary" type="button" :disabled="usersPage.page + 1 >= usersPage.totalPages || isUsersListLoading" @click="changeUsersPage(1)">→</button>
          </div>
        </article>

        <article class="card panel-card collapsible-panel" :class="{ collapsed: !isUserEditorExpanded }">
          <button
            class="collapsible-header"
            type="button"
            :aria-expanded="isUserEditorExpanded"
            @click="isUserEditorExpanded = !isUserEditorExpanded"
          >
            <h2>{{ userForm.id ? 'Изменить пользователя' : 'Добавить пользователя' }}</h2>
            <span class="collapse-chevron" aria-hidden="true">›</span>
          </button>

          <div v-if="isUserEditorExpanded" class="collapsible-content">
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
          </div>
        </article>

        <article
          v-if="userForm.id"
          class="card panel-card user-solutions-panel collapsible-panel"
          :class="{ collapsed: !isUserSolutionsExpanded }"
        >
          <button
            class="collapsible-header"
            type="button"
            :aria-expanded="isUserSolutionsExpanded"
            @click="toggleUserSolutions"
          >
            <h2>Решения пользователя</h2>
            <span class="collapse-chevron" aria-hidden="true">›</span>
          </button>

          <div v-if="isUserSolutionsExpanded" class="collapsible-content">
            <div class="section-topbar solutions-topbar">
            <div>
              <p class="meta">
                {{ userForm.nickName || userForm.login || `ID ${userForm.id}` }} ·
                Всего: {{ userSolutionsPage.totalElements }}
              </p>
            </div>
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="isUserSolutionsLoading"
              @click="loadUserSolutions(userForm.id, userSolutionsPage.page)"
            >
              Обновить
            </button>
            </div>

          <p v-if="userSolutionsError" class="error-text" role="alert">
            {{ userSolutionsError }}
          </p>
          <p v-else-if="isUserSolutionsLoading" class="hint">Загружаем решения...</p>
          <p v-else-if="!userSolutions.length" class="hint">
            Пользователь ещё не отправлял решений.
          </p>

          <div v-else class="user-solutions-list">
            <article
              v-for="solution in userSolutions"
              :key="solution.solutionId"
              class="user-solution-item"
            >
              <header class="user-solution-header">
                <strong>{{ getSolutionCaseTitle(solution.caseId) }}</strong>
                <span class="solution-rating">Оценка: {{ solution.rating ?? '—' }} / 100</span>
              </header>
              <div class="solution-message solution-message-user">
                <span>Решение пользователя</span>
                <p>{{ solution.solutionText || 'Текст решения отсутствует.' }}</p>
              </div>
              <div class="solution-message solution-message-bot">
                <span>Ответ ИИ</span>
                <p>{{ solution.solutionResponse || 'Ответ отсутствует.' }}</p>
              </div>
            </article>
          </div>

            <div v-if="userSolutionsPage.totalPages > 1" class="pagination-actions">
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="userSolutionsPage.page <= 0 || isUserSolutionsLoading"
              @click="changeUserSolutionsPage(-1)"
            >←</button>
            <span>{{ userSolutionsPage.page + 1 }} / {{ userSolutionsPage.totalPages }}</span>
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="userSolutionsPage.page + 1 >= userSolutionsPage.totalPages || isUserSolutionsLoading"
              @click="changeUserSolutionsPage(1)"
            >→</button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="panel-grid">
        <article class="card panel-card">
          <h2>Теги</h2>
          <div class="list">
            <div v-for="tag in adminTags" :key="tag.id" class="list-item">
              <div>
                <p class="title">{{ tag.name }}</p>
                <p class="meta">
                  {{ tag.active === false ? 'Неактивен' : 'Активен' }} · Кейсов: {{ tag.caseCount ?? tag.count ?? 0 }}
                </p>
              </div>
              <div class="row-actions">
                <button class="btn btn-secondary" type="button" @click="startTagEdit(tag)">Изменить</button>
                <button class="btn btn-secondary" type="button" @click="toggleTagActive(tag)">
                  {{ tag.active === false ? 'Активировать' : 'Деактивировать' }}
                </button>
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
  activateCaseTag,
  attachCaseTag,
  createAdminUser,
  createCaseRequest,
  createCaseTag,
  deactivateCaseTag,
  detachCaseTag,
  deleteAdminUser,
  getUserCityById,
  getAdminUserById,
  loginRequest,
  listAdminCases,
  listAdminTags,
  listAdminUserSolutions,
  listAdminUsers,
  listCities,
  logoutRequest,
  parseBirthdateFromApi,
  updateAdminUser,
  updateCaseTag,
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
  selectedTagIds: Array.isArray(item?.tagIds) ? [...item.tagIds] : [],
  averageSolveMinutes: item?.averageSolveMinutes ?? 1,
  promptContextEn: item?.promptContextEn || '',
  perfectSolution: item?.perfectSolution || '',
  hadPerfectSolution: Boolean(item?.perfectSolution),
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
      caseSaveMessage: '',
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
      isUsersListLoading: false,
      userError: '',
      userMessage: '',
      userSearch: '',
      adminUsers: [],
      usersPage: { page: 0, size: 25, totalElements: 0, totalPages: 0 },
      userSolutions: [],
      userSolutionsPage: { page: 0, size: 25, totalElements: 0, totalPages: 0 },
      isUserSolutionsLoading: false,
      userSolutionsError: '',
      isUserEditorExpanded: false,
      isUserSolutionsExpanded: false,
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
  watch: {
    activeTab(value) {
      if (value === 'users' && this.isAdminAuthorized) this.loadAdminUsers(0)
    },
  },
  computed: {
    caseTagOptions() {
      const selected = new Set(this.caseForm.selectedTagIds.map(Number))
      return this.adminTags.filter((tag) => tag.active !== false || selected.has(Number(tag.id)))
    },
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
        const firstPage = await listAdminTags({ page: 0, size: 100, sort: 'name,asc' })
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
            listAdminTags({ page: index + 1, size: 100, sort: 'name,asc' })
          )
        )
        const tags = [firstPage, ...remainingPages].flatMap((page) => page.items)
        this.adminTags = tags.map((tag, index) => ({ ...tag, id: tag.id ?? `tag-${index}` }))
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось загрузить теги.'
      }
    },
    async loadAdminUsers(page = this.usersPage.page) {
      this.isUsersListLoading = true
      this.userError = ''
      try {
        const result = await listAdminUsers({ page, size: this.usersPage.size, search: this.userSearch })
        this.adminUsers = result.items
        this.usersPage = {
          page: result.page,
          size: result.size,
          totalElements: result.totalElements,
          totalPages: result.totalPages,
        }
      } catch (error) {
        this.adminUsers = []
        this.userError = error?.message || 'Не удалось загрузить список пользователей.'
      } finally {
        this.isUsersListLoading = false
      }
    },
    searchUsers() {
      this.loadAdminUsers(0)
    },
    changeUsersPage(offset) {
      this.loadAdminUsers(this.usersPage.page + offset)
    },
    selectUser(id) {
      this.userForm.id = Number(id)
      this.loadUserById()
    },
    async loadUserById() {
      const userId = Number(this.userForm.id)
      if (!userId || this.isUserLoading) return

      this.resetUserSolutions()
      this.isUserSolutionsExpanded = false
      this.isUserLoading = true
      this.userError = ''
      this.userMessage = ''
      try {
        const [profile, city] = await Promise.all([
          getAdminUserById(userId),
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
          accountRole: profile?.role || '',
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
      this.resetUserSolutions()
      this.isUserEditorExpanded = false
      this.isUserSolutionsExpanded = false
      this.cities = []
      this.cityLoadError = ''
      this.userError = ''
      this.userMessage = ''
    },
    resetUserSolutions() {
      this.userSolutions = []
      this.userSolutionsPage = { page: 0, size: 25, totalElements: 0, totalPages: 0 }
      this.userSolutionsError = ''
      this.isUserSolutionsLoading = false
    },
    toggleUserSolutions() {
      this.isUserSolutionsExpanded = !this.isUserSolutionsExpanded
      if (
        this.isUserSolutionsExpanded &&
        !this.userSolutions.length &&
        !this.userSolutionsError
      ) {
        this.loadUserSolutions(this.userForm.id, 0)
      }
    },
    async loadUserSolutions(userId, page = 0) {
      const normalizedUserId = Number(userId)
      if (!normalizedUserId || this.isUserSolutionsLoading) return
      this.isUserSolutionsLoading = true
      this.userSolutionsError = ''
      try {
        const result = await listAdminUserSolutions(normalizedUserId, {
          page,
          size: this.userSolutionsPage.size,
        })
        this.userSolutions = result.items
        this.userSolutionsPage = {
          page: result.page,
          size: result.size,
          totalElements: result.totalElements,
          totalPages: result.totalPages,
        }
      } catch (error) {
        this.userSolutions = []
        this.userSolutionsError = error?.message || 'Не удалось загрузить решения пользователя.'
      } finally {
        this.isUserSolutionsLoading = false
      }
    },
    changeUserSolutionsPage(offset) {
      this.loadUserSolutions(this.userForm.id, this.userSolutionsPage.page + offset)
    },
    getSolutionCaseTitle(caseId) {
      const caseItem = this.adminCases.find((item) => Number(item.id) === Number(caseId))
      return caseItem?.title || 'Неизвестный кейс'
    },
    async saveUser() {
      if (this.isUserSaving) return

      const isEditing = Boolean(this.userForm.id)
      if (!this.userForm.email || (!isEditing && (!this.userForm.login || !this.userForm.password))) {
        this.userError = isEditing
          ? 'Для сохранения пользователя укажите email.'
          : 'Для нового пользователя заполните логин, email и пароль.'
        return
      }

      this.isUserSaving = true
      this.userError = ''
      this.userMessage = ''
      try {
        if (isEditing) {
          const payload = {
            email: this.userForm.email,
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
          await this.loadAdminUsers()
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
          await this.loadAdminUsers(0)
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
        await this.loadAdminUsers()
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
      this.caseSaveMessage = ''
      this.caseForm = toCaseForm(item)
      this.caseForm.selectedTagIds = this.getCaseTagIds(item)
      this.casePdfFile = null
      this.caseIconFile = null
    },
    getCaseTagIds(item) {
      const directIds = Array.isArray(item?.tagIds) ? item.tagIds : []
      const idsByName = (item?.tags || []).map(
        (name) => this.adminTags.find((tag) => tag.name === name)?.id
      )
      return [...new Set([...directIds, ...idsByName].map(Number))].filter(
        (id) => Number.isFinite(id) && id > 0
      )
    },
    resetCaseForm() {
      this.caseForm = toCaseForm()
      this.casePdfFile = null
      this.caseIconFile = null
      this.caseSaveMessage = ''
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
      this.caseSaveMessage = ''
      if (!this.caseForm.slug || !this.caseForm.title || !this.caseForm.description) {
        this.adminActionError = 'Заполните slug, название и краткое описание.'
        return
      }

      try {
        const files = { pdfFile: this.casePdfFile, iconFile: this.caseIconFile }
        const casePayload = {
          ...this.caseForm,
          removePerfectSolution: Boolean(
            this.caseForm.id &&
            this.caseForm.hadPerfectSolution &&
            !this.caseForm.perfectSolution.trim()
          ),
        }
        const previousTagIds = this.caseForm.id
          ? this.getCaseTagIds(
              this.adminCases.find((item) => Number(item.id) === Number(this.caseForm.id))
            )
          : []
        let caseId = this.caseForm.id
        if (this.caseForm.id) {
          await updateCaseRequest(this.caseForm.id, casePayload, files)
        } else {
          const result = await createCaseRequest(casePayload, files)
          caseId = Number(result?.id)
          if (!Number.isFinite(caseId) || caseId <= 0) {
            throw new Error('Кейс создан, но сервер не вернул его идентификатор для привязки тегов.')
          }
        }
        await this.syncCaseTags(caseId, previousTagIds, this.caseForm.selectedTagIds)
        await this.loadAdminCases()
        this.resetCaseForm()
        this.caseSaveMessage = 'Кейс сохранён.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось сохранить кейс.'
      }
    },
    async syncCaseTags(caseId, previousTagIds, selectedTagIds) {
      const previous = new Set((previousTagIds || []).map(Number).filter(Number.isFinite))
      const selected = new Set((selectedTagIds || []).map(Number).filter(Number.isFinite))
      const toAttach = [...selected].filter((tagId) => !previous.has(tagId))
      const toDetach = [...previous].filter((tagId) => !selected.has(tagId))

      await Promise.all([
        ...toAttach.map((tagId) => attachCaseTag(caseId, tagId)),
        ...toDetach.map((tagId) => detachCaseTag(caseId, tagId)),
      ])
    },
    async deactivateCase(caseId) {
      this.adminActionError = ''
      this.adminActionMessage = ''
      this.caseSaveMessage = ''
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
      const isEditing = Boolean(this.tagForm.id)
      try {
        if (isEditing) {
          await updateCaseTag(this.tagForm.id, { name: this.tagForm.name })
        } else {
          await createCaseTag(this.tagForm.name)
        }
        await this.loadTagsFromApi()
        this.resetTagForm()
        this.adminActionMessage = isEditing ? 'Тег изменён.' : 'Тег создан.'
      } catch (error) {
        this.adminActionError = error?.message || 'Не удалось сохранить тег.'
      }
    },
    async toggleTagActive(tag) {
      if (tag.active === false) {
        try {
          await activateCaseTag(tag.id)
          await this.loadTagsFromApi()
          this.adminActionMessage = 'Тег активирован.'
        } catch (error) {
          this.adminActionError = error?.message || 'Не удалось активировать тег.'
        }
        return
      }
      await this.deactivateTag(tag.id)
    },
    async deactivateTag(tagId) {
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

.case-field-hint {
  margin-top: -2px;
  font-size: 0.78rem;
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

.collapsible-panel.collapsed {
  align-self: start;
}

.collapsible-header {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.collapsible-header h2 {
  margin: 0;
}

.collapse-chevron {
  flex: 0 0 auto;
  font-family: var(--mono-font);
  font-size: 2rem;
  line-height: 0.8;
  color: var(--primary);
  transform: rotate(0deg);
  transition: transform 0.18s ease;
}

.collapsible-header[aria-expanded='true'] .collapse-chevron {
  transform: rotate(90deg);
}

.collapsible-content {
  margin-top: 16px;
}

.solutions-topbar {
  align-items: flex-start;
}

@media (prefers-reduced-motion: reduce) {
  .collapse-chevron {
    transition: none;
  }
}

.user-solutions-panel {
  grid-column: 1 / -1;
}

.user-solutions-list {
  display: grid;
  gap: 12px;
}

.user-solution-item {
  padding: 14px;
  border: 1px solid var(--border);
  background: var(--chat-bg);
  display: grid;
  gap: 10px;
}

.user-solution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.solution-rating {
  padding: 4px 8px;
  background: var(--primary);
  color: #fff;
  font-family: var(--mono-font);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.solution-message {
  padding: 10px 12px;
  border: 1px solid var(--border);
}

.solution-message-user {
  margin-left: clamp(0px, 8vw, 100px);
  background: var(--primary);
  color: #fff;
}

.solution-message-bot {
  margin-right: clamp(0px, 8vw, 100px);
  background: var(--surface-bot-message);
}

.solution-message span {
  display: block;
  margin-bottom: 5px;
  font-family: var(--mono-font);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.75;
}

.solution-message p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
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

.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 0;
  padding: 10px 12px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.tag-picker legend {
  padding: 0 4px;
  font-weight: 600;
}

.tag-picker .tag-option {
  margin-top: 0;
}

.tag-picker .hint {
  width: 100%;
  margin: 0;
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

.case-save-message {
  margin-top: 12px;
  text-align: center;
}

/* Editorial admin workspace */
.admin-page { gap: 24px; }
.admin-login, .admin-console { padding: clamp(18px, 2.5vw, 28px); }
h1 { font-size: clamp(2rem, 4vw, 4rem); line-height: 0.9; text-transform: uppercase; }
.tabs { gap: 0; border-bottom: 1px solid var(--border); }
.tab-btn { border-radius: 0; border-bottom: 0; }
.tab-btn.active { border-color: var(--primary); background: var(--primary); color: #fff !important; }
.panel-grid { gap: 20px; }
.list { gap: 0; border-top: 1px solid var(--border); }
.list-item { border-radius: 0; border-top: 0; }
.admin-form input, .admin-form textarea, .admin-form select, .tag-picker { border-radius: 0; }
.list-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 378px;
  gap: 20px;
}
.list-item > .row-actions {
  display: grid;
  grid-template-columns: 150px 220px;
  gap: 8px;
  justify-content: end;
}
.list-item > .row-actions .btn { width: 100%; }
.case-list-item {
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.case-list-copy {
  min-width: 0;
}
.case-list-copy .title {
  overflow-wrap: anywhere;
}
.case-list-copy .meta {
  line-height: 1.45;
}
.case-list-item > .row-actions {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  width: 100%;
  justify-content: stretch;
}
.user-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 16px;
}
.user-search input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); background: var(--input-bg); color: var(--text-main); }
.users-list { margin-top: 0; }
.user-list-item {
  width: 100%;
  padding: 14px 12px;
  border: 1px solid var(--border);
  border-top: 0;
  background: var(--surface-muted);
  color: var(--text-main);
  display: flex;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}
.user-list-item > span:first-child { display: grid; gap: 3px; }
.user-list-item small, .user-list-meta { color: var(--text-muted); }
.user-list-meta { text-align: right; }
.pagination-actions { margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--mono-font); }
.pagination-actions .btn { min-width: 48px; }

@media (max-width: 700px) {
  .list-item { grid-template-columns: 1fr; }
  .list-item > .row-actions { grid-template-columns: 1fr; justify-content: stretch; }
  .user-search { grid-template-columns: 1fr; }
  .user-list-item { align-items: start; flex-direction: column; }
  .user-list-meta { text-align: left; }
}
</style>
