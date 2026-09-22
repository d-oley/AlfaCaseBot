<template>
  <div class="container public-profile-page">
    <router-link class="back-link" to="/">← На главную</router-link>
    <p v-if="loading" role="status">Загружаем профиль...</p>
    <section v-else-if="error" class="card profile-card">
      <div>
        <p class="error-text" role="alert">{{ error }}</p>
        <button class="btn btn-secondary" type="button" @click="load">Повторить загрузку</button>
      </div>
    </section>
    <template v-else>
      <section class="card profile-card">
        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="Аватар участника" />
        <div>
          <p class="eyebrow">Публичный профиль</p>
          <h1>{{ displayName }}</h1>
          <p v-if="profile.nickname">@{{ profile.nickname }}</p>
          <p>{{ profile.city || 'Город не указан' }}</p>
          <p>Место: {{ profile.rank || '—' }} · Баллы: {{ profile.points || 0 }}</p>
        </div>
      </section>
      <section class="card achievements-card">
        <h2>Достижения</h2>
        <div class="achievements">
          <article v-for="item in achievements" :key="item.id" :class="{ inactive: !item.active }">
            <strong>{{ item.title }}</strong><p>{{ item.description }}</p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { getCaseAssetUrl, getUserProfileById, listUserAchievements, mapApiProfileToState } from '@/api/authApi'

export default {
  name: 'PublicProfilePage',
  data: () => ({ profile: {}, achievements: [], loading: false, error: '', loadVersion: 0 }),
  computed: {
    displayName() {
      return [this.profile.firstName, this.profile.middleName, this.profile.lastName].filter(Boolean).join(' ') || this.profile.nickname || 'Пользователь'
    },
  },
  watch: {
    '$route.params.id'() { this.load() },
  },
  created() { this.load() },
  methods: {
    async load() {
      const version = ++this.loadVersion
      this.loading = true
      this.error = ''
      try {
        const id = Number(this.$route.params.id)
        if (!id) throw new Error('Некорректный ID пользователя.')
        const [profile, achievements] = await Promise.all([getUserProfileById(id), listUserAchievements(id)])
        if (version !== this.loadVersion) return
        this.profile = mapApiProfileToState(profile)
        this.profile.avatarUrl = getCaseAssetUrl(profile?.avatarUrl)
        this.achievements = achievements
      } catch (error) {
        if (version !== this.loadVersion) return
        this.profile = {}
        this.achievements = []
        this.error = error?.message || 'Не удалось загрузить профиль.'
      } finally {
        if (version === this.loadVersion) this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.public-profile-page { display: grid; gap: 22px; }
.profile-card, .achievements-card { padding: clamp(20px, 4vw, 36px); }
.profile-card { display: flex; gap: 24px; align-items: center; }
.profile-card img { width: 120px; height: 120px; object-fit: cover; border: 1px solid var(--border); }
.profile-card h1 { margin: 5px 0; }
.eyebrow { color: var(--primary); text-transform: uppercase; }
.achievements { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.achievements article { padding: 16px; border: 1px solid var(--border); }
.achievements article.inactive { opacity: .55; }
@media (max-width: 560px) { .profile-card { align-items: flex-start; flex-direction: column; } }
</style>
