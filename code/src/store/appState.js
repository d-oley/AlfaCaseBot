// appState.js
// - хранит данные текущего пользователя
// - хранит набор кейсов и мок-данные рейтинга
// - функции изменения состояния (авторизация, профиль, аватар и т.д.)
import { reactive } from 'vue'
import noPhotoImage from '@/assets/no-photo.png'

// Список ролей для селекторов в регистрации и профиле.
const roleOptions = [
  'Учащийся 1 класса',
  'Учащийся 2 класса',
  'Учащийся 3 класса',
  'Учащийся 4 класса',
  'Учащийся 5 класса',
  'Учащийся 6 класса',
  'Учащийся 7 класса',
  'Учащийся 8 класса',
  'Учащийся 9 класса',
  'Учащийся 10 класса',
  'Учащийся 11 класса',
  'Учащийся СПО',
  'Студент',
  'Другое',
]

// Каталог кейсов (локально, с привязкой к PDF полных условий).
const cases = [
  {
    id: 1,
    title: 'VK Мессенджер x Альфа: продукты для СМБ',
    description: 'Разработайте стратегию развития B2B-продуктов VK Мессенджера для малого и среднего бизнеса.',
    fullDescription:
      'Проведите анализ потребностей и сегментов СМБ, оцените рынок продуктов на базе мессенджеров, предложите метрики и план роста с приоритизацией фич.',
    tags: ['Стратегия', 'SMB', 'Продукт', 'Мессенджеры'],
    difficulty: 'Средний',
    solvedScore: 8.1,
    pdfUrl: '/cases/vk-messenger-smb.pdf',
  },
  {
    id: 2,
    title: 'CL Cup IT: Персонализация сайта Альфа-Банка',
    description: 'Сформируйте гипотезы для роста конверсии сайта через персонализацию контента.',
    fullDescription:
      'Нужно изучить рынок персонализации, подобрать инструменты и обосновать гипотезы, которые улучшат пользовательский опыт и конверсию на alfabank.ru.',
    tags: ['UX', 'Персонализация', 'CRO', 'Веб-аналитика'],
    difficulty: 'Сложный',
    solvedScore: 8.5,
    pdfUrl: '/cases/cl-cup-ux.pdf',
  },
  {
    id: 3,
    title: 'CL Cup Data Science: Расширяя круг',
    description: 'Разработайте ML-алгоритм для привлечения родственников текущих клиентов Альфа-Банка.',
    fullDescription:
      'Требуется проанализировать данные, выбрать подход к look-alike моделированию, предложить модель и план развития решения на ближайший год.',
    tags: ['Data Science', 'ML', 'Look-alike', 'CRM'],
    difficulty: 'Сложный',
    solvedScore: 8.9,
    pdfUrl: '/cases/cl-cup-ml.pdf',
  },
  {
    id: 4,
    title: 'Gum Cup: Отраслевой банк первого клика',
    description: 'Соберите отраслевое решение для российского малого и микробизнеса.',
    fullDescription:
      'Нужно предложить продуктовые бандлы банковских и нефинансовых сервисов под выбранные отрасли, провести конкурентный анализ и обосновать стратегию запуска.',
    tags: ['Финтех', 'SMB', 'Продуктовые бандлы', 'Go-to-Market'],
    difficulty: 'Сложный',
    solvedScore: 8.4,
    pdfUrl: '/cases/gum-cup-main.pdf',
  },
  {
    id: 5,
    title: 'Gum Cup: Дополнительное задание финала',
    description: 'Подготовьте клиентское предложение по отраслевому решению на основе обратной связи.',
    fullDescription:
      'Доработайте решение и представьте его в выбранном формате (лендинг, презентация, PDF, ролик), четко раскрыв ценность, уникальность и преимущества.',
    tags: ['Презентация', 'Коммуникация ценности', 'Go-to-Market'],
    difficulty: 'Средний',
    solvedScore: 8.0,
    pdfUrl: '/cases/gum-cup-final-extra.pdf',
  },
  {
    id: 6,
    title: 'Alfa People: Отборочный этап',
    description: 'Предложите развитие приложения для работы с кандидатами Alfa People.',
    fullDescription:
      'Кейс сфокусирован на росте вовлеченности аудитории в HR-продукте: нужны продуктовые гипотезы, метрики и логика приоритизации улучшений.',
    tags: ['HR Tech', 'Вовлеченность', 'Продукт', 'Кандидатский опыт'],
    difficulty: 'Средний',
    solvedScore: 7.8,
    pdfUrl: '/cases/alfa-people-qual.pdf',
  },
  {
    id: 7,
    title: 'Alfa People: Финал',
    description: 'Финальная доработка решения по развитию Alfa People и защита на презентации.',
    fullDescription:
      'На финальном этапе нужно довести продуктовую концепцию до защищаемого формата, усилить аргументацию и представить план внедрения.',
    tags: ['HR Tech', 'Финал', 'Продуктовая стратегия', 'Презентация'],
    difficulty: 'Сложный',
    solvedScore: 8.7,
    pdfUrl: '/cases/alfa-people-final.pdf',
  },
]

const getDefaultUser = () => ({
  id: null,
  username: '',
  email: '',
  login: '',
  birthDate: '',
  role: '',
  city: '',
  creationDate: '',
  avatarUrl: '',
  rank: 57,
})

//реактивный store приложения
export const appState = reactive({
  isAuthenticated: false,
  user: getDefaultUser(),
  topUsers: [
    { id: 1, login: 'PupiKapi', points: 985, avatarUrl: '' },
    { id: 2, login: 'AlphaSamets', points: 912, avatarUrl: '' },
    { id: 3, login: 'Theresnohope', points: 874, avatarUrl: '' },
  ],
  cases,
  recommendedCaseId: 3,
  userSolvedCases: [
    { caseId: 1, score: 8.4 },
    { caseId: 3, score: 8.1 },
    { caseId: 5, score: 8.8 },
  ],
  userFavoriteCaseIds: [2, 5],
  noPhotoImage,
})

// Сохранение пользователя в state после регистрации.
export const registerUser = (payload) => {
  appState.isAuthenticated = true
  appState.user = {
    ...appState.user,
    id: payload.id || null,
    username: payload.username || payload.login || '',
    email: payload.email || '',
    login: payload.login || payload.username || '',
    birthDate: payload.birthDate || '',
    role: payload.role || '',
    city: payload.city || '',
    creationDate: payload.creationDate || '',
  }
}

// Сохранение пользователя в state после входа
export const loginUser = (payload) => {
  appState.isAuthenticated = true
  appState.user = {
    ...appState.user,
    id: payload.id || appState.user.id,
    username: payload.username || appState.user.username,
    email: payload.email || appState.user.email,
    login: payload.login || payload.username || appState.user.login || 'Пользователь',
    role: payload.role || appState.user.role || 'Студент',
    city: payload.city || appState.user.city,
    birthDate: payload.birthDate || appState.user.birthDate,
    creationDate: payload.creationDate || appState.user.creationDate,
  }
}

// полный сброс состояния авторизации
export const logoutUser = () => {
  appState.isAuthenticated = false
  appState.user = getDefaultUser()
}

// изменение аватарки пользователя. пока локально
export const setUserAvatar = (avatarUrl) => {
  appState.user.avatarUrl = avatarUrl
}

// обновление базовых полей профиля из формы редактирования
export const updateUserProfile = (payload) => {
  appState.user = {
    ...appState.user,
    login: payload.login ?? appState.user.login,
    username: payload.username ?? appState.user.username,
    email: payload.email ?? appState.user.email,
    birthDate: payload.birthDate ?? appState.user.birthDate,
    role: payload.role ?? appState.user.role,
    city: payload.city ?? appState.user.city,
  }
}

// Удаление профиля в рамках локальной демо-логики
export const deleteUserProfile = () => {
  appState.isAuthenticated = false
  appState.user = getDefaultUser()
  appState.userSolvedCases = []
  appState.userFavoriteCaseIds = []
}

// Поиск кейса по id
export const getCaseById = (caseId) => {
  const numericId = Number(caseId)
  return appState.cases.find((item) => item.id === numericId) || null
}

// Возвращает список решенных кейсов текущего пользователя
// в формате, удобном для отображения на странице профиля
export const getSolvedCasesForUser = () =>
  appState.userSolvedCases
    .map((entry) => {
      const caseItem = getCaseById(entry.caseId)
      return caseItem
        ? {
            caseId: caseItem.id,
            title: caseItem.title,
            score: entry.score,
          }
        : null
    })
    .filter(Boolean)

export const getRoleOptions = () => roleOptions

export const isCaseFavorite = (caseId) => {
  const numericId = Number(caseId)
  return appState.userFavoriteCaseIds.includes(numericId)
}

export const toggleCaseFavorite = (caseId) => {
  const numericId = Number(caseId)
  if (isCaseFavorite(numericId)) {
    appState.userFavoriteCaseIds = appState.userFavoriteCaseIds.filter((id) => id !== numericId)
    return false
  }
  appState.userFavoriteCaseIds = [...appState.userFavoriteCaseIds, numericId]
  return true
}

export const getFavoriteCasesForUser = () =>
  appState.userFavoriteCaseIds
    .map((caseId) => getCaseById(caseId))
    .filter(Boolean)
