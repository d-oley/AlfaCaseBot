// 1) Создает Vue-приложение
// 2) Подключает роутер
// 3) Подключает глобальные стили
// 4) Монтирует приложение в DOM
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('Error:', err)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise error:', event.reason)
})

app.use(router).mount('#app')
