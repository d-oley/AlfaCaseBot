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
          <p>Изображение меняется локально как заглушка, без отправки на сервер.</p>
        </div>
      </div>
    </section>

    <section class="card edit-card">
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
          <button class="btn btn-primary" type="submit">Сохранить изменения</button>
          <button class="btn btn-secondary" type="button" @click="removeProfile">Удалить профиль</button>
        </div>
      </form>
      <p v-if="profileMessage" class="success-text">{{ profileMessage }}</p>
    </section>

    <section class="card rank-card">
      <h3>Место в рейтинге</h3>
      <p class="stat-value">#{{ appState.user.rank }}</p>
    </section>

    <section class="card solved-card">
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
    </section>

    <section class="card achievements-card">
      <h3>Достижения</h3>
      <div class="achievements-grid">
        <div
          v-for="item in achievementSlots"
          :key="item.id"
          class="achievement-item"
          :class="{ inactive: !item.active, empty: item.empty }"
        >
          <template v-if="!item.empty">
            <img :src="achievementImage" alt="Достижение" />
            <p>Проведи 24 часа на сайте</p>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// ProfilePage.vue: личный кабинет с аватаром, редактированием профиля, кейсами и достижениями.
import achievementImage from '@/assets/achievement.png'
import {
  appState,
  deleteUserProfile,
  getRoleOptions,
  getSolvedCasesForUser,
  setUserAvatar,
  updateUserProfile,
} from '@/store/appState'

const LOGIN_REGEX = /^[A-Za-z0-9]+$/

export default {
  name: 'ProfilePage',
  data() {
    return {
      appState,
      achievementImage,
      roleOptions: getRoleOptions(),
      objectUrl: '',
      profileMessage: '',
      profileError: '',
      profileForm: {
        login: '',
        email: '',
        birthDate: '',
        role: '',
      },
      achievements: [
        { id: 1, active: true },
        { id: 2, active: true },
        { id: 3, active: true },
        { id: 4, active: true },
        { id: 5, active: false },
        { id: 6, active: false },
        { id: 7, active: false },
        { id: 8, active: false },
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
    achievementSlots() {
      const slots = [...this.achievements]
      const emptyCount = Math.max(0, 16 - slots.length)
      for (let index = 0; index < emptyCount; index += 1) {
        slots.push({ id: `empty-${index + 1}`, active: false, empty: true })
      }
      return slots
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
    saveProfile() {
      this.profileMessage = ''
      this.profileError = ''

      if (!LOGIN_REGEX.test(this.profileForm.login)) {
        this.profileError = 'Логин должен содержать только латинские буквы и цифры.'
        return
      }

      updateUserProfile({
        login: this.profileForm.login,
        email: this.profileForm.email,
        birthDate: this.profileForm.birthDate,
        role: this.profileForm.role,
      })

      this.profileMessage = 'Профиль обновлен.'
    },
    removeProfile() {
      deleteUserProfile()
      this.$router.push('/')
    },
    openSolvedCase(caseId) {
      this.$router.push(`/case/${caseId}/chat`)
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
.achievements-card,
.solved-card,
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
  background: #f2f6ff;
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

.edit-card h3,
.rank-card h3,
.achievements-card h3,
.solved-card h3 {
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
  background: #fff;
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

.solved-list {
  display: grid;
  gap: 8px;
}

.solved-item {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f8faff;
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
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  background: #f8faff;
}

.achievement-item.empty {
  border-style: dashed;
  background: transparent;
}

.achievement-item img {
  width: 100%;
  height: 82px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
}

.achievement-item p {
  margin: 6px 0 0;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.achievement-item:hover p {
  opacity: 1;
}

.achievement-item.inactive img {
  filter: grayscale(1);
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

