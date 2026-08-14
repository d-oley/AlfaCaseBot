<template>
  <section class="podium">
    <div class="podium-heading">
      <p>Все участники / общий зачёт</p>
      <h2>Глобальные лидеры</h2>
    </div>
    <div class="podium-grid">
      <article v-for="user in orderedUsers" :key="user.id" class="podium-user">
        <p class="place">{{ String(user.rank).padStart(2, '0') }}</p>
        <img
          v-if="hasAvatar(user)"
          :src="user.avatarUrl"
          :alt="`Аватар ${user.login}`"
          class="avatar"
          @error="hideAvatar(user.id)"
        />
        <div v-else class="avatar avatar-empty" role="img" :aria-label="`Аватар ${user.login} не установлен`"></div>
        <div class="identity">
          <p class="name">{{ getDisplayName(user) }}</p>
          <p class="login">@{{ user.login }}</p>
        </div>
        <p class="meta">{{ user.city || 'Город не указан' }}</p>
        <p class="points">{{ user.points }} <small>очков</small></p>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'UserPodium',
  props: {
    users: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      failedAvatarIds: [],
    }
  },
  watch: {
    users() {
      this.failedAvatarIds = []
    },
  },
  computed: {
    orderedUsers() {
      return [...this.users].sort((a, b) => a.rank - b.rank)
    },
  },
  methods: {
    hasAvatar(user) {
      return Boolean(user?.avatarUrl) && !this.failedAvatarIds.includes(user.id)
    },
    hideAvatar(id) {
      if (!this.failedAvatarIds.includes(id)) {
        this.failedAvatarIds.push(id)
      }
    },
    getDisplayName(user) {
      const isKnownName = (value) => {
        const normalized = String(value || '').trim()
        return normalized && normalized.toLowerCase() !== 'unknown'
      }
      const fullName = [user?.firstName, user?.lastName].filter(isKnownName).join(' ').trim()
      return fullName || 'Таинственный пользователь'
    },
  },
}
</script>

<style scoped>
.podium {
  border-top: 4px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--card-bg);
}

.podium-heading {
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  border-bottom: 1px solid var(--border);
}
.podium-heading p { margin: 0; color: var(--primary); font-family: var(--mono-font); font-size: .72rem; text-transform: uppercase; }
.podium h2 { margin: 0; font-size: clamp(2rem, 4vw, 4rem); text-transform: uppercase; line-height: .9; }

.podium-grid {
  display: grid;
  gap: 0;
}

.podium-user {
  min-height: 88px;
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  background: transparent;
  display: grid;
  grid-template-columns: 70px 54px minmax(0, 1fr) minmax(120px, .5fr) 140px;
  gap: 16px;
  align-items: center;
}
.podium-user:last-child { border-bottom: 0; }

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 0;
  object-fit: cover;
}

.avatar-empty {
  display: block;
  background: var(--surface-subtle);
  border: 1px solid var(--border);
}

.place,
.name,
.login,
.meta,
.points {
  margin: 0;
}
.place { font-family: var(--display-font); font-size: 2.6rem; color: var(--primary); }

.name {
  font-weight: 700;
}

.login,
.meta,
.points {
  color: var(--text-muted);
}
.login { font-family: var(--mono-font); font-size: .78rem; }
.points { color: var(--text-main); font-family: var(--display-font); font-size: 1.8rem; text-align: right; }
.points small { font-family: Arial, sans-serif; font-size: .7rem; text-transform: uppercase; }

@media (max-width: 700px) {
  .podium-heading { align-items: start; flex-direction: column; }
  .podium-user { grid-template-columns: 42px 42px 1fr; padding: 12px; }
  .avatar { width: 42px; height: 42px; }
  .place { font-size: 1.8rem; }
  .meta { display: none; }
  .points { grid-column: 3; text-align: left; font-size: 1.2rem; }
}
</style>
