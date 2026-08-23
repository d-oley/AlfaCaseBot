<template>
  <div class="container profile-page">
    <section class="card profile-header">
      <div class="avatar-block">
        <div class="avatar-frame">
          <img
            v-if="avatarSource && !avatarLoadFailed"
            :src="avatarSource"
            alt="Аватар пользователя"
            class="avatar-image"
            @error="handleAvatarLoadError"
          />
          <div v-else class="avatar-empty" role="img" aria-label="Аватар не установлен"></div>
        </div>

        <div class="avatar-controls">
          <h2>Личный кабинет</h2>
          <p class="meta-line">Имя: {{ fullName || 'Пока не указано' }}</p>
          <p class="meta-line">Логин: {{ appState.user.login || 'Пользователь' }}</p>
          <p class="meta-line">Статус: {{ roleLabel }}</p>
          <p class="meta-line">Город: {{ appState.user.city || 'Пока не выбран' }}</p>

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
        <label for="profile-avatar">Аватар</label>
        <input
          id="profile-avatar"
          type="file"
          accept="image/jpeg,image/jpg"
          :disabled="isSavingProfile"
          @change="onAvatarChange"
        />

        <label for="profile-first-name">Имя</label>
        <input id="profile-first-name" v-model.trim="profileForm.firstName" type="text" placeholder="Имя" />

        <label for="profile-last-name">Фамилия</label>
        <input id="profile-last-name" v-model.trim="profileForm.lastName" type="text" placeholder="Фамилия" />

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
          :disabled="isSavingProfile"
          :backend-error="cityLoadError"
          :selected-city-label="selectedCityLabel"
          @search-change="handleCitySearch"
        />

        <fieldset class="profile-tag-picker">
          <legend>Мне интересны...</legend>
          <label v-for="tag in preferenceTagOptions" :key="tag.id" class="profile-tag-option">
            <input
              v-model="profileForm.preferenceTagIds"
              type="checkbox"
              :value="Number(tag.id)"
              :disabled="isSavingProfile"
            >
            <span>{{ tag.name }}</span>
          </label>
        </fieldset>

        <label for="profile-difficulty">По сложности...</label>
        <select id="profile-difficulty" v-model="profileForm.preferenceDifficulty">
          <option value="">Пока без предпочтений</option>
          <option v-for="item in difficultyPreferenceOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <p v-if="profileError" class="error-text">{{ profileError }}</p>

        <div class="profile-actions">
          <button class="btn btn-primary" type="submit" :disabled="isSavingProfile">
            {{ isSavingProfile ? 'Сохранение...' : 'Сохранить изменения' }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="isSavingProfile" @click="cancelProfileEdit">
            Отмена
          </button>
        </div>
      </form>

      <p v-if="profileMessage" class="success-text">{{ profileMessage }}</p>
    </section>

    <section class="card rank-card">
      <h3>Место в рейтинге</h3>
      <p class="stat-value">{{ appState.user.rank > 0 ? `#${appState.user.rank}` : '—' }}</p>
    </section>

    <section class="card switchable-card">
      <div class="switch-tabs">
        <button class="switch-tab" :class="{ active: activeTab === 'solved' }" :style="activeTab === 'solved' ? activeTabStyle : null" type="button" @click="activeTab = 'solved'">
          <span class="switch-tab-label" :style="activeTab === 'solved' ? activeTabLabelStyle : null">Решенные кейсы</span>
        </button>
        <button class="switch-tab" :class="{ active: activeTab === 'achievements' }" :style="activeTab === 'achievements' ? activeTabStyle : null" type="button" @click="activeTab = 'achievements'">
          <span class="switch-tab-label" :style="activeTab === 'achievements' ? activeTabLabelStyle : null">Достижения</span>
        </button>
        <button class="switch-tab" :class="{ active: activeTab === 'favorites' }" :style="activeTab === 'favorites' ? activeTabStyle : null" type="button" @click="activeTab = 'favorites'">
          <span class="switch-tab-label" :style="activeTab === 'favorites' ? activeTabLabelStyle : null">Избранные кейсы</span>
        </button>
      </div>

      <div v-if="activeTab === 'solved'">
        <h3 class="active-section-title">Решенные кейсы</h3>
        <div v-if="solvedCases.length" class="solved-list">
          <button v-for="item in solvedCases" :key="item.caseId" class="solved-item" type="button" @click="openSolvedCase(item.caseId)">
            <span>{{ item.title }}</span>
            <span>{{ item.scorePercent }} / 100</span>
          </button>
        </div>
        <p v-else class="meta-line">Пока нет решенных кейсов.</p>
      </div>

      <div v-else-if="activeTab === 'favorites'">
        <h3 class="active-section-title">Избранные кейсы</h3>
        <div v-if="favoriteCases.length" class="solved-list">
          <button v-for="item in favoriteCases" :key="item.id" class="solved-item" type="button" @click="openCase(item.id)">
            <span>{{ item.title }}</span>
            <span>Открыть кейс</span>
          </button>
        </div>
        <p v-else class="meta-line">Пока нет избранных кейсов.</p>
      </div>

      <div v-else>
        <h3 class="active-section-title">Достижения</h3>
        <div class="achievements-grid">
          <button
            v-for="(item, index) in achievements"
            :key="item.id"
            class="achievement-item"
            :class="{ inactive: !item.active }"
            type="button"
            :aria-label="`${item.title}. ${item.active ? 'Достижение получено' : 'Достижение ещё не получено'}`"
            @click="openAchievement(item)"
          >
            <span class="achievement-visual">
              <img v-if="item.iconUrl" class="achievement-icon" :src="item.iconUrl" alt="" />
              <span v-else class="achievement-code">A—{{ String(index + 1).padStart(2, '0') }}</span>
              <span v-if="!item.active" class="achievement-lock" aria-hidden="true">🔒</span>
            </span>
            <p class="achievement-title">{{ item.title }}</p>
          </button>
        </div>
        <p v-if="!achievements.length" class="meta-line">Достижения пока недоступны.</p>
      </div>
    </section>

    <div
      v-if="selectedAchievement"
      class="achievement-modal-overlay"
      role="presentation"
      @click.self="closeAchievement"
    >
      <section
        class="achievement-modal card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`achievement-title-${selectedAchievement.id}`"
      >
        <button class="achievement-modal-close" type="button" aria-label="Закрыть" @click="closeAchievement">×</button>
        <div class="achievement-modal-visual" :class="{ inactive: !selectedAchievement.active }">
          <img v-if="selectedAchievement.iconUrl" :src="selectedAchievement.iconUrl" alt="" />
          <span v-else class="achievement-modal-placeholder">A—{{ selectedAchievement.id }}</span>
          <span v-if="!selectedAchievement.active" class="achievement-modal-lock" aria-hidden="true">🔒</span>
        </div>
        <p class="achievement-modal-label">
          {{ selectedAchievement.active ? '✓ Достижение получено' : '🔒 Достижение ещё не получено' }}
        </p>
        <h2 :id="`achievement-title-${selectedAchievement.id}`">{{ selectedAchievement.title }}</h2>
        <p class="achievement-modal-description">{{ selectedAchievement.description }}</p>
        <p v-if="selectedAchievement.obtainedAt" class="achievement-modal-date">
          Получено {{ formatAchievementDate(selectedAchievement.obtainedAt) }}
        </p>
      </section>
    </div>
  </div>
</template>

<script>
import CitySelect from '@/components/CitySelect.vue'
import {
  changeEmail,
  changeUserParams,
  formatBirthdateForApi,
  getCaseAssetUrl,
  getCurrentUserProfile,
  listCities,
  saveUserPreferences,
  setProfilePicture,
} from '@/api/authApi'
import {
  appState,
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
  updateUserPreferences,
  updateUserProfile,
} from '@/store/appState'

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
      pendingAvatarFile: null,
      avatarLoadFailed: false,
      profileMessage: '',
      profileError: '',
      isSavingProfile: false,
      isEditingProfile: false,
      activeTab: 'solved',
      selectedAchievement: null,
      activeTabStyle: {
        backgroundColor: '#11110f',
        borderColor: '#11110f',
        color: '#ffffff',
      },
      activeTabLabelStyle: {
        color: '#ffffff',
        WebkitTextFillColor: '#ffffff',
      },
      profileForm: {
        firstName: '',
        lastName: '',
        email: '',
        birthDate: '',
        role: '',
        cityId: null,
        preferenceTagIds: [],
        preferenceDifficulty: '',
      },
    }
  },
  computed: {
    avatarSource() {
      return this.objectUrl || this.appState.user.avatarUrl || ''
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
  watch: {
    avatarSource() {
      this.avatarLoadFailed = false
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
    resetProfileMessages() {
      this.profileMessage = ''
      this.profileError = ''
    },
    getSelectedCity() {
      return this.cities.find((item) => Number(item.id) === Number(this.profileForm.cityId)) || null
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
      this.profileForm.email = this.appState.user.email || ''
      this.profileForm.birthDate = this.appState.user.birthDate || ''
      this.profileForm.role = this.appState.user.role || ''
      this.profileForm.cityId = this.appState.user.cityId ?? null
      this.profileForm.preferenceTagIds = [...(this.appState.user.preferences?.tagIds || [])]
      this.profileForm.preferenceDifficulty = this.appState.user.preferences?.difficulty || ''
    },
    startProfileEdit() {
      this.resetProfileMessages()
      this.clearPendingAvatar()
      this.fillFormFromState()
      this.isEditingProfile = true
    },
    cancelProfileEdit() {
      this.isEditingProfile = false
      this.clearPendingAvatar()
      this.resetProfileMessages()
    },
    clearPendingAvatar() {
      this.pendingAvatarFile = null
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = ''
      }
    },
    handleAvatarLoadError() {
      if (!this.objectUrl) {
        this.avatarLoadFailed = true
      }
    },
    async onAvatarChange(event) {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      this.resetProfileMessages()
      if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
        this.profileError = 'Допустимы только изображения JPEG/JPG.'
        event.target.value = ''
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        this.profileError = 'Размер аватара не должен превышать 5 МБ.'
        event.target.value = ''
        return
      }

      this.clearPendingAvatar()
      this.pendingAvatarFile = file
      this.objectUrl = URL.createObjectURL(file)
      this.avatarLoadFailed = false
      event.target.value = ''
    },
    async saveProfile() {
      if (this.isSavingProfile) {
        return
      }

      this.isSavingProfile = true
      this.resetProfileMessages()

      const previousUser = { ...this.appState.user }
      const selectedCity = this.getSelectedCity()
      const emailChanged = this.profileForm.email !== (previousUser.email || '')
      const profileParamsChanged =
        this.profileForm.firstName !== (previousUser.firstName || '') ||
        this.profileForm.lastName !== (previousUser.lastName || '') ||
        this.profileForm.birthDate !== (previousUser.birthDate || '') ||
        this.profileForm.role !== (previousUser.role || '') ||
        Number(this.profileForm.cityId || 0) !== Number(previousUser.cityId || 0)

      try {
        if (emailChanged) {
          await changeEmail({
            email: this.profileForm.email,
          })
        }

        if (profileParamsChanged) {
          await changeUserParams({
            firstName: this.profileForm.firstName,
            lastName: this.profileForm.lastName,
            birthdate: formatBirthdateForApi(this.profileForm.birthDate),
            status: this.profileForm.role,
            cityId: this.profileForm.cityId,
          })
        }

        if (this.pendingAvatarFile) {
          await setProfilePicture(this.pendingAvatarFile)
          const refreshedProfile = await getCurrentUserProfile()
          const storedAvatarUrl = getCaseAssetUrl(refreshedProfile?.avatarUrl)
          const avatarUrl = storedAvatarUrl ? `${storedAvatarUrl}?v=${Date.now()}` : ''
          setUserAvatar(avatarUrl)
          this.clearPendingAvatar()
          this.avatarLoadFailed = false
        }

        const preferences = await saveUserPreferences({
          tagIds: this.profileForm.preferenceTagIds,
          difficulty: this.profileForm.preferenceDifficulty,
        })
        const selectedPreferenceNames = this.preferenceTagOptions
          .filter((tag) => preferences.tagIds.includes(Number(tag.id)))
          .map((tag) => tag.name)
        updateUserPreferences({
          ...preferences,
          tags: preferences.tags.length ? preferences.tags : selectedPreferenceNames,
        })

        updateUserProfile({
          firstName: this.profileForm.firstName,
          lastName: this.profileForm.lastName,
          email: this.profileForm.email,
          birthDate: this.profileForm.birthDate,
          role: this.profileForm.role,
          cityId: selectedCity?.id ?? previousUser.cityId ?? null,
          city: selectedCity?.cityName || previousUser.city || '',
          region: selectedCity?.regionName || previousUser.region || '',
        })

        this.profileMessage = 'Изменения сохранены.'

        this.isEditingProfile = false
      } catch (error) {
        this.profileError = error?.message || 'Не удалось сохранить изменения профиля.'
      } finally {
        this.isSavingProfile = false
      }
    },
    openSolvedCase(caseId) {
      this.$router.push(`/case/${caseId}/chat`)
    },
    openCase(caseId) {
      this.$router.push(`/case/${caseId}`)
    },
    openAchievement(achievement) {
      this.selectedAchievement = achievement
    },
    closeAchievement() {
      this.selectedAchievement = null
    },
    formatAchievementDate(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(date)
    },
  },
}
</script>

<style scoped>
.profile-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
}

.profile-header,
.rank-card,
.switchable-card,
.edit-card {
  padding: clamp(20px, 3vw, 36px);
}

.profile-header { min-height: 230px; }
.rank-card { background: var(--primary); color: #fff; display: flex; flex-direction: column; justify-content: space-between; }
.rank-card h3 { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; }
.edit-card, .switchable-card { grid-column: 1 / -1; }

.avatar-block {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.avatar-frame {
  width: 94px;
  height: 94px;
  border-radius: 0;
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
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 0.95;
  text-transform: uppercase;
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
  border-radius: 0;
  padding: 10px 12px;
  font-size: 0.95rem;
  background: var(--input-bg);
  color: var(--text-main);
}

.profile-tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0;
  padding: 0;
  border: 0;
}

.profile-tag-picker legend {
  width: 100%;
  margin-bottom: 4px;
}

.profile-tag-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  background: var(--secondary-bg);
  cursor: pointer;
}

.profile-tag-option input {
  width: auto;
  padding: 0;
}

.profile-tag-option:has(input:checked) {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, var(--secondary-bg));
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
  font-size: clamp(3rem, 7vw, 6rem);
  font-weight: 900;
  line-height: 0.8;
}

.switch-tabs {
  display: flex;
  gap: 0;
  flex-wrap: wrap;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.switch-tab {
  border: 1px solid var(--border);
  border-radius: 0;
  border-bottom: 0;
  background: var(--input-bg);
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-main) !important;
  font-weight: 600;
}

.switch-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff !important;
}

.switch-tab-label {
  color: var(--text-main);
  -webkit-text-fill-color: var(--text-main);
}

.switch-tab.active .switch-tab-label {
  color: #fff;
  -webkit-text-fill-color: #fff;
}

.active-section-title {
  color: var(--text-main) !important;
  -webkit-text-fill-color: var(--text-main);
}

.solved-list {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--border);
}

.solved-item {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 0;
  border-top: 0;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.achievement-item {
  position: relative;
  border: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  padding: 20px;
  background: transparent;
  color: var(--text-main);
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.achievement-item:hover,
.achievement-item:focus-visible {
  z-index: 1;
  background: var(--surface-muted);
  box-shadow: inset 0 0 0 2px var(--primary);
  outline: none;
}

.achievement-item.inactive {
  border-color: var(--inactive-border);
  background: var(--inactive-bg);
  color: var(--text-muted);
}

.achievement-item.inactive .achievement-icon {
  filter: grayscale(1);
  opacity: 0.35;
}

.achievement-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 48px;
  min-height: 48px;
  width: max-content;
  margin: 0 auto;
}

.achievement-lock {
  position: absolute;
  right: -8px;
  bottom: -5px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  font-size: 0.75rem;
}

.achievement-code {
  font-family: var(--font-mono);
  color: var(--primary);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
}

.achievement-title {
  margin: 10px 0 6px;
  font-weight: 700;
  text-align: center;
}

.achievement-description {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.achievement-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay-bg);
}

.achievement-modal {
  position: relative;
  width: min(480px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: clamp(24px, 5vw, 40px);
  text-align: center;
  box-shadow: 10px 10px 0 var(--primary);
}

.achievement-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-main);
  font-size: 1.35rem;
  cursor: pointer;
}

.achievement-modal-visual {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 160px;
  height: 160px;
  margin-top: 12px;
}

.achievement-modal-visual img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.achievement-modal-visual.inactive img {
  filter: grayscale(1);
  opacity: 0.35;
}

.achievement-modal-lock {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 2.5rem;
}

.achievement-modal-placeholder {
  font-family: var(--font-mono);
  color: var(--primary);
  font-size: 1.25rem;
}

.achievement-modal-label {
  margin: 18px 0 8px;
  color: var(--primary);
  font-weight: 800;
}

.achievement-modal h2 {
  margin: 0;
}

.achievement-modal-description {
  margin: 14px 0 0;
  color: var(--text-muted);
  line-height: 1.55;
}

.achievement-modal-date {
  margin: 18px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

@media (max-width: 760px) {
  .profile-page { grid-template-columns: 1fr; }
  .edit-card, .switchable-card { grid-column: auto; }
  .achievements-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .avatar-upload input {
    max-width: 160px;
  }
}

@media (max-width: 640px) {
  .switchable-card {
    padding-inline: 16px;
  }

  .switch-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .switch-tab {
    min-width: 0;
    min-height: 58px;
    padding: 8px 5px;
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .switch-tab + .switch-tab {
    border-left: 0;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }
}

.achievement-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
</style>
