import { reactive } from 'vue'
import noPhotoImage from '@/assets/no-photo.png'

const SESSION_STORAGE_KEY = 'alfacasebot-session-v2'
const USER_DATA_STORAGE_KEY = 'alfacasebot-user-data-v2'

const roleOptions = [
  { value: 'STUDENT5', label: 'Ученик средней школы' },
  { value: 'STUDENT10', label: 'Ученик старшей школы' },
  { value: 'COLLEGESTUDENT', label: 'Студент СПО' },
  { value: 'UNDERGRADUATE', label: 'Студент бакалавриата' },
  { value: 'POSTGRADUATE', label: 'Студент магистратуры' },
  { value: 'WORKER', label: 'Работающий специалист' },
]

const difficultyPreferenceOptions = [
  { value: 'easy', label: 'Я люблю полегче' },
  { value: 'medium', label: 'Мне нравится средняя сложность' },
  { value: 'hard', label: 'Я люблю посложнее' },
]

const cases = [
  {
    id: 1,
    title: 'VK Мессенджер x Альфа: продукты для СМБ',
    description: 'Разработайте стратегию роста B2B-продуктов VK Мессенджера для малого и среднего бизнеса.',
    fullDescription:
      'Проведите анализ сегментов СМБ, определите точки роста продукта, предложите метрики, дорожную карту и формат запуска.',
    tags: ['Бизнес-стратегия', 'SMB', 'Продукт', 'Go-to-Market'],
    difficulty: 'Средний',
    averageSolveMinutes: 185,
    solvedScore: 87,
    pdfUrl: '/cases/vk-messenger-smb.pdf',
  },
  {
    id: 2,
    title: 'CL Cup IT: Персонализация сайта Альфа-Банка',
    description: 'Подберите гипотезы персонализации, которые повысят конверсию и качество пользовательского пути.',
    fullDescription:
      'Нужно изучить пользовательские сценарии, выбрать точки персонализации и предложить механику экспериментов с измеримым эффектом.',
    tags: ['UX', 'Веб-аналитика', 'Бизнес-стратегия', 'CRO'],
    difficulty: 'Сложный',
    averageSolveMinutes: 240,
    solvedScore: 91,
    pdfUrl: '/cases/cl-cup-ux.pdf',
  },
  {
    id: 3,
    title: 'CL Cup Data Science: Расширяя круг',
    description: 'Разработайте ML-подход для поиска родственников текущих клиентов Альфа-Банка.',
    fullDescription:
      'От вас ждут логику построения data science решения, признаки, план валидации и идеи развития модели на год вперед.',
    tags: ['Data Science', 'ML', 'CRM', 'Аналитика'],
    difficulty: 'Сложный',
    averageSolveMinutes: 265,
    solvedScore: 95,
    pdfUrl: '/cases/cl-cup-ml.pdf',
  },
  {
    id: 4,
    title: 'Gum Cup: Отраслевой банк первого клика',
    description: 'Соберите отраслевое предложение для малого и микробизнеса с понятной ценностью и каналом роста.',
    fullDescription:
      'Нужно предложить отраслевое решение, конкурентное позиционирование, набор сервисов и экономику запуска.',
    tags: ['Финтех', 'Бизнес-стратегия', 'SMB', 'Продукт'],
    difficulty: 'Сложный',
    averageSolveMinutes: 225,
    solvedScore: 89,
    pdfUrl: '/cases/gum-cup-main.pdf',
  },
  {
    id: 5,
    title: 'Gum Cup: Дополнительное задание финала',
    description: 'Упакуйте клиентское предложение и представьте его в формате, понятном бизнесу и жюри.',
    fullDescription:
      'Доработайте решение после обратной связи и превратите его в убедительный, структурный и визуально сильный финальный артефакт.',
    tags: ['Презентация', 'Коммуникация', 'Бизнес-стратегия'],
    difficulty: 'Средний',
    averageSolveMinutes: 150,
    solvedScore: 84,
    pdfUrl: '/cases/gum-cup-final-extra.pdf',
  },
  {
    id: 6,
    title: 'Alfa People: Отборочный этап',
    description: 'Предложите развитие приложения для работы с кандидатами Alfa People.',
    fullDescription:
      'Сфокусируйтесь на росте вовлеченности аудитории, проблемах кандидатов и продуктовых гипотезах, которые можно быстро проверить.',
    tags: ['HR Tech', 'Продукт', 'Исследования', 'Data Science'],
    difficulty: 'Средний',
    averageSolveMinutes: 170,
    solvedScore: 82,
    pdfUrl: '/cases/alfa-people-qual.pdf',
  },
  {
    id: 7,
    title: 'Alfa People: Финал',
    description: 'Усилите продуктовую концепцию Alfa People и защитите ее перед жюри.',
    fullDescription:
      'Нужно довести решение до финального уровня: проработать гипотезы, UX, запуск, метрики и логику внедрения.',
    tags: ['HR Tech', 'Продукт', 'Бизнес-стратегия', 'Data Science'],
    difficulty: 'Сложный',
    averageSolveMinutes: 230,
    solvedScore: 90,
    pdfUrl: '/cases/alfa-people-final.pdf',
  },
]

const topUsersSeed = [
  {
    id: 'podium-1',
    rank: 1,
    login: 'PupiKapi',
    firstName: 'Полина',
    lastName: 'Капустина',
    city: 'Москва',
    points: 985,
    avatarUrl: '',
  },
  {
    id: 'podium-2',
    rank: 2,
    login: 'AlphaSamets',
    firstName: 'Самуил',
    lastName: 'Альфов',
    city: 'Казань',
    points: 947,
    avatarUrl: '',
  },
  {
    id: 'podium-3',
    rank: 3,
    login: 'Theresnohope',
    firstName: 'Алина',
    lastName: 'Трофимова',
    city: 'Новосибирск',
    points: 921,
    avatarUrl: '',
  },
]

const caseLeaderboardsSeed = {
  1: [
    { id: '1-a', login: 'PupiKapi', firstName: 'Полина', lastName: 'Капустина', city: 'Москва', score: 98 },
    { id: '1-b', login: 'AlphaSamets', firstName: 'Самуил', lastName: 'Альфов', city: 'Казань', score: 95 },
    { id: '1-c', login: 'case_vision', firstName: 'Мария', lastName: 'Власова', city: 'Санкт-Петербург', score: 92 },
  ],
  2: [
    { id: '2-a', login: 'ux_hawk', firstName: 'Илья', lastName: 'Чернов', city: 'Екатеринбург', score: 99 },
    { id: '2-b', login: 'AlphaSamets', firstName: 'Самуил', lastName: 'Альфов', city: 'Казань', score: 97 },
    { id: '2-c', login: 'Theresnohope', firstName: 'Алина', lastName: 'Трофимова', city: 'Новосибирск', score: 93 },
  ],
  3: [
    { id: '3-a', login: 'ml_nika', firstName: 'Ника', lastName: 'Лебедева', city: 'Томск', score: 100 },
    { id: '3-b', login: 'data_alex', firstName: 'Алексей', lastName: 'Ершов', city: 'Москва', score: 98 },
    { id: '3-c', login: 'PupiKapi', firstName: 'Полина', lastName: 'Капустина', city: 'Москва', score: 96 },
  ],
  4: [
    { id: '4-a', login: 'biz_wolf', firstName: 'Олег', lastName: 'Серов', city: 'Самара', score: 97 },
    { id: '4-b', login: 'PupiKapi', firstName: 'Полина', lastName: 'Капустина', city: 'Москва', score: 95 },
    { id: '4-c', login: 'AlphaSamets', firstName: 'Самуил', lastName: 'Альфов', city: 'Казань', score: 90 },
  ],
  5: [
    { id: '5-a', login: 'slides_queen', firstName: 'Елизавета', lastName: 'Орлова', city: 'Москва', score: 96 },
    { id: '5-b', login: 'Theresnohope', firstName: 'Алина', lastName: 'Трофимова', city: 'Новосибирск', score: 94 },
    { id: '5-c', login: 'PupiKapi', firstName: 'Полина', lastName: 'Капустина', city: 'Москва', score: 91 },
  ],
  6: [
    { id: '6-a', login: 'hr_nova', firstName: 'Софья', lastName: 'Исаева', city: 'Пермь', score: 95 },
    { id: '6-b', login: 'AlphaSamets', firstName: 'Самуил', lastName: 'Альфов', city: 'Казань', score: 89 },
    { id: '6-c', login: 'case_vision', firstName: 'Мария', lastName: 'Власова', city: 'Санкт-Петербург', score: 87 },
  ],
  7: [
    { id: '7-a', login: 'product_fox', firstName: 'Виктор', lastName: 'Мельников', city: 'Сочи', score: 99 },
    { id: '7-b', login: 'PupiKapi', firstName: 'Полина', lastName: 'Капустина', city: 'Москва', score: 97 },
    { id: '7-c', login: 'Theresnohope', firstName: 'Алина', lastName: 'Трофимова', city: 'Новосибирск', score: 95 },
  ],
}

const getDefaultPreferences = () => ({
  tag: '',
  difficulty: '',
})

const getDefaultUser = () => ({
  id: null,
  username: '',
  email: '',
  login: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  role: '',
  cityId: null,
  city: '',
  region: '',
  creationDate: '',
  avatarUrl: '',
  rank: 57,
  preferences: getDefaultPreferences(),
})

const getDefaultLocalUserData = () => ({
  firstName: '',
  lastName: '',
  avatarUrl: '',
  rank: 57,
  cityId: null,
  city: '',
  region: '',
  preferences: getDefaultPreferences(),
  userSolvedCases: [],
  userFavoriteCaseIds: [],
  viewedCaseIds: [],
  shouldShowPreferencesOnboarding: false,
})

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const readStorage = (key, fallback) => safeParse(localStorage.getItem(key), fallback)
const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const normalizeLogin = (login) => String(login || '').trim().toLowerCase()

const getAllLocalUsers = () => readStorage(USER_DATA_STORAGE_KEY, {})
const getLocalUserData = (login) => {
  const key = normalizeLogin(login)
  if (!key) {
    return getDefaultLocalUserData()
  }
  return {
    ...getDefaultLocalUserData(),
    ...(getAllLocalUsers()[key] || {}),
    preferences: {
      ...getDefaultPreferences(),
      ...(getAllLocalUsers()[key]?.preferences || {}),
    },
    userSolvedCases: [...(getAllLocalUsers()[key]?.userSolvedCases || [])],
    userFavoriteCaseIds: [...(getAllLocalUsers()[key]?.userFavoriteCaseIds || [])],
    viewedCaseIds: [...(getAllLocalUsers()[key]?.viewedCaseIds || [])],
  }
}

const getInitialSession = () =>
  readStorage(SESSION_STORAGE_KEY, {
    isAuthenticated: false,
    user: getDefaultUser(),
  })

const buildFullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()

const getDisplayName = (user) => buildFullName(user) || user?.login || 'Пользователь'

const difficultyPreferenceToCaseValue = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
}

const buildUserFromSession = () => {
  const session = getInitialSession()
  if (!session?.isAuthenticated) {
    return getDefaultUser()
  }

  const localUserData = getLocalUserData(session.user?.login || session.user?.username)

  return {
    ...getDefaultUser(),
    ...session.user,
    ...localUserData,
    preferences: {
      ...getDefaultPreferences(),
      ...(session.user?.preferences || {}),
      ...(localUserData.preferences || {}),
    },
  }
}

const initialSession = getInitialSession()
const initialUser = buildUserFromSession()
const initialLocalUserData = getLocalUserData(initialUser.login || initialUser.username)

export const appState = reactive({
  isAuthenticated: Boolean(initialSession?.isAuthenticated),
  user: initialUser,
  topUsers: [...topUsersSeed],
  cases,
  cities: [],
  recommendedCaseId: null,
  shouldShowPreferencesOnboarding: Boolean(initialLocalUserData.shouldShowPreferencesOnboarding),
  userSolvedCases: [...initialLocalUserData.userSolvedCases],
  userFavoriteCaseIds: [...initialLocalUserData.userFavoriteCaseIds],
  viewedCaseIds: [...initialLocalUserData.viewedCaseIds],
  noPhotoImage,
})

const persistSession = () => {
  writeStorage(SESSION_STORAGE_KEY, {
    isAuthenticated: appState.isAuthenticated,
    user: appState.user,
  })
}

const persistCurrentUserData = (previousLogin = '') => {
  if (!appState.isAuthenticated) {
    persistSession()
    return
  }

  const currentLogin = normalizeLogin(appState.user.login || appState.user.username)
  if (!currentLogin) {
    persistSession()
    return
  }

  const allUsers = getAllLocalUsers()
  const previousKey = normalizeLogin(previousLogin)

  if (previousKey && previousKey !== currentLogin && allUsers[previousKey]) {
    allUsers[currentLogin] = {
      ...allUsers[previousKey],
      ...allUsers[currentLogin],
    }
    delete allUsers[previousKey]
  }

  allUsers[currentLogin] = {
    ...getDefaultLocalUserData(),
    ...(allUsers[currentLogin] || {}),
    firstName: appState.user.firstName || '',
    lastName: appState.user.lastName || '',
    avatarUrl: appState.user.avatarUrl || '',
    rank: appState.user.rank || 57,
    cityId: appState.user.cityId ?? null,
    city: appState.user.city || '',
    region: appState.user.region || '',
    preferences: {
      ...getDefaultPreferences(),
      ...(appState.user.preferences || {}),
    },
    userSolvedCases: [...appState.userSolvedCases],
    userFavoriteCaseIds: [...appState.userFavoriteCaseIds],
    viewedCaseIds: [...appState.viewedCaseIds],
    shouldShowPreferencesOnboarding: appState.shouldShowPreferencesOnboarding,
  }

  writeStorage(USER_DATA_STORAGE_KEY, allUsers)
  persistSession()
}

const syncTopUsers = () => {
  const users = [...topUsersSeed]
  if (appState.isAuthenticated && Number(appState.user.rank) > 0 && Number(appState.user.rank) <= 3) {
    const currentEntry = {
      id: `podium-current-${appState.user.rank}`,
      rank: Number(appState.user.rank),
      login: appState.user.login || appState.user.username || 'Пользователь',
      firstName: appState.user.firstName || '',
      lastName: appState.user.lastName || '',
      city: appState.user.city || 'Город не указан',
      points: 900 - Number(appState.user.rank) * 5,
      avatarUrl: appState.user.avatarUrl || '',
    }
    const existingIndex = users.findIndex((item) => item.rank === currentEntry.rank)
    if (existingIndex >= 0) {
      users.splice(existingIndex, 1, currentEntry)
    } else {
      users.push(currentEntry)
    }
  }
  appState.topUsers = users.sort((a, b) => a.rank - b.rank)
}

const calculateRecommendedCaseId = () => {
  const preferredTag = appState.user.preferences?.tag || ''
  const preferredDifficulty = difficultyPreferenceToCaseValue[appState.user.preferences?.difficulty] || ''

  if (!preferredTag && !preferredDifficulty) {
    return null
  }

  const solvedCaseIds = new Set(appState.userSolvedCases.map((entry) => Number(entry.caseId)))

  const rankedCases = appState.cases
    .filter((item) => !solvedCaseIds.has(item.id))
    .map((item) => {
      let score = 0
      if (preferredTag && item.tags.includes(preferredTag)) {
        score += 3
      }
      if (preferredDifficulty && item.difficulty === preferredDifficulty) {
        score += 2
      }
      return {
        id: item.id,
        score,
        solvedScore: item.solvedScore,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return b.solvedScore - a.solvedScore
    })

  return rankedCases[0]?.id || null
}

const refreshRecommendedCase = () => {
  appState.recommendedCaseId = calculateRecommendedCaseId()
}

const hydrateCurrentUserData = (payload, { shouldShowPreferencesOnboarding = false } = {}) => {
  const login = payload.login || payload.username || ''
  const localUserData = getLocalUserData(login)

  appState.isAuthenticated = true
  appState.user = {
    ...getDefaultUser(),
    ...payload,
    ...localUserData,
    login: payload.login || payload.username || '',
    username: payload.username || payload.login || '',
    firstName: payload.firstName ?? localUserData.firstName ?? '',
    lastName: payload.lastName ?? localUserData.lastName ?? '',
    cityId: payload.cityId ?? localUserData.cityId ?? null,
    city: payload.city ?? localUserData.city ?? '',
    region: payload.region ?? localUserData.region ?? '',
    rank: payload.rank ?? localUserData.rank ?? 57,
    avatarUrl: payload.avatarUrl ?? localUserData.avatarUrl ?? '',
    preferences: {
      ...getDefaultPreferences(),
      ...(payload.preferences || {}),
      ...(localUserData.preferences || {}),
    },
  }
  appState.userSolvedCases = [...localUserData.userSolvedCases]
  appState.userFavoriteCaseIds = [...localUserData.userFavoriteCaseIds]
  appState.viewedCaseIds = [...localUserData.viewedCaseIds]
  appState.shouldShowPreferencesOnboarding =
    shouldShowPreferencesOnboarding || Boolean(localUserData.shouldShowPreferencesOnboarding)

  refreshRecommendedCase()
  syncTopUsers()
  persistCurrentUserData()
}

export const registerUser = (payload) => {
  hydrateCurrentUserData(payload, { shouldShowPreferencesOnboarding: true })
}

export const loginUser = (payload) => {
  hydrateCurrentUserData(payload)
}

export const logoutUser = () => {
  appState.isAuthenticated = false
  appState.user = getDefaultUser()
  appState.userSolvedCases = []
  appState.userFavoriteCaseIds = []
  appState.viewedCaseIds = []
  appState.shouldShowPreferencesOnboarding = false
  appState.recommendedCaseId = null
  syncTopUsers()
  persistSession()
}

export const setAvailableCities = (cities) => {
  appState.cities = Array.isArray(cities) ? [...cities] : []
}

export const setUserAvatar = (avatarUrl) => {
  appState.user.avatarUrl = avatarUrl
  persistCurrentUserData()
  syncTopUsers()
}

export const updateUserProfile = (payload) => {
  const previousLogin = appState.user.login || appState.user.username || ''
  const nextLogin = payload.login ?? payload.username ?? appState.user.login

  appState.user = {
    ...appState.user,
    ...payload,
    login: nextLogin || '',
    username: payload.username ?? nextLogin ?? '',
    preferences: {
      ...getDefaultPreferences(),
      ...(appState.user.preferences || {}),
      ...(payload.preferences || {}),
    },
  }

  persistCurrentUserData(previousLogin)
  refreshRecommendedCase()
  syncTopUsers()
}

export const updateUserPreferences = (payload = {}) => {
  appState.user.preferences = {
    ...getDefaultPreferences(),
    ...(appState.user.preferences || {}),
    ...payload,
  }
  appState.shouldShowPreferencesOnboarding = false
  persistCurrentUserData()
  refreshRecommendedCase()
}

export const skipUserPreferences = () => {
  appState.user.preferences = getDefaultPreferences()
  appState.shouldShowPreferencesOnboarding = false
  persistCurrentUserData()
  refreshRecommendedCase()
}

export const closePreferencesOnboarding = () => {
  appState.shouldShowPreferencesOnboarding = false
  persistCurrentUserData()
}

export const deleteUserProfile = () => {
  const login = normalizeLogin(appState.user.login || appState.user.username)
  const allUsers = getAllLocalUsers()
  if (login && allUsers[login]) {
    delete allUsers[login]
    writeStorage(USER_DATA_STORAGE_KEY, allUsers)
  }
  logoutUser()
}

export const getCaseById = (caseId) => {
  const numericId = Number(caseId)
  return appState.cases.find((item) => item.id === numericId) || null
}

export const markCaseViewed = (caseId) => {
  const numericId = Number(caseId)
  if (!appState.viewedCaseIds.includes(numericId)) {
    appState.viewedCaseIds = [...appState.viewedCaseIds, numericId]
    persistCurrentUserData()
  }
}

export const isCaseFavorite = (caseId) => {
  const numericId = Number(caseId)
  return appState.userFavoriteCaseIds.includes(numericId)
}

export const toggleCaseFavorite = (caseId) => {
  const numericId = Number(caseId)
  if (isCaseFavorite(numericId)) {
    appState.userFavoriteCaseIds = appState.userFavoriteCaseIds.filter((id) => id !== numericId)
    persistCurrentUserData()
    return false
  }

  appState.userFavoriteCaseIds = [...appState.userFavoriteCaseIds, numericId]
  persistCurrentUserData()
  return true
}

export const getFavoriteCasesForUser = () =>
  appState.userFavoriteCaseIds
    .map((caseId) => getCaseById(caseId))
    .filter(Boolean)

export const getSolvedCasesForUser = () =>
  [...appState.userSolvedCases]
    .sort((a, b) => String(b.solvedAt || '').localeCompare(String(a.solvedAt || '')))
    .map((entry) => {
      const caseItem = getCaseById(entry.caseId)
      return caseItem
        ? {
            caseId: caseItem.id,
            title: caseItem.title,
            scorePercent: entry.scorePercent,
            solvedAt: entry.solvedAt,
          }
        : null
    })
    .filter(Boolean)

const getSolvedCaseDetails = () =>
  appState.userSolvedCases
    .map((entry) => {
      const caseItem = getCaseById(entry.caseId)
      return caseItem
        ? {
            ...entry,
            caseItem,
          }
        : null
    })
    .filter(Boolean)

const getLongestSolveStreak = (entries) => {
  const uniqueDates = [...new Set(entries.map((entry) => String(entry.solvedAt || '').slice(0, 10)).filter(Boolean))].sort()
  if (!uniqueDates.length) {
    return 0
  }

  let best = 1
  let current = 1

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previousDate = new Date(uniqueDates[index - 1])
    const currentDate = new Date(uniqueDates[index])
    const diff = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }

  return best
}

export const getAchievementsForUser = () => {
  const solvedDetails = getSolvedCaseDetails()
  const earliestSolved = [...solvedDetails].sort((a, b) => String(a.solvedAt || '').localeCompare(String(b.solvedAt || '')))[0]
  const solvedCaseIds = new Set(solvedDetails.map((entry) => entry.caseId))
  const uniqueTags = new Set(solvedDetails.flatMap((entry) => entry.caseItem.tags))
  const dataScienceCount = solvedDetails.filter((entry) => entry.caseItem.tags.includes('Data Science')).length
  const businessStrategyCount = solvedDetails.filter((entry) => entry.caseItem.tags.includes('Бизнес-стратегия')).length
  const perfectSolutionsCount = solvedDetails.filter((entry) => Number(entry.scorePercent) === 100).length
  const firstAttemptCount = solvedDetails.filter((entry) => Number(entry.attempts || 0) === 1 && Number(entry.revisions || 0) === 0).length
  const hardCasesCount = solvedDetails.filter((entry) => entry.caseItem.difficulty === 'Сложный').length
  const sprinterCount = solvedDetails.filter(
    (entry) => Number(entry.solveMinutes || 0) > 0 && Number(entry.solveMinutes) < Number(entry.caseItem.averageSolveMinutes || 0)
  ).length
  const longestStreak = getLongestSolveStreak(solvedDetails)
  const viewedUniqueCount = [...new Set(appState.viewedCaseIds.map((item) => Number(item)))].length

  return [
    {
      id: 'fast-start',
      title: 'Быстрый старт',
      description: 'Решите первый кейс менее чем за 30 минут',
      emoji: '⚡',
      active: Boolean(earliestSolved && Number(earliestSolved.solveMinutes || 0) > 0 && Number(earliestSolved.solveMinutes) < 30),
      progress: earliestSolved ? `${Math.min(Number(earliestSolved.solveMinutes || 0), 30)} / 30 мин` : '0 / 30 мин',
    },
    {
      id: 'rapid-rise',
      title: 'Стремительный взлёт',
      description: 'Решите 5 кейсов',
      emoji: '🚀',
      active: solvedCaseIds.size >= 5,
      progress: `${Math.min(solvedCaseIds.size, 5)} / 5`,
    },
    {
      id: 'collector',
      title: 'Коллекционер',
      description: 'Решите 20 кейсов',
      emoji: '📚',
      active: solvedCaseIds.size >= 20,
      progress: `${Math.min(solvedCaseIds.size, 20)} / 20`,
    },
    {
      id: 'tag-master',
      title: 'Мастер на все теги',
      description: 'Решите кейсы из 5 разных тегов',
      emoji: '🌈',
      active: uniqueTags.size >= 5,
      progress: `${Math.min(uniqueTags.size, 5)} / 5`,
    },
    {
      id: 'data-master',
      title: 'Data-мастер',
      description: 'Решите 5 кейсов с тегом «Data Science»',
      emoji: '📊',
      active: dataScienceCount >= 5,
      progress: `${Math.min(dataScienceCount, 5)} / 5`,
    },
    {
      id: 'business-leader',
      title: 'Бизнес-лидер',
      description: 'Решите 5 кейсов с тегом «Бизнес-стратегия»',
      emoji: '🏢',
      active: businessStrategyCount >= 5,
      progress: `${Math.min(businessStrategyCount, 5)} / 5`,
    },
    {
      id: 'perfect-solution',
      title: 'Идеальное решение',
      description: 'Получите 100% баллов за любой кейс',
      emoji: '💎',
      active: perfectSolutionsCount >= 1,
      progress: `${Math.min(perfectSolutionsCount, 1)} / 1`,
    },
    {
      id: 'first-try',
      title: 'С первой попытки',
      description: 'Сдайте кейс без доработок с первой отправки',
      emoji: '✅',
      active: firstAttemptCount >= 1,
      progress: `${Math.min(firstAttemptCount, 1)} / 1`,
    },
    {
      id: 'hardcore',
      title: 'Хардкорщик',
      description: 'Решите 3 кейса высокого уровня сложности',
      emoji: '🧠',
      active: hardCasesCount >= 3,
      progress: `${Math.min(hardCasesCount, 3)} / 3`,
    },
    {
      id: 'sprinter',
      title: 'Спринтер',
      description: 'Решите кейс быстрее среднего времени выполнения',
      emoji: '⏱️',
      active: sprinterCount >= 1,
      progress: `${Math.min(sprinterCount, 1)} / 1`,
    },
    {
      id: 'marathoner',
      title: 'Марафонец',
      description: 'Решите 3 кейса подряд без пропусков дней',
      emoji: '🔥',
      active: longestStreak >= 3,
      progress: `${Math.min(longestStreak, 3)} / 3`,
    },
    {
      id: 'explorer',
      title: 'Исследователь',
      description: 'Просмотрите 15 уникальных кейсов',
      emoji: '🔍',
      active: viewedUniqueCount >= 15,
      progress: `${Math.min(viewedUniqueCount, 15)} / 15`,
    },
    {
      id: 'perfectionist',
      title: 'Перфекционист',
      description: 'Получите максимальный балл за 3 разных кейса',
      emoji: '👑',
      active: perfectSolutionsCount >= 3,
      progress: `${Math.min(perfectSolutionsCount, 3)} / 3`,
    },
    {
      id: 'thought-leader',
      title: 'Лидер мнений',
      description: 'Попадите в топ-3 рейтинга',
      emoji: '🎖️',
      active: Number(appState.user.rank || 0) > 0 && Number(appState.user.rank) <= 3,
      progress: Number(appState.user.rank || 0) > 0 ? `Текущее место: #${appState.user.rank}` : 'Место не определено',
    },
  ]
}

export const getCaseLeaderboard = (caseId) => {
  const numericId = Number(caseId)
  const seededEntries = [...(caseLeaderboardsSeed[numericId] || [])]
  const userSubmission = appState.userSolvedCases.find((entry) => Number(entry.caseId) === numericId)

  if (appState.isAuthenticated && userSubmission) {
    const currentUserEntry = {
      id: `current-${numericId}`,
      login: appState.user.login || appState.user.username || 'Пользователь',
      firstName: appState.user.firstName || '',
      lastName: appState.user.lastName || '',
      city: appState.user.city || 'Город не указан',
      score: Number(userSubmission.scorePercent || 0),
      isCurrentUser: true,
    }

    const existingIndex = seededEntries.findIndex((entry) => entry.login === currentUserEntry.login)
    if (existingIndex >= 0) {
      seededEntries.splice(existingIndex, 1, currentUserEntry)
    } else {
      seededEntries.push(currentUserEntry)
    }
  }

  return seededEntries
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      fullName: getDisplayName(entry),
    }))
}

export const getRoleOptions = () => [...roleOptions]

export const getRoleLabel = (roleValue) => roleOptions.find((item) => item.value === roleValue)?.label || 'Не указан'

export const getDifficultyPreferenceOptions = () => [...difficultyPreferenceOptions]

export const getPreferenceTagOptions = () => [...new Set(appState.cases.flatMap((item) => item.tags))].sort()

export const getFullName = (user = appState.user) => buildFullName(user)

syncTopUsers()
refreshRecommendedCase()
