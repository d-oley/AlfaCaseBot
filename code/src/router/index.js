// Маршруты приложения:
// - описывает доступные страницы
// - включает базовую защиту приватных роутов
// - перенаправляет неавторизованного пользователя на главную
import { createRouter, createWebHistory } from 'vue-router'
import { appState } from '@/store/appState'
import { loginUser } from '@/store/appState'
import { getCurrentUserProfile, mapApiProfileToState } from '@/api/authApi'

const HomePage = () => import('@/views/HomePage.vue')
const DashboardPage = () => import('@/views/DashboardPage.vue')
const CaseDetailPage = () => import('@/views/CaseDetailPage.vue')
const CaseChatPage = () => import('@/views/CaseChatPage.vue')
const TheoryPage = () => import('@/views/TheoryPage.vue')
const ProfilePage = () => import('@/views/ProfilePage.vue')
const AdminPage = () => import('@/views/AdminPage.vue')
const NotFoundPage = () => import('@/views/NotFoundPage.vue')
const SolutionsPage = () => import('@/views/SolutionsPage.vue')
const PublicProfilePage = () => import('@/views/PublicProfilePage.vue')
const HelpPage = () => import('@/views/HelpPage.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/help',
    name: 'help',
    component: HelpPage,
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfilePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/solutions',
    name: 'solutions',
    component: SolutionsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:id',
    name: 'public-profile',
    component: PublicProfilePage,
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
    path: '/case/:caseId/theory',
    name: 'case-theory',
    component: TheoryPage,
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
