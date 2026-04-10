<template>
  <div class="container profile-page">
    <section class="card profile-header">
      <div class="avatar-block">
        <div class="avatar-frame">
          <img :src="avatarSource" alt="Аватар пользователя" class="avatar-image" />
        </div>

        <div class="avatar-controls">
          <h2>Личный кабинет</h2>
          <p class="meta-line">Имя: {{ fullName || 'Пока не указано' }}</p>
          <p class="meta-line">Логин: {{ appState.user.login || 'Пользователь' }}</p>
          <p class="meta-line">Статус: {{ roleLabel }}</p>
          <p class="meta-line">Город: {{ appState.user.city || 'Пока не выбран' }}</p>

          <label class="avatar-upload">
            Изменить аватар
            <input type="file" accept="image/*" @change="onAvatarChange" />
          </label>

          <div class="header-actions">
            <button class="btn btn-primary" type="button" @click="startProfileEdit">
              Редактировать профиль
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isEditingProfile" class="card edit-card">
      <h3>Редактирование профиля</h3>
      <form class="profile-form" @submit.prevent="saveProfile">
        <label for="profile-first-name">Имя</label>
        <input id="profile-first-name" v-model.trim="profileForm.firstName" type="text" placeholder="Имя" />

        <label for="profile-last-name">Фамилия</label>
        <input id="profile-last-name" v-model.trim="profileForm.lastName" type="text" placeholder="Фамилия" />

        <label for="profile-login">Логин</label>
        <input id="profile-login" v-model.trim="profileForm.login" type="text" />

        <label for="profile-email">Почта</label>
        <input id="profile-email" v-model.trim="profileForm.email" type="email" />

        <label for="profile-birth">Дата рождения</label>
        <input id="profile-birth" v-model="profileForm.birthDate" type="date" />

        <label for="profile-role">Статус</label>
        <select id="profile-role" v-model="profileForm.role">
          <option value="" disabled>Выберите статус</option>
          <option v-for="role in roleOptions" :key="role.value" :value="role.value">
            {{ role.label }}
          </option>
        </select>

        <label for="profile-city">Город</label>
        <city-select
          id="profile-city"
          v-model="profileForm.cityId"
          :cities="cities"
          :loading="citiesLoading"
          :disabled="isSavingProfile || isRemovingProfile"
          :backend-error="cityLoadError"
          :selected-city-label="selectedCityLabel"
          @search-change="handleCitySearch"
        />

        <label for="profile-tag">Я предпочитаю...</label>
        <select id="profile-tag" v-model="profileForm.preferenceTag">
          <option value="">Пока без предпочтений</option>
          <option v-for="tag in preferenceTagOptions" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>

        <label for="profile-difficulty">По сложности...</label>
        <select id="profile-difficulty" v-model="profileForm.preferenceDifficulty">
          <option value="">Пока без предпочтений</option>
          <option v-for="item in difficultyPreferenceOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <p v-if="profileError" class="error-text">{{ profileError }}</p>

        <div class="profile-actions">
          <button class="btn btn-primary" type="submit" :disabled="isSavingProfile || isRemovingProfile">
            {{ isSavingProfile ? 'Сохранение...' : 'Сохранить изменения' }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="isSavingProfile || isRemovingProfile" @click="cancelProfileEdit">
            Отмена
          </button>
          <button class="btn btn-secondary" type="button" :disabled="isSavingProfile || isRemovingProfile" @click="removeProfile">
            {{ isRemovingProfile ? 'Удаление...' : 'Удалить профиль' }}
          </button>
        </div>
      </form>

      <p v-if="profileMessage" class="success-text">{{ profileMessage }}</p>
    </section>

    <section class="card rank-card">
      <h3>Место в рейтинге</h3>
      <p class="stat-value">#{{ appState.user.rank }}</p>
    </section>

    <section class="card switchable-card">
      <div class="switch-tabs">
        <button class="switch-tab" :class="{ active: activeTab === 'solved' }" type="button" @click="activeTab = 'solved'">
          Решенные кейсы
        </button>
        <button class="switch-tab" :class="{ active: activeTab === 'achievements' }" type="button" @click="activeTab = 'achievements'">
          Достижения
        </button>
        <button class="switch-tab" :class="{ active: activeTab === 'favorites' }" type="button" @click="activeTab = 'favorites'">
          Избранные кейсы
        </button>
      </div>

      <div v-if="activeTab === 'solved'">
        <h3>Решенные кейсы</h3>
        <div v-if="solvedCases.length" class="solved-list">
          <button v-for="item in solvedCases" :key="item.caseId" class="solved-item" type="button" @click="openSolvedCase(item.caseId)">
            <span>{{ item.title }}</span>
            <span>{{ item.scorePercent }} / 100</span>
          </button>
        </div>
        <p v-else class="meta-line">Пока нет решенных кейсов.</p>
      </div>

      <div v-else-if="activeTab === 'favorites'">
        <h3>Избранные кейсы</h3>
        <div v-if="favoriteCases.length" class="solved-list">
          <button v-for="item in favoriteCases" :key="item.id" class="solved-item" type="button" @click="openCase(item.id)">
            <span>{{ item.title }}</span>
            <span>Открыть кейс</span>
          </button>
        </div>
        <p v-else class="meta-line">Пока нет избранных кейсов.</p>
      </div>

      <div v-else>
        <h3>Достижения</h3>
        <div class="achievements-grid">
          <div
            v-for="item in achievements"
            :key="item.id"
            class="achievement-item"
            :class="{ inactive: !item.active }"
          >
            <div class="emoji">{{ item.emoji }}</div>
            <p class="achievement-title">{{ item.title }}</p>
            <p class="achievement-description">{{ item.description }}</p>
            <p class="achievement-progress">{{ item.progress }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import CitySelect from '@/components/CitySelect.vue'
import {
  changeEmail,
  changeUserParams,
  deleteUserByUsername,
  formatBirthdateForApi,
  isNotFoundError,
  listCities,
} from '@/api/authApi'
import {
  appState,
  deleteUserProfile,
  getAchievementsForUser,
  getDifficultyPreferenceOptions,
  getFavoriteCasesForUser,
  getFullName,
  getPreferenceTagOptions,
  getRoleLabel,
  getRoleOptions,
  getSolvedCasesForUser,
  setAvailableCities,
  setUserAvatar,
  updateUserProfile,
} from '@/store/appState'

const LOGIN_REGEX = /^\S{3,20}$/

export default {
  name: 'ProfilePage',
  components: {
    CitySelect,
  },
  data() {
    return {
      appState,
      roleOptions: getRoleOptions(),
      difficultyPreferenceOptions: getDifficultyPreferenceOptions(),
      cities: [],
      citiesLoading: false,
      cityLoadError: '',
      objectUrl: '',
      profileMessage: '',
      profileError: '',
      isSavingProfile: false,
      isRemovingProfile: false,
      isEditingProfile: false,
      activeTab: 'solved',
      profileForm: {
        firstName: '',
        lastName: '',
        login: '',
        email: '',
        birthDate: '',
        role: '',
        cityId: null,
        preferenceTag: '',
        preferenceDifficulty: '',
      },
    }
  },
  computed: {
    avatarSource() {
      return this.appState.user.avatarUrl || this.appState.noPhotoImage
    },
    fullName() {
      return getFullName(this.appState.user)
    },
    roleLabel() {
      return getRoleLabel(this.appState.user.role)
    },
    solvedCases() {
      return getSolvedCasesForUser()
    },
    favoriteCases() {
      return getFavoriteCasesForUser()
    },
    achievements() {
      return getAchievementsForUser()
    },
    preferenceTagOptions() {
      return getPreferenceTagOptions()
    },
    selectedCityLabel() {
      const selectedCity = this.cities.find((item) => Number(item.id) === Number(this.profileForm.cityId))
      if (selectedCity) {
        return [selectedCity.cityName, selectedCity.regionName].filter(Boolean).join(', ')
      }
      return [this.appState.user.city, this.appState.user.region].filter(Boolean).join(', ')
    },
  },
  created() {
    this.fillFormFromState()
  },
  beforeUnmount() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
    }
  },
  methods: {
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
        setAvailableCities(this.cities)
      } catch (error) {
        this.cities = []
        this.cityLoadError = error?.message || 'Не удалось загрузить список городов.'
      } finally {
        this.citiesLoading = false
      }
    },
    fillFormFromState() {
      this.profileForm.firstName = this.appState.user.firstName || ''
      this.profileForm.lastName = this.appState.user.lastName || ''
      this.profileForm.login = this.appState.user.login || ''
      this.profileForm.email = this.appState.user.email || ''
      this.profileForm.birthDate = this.appState.user.birthDate || ''
      this.profileForm.role = this.appState.user.role || ''
      this.profileForm.cityId = this.appState.user.cityId ?? null
      this.profileForm.preferenceTag = this.appState.user.preferences?.tag || ''
      this.profileForm.preferenceDifficulty = this.appState.user.preferences?.difficulty || ''
    },
    startProfileEdit() {
      this.profileMessage = ''
      this.profileError = ''
      this.fillFormFromState()
      this.isEditingProfile = true
    },
    cancelProfileEdit() {
      this.isEditingProfile = false
      this.profileError = ''
      this.profileMessage = ''
    },
    onAvatarChange(event) {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
      }

      this.objectUrl = URL.createObjectURL(file)
      setUserAvatar(this.objectUrl)
    },
    async saveProfile() {
      if (this.isSavingProfile || this.isRemovingProfile) {
        return
      }

      if (!LOGIN_REGEX.test(this.profileForm.login)) {
        this.profileError = 'Логин должен содержать от 3 до 20 символов без пробелов.'
        return
      }

      this.isSavingProfile = true
      this.profileMessage = ''
      this.profileError = ''

      const previousUser = { ...this.appState.user }
      const selectedCity = this.cities.find((item) => Number(item.id) === Number(this.profileForm.cityId)) || null
      const emailChanged = this.profileForm.email !== (previousUser.email || '')
      const backendParamsChanged =
        this.profileForm.firstName !== (previousUser.firstName || '') ||
        this.profileForm.lastName !== (previousUser.lastName || '') ||
        this.profileForm.login !== (previousUser.login || '') ||
        this.profileForm.birthDate !== (previousUser.birthDate || '') ||
        this.profileForm.role !== (previousUser.role || '') ||
        Number(this.profileForm.cityId || 0) !== Number(previousUser.cityId || 0)

      try {
        if (emailChanged) {
          await changeEmail({
            email: this.profileForm.email,
          })
        }

        if (backendParamsChanged) {
          await changeUserParams({
            firstName: this.profileForm.firstName,
            lastName: this.profileForm.lastName,
            birthdate: formatBirthdateForApi(this.profileForm.birthDate),
            status: this.profileForm.role,
            cityId: this.profileForm.cityId,
          })
        }

        updateUserProfile({
          firstName: this.profileForm.firstName,
          lastName: this.profileForm.lastName,
          login: this.profileForm.login,
          nickname: this.profileForm.login,
          email: this.profileForm.email,
          birthDate: this.profileForm.birthDate,
          role: this.profileForm.role,
          cityId: selectedCity?.id ?? previousUser.cityId ?? null,
          city: selectedCity?.cityName || previousUser.city || '',
          region: selectedCity?.regionName || previousUser.region || '',
          preferences: {
            tag: this.profileForm.preferenceTag,
            difficulty: this.profileForm.preferenceDifficulty,
          },
        })

        if (backendParamsChanged || emailChanged) {
          this.profileMessage = 'Профиль обновлен. Сервер синхронизировал email, имя, фамилию, статус, дату рождения и город; предпочтения пока сохраняются на фронте.'
        } else {
          this.profileMessage = 'Локальные поля профиля обновлены.'
        }

        this.isEditingProfile = false
      } catch (error) {
        this.profileError = error?.message || 'Не удалось сохранить изменения профиля.'
      } finally {
        this.isSavingProfile = false
      }
    },
    async removeProfile() {
      if (this.isRemovingProfile || this.isSavingProfile) {
        return
      }

      this.isRemovingProfile = true
      this.profileMessage = ''
      this.profileError = ''

      try {
        if (this.appState.user.username) {
          try {
            await deleteUserByUsername(this.appState.user.username)
          } catch (error) {
            if (!isNotFoundError(error)) {
              throw error
            }
          }
        }

        deleteUserProfile()
        this.$router.push('/')
      } catch (error) {
        this.profileError = error?.message || 'Не удалось удалить профиль.'
      } finally {
        this.isRemovingProfile = false
      }
    },
    openSolvedCase(caseId) {
      this.$router.push(`/case/${caseId}/chat`)
    },
    openCase(caseId) {
      this.$router.push(`/case/${caseId}`)
    },
  },
}
</script>

<style scoped>
.profile-page {
  display: grid;
  gap: 20px;
}

.profile-header,
.rank-card,
.switchable-card,
.edit-card {
  padding: 20px;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.avatar-frame {
  width: 94px;
  height: 94px;
  border-radius: 50%;
  border: 2px solid var(--border);
  overflow: hidden;
  background: var(--surface-subtle);
  display: grid;
  place-items: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-controls h2 {
  margin: 0 0 8px;
}

.meta-line {
  margin: 0;
  color: var(--text-muted);
}

.avatar-controls p {
  margin: 6px 0 0;
}

.avatar-upload {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
}

.avatar-upload input {
  max-width: 220px;
}

.header-actions {
  margin-top: 12px;
}

.edit-card h3,
.rank-card h3,
.switchable-card h3 {
  margin: 0 0 10px;
}

.profile-form {
  display: grid;
  gap: 8px;
}

.profile-form input,
.profile-form select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  background: var(--input-bg);
  color: var(--text-main);
}

.profile-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.error-text {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #be2a2a;
}

.success-text {
  margin: 10px 0 0;
  color: #2a5c17;
  font-weight: 600;
}

.stat-value {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
}

.switch-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.switch-tab {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-main);
  font-weight: 600;
}

.switch-tab.active {
  background: var(--surface-tab-active);
  border-color: var(--tab-active-border);
}

.solved-list {
  display: grid;
  gap: 8px;
}

.solved-item {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.achievement-item {
  border: 1px solid var(--success-border);
  border-radius: 12px;
  padding: 14px;
  background: var(--success-bg);
}

.achievement-item.inactive {
  border-color: var(--inactive-border);
  background: var(--inactive-bg);
}

.emoji {
  font-size: 1.8rem;
  line-height: 1;
}

.achievement-title {
  margin: 10px 0 6px;
  font-weight: 700;
}

.achievement-description,
.achievement-progress {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.achievement-progress {
  margin-top: 8px;
}

@media (max-width: 760px) {
  .avatar-upload input {
    max-width: 160px;
  }
}

@media (max-width: 640px) {
  .achievements-grid {
    grid-template-columns: 1fr;
  }
}
</style>
