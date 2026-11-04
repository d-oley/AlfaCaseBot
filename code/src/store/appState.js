import { reactive } from 'vue'
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

const normalizePreferences = (value = {}) => {
  const tagIds = []
  const savedIds = Array.isArray(value.tagIds) ? value.tagIds : []
  for (const savedId of savedIds) {
    const id = Number(savedId)
    if (Number.isFinite(id) && id > 0 && !tagIds.includes(id)) {
      tagIds.push(id)
    }
  }

  const tags = []
  const savedTags = Array.isArray(value.tags) ? [...value.tags] : []
  if (value.tag) savedTags.push(value.tag)
  for (const tag of savedTags) {
    if (tag && !tags.includes(tag)) tags.push(tag)
  }

  return { tagIds, tags, difficulty: value.difficulty || '' }
}

const getDefaultUser = () => ({
  id: null, username: '', email: '', login: '', nickname: '',
  firstName: '', lastName: '', middleName: '', gender: 'NOT_STATED', birthDate: '', role: '',
  cityId: null, city: '', region: '', creationDate: '',
  avatarUrl: '', rank: 0, preferences: getDefaultPreferences(),
})

function safeParse(val, fallback) {
  try {
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

const readSessionStorage = (key, fallback) => safeParse(sessionStorage.getItem(key), fallback)
const initialBanNotice = readSessionStorage(BAN_NOTICE_STORAGE_KEY, null)

// удаляем старые данные профиля из localStorage: актуальные данные приходят с сервера
localStorage.removeItem('alfacasebot-session-v2')
localStorage.removeItem('alfacasebot-user-data-v2')

export const appState = reactive({
  isAuthenticated: false,
  isAdmin: false,
  user: getDefaultUser(),
  topUsers: [],
  cases: [],
  casesLoading: false,
  casesError: '',
  cities: [],
  availableTags: [],
  recommendedCaseId: null,
  shouldShowPreferencesOnboarding: false,
  userSolvedCases: [],
  userFavoriteCaseIds: [],
  userAchievements: [],
  viewedCaseIds: [],
  banNotice: initialBanNotice,
})

const diffDiffMap = { easy: 'Легко', medium: 'Средне', hard: 'Сложно' }
const normalizeTagName = (value) => String(value || '').trim().toLocaleLowerCase('ru-RU')

// эту функцию помог доработать chatgpt sol
const calcRecommendedCase = () => {
  const tagIds = new Set((appState.user.preferences?.tagIds || []).map(Number))
  const tags = new Set((appState.user.preferences?.tags || []).map(normalizeTagName).filter(Boolean))
  const diff = diffDiffMap[appState.user.preferences?.difficulty] || ''
  if (!tagIds.size && !tags.size && !diff) return null

  const solved = new Set()
  for (const result of appState.userSolvedCases) {
    if (Number(result.scorePercent) >= SOLVE_SCORE_THRESHOLD) {
      solved.add(Number(result.caseId))
    }
  }

  const variants = []
  for (const item of appState.cases) {
   let matchingTags = 0
    for (const tag of item.tags || []) {
      if (tags.has(normalizeTagName(tag))) matchingTags++
    }

    let matchingTagIds = 0
    for (const id of item.tagIds || []) {
      if (tagIds.has(Number(id))) matchingTagIds++
    }

    let score = Math.max(matchingTags, matchingTagIds) * 3
    if (diff && item.difficulty === diff) score += 2
    if (score > 0) {
      variants.push({ id: item.id, score, solved: solved.has(Number(item.id)) })
    }
  }

  // сначала предлагаем нерешенные кейсы, потом сравниваем совпадения
  variants.sort((a, b) => {
   const solvedDifference = Number(a.solved) - Number(b.solved)
    if (solvedDifference) return solvedDifference
    if (a.score !== b.score) return b.score - a.score
    return a.id - b.id
  })
  return variants[0]?.id || null
}

export const hydrateUser = (payload, opts = {}) => {
  appState.isAuthenticated = true
  appState.user = {
    ...getDefaultUser(),
    ...payload,
    login: payload.login || payload.nickname || payload.username || '',
    nickname: payload.nickname || payload.login || payload.username || '',
    username: payload.username || '',
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    cityId: payload.cityId ?? null,
    city: payload.city || '',
    region: payload.region || '',
    rank: payload.rank ?? 0,
    avatarUrl: payload.avatarUrl || '',
    preferences: normalizePreferences(payload.preferences),
  }
  appState.userSolvedCases = []
  appState.userFavoriteCaseIds = []
  appState.viewedCaseIds = []
  appState.shouldShowPreferencesOnboarding = Boolean(opts.onboarding)

  appState.recommendedCaseId = calcRecommendedCase()
}

export const registerUser = (payload) => {
  hydrateUser(payload, { onboarding: true })
}

export const loginUser = (payload) => {
  hydrateUser(payload)
}

export const logoutUser = () => {
  appState.isAuthenticated = false
  appState.isAdmin = false
  appState.user = getDefaultUser()
  appState.userSolvedCases = []
  appState.userFavoriteCaseIds = []
  appState.userAchievements = []
  appState.viewedCaseIds = []
  appState.shouldShowPreferencesOnboarding = false
  appState.recommendedCaseId = null
}

export const setAdminAccess = (value) => {
  appState.isAdmin = Boolean(value)
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

export const setAvailableTags = (items) => {
  appState.availableTags = Array.isArray(items) ? items.filter(item => item?.active !== false) : []
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
}

export const updateUserProfile = (payload) => {
  const nextLogin = payload.login ?? payload.nickname ?? appState.user.login

  appState.user = {
    ...appState.user,
    ...payload,
    login: nextLogin || '',
    nickname: payload.nickname ?? nextLogin ?? '',
    username: payload.username ?? appState.user.username ?? '',
    preferences: normalizePreferences({ ...appState.user.preferences, ...payload.preferences }),
  }

  appState.recommendedCaseId = calcRecommendedCase()
}

export const updateUserPreferences = (payload = {}, { closeOnboarding = true } = {}) => {
  appState.user.preferences = normalizePreferences(payload)
  if (closeOnboarding) appState.shouldShowPreferencesOnboarding = false
  appState.recommendedCaseId = calcRecommendedCase()
}

export const skipUserPreferences = () => {
  appState.user.preferences = getDefaultPreferences()
  appState.shouldShowPreferencesOnboarding = false
  appState.recommendedCaseId = calcRecommendedCase()
}

export const closePreferencesOnboarding = () => {
  appState.shouldShowPreferencesOnboarding = false
}

export const getCaseById = (id) => appState.cases.find(c => c.id === Number(id)) || null

export const markCaseViewed = (id) => {
  const num = Number(id)
  if (!appState.viewedCaseIds.includes(num)) {
    appState.viewedCaseIds = [...appState.viewedCaseIds, num]
  }
}

export const isCaseFavorite = (id) => appState.userFavoriteCaseIds.includes(Number(id))

export const setUserFavoriteCases = (cases = []) => {
  const ids = []
  for (const item of cases) {
    const id = Number(item?.id ?? item)
    if (Number.isFinite(id) && id > 0 && !ids.includes(id)) {
      ids.push(id)
    }
  }
  appState.userFavoriteCaseIds = ids
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
  appState.availableTags.forEach((tag) => {
    const id = Number(tag?.id)
    if (tag?.name && Number.isFinite(id) && id > 0) tags.set(id, { id, name: tag.name })
  })
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
  return [firstName, user.middleName, lastName].filter(Boolean).join(' ') || user.login || user.nickname || 'Пользователь'
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
