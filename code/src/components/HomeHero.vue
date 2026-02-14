<template>
  <section class="hero card">
    <p class="badge">ИИ-тренажер с бизнес-кейсами</p>
    <h1>Прокачивай проектное мышление на реальных задачах</h1>
    <p class="hero-text">
      AlfaCaseBot помогает школьникам и студентам разбирать кейсы, получать структурную обратную
      связь и постепенно повышать уровень решений.
    </p>
    <div class="hero-actions">
      <button class="btn btn-primary" type="button" @click="$emit('open-register')">
        Начать
      </button>
      <button class="btn btn-ghost" type="button" @click="$emit('open-login')">
        У меня уже есть аккаунт
      </button>
    </div>
  </section>
</template>

<script>
// HomeHero.vue: главный промо-блок публичной страницы с CTA-кнопками.
export default {
  name: 'HomeHero',
  emits: ['open-login', 'open-register'],
}
</script>

<style scoped>
.hero {
  padding: 36px;
  backdrop-filter: blur(4px);
  background: rgba(255, 255, 255, 0.85);
}

.badge {
  display: inline-block;
  margin: 0 0 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--secondary-bg);
  color: var(--text-main);
  font-weight: 600;
  font-size: 0.9rem;
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(1.9rem, 3vw, 2.8rem);
  line-height: 1.15;
}

.hero-text {
  margin: 0;
  max-width: 740px;
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}

.hero-actions {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 760px) {
  .hero {
    padding: 24px;
  }
}
</style>
