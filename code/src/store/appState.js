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
  { value: 'OTHER', label: 'Другое' },
]

const difficultyPreferenceOptions = [
  { value: 'easy', label: 'Я люблю полегче' },
  { value: 'medium', label: 'Мне нравится средняя сложность' },
  { value: 'hard', label: 'Я люблю посложнее' },
]

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
  topUsers: [],
  cases: [],
  casesLoading: false,
  casesError: '',
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

const diffDiffMap = { easy: 'Легко', medium: 'Средне', hard: 'Сложно' }

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
      return { id: c.id, score }
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id)
  
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
  appState.topUsers = Array.isArray(users)
    ? [...users].sort((a, b) => Number(a.rank) - Number(b.rank))
    : []
}

export const setCasesLoading = (value) => {
  appState.casesLoading = Boolean(value)
}

export const setCasesError = (message = '') => {
  appState.casesError = String(message || '')
}

export const setCases = (items) => {
  appState.cases = Array.isArray(items) ? [...items] : []
  appState.casesError = ''
  appState.recommendedCaseId = calcRecommendedCase()
}

export const upsertCase = (item) => {
  if (!item?.id) return
  const index = appState.cases.findIndex((caseItem) => Number(caseItem.id) === Number(item.id))
  if (index >= 0) {
    appState.cases[index] = item
  } else {
    appState.cases = [...appState.cases, item]
  }
  appState.recommendedCaseId = calcRecommendedCase()
}

export const setUserAvatar = (url) => {
  appState.user.avatarUrl = url
  persistUserData()
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

export const getRoleOptions = () => [...roleOptions]
export const getRoleLabel = (val) => roleOptions.find(o => o.value === val)?.label || 'Не указан'
export const getDifficultyPreferenceOptions = () => [...difficultyPreferenceOptions]
export const getPreferenceTagOptions = () => [...new Set(appState.cases.flatMap(c => c.tags))].sort()

export const getAchievementsForUser = () => {
  const solved = appState.userSolvedCases
  const solvedIds = new Set(solved.map(e => Number(e.caseId)))
  const dataSci = solved.filter(e => getCaseById(e.caseId)?.tags.includes('AI')).length
  const busBiz = solved.filter(e => getCaseById(e.caseId)?.tags.includes('Strategy')).length
  const perfect = solved.filter(e => Number(e.scorePercent) === 100).length
  const hardCases = solved.filter(e => getCaseById(e.caseId)?.difficulty === 'Сложно').length

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

appState.recommendedCaseId = calcRecommendedCase()
