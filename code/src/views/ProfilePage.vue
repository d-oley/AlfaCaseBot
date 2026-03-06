<template>
  <div class="container profile-page">
    <section class="card profile-header">
      <div class="avatar-block">
        <div class="avatar-frame">
          <img :src="avatarSource" alt="Аватар пользователя" class="avatar-image" />
        </div>
        <div class="avatar-controls">
          <h2>Личный кабинет</h2>
          <p class="meta-line">Логин: {{ appState.user.login || 'Пользователь' }}</p>
          <p class="meta-line">Статус: {{ appState.user.role || 'Не указан' }}</p>
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
        <label for="profile-login">Логин</label>
        <input id="profile-login" v-model.trim="profileForm.login" type="text" />

        <label for="profile-email">Почта</label>
        <input id="profile-email" v-model.trim="profileForm.email" type="email" />

        <label for="profile-birth">Дата рождения</label>
        <input id="profile-birth" v-model="profileForm.birthDate" type="date" />

        <label for="profile-role">Статус учащегося</label>
        <select id="profile-role" v-model="profileForm.role">
          <option value="" disabled>Выберите статус</option>
          <option v-for="role in roleOptions" :key="role" :value="role">
            {{ role }}
          </option>
        </select>

        <p v-if="profileError" class="error-text">{{ profileError }}</p>

        <div class="profile-actions">
          <button class="btn btn-primary" type="submit" :disabled="isSavingProfile || isRemovingProfile">
            {{ isSavingProfile ? 'Сохранение...' : 'Сохранить изменения' }}
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="isSavingProfile || isRemovingProfile"
            @click="cancelProfileEdit"
          >
            Отмена
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="isSavingProfile || isRemovingProfile"
            @click="removeProfile"
          >
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
        <button
          class="switch-tab"
          :class="{ active: activeTab === 'solved' }"
          type="button"
          @click="activeTab = 'solved'"
        >
          Решенные кейсы
        </button>
        <button
          class="switch-tab"
          :class="{ active: activeTab === 'achievements' }"
          type="button"
          @click="activeTab = 'achievements'"
        >
          Достижения
        </button>
        <button
          class="switch-tab"
          :class="{ active: activeTab === 'favorites' }"
          type="button"
          @click="activeTab = 'favorites'"
        >
          Избранные кейсы
        </button>
      </div>

      <div v-if="activeTab === 'solved'">
        <h3>Решенные кейсы</h3>
        <div v-if="solvedCases.length" class="solved-list">
          <button
            v-for="item in solvedCases"
            :key="item.caseId"
            class="solved-item"
            type="button"
            @click="openSolvedCase(item.caseId)"
          >
            <span>{{ item.title }}</span>
            <span>{{ item.score }} / 10</span>
          </button>
        </div>
        <p v-else class="meta-line">Пока нет решенных кейсов.</p>
      </div>

      <div v-else-if="activeTab === 'favorites'">
        <h3>Избранные кейсы</h3>
        <div v-if="favoriteCases.length" class="solved-list">
          <button
            v-for="item in favoriteCases"
            :key="item.id"
            class="solved-item"
            type="button"
            @click="openCase(item.id)"
          >
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
            <p>{{ item.title }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// ProfilePage.vue: личный кабинет с аватаром, управлением профиля, кейсами и достижениями.
import { changeEmail, deleteUserByUsername, isNotFoundError } from '@/api/authApi'
import {
  appState,
  deleteUserProfile,
  getFavoriteCasesForUser,
  getRoleOptions,
  getSolvedCasesForUser,
  setUserAvatar,
  updateUserProfile,
} from '@/store/appState'

const LOGIN_REGEX = /^\S{3,20}$/

export default {
  name: 'ProfilePage',
  data() {
    return {
      appState,
      roleOptions: getRoleOptions(),
      objectUrl: '',
      profileMessage: '',
      profileError: '',
      isSavingProfile: false,
      isRemovingProfile: false,
      isEditingProfile: false,
      activeTab: 'solved',
      profileForm: {
        login: '',
        email: '',
        birthDate: '',
        role: '',
      },
      achievements: [
        { id: 1, active: true, emoji: '❤️', title: 'Первый вход' },
        { id: 2, active: true, emoji: '✨', title: '3 кейса решено' },
        { id: 3, active: true, emoji: '🎉', title: 'Лучший результат 8+' },
        { id: 4, active: true, emoji: '🚀', title: 'Неделя активности' },
        { id: 5, active: false, emoji: '🏆', title: '10 кейсов решено' },
        { id: 6, active: false, emoji: '🔥', title: '5 дней подряд' },
        { id: 7, active: false, emoji: '🧠', title: 'Эксперт аналитики' },
        { id: 8, active: false, emoji: '🌟', title: 'Топ-10 рейтинга' },
      ],
    }
  },
  computed: {
    avatarSource() {
      return this.appState.user.avatarUrl || this.appState.noPhotoImage
    },
    solvedCases() {
      return getSolvedCasesForUser()
    },
    favoriteCases() {
      return getFavoriteCasesForUser()
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
    fillFormFromState() {
      this.profileForm.login = this.appState.user.login || ''
      this.profileForm.email = this.appState.user.email || ''
      this.profileForm.birthDate = this.appState.user.birthDate || ''
      this.profileForm.role = this.appState.user.role || ''
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

      this.isSavingProfile = true
      this.profileMessage = ''
      this.profileError = ''

      if (!LOGIN_REGEX.test(this.profileForm.login)) {
        this.profileError = 'Логин должен содержать от 3 до 20 символов без пробелов.'
        this.isSavingProfile = false
        return
      }

      const previousUser = { ...this.appState.user }
      const emailChanged = this.profileForm.email !== (previousUser.email || '')
      const unsupportedChanged =
        this.profileForm.login !== (previousUser.login || '') ||
        this.profileForm.birthDate !== (previousUser.birthDate || '') ||
        this.profileForm.role !== (previousUser.role || '')

      try {
        if (emailChanged && previousUser.id) {
          await changeEmail({
            id: previousUser.id,
            email: this.profileForm.email,
          })
        }

        updateUserProfile({
          login: this.profileForm.login,
          email: this.profileForm.email,
          birthDate: this.profileForm.birthDate,
          role: this.profileForm.role,
        })

        if (emailChanged && previousUser.id && unsupportedChanged) {
          this.profileMessage = 'Почта сохранена на сервере. Остальные поля обновлены локально.'
        } else if (emailChanged && !previousUser.id) {
          this.profileMessage = 'Профиль обновлен локально. Почта пока не синхронизирована с сервером.'
        } else {
          this.profileMessage = 'Профиль обновлен.'
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
  color: var(--text-muted);
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.achievement-item {
  border: 1px solid var(--success-border);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  background: var(--success-bg);
}

.achievement-item.inactive {
  border-color: var(--inactive-border);
  background: var(--inactive-bg);
}

.emoji {
  font-size: 2rem;
  line-height: 1;
}

.achievement-item p {
  margin: 8px 0 0;
  font-size: 0.8rem;
}

@media (max-width: 980px) {
  .achievements-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .avatar-upload input {
    max-width: 160px;
  }
}

@media (max-width: 640px) {
  .achievements-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
