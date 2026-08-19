<template>
  <section class="benefits">
    <h2>Почему это удобно</h2>
    <div class="benefits-grid">
      <article v-for="(item, index) in items" :key="item.title" class="benefit-card">
        <span class="benefit-number">0{{ index + 1 }}</span>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
// BenefitsSection.vue: секция с ключевыми преимуществами продукта на главной странице.
export default {
  name: 'BenefitsSection',
  data() {
    return {
      items: [
        {
          title: 'Проверка по критериям',
          text:
            'Ответ оценивается по заранее заданным критериям: структура, логика, обоснованность выводов и качество источников.',
        },
        {
          title: 'Пошаговая обратная связь',
          text:
            'Система объясняет сильные и слабые места решения и подсказывает, что улучшить в следующей итерации.',
        },
        {
          title: 'Трекинг прогресса',
          text: 'Следите за динамикой оценок, темами кейсов и личным прогрессом в удобном формате.',
        },
        {
          title: 'Учеба без готовых ответов',
          text:
            'Тренажер не выдает финальные решения, а развивает навык самостоятельного анализа и принятия решений.',
        },
      ],
    }
  },
}
</script>

<style scoped>
h2 {
  margin: 0;
  padding: 18px 0;
  border-top: 4px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-size: clamp(2rem, 4vw, 4rem);
  text-transform: uppercase;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
}

.benefit-card {
  min-height: 220px;
  padding: 24px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 18px;
}

.benefit-card:nth-child(even) { border-right: 0; }
.benefit-number { font-family: var(--mono-font); color: var(--primary); font-weight: 800; }

h3 {
  margin: 0 0 8px;
  font-size: clamp(1.35rem, 2.5vw, 2.2rem);
  text-transform: uppercase;
}

p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

@media (max-width: 700px) {
  .benefits-grid { grid-template-columns: 1fr; }
  .benefit-card { border-right: 0; grid-template-columns: 42px 1fr; min-height: 170px; }
}
</style>
