<template>
  <footer class="app-footer">
    <div class="container footer-content">
      <p>AlfaCaseBot</p>
      <p>ИИ-тренажер для практики бизнес-кейсов</p>
    </div>
  </footer>
</template>

<script>
// AppFooter.vue: компонент подвала сайта с краткой информацией о продукте.
export default {
  name: 'AppFooter',
}
</script>

<style scoped>
.app-footer {
  width: 100%;
  background: var(--primary);
  padding: 20px 24px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-content p {
  margin: 0;
  color: #fff;
}
</style>
