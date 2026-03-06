<template>
  <div class="container not-found-page">
    <section class="card not-found-card">
      <p class="code">404</p>
      <h1>Страница не найдена</h1>
      <p class="description">Проверьте адрес страницы или вернитесь на главную.</p>
      <button class="btn btn-primary" type="button" @click="$router.push('/')">На главную</button>
    </section>
  </div>
</template>

<script>
export default {
  name: 'NotFoundPage',
}
</script>

<style scoped>
.not-found-page {
  display: grid;
  place-items: center;
  min-height: 60vh;
}

.not-found-card {
  width: min(560px, 100%);
  padding: clamp(20px, 4vw, 36px);
  text-align: center;
}

.code {
  margin: 0;
  font-size: clamp(2rem, 8vw, 4rem);
  font-weight: 800;
  line-height: 1;
  color: var(--text-muted);
}

h1 {
  margin: 10px 0 8px;
}

.description {
  margin: 0 0 20px;
  color: var(--text-muted);
}
</style>
