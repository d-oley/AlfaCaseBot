import { reactive } from 'vue'
const SESSION_STORAGE_KEY = 'alfacasebot-session-v2'
const USER_DATA_STORAGE_KEY = 'alfacasebot-user-data-v2'
const BAN_NOTICE_STORAGE_KEY = 'alfacasebot-ban-notice-v1'
export const SOLVE_SCORE_THRESHOLD = 70

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

const getDefaultPreferences = () => ({ tagIds: [], tags: [], difficulty: '' })

const normalizePreferences = (value = {}) => ({
  tagIds: [...new Set(
    (Array.isArray(value.tagIds) ? value.tagIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )],
  tags: [...new Set([
    ...(Array.isArray(value.tags) ? value.tags : []),
    ...(value.tag ? [value.tag] : []),
  ].filter(Boolean))],
  difficulty: value.difficulty || '',
})

const getDefaultUser = () => ({
  id: null, username: '', email: '', login: '', nickname: '',
  firstName: '', lastName: '', birthDate: '', role: '',
  cityId: null, city: '', region: '', creationDate: '',
  avatarUrl: '', rank: 0, preferences: getDefaultPreferences(),
})

const getDefaultLocalUserData = () => ({
  firstName: '', lastName: '', rank: 0,
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
    preferences: normalizePreferences(saved.preferences),
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
    preferences: normalizePreferences({
      ...session.user?.preferences,
      ...local.preferences,
    }),
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
  userAchievements: [],
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
    rank: appState.user.rank ?? 0,
    cityId: appState.user.cityId ?? null,
    city: appState.user.city || '',
    region: appState.user.region || '',
    preferences: normalizePreferences(appState.user.preferences),
    userSolvedCases: [...appState.userSolvedCases],
    userFavoriteCaseIds: [...appState.userFavoriteCaseIds],
    viewedCaseIds: [...appState.viewedCaseIds],
    shouldShowPreferencesOnboarding: appState.shouldShowPreferencesOnboarding,
  }

  writeStorage(USER_DATA_STORAGE_KEY, allUsers)
  persistSession()
}

const diffDiffMap = { easy: 'Легко', medium: 'Средне', hard: 'Сложно' }
const normalizeTagName = (value) => String(value || '').trim().toLocaleLowerCase('ru-RU')

const calcRecommendedCase = () => {
  const tagIds = new Set((appState.user.preferences?.tagIds || []).map(Number))
  const tags = new Set((appState.user.preferences?.tags || []).map(normalizeTagName).filter(Boolean))
  const diff = diffDiffMap[appState.user.preferences?.difficulty] || ''
  if (!tagIds.size && !tags.size && !diff) return null

  const solved = new Set(
    appState.userSolvedCases
      .filter(e => Number(e.scorePercent) >= SOLVE_SCORE_THRESHOLD)
      .map(e => Number(e.caseId))
  )
  const ranked = appState.cases
    .map(c => {
      let score = 0
      const matchingTags = (c.tags || [])
        .map(normalizeTagName)
        .filter((tag) => tags.has(tag)).length
      const matchingTagIds = (c.tagIds || []).filter((id) => tagIds.has(Number(id))).length
      score += Math.max(matchingTags, matchingTagIds) * 3
      if (diff && c.difficulty === diff) score += 2
      return { id: c.id, score, solved: solved.has(Number(c.id)) }
    })
    .filter(c => c.score > 0)
    .sort((a, b) => Number(a.solved) - Number(b.solved) || b.score - a.score || a.id - b.id)
  
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
    rank: payload.rank ?? local.rank ?? 0,
    avatarUrl: payload.avatarUrl || '',
    preferences: normalizePreferences({
      ...payload.preferences,
      ...local.preferences,
    }),
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
  appState.userAchievements = []
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
    preferences: normalizePreferences({ ...appState.user.preferences, ...payload.preferences }),
  }

  persistUserData(prevKey)
  appState.recommendedCaseId = calcRecommendedCase()
}

export const updateUserPreferences = (payload = {}, { closeOnboarding = true } = {}) => {
  appState.user.preferences = normalizePreferences(payload)
  if (closeOnboarding) appState.shouldShowPreferencesOnboarding = false
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

export const setUserFavoriteCases = (cases = []) => {
  appState.userFavoriteCaseIds = [...new Set(
    cases.map((item) => Number(item?.id ?? item)).filter((id) => Number.isFinite(id) && id > 0)
  )]
  persistUserData()
}

export const setUserAchievements = (achievements = []) => {
  appState.userAchievements = Array.isArray(achievements) ? [...achievements] : []
}

export const setCaseFavorite = (id, favorite) => {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return false
  const ids = new Set(appState.userFavoriteCaseIds)
  if (favorite) ids.add(num)
  else ids.delete(num)
  appState.userFavoriteCaseIds = [...ids]
  persistUserData()
  return isCaseFavorite(num)
}

export const toggleCaseFavorite = (id) => {
  return setCaseFavorite(id, !isCaseFavorite(id))
}

export const getFavoriteCases = () =>
  appState.userFavoriteCaseIds.map(id => getCaseById(id)).filter(Boolean)

export const saveSolvedCase = (id, score, extra = {}) => {
  const num = Number(id)
  const normalizedScore = Number(score)
  if (!Number.isFinite(normalizedScore) || normalizedScore < SOLVE_SCORE_THRESHOLD) return false

  const entry = {
    caseId: num,
    scorePercent: normalizedScore,
    solvedAt: extra.solvedAt || new Date().toISOString(),
    attempts: Number(extra.attempts ?? 1),
    revisions: Number(extra.revisions ?? 0),
  }

  const idx = appState.userSolvedCases.findIndex(e => Number(e.caseId) === num)
  if (idx >= 0) {
    const previous = appState.userSolvedCases[idx]
    appState.userSolvedCases[idx] = {
      ...previous,
      ...entry,
      scorePercent: Math.max(Number(previous.scorePercent || 0), normalizedScore),
      solvedAt: previous.solvedAt || entry.solvedAt,
    }
  } else {
    appState.userSolvedCases = [...appState.userSolvedCases, entry]
  }
  persistUserData()
  appState.recommendedCaseId = calcRecommendedCase()
  return true
}

export const getSolvedCases = () =>
  [...appState.userSolvedCases]
    .filter(e => Number(e.scorePercent) >= SOLVE_SCORE_THRESHOLD)
    .sort((a, b) => String(b.solvedAt || '').localeCompare(String(a.solvedAt || '')))
    .map(e => {
      const c = getCaseById(e.caseId)
      return c ? { caseId: c.id, title: c.title, scorePercent: e.scorePercent, solvedAt: e.solvedAt } : null
    })
    .filter(Boolean)

export const getRoleOptions = () => [...roleOptions]
export const getRoleLabel = (val) => roleOptions.find(o => o.value === val)?.label || 'Не указан'
export const getDifficultyPreferenceOptions = () => [...difficultyPreferenceOptions]
export const getPreferenceTagOptions = () => {
  const tags = new Map()
  appState.cases.forEach((caseItem) => {
    (caseItem.tags || []).forEach((name, index) => {
      const id = Number(caseItem.tagIds?.[index])
      if (name && Number.isFinite(id) && id > 0) tags.set(id, { id, name })
    })
  })
  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export const getAchievementsForUser = () => {
  return appState.userAchievements
}

export const getFullName = (user) => {
  if (!user) return ''
  const firstName = user.firstName || ''
  const lastName = user.lastName || ''
  return [firstName, lastName].filter(Boolean).join(' ') || user.login || user.nickname || 'Пользователь'
}

export const getSolvedCasesForUser = () => {
  return appState.userSolvedCases
    .filter(solved => Number(solved.scorePercent) >= SOLVE_SCORE_THRESHOLD)
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
