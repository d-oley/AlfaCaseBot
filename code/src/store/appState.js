import { reactive } from 'vue'
const SESSION_STORAGE_KEY = 'alfacasebot-session-v2'
const USER_DATA_STORAGE_KEY = 'alfacasebot-user-data-v2'
const BAN_NOTICE_STORAGE_KEY = 'alfacasebot-ban-notice-v1'

const roleOptions = [
  { value: 'STUDENT5', label: 'Ученик средней школы' },
  { value: 'STUDENT10', label: 'Ученик старшей школы' },
  { value: 'COLLEGE_STUDENT', label: 'Студент СПО' },
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

const getDefaultPreferences = () => ({ tag: '', difficulty: '' })

const getDefaultUser = () => ({
  id: null, username: '', email: '', login: '', nickname: '',
  firstName: '', lastName: '', birthDate: '', role: '',
  cityId: null, city: '', region: '', creationDate: '',
  avatarUrl: '', rank: 57, preferences: getDefaultPreferences(),
})

const getDefaultLocalUserData = () => ({
  firstName: '', lastName: '', rank: 57,
  cityId: null, city: '', region: '', preferences: getDefaultPreferences(),
  userSolvedCases: [], userFavoriteCaseIds: [], viewedCaseIds: [],
  shouldShowPreferencesOnboarding: false,
})

function safeParse(val, fallback) {
  try { return val ? JSON.parse(val) : fallback }
  catch { return fallback }
}

const readStorage = (key, fallback) => safeParse(localStorage.getItem(key), fallback)
const writeStorage = (key, val) => localStorage.setItem(key, JSON.stringify(val))
const readSessionStorage = (key, fallback) => safeParse(sessionStorage.getItem(key), fallback)

const getInitialSession = () => readStorage(SESSION_STORAGE_KEY, {
  isAuthenticated: false, user: getDefaultUser(),
})

const getLocalUserData = (userLike) => {
  const key = String(userLike?.username || userLike?.login || '').trim().toLowerCase()
  if (!key) return getDefaultLocalUserData()
  
  const allUsers = readStorage(USER_DATA_STORAGE_KEY, {})
  const saved = allUsers[key] || {}
  
  return {
    ...getDefaultLocalUserData(),
    ...saved,
    preferences: { ...getDefaultPreferences(), ...saved.preferences },
    userSolvedCases: [...(saved.userSolvedCases || [])],
    userFavoriteCaseIds: [...(saved.userFavoriteCaseIds || [])],
    viewedCaseIds: [...(saved.viewedCaseIds || [])],
  }
}

const buildUserFromSession = () => {
  const session = getInitialSession()
  if (!session?.isAuthenticated) return getDefaultUser()

  const local = getLocalUserData(session.user)
  return {
    ...getDefaultUser(),
    ...session.user,
    ...local,
    preferences: {
      ...getDefaultPreferences(),
      ...session.user?.preferences,
      ...local.preferences,
    },
  }
}

const initialSession = getInitialSession()
const initialUser = buildUserFromSession()
const initialLocalUserData = getLocalUserData(initialUser)
const initialBanNotice = readSessionStorage(BAN_NOTICE_STORAGE_KEY, null)

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
  banNotice: initialBanNotice,
})

const persistSession = () => {
  writeStorage(SESSION_STORAGE_KEY, {
    isAuthenticated: appState.isAuthenticated,
    user: appState.user,
  })
}

const persistUserData = (prevLogin = '') => {
  if (!appState.isAuthenticated) {
    persistSession()
    return
  }

  const curKey = String(appState.user?.username || appState.user?.login || '').trim().toLowerCase()
  if (!curKey) {
    persistSession()
    return
  }

  const allUsers = readStorage(USER_DATA_STORAGE_KEY, {})
  const prevKey = String(prevLogin || '').trim().toLowerCase()

  if (prevKey && prevKey !== curKey && allUsers[prevKey]) {
    allUsers[curKey] = { ...allUsers[prevKey], ...allUsers[curKey] }
    delete allUsers[prevKey]
  }

  allUsers[curKey] = {
    ...getDefaultLocalUserData(),
    ...allUsers[curKey],
    firstName: appState.user.firstName || '',
    lastName: appState.user.lastName || '',
    rank: appState.user.rank || 57,
    cityId: appState.user.cityId ?? null,
    city: appState.user.city || '',
    region: appState.user.region || '',
    preferences: { ...getDefaultPreferences(), ...appState.user.preferences },
    userSolvedCases: [...appState.userSolvedCases],
    userFavoriteCaseIds: [...appState.userFavoriteCaseIds],
    viewedCaseIds: [...appState.viewedCaseIds],
    shouldShowPreferencesOnboarding: appState.shouldShowPreferencesOnboarding,
  }

  writeStorage(USER_DATA_STORAGE_KEY, allUsers)
  persistSession()
}

const diffDiffMap = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' }

const syncTopUsers = () => {
  const users = [...topUsersSeed]
  if (appState.isAuthenticated && appState.user.rank > 0 && appState.user.rank <= 3) {
    const entry = {
      id: `podium-${appState.user.rank}`,
      rank: appState.user.rank,
      login: appState.user.login || appState.user.username || 'User',
      firstName: appState.user.firstName || '',
      lastName: appState.user.lastName || '',
      city: appState.user.city || 'Нет города',
      points: 900 - appState.user.rank * 5,
      avatarUrl: appState.user.avatarUrl || '',
    }
    const idx = users.findIndex(u => u.rank === entry.rank)
    if (idx >= 0) users[idx] = entry
    else users.push(entry)
  }
  appState.topUsers = users.sort((a, b) => a.rank - b.rank)
}

const calcRecommendedCase = () => {
  const tag = appState.user.preferences?.tag || ''
  const diff = diffDiffMap[appState.user.preferences?.difficulty] || ''
  if (!tag && !diff) return null

  const solved = new Set(appState.userSolvedCases.map(e => Number(e.caseId)))
  const ranked = appState.cases
    .filter(c => !solved.has(c.id))
    .map(c => {
      let score = 0
      if (tag && c.tags.includes(tag)) score += 3
      if (diff && c.difficulty === diff) score += 2
      return { id: c.id, score, solved: c.solvedScore }
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score || b.solved - a.solved)
  
  return ranked[0]?.id || null
}

export const hydrateUser = (payload, opts = {}) => {
  const local = getLocalUserData(payload)

  appState.isAuthenticated = true
  appState.user = {
    ...getDefaultUser(),
    ...payload,
    ...local,
    login: payload.login || payload.nickname || payload.username || '',
    nickname: payload.nickname || payload.login || payload.username || '',
    username: payload.username || '',
    firstName: payload.firstName ?? local.firstName ?? '',
    lastName: payload.lastName ?? local.lastName ?? '',
    cityId: payload.cityId ?? local.cityId ?? null,
    city: payload.city ?? local.city ?? '',
    region: payload.region ?? local.region ?? '',
    rank: payload.rank ?? local.rank ?? 57,
    avatarUrl: payload.avatarUrl || '',
    preferences: {
      ...getDefaultPreferences(),
      ...payload.preferences,
      ...local.preferences,
    },
  }
  appState.userSolvedCases = [...(local.userSolvedCases || [])]
  appState.userFavoriteCaseIds = [...(local.userFavoriteCaseIds || [])]
  appState.viewedCaseIds = [...(local.viewedCaseIds || [])]
  appState.shouldShowPreferencesOnboarding = opts.onboarding || local.shouldShowPreferencesOnboarding

  syncTopUsers()
  appState.recommendedCaseId = calcRecommendedCase()
  persistUserData()
}

export const registerUser = (payload) => {
  hydrateUser(payload, { onboarding: true })
}

export const loginUser = (payload) => {
  hydrateUser(payload)
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

export const showBanNotice = (message = '') => {
  const notice = {
    message: String(message).trim() || 'Аккаунт заблокирован за нарушение правил общения.',
  }
  appState.banNotice = notice
  sessionStorage.setItem(BAN_NOTICE_STORAGE_KEY, JSON.stringify(notice))
}

export const clearBanNotice = () => {
  appState.banNotice = null
  sessionStorage.removeItem(BAN_NOTICE_STORAGE_KEY)
}

export const setAvailableCities = (cities) => {
  appState.cities = Array.isArray(cities) ? [...cities] : []
}

export const setLeaderboardUsers = (users) => {
  if (Array.isArray(users) && users.length) {
    appState.topUsers = [...users].sort((a, b) => Number(a.rank) - Number(b.rank))
  }
}

export const setUserAvatar = (url) => {
  appState.user.avatarUrl = url
  persistUserData()
  syncTopUsers()
}

export const updateUserProfile = (payload) => {
  const prevKey = String(appState.user?.username || appState.user?.login || '').trim().toLowerCase()
  const nextLogin = payload.login ?? payload.nickname ?? appState.user.login

  appState.user = {
    ...appState.user,
    ...payload,
    login: nextLogin || '',
    nickname: payload.nickname ?? nextLogin ?? '',
    username: payload.username ?? appState.user.username ?? '',
    preferences: { ...getDefaultPreferences(), ...appState.user.preferences, ...payload.preferences },
  }

  persistUserData(prevKey)
  appState.recommendedCaseId = calcRecommendedCase()
  syncTopUsers()
}

export const updateUserPreferences = (payload = {}) => {
  appState.user.preferences = { ...getDefaultPreferences(), ...appState.user.preferences, ...payload }
  appState.shouldShowPreferencesOnboarding = false
  persistUserData()
  appState.recommendedCaseId = calcRecommendedCase()
}

export const skipUserPreferences = () => {
  appState.user.preferences = getDefaultPreferences()
  appState.shouldShowPreferencesOnboarding = false
  persistUserData()
  appState.recommendedCaseId = calcRecommendedCase()
}

export const closePreferencesOnboarding = () => {
  appState.shouldShowPreferencesOnboarding = false
  persistUserData()
}

export const getCaseById = (id) => appState.cases.find(c => c.id === Number(id)) || null

export const markCaseViewed = (id) => {
  const num = Number(id)
  if (!appState.viewedCaseIds.includes(num)) {
    appState.viewedCaseIds = [...appState.viewedCaseIds, num]
    persistUserData()
  }
}

export const isCaseFavorite = (id) => appState.userFavoriteCaseIds.includes(Number(id))

export const toggleCaseFavorite = (id) => {
  const num = Number(id)
  if (isCaseFavorite(num)) {
    appState.userFavoriteCaseIds = appState.userFavoriteCaseIds.filter(x => x !== num)
  } else {
    appState.userFavoriteCaseIds = [...appState.userFavoriteCaseIds, num]
  }
  persistUserData()
  return isCaseFavorite(num)
}

export const getFavoriteCases = () =>
  appState.userFavoriteCaseIds.map(id => getCaseById(id)).filter(Boolean)

export const saveSolvedCase = (id, score, extra = {}) => {
  const num = Number(id)
  const entry = {
    caseId: num,
    scorePercent: Number(score || 0),
    solvedAt: extra.solvedAt || new Date().toISOString(),
    attempts: Number(extra.attempts ?? 1),
    revisions: Number(extra.revisions ?? 0),
    solveMinutes: Number(extra.solveMinutes ?? 0),
  }

  const idx = appState.userSolvedCases.findIndex(e => Number(e.caseId) === num)
  if (idx >= 0) {
    appState.userSolvedCases[idx] = { ...appState.userSolvedCases[idx], ...entry }
  } else {
    appState.userSolvedCases = [...appState.userSolvedCases, entry]
  }
  persistUserData()
}

export const getSolvedCases = () =>
  [...appState.userSolvedCases]
    .sort((a, b) => String(b.solvedAt || '').localeCompare(String(a.solvedAt || '')))
    .map(e => {
      const c = getCaseById(e.caseId)
      return c ? { caseId: c.id, title: c.title, scorePercent: e.scorePercent, solvedAt: e.solvedAt } : null
    })
    .filter(Boolean)

export const getCaseLeaderboard = (caseId) => {
  const num = Number(caseId)
  const entries = [...(caseLeaderboardsSeed[num] || [])]
  const solved = appState.userSolvedCases.find(e => Number(e.caseId) === num)

  if (appState.isAuthenticated && solved) {
    const userEntry = {
      id: `user-${num}`,
      login: appState.user.login || appState.user.username || 'User',
      firstName: appState.user.firstName || '',
      lastName: appState.user.lastName || '',
      city: appState.user.city || 'Нет города',
      score: Number(solved.scorePercent || 0),
      isCurrentUser: true,
    }
    const idx = entries.findIndex(e => e.login === userEntry.login)
    if (idx >= 0) entries[idx] = userEntry
    else entries.push(userEntry)
  }

  return entries.sort((a, b) => Number(b.score) - Number(a.score)).map((e, i) => ({
    ...e,
    rank: i + 1,
    fullName: [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || e.login,
  }))
}

export const getRoleOptions = () => [...roleOptions]
export const getRoleLabel = (val) => roleOptions.find(o => o.value === val)?.label || 'Не указан'
export const getDifficultyPreferenceOptions = () => [...difficultyPreferenceOptions]
export const getPreferenceTagOptions = () => [...new Set(appState.cases.flatMap(c => c.tags))].sort()

export const getAchievementsForUser = () => {
  const solved = appState.userSolvedCases
  const solvedIds = new Set(solved.map(e => Number(e.caseId)))
  const dataSci = solved.filter(e => getCaseById(e.caseId)?.tags.includes('Data Science')).length
  const busBiz = solved.filter(e => getCaseById(e.caseId)?.tags.includes('Бизнес-стратегия')).length
  const perfect = solved.filter(e => Number(e.scorePercent) === 100).length
  const hardCases = solved.filter(e => getCaseById(e.caseId)?.difficulty === 'Сложный').length

  return [
    { id: 'rapid', title: '⚡ Стремительный взлёт', desc: 'Решите 5 кейсов', active: solvedIds.size >= 5, prog: `${Math.min(solvedIds.size, 5)}/5` },
    { id: 'collector', title: '📚 Коллекционер', desc: 'Решите 20 кейсов', active: solvedIds.size >= 20, prog: `${Math.min(solvedIds.size, 20)}/20` },
    { id: 'perfect', title: '💎 Идеальное решение', desc: '100% за кейс', active: perfect >= 1, prog: `${Math.min(perfect, 1)}/1` },
    { id: 'hardcore', title: '🧠 Хардкорщик', desc: '3 сложных кейса', active: hardCases >= 3, prog: `${Math.min(hardCases, 3)}/3` },
    { id: 'datasci', title: '📊 Data-мастер', desc: '5 DS кейсов', active: dataSci >= 5, prog: `${Math.min(dataSci, 5)}/5` },
    { id: 'bizlead', title: '🏢 Бизнес-лидер', desc: '5 бизнес кейсов', active: busBiz >= 5, prog: `${Math.min(busBiz, 5)}/5` },
    { id: 'toprank', title: '🎖️ Лидер мнений', desc: 'Топ-3 рейтинга', active: appState.user.rank > 0 && appState.user.rank <= 3, prog: `#${appState.user.rank || '-'}` },
  ]
}

export const getFullName = (user) => {
  if (!user) return ''
  const firstName = user.firstName || ''
  const lastName = user.lastName || ''
  return [firstName, lastName].filter(Boolean).join(' ') || user.login || user.nickname || 'Пользователь'
}

export const getSolvedCasesForUser = () => {
  return appState.userSolvedCases
    .map(solved => ({ ...getCaseById(solved.caseId), ...solved }))
    .filter(c => c)
}

export const getFavoriteCasesForUser = () => {
  return appState.userFavoriteCaseIds
    .map(id => getCaseById(id))
    .filter(c => c)
}

export const saveSolvedCaseResult = saveSolvedCase

syncTopUsers()
appState.recommendedCaseId = calcRecommendedCase()
