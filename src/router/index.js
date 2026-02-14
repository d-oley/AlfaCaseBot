// Маршруты приложения:
// - описывает доступные страницы
// - включает базовую защиту приватных роутов
// - перенаправляет неавторизованного пользователя на главную
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import DashboardPage from '@/views/DashboardPage.vue'
import CaseDetailPage from '@/views/CaseDetailPage.vue'
import CaseChatPage from '@/views/CaseChatPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import { appState } from '@/store/appState'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfilePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/case/:caseId',
    name: 'case-detail',
    component: CaseDetailPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/case/:caseId/chat',
    name: 'case-chat',
    component: CaseChatPage,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// блокируем приватные страницы для гостей
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !appState.isAuthenticated) {
    return '/'
  }
  return true
})

export default router
