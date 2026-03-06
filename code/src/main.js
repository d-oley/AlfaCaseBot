// 1) Создает Vue-приложение
// 2) Подключает роутер
// 3) Подключает глобальные стили
// 4) Монтирует приложение в DOM
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  console.error('[Vue error]', info, error)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled promise rejection]', event.reason)
})

app.use(router).mount('#app')
