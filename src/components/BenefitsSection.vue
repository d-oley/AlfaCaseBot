<template>
  <section class="benefits">
    <h2>Почему это удобно</h2>
    <div class="benefits-grid">
      <article v-for="item in items" :key="item.title" class="card benefit-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
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
  margin: 0 0 18px;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
}

.benefit-card {
  padding: 18px;
}

h3 {
  margin: 0 0 8px;
}

p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
