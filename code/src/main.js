// 1) Создает Vue-приложение
// 2) Подключает роутер
// 3) Подключает глобальные стили
// 4) Монтирует приложение в DOM
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'

createApp(App).use(router).mount('#app')
