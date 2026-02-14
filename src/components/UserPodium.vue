<template>
  <section class="podium card">
    <h2>Топ-3 пользователей</h2>
    <div class="podium-grid">
      <article v-for="user in orderedUsers" :key="user.id" class="podium-user">
        <img :src="user.avatarUrl || fallbackAvatar" :alt="`Аватар ${user.login}`" class="avatar" />
        <p class="place">#{{ user.id }}</p>
        <p class="login">{{ user.login }}</p>
        <p class="points">{{ user.points }} очков</p>
      </article>
    </div>
  </section>
</template>

<script>
// UserPodium.vue: блок рейтинга с отображением топ-3 пользователей.
export default {
  name: 'UserPodium',
  props: {
    users: {
      type: Array,
      default: () => [],
    },
    fallbackAvatar: {
      type: String,
      required: true,
    },
  },
  computed: {
    orderedUsers() {
      return [...this.users].sort((a, b) => a.id - b.id)
    },
  },
}
</script>

<style scoped>
.podium {
  padding: 20px;
}

.podium h2 {
  margin: 0 0 14px;
}

.podium-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}

.podium-user {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  background: #f8faff;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.place,
.login,
.points {
  margin: 6px 0 0;
}

.login {
  font-weight: 700;
}

.points {
  color: var(--text-muted);
}
</style>
