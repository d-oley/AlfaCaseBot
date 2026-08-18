<template>
  <section class="hero">
    <div class="hero-index" aria-hidden="true">
      <span class="hero-wordmark">CASE</span>
      <span>ALFA CASE BOT</span>
    </div>
    <div class="hero-content">
      <p class="badge">Практика / Аналитика / Решения</p>
      <h1>Решай реальные задачи.<br /><em>Доказывай</em> свою идею.</h1>
      <p class="hero-text">
        Тренажёр бизнес-кейсов для тех, кто хочет мыслить структурно, проверять гипотезы и видеть
        прогресс без готовых ответов.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary" type="button" @click="$emit('open-register')">
          Начать практику ↗
        </button>
        <button class="btn btn-ghost" type="button" @click="$emit('open-login')">
          Войти
        </button>
      </div>
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
  min-height: min(620px, 70vh);
  display: grid;
  grid-template-columns: minmax(180px, 0.34fr) 1fr;
  border: 1px solid var(--border);
  background: var(--hero-bg);
}

.hero-index {
  padding: 24px;
  border-right: 1px solid var(--border);
  background: var(--primary);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: var(--mono-font);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.hero-wordmark {
  font-family: var(--display-font);
  font-size: clamp(3.2rem, 5vw, 4.5rem);
  line-height: 0.9;
  letter-spacing: -0.04em;
}

.hero-content {
  padding: clamp(28px, 6vw, 76px);
  align-self: center;
}

.badge {
  margin: 0 0 28px;
  font-family: var(--mono-font);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 28px;
  max-width: 950px;
  font-size: clamp(3rem, 7.2vw, 7.4rem);
  line-height: 0.86;
  text-transform: uppercase;
}

h1 em { color: var(--primary); font-style: normal; }

.hero-text {
  margin: 0;
  max-width: 620px;
  color: var(--text-muted);
  font-size: clamp(1rem, 1.8vw, 1.3rem);
  line-height: 1.45;
}

.hero-actions {
  margin-top: 34px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 760px) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
  }
  .hero-index {
    min-height: 72px;
    padding: 16px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
    flex-direction: row;
  }
  .hero-wordmark { font-size: 2.6rem; }
  .hero-content { padding: 28px 20px 36px; }
  h1 { font-size: clamp(2.7rem, 15vw, 5rem); }
}
</style>
