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
import AdminPage from '@/views/AdminPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'
import { appState } from '@/store/appState'
import { loginUser } from '@/store/appState'
import { getCurrentUserProfile, mapApiProfileToState } from '@/api/authApi'

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
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// блокируем приватные страницы для гостей
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !appState.isAuthenticated) {
    try {
      const profile = await getCurrentUserProfile()
      loginUser(mapApiProfileToState(profile))
    } catch {
      return '/'
    }
  }
  return true
})

export default router
