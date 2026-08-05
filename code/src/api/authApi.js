const API_URL = process.env.VUE_APP_API_BASE_URL || ''
const ML_URL = process.env.VUE_APP_ML_API_BASE_URL || ''
const CASE_ASSET_URL = process.env.VUE_APP_CASE_ASSET_BASE_URL || ''

const AUTH_PREFIX = '/api/v1/auth'
const ADMIN_PREFIX = '/api/admin/v1'
const CASE_PREFIX = '/api/v1/cases'
const SITE_PREFIX = '/api/v1/site'
const TEXT_PREFIX = '/api/text/v1'

const withBaseUrl = (baseUrl, path) => `${String(baseUrl || '').replace(/\/$/, '')}${path}`

const errors = {
  'Account does not exist': 'Такой пользователь не найден',
  'User not found': 'Такой пользователь не найден',
  'Пользователь не найден': 'Такой пользователь не найден',
  'Incorrect password': 'Неверный пароль',
  'Invalid password': 'Неверный пароль',
  'Please login first': 'Сначала войдите в аккаунт',
  'This email address is invalid': 'Некорректный email',
  'This email address is already taken': 'Email уже используется',
  'This username is already taken': 'Логин уже занят',
  'Password cannot be empty': 'Введите пароль',
  'Password cannot be longer than 30 characters': 'Пароль слишком длинный',
  'Password cannot be shorter than 8 characters': 'Пароль слишком короткий',
  'Password must contain at least 1 digit': 'Пароль должен иметь цифру',
  'Password must contain at least 1 special character': 'Пароль должен иметь спецсимвол',
  'Username cannot be longer than 20 characters': 'Логин слишком длинный',
  'Username cannot be shorter than 3 characters': 'Логин слишком короткий',
  'Username cannot be empty': 'Введите логин',
  'Username cannot contain spaces': 'Логин не должен иметь пробелы',
  'Session expired': 'Сессия истекла',
  'User does not exist': 'Пользователь не найден',
  'Invalid user status code': 'Некорректный статус пользователя',
  'Invalid username or password': 'Неверный логин или пароль',
  'User is still banned': 'Аккаунт временно заблокирован',
  'You are already logged in': 'Сначала выйдите из текущего аккаунта',
  'You are not logged in': 'Вы уже вышли из аккаунта',
  'Invalid request': 'Не удалось обработать данные',
  'Validation method is required': 'Выберите способ подтверждения email',
  'Verification code is required': 'Введите код из письма',
  'Invalid or expired verification code': 'Неверный или устаревший код подтверждения',
  'Verification session expired.': 'Сессия подтверждения истекла. Начните регистрацию заново',
  'Invalid or expired verification session.': 'Сессия подтверждения истекла. Начните регистрацию заново',
  'Account is not verified': 'Подтвердите email перед входом',
  'Backend недоступен': 'Сервис временно недоступен',
}

const httpErrors = {
  401: 'Сначала войдите в аккаунт',
  403: 'Недостаточно прав для этого действия',
  404: 'Ресурс не найден',
  502: 'Сервис временно недоступен',
}

const translateError = (message, fallback = 'Не удалось выполнить действие') => {
  const normalized = String(message || '').trim()
  if (!normalized) {
    return fallback
  }

  if (normalized.startsWith('<!DOCTYPE') || normalized.startsWith('<html')) {
    return fallback
  }

  return errors[normalized] || normalized
}

const buildRequestError = ({ message, status = 0, body = null, fallback }) => {
  const error = new Error(translateError(message, fallback || httpErrors[status] || 'Не удалось выполнить действие'))
  error.status = status
  error.body = body
  return error
}

async function parseResponse(res) {
  const raw = await res.text()
  if (!raw) {
    return { data: null, raw: '' }
  }

  try {
    return { data: JSON.parse(raw), raw }
  } catch {
    return { data: null, raw }
  }
}

async function request(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })

  const { data, raw } = await parseResponse(res)

  if (!res.ok) {
    throw buildRequestError({
      message: data?.errorText || data?.message || raw,
      status: res.status,
      body: data,
    })
  }

  if (data && typeof data === 'object' && !Array.isArray(data) && data.success === false) {
    throw buildRequestError({
      message: data.errorText || data.message,
      status: data.errorText === 'Please login first' || data.errorText === 'Session expired' ? 401 : res.status,
      body: data,
      fallback: 'Ошибка запроса',
    })
  }

  return data
}

async function mlRequest(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    },
  })

  const { data, raw } = await parseResponse(res)

  if (!res.ok) {
    throw buildRequestError({
      message: data?.message || raw,
      status: res.status,
      body: data,
      fallback: 'Не удалось обработать ответ',
    })
  }

  return data
}

async function multipartRequest(url, formData, method = 'POST') {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    body: formData,
  })
  const { data, raw } = await parseResponse(res)
  if (!res.ok || data?.success === false) {
    throw buildRequestError({
      message: data?.errorText || data?.message || raw,
      status: res.status,
      body: data,
      fallback: 'Не удалось загрузить файл',
    })
  }
  return data
}

const difficultyLabels = {
  EASY: 'Легко',
  MEDIUM: 'Средне',
  HARD: 'Сложно',
}

const difficultyCodes = Object.fromEntries(
  Object.entries(difficultyLabels).map(([code, label]) => [label, code])
)

export const getCaseAssetUrl = (key) => {
  const value = String(key || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const normalizedKey = value.replace(/^\/+/, '')
  if (!CASE_ASSET_URL) return `/${normalizedKey}`
  return `${CASE_ASSET_URL.replace(/\/$/, '')}/${normalizedKey}`
}

const getCaseTagName = (caseTag) => {
  if (typeof caseTag === 'string') return caseTag
  return caseTag?.name || caseTag?.tag?.name || ''
}

export const normalizeCase = (item = {}) => {
  const rawTags = Array.isArray(item.tags) ? item.tags : item.caseTags
  const tags = [...new Set((rawTags || []).map(getCaseTagName).filter(Boolean))]
  const difficultyCode = difficultyLabels[item.difficulty]
    ? item.difficulty
    : difficultyCodes[item.difficulty] || item.difficulty || ''

  return {
    id: Number(item.id),
    slug: item.slug || '',
    title: item.title || '',
    titleEn: item.titleEn || '',
    description: item.description || '',
    fullDescription: item.fullDescription || item.description || '',
    difficulty: difficultyLabels[difficultyCode] || item.difficulty || '',
    difficultyCode,
    tags,
    caseTags: Array.isArray(item.caseTags) ? item.caseTags : [],
    averageSolveMinutes: Number(item.averageSolveMin ?? item.averageSolveMinutes ?? 0),
    pdfKey: item.pdfUrl || '',
    iconKey: item.iconUrl || '',
    pdfUrl: getCaseAssetUrl(item.pdfUrl),
    iconUrl: getCaseAssetUrl(item.iconUrl),
    promptContextEn: item.promptContextEn || '',
    viewsCount: Number(item.viewsCount || 0),
    active: item.active ?? item.isActive ?? true,
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  }
}

const toCaseApiPayload = (item = {}) => ({
  slug: item.slug || '',
  title: item.title || '',
  titleEn: item.titleEn || '',
  description: item.description || '',
  fullDescription: item.fullDescription || '',
  difficulty: difficultyLabels[item.difficultyCode]
    ? item.difficultyCode
    : difficultyCodes[item.difficulty] || item.difficulty || 'MEDIUM',
  averageSolveMin: Number(item.averageSolveMin ?? item.averageSolveMinutes ?? 0),
  promptContextEn: item.promptContextEn || '',
  isActive: item.active ?? item.isActive ?? true,
  ...(item.removePdf !== undefined ? { removePdf: Boolean(item.removePdf) } : {}),
  ...(item.removeIcon !== undefined ? { removeIcon: Boolean(item.removeIcon) } : {}),
})

const buildCaseFormData = (item, files = {}) => {
  const formData = new FormData()
  formData.append(
    'case',
    new Blob([JSON.stringify(toCaseApiPayload(item))], { type: 'application/json' })
  )
  if (files.pdfFile) formData.append('pdfFile', files.pdfFile)
  if (files.iconFile) formData.append('iconFile', files.iconFile)
  return formData
}
function normalizeCity(city) {
  if (!city || city.cityName === 'not_set') {
    return { cityId: city?.id ?? city?.cityId ?? null, cityName: '', regionName: '' }
  }
  return {
    cityId: city?.id ?? city?.cityId ?? null,
    cityName: city?.cityName || '',
    regionName: city?.regionName || '',
  }
}

export const formatBirthdateForApi = (date) => {
  if (!date || !date.includes('-')) return date || ''
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year}`
}

export const parseBirthdateFromApi = (date) => {
  if (!date || !date.includes('.')) return date || ''
  const [day, month, year] = date.split('.')
  return `${year}-${month}-${day}`
}

export const mapApiProfileToState = (profile, fallback = {}) => {
  const username = profile?.username || fallback.username || profile?.nickName || profile?.nickname || ''
  const login = profile?.nickName || profile?.nickname || fallback.login || username

  return {
    id: profile?.id ?? fallback.id ?? null,
    username,
    login,
    nickname: login,
    email: profile?.email ?? fallback.email ?? '',
    firstName: profile?.firstName ?? fallback.firstName ?? '',
    lastName: profile?.lastName ?? fallback.lastName ?? '',
    birthDate: parseBirthdateFromApi(profile?.birthdate || fallback.birthDate || ''),
    role: profile?.status ?? fallback.role ?? '',
    cityId: profile?.cityId ?? fallback.cityId ?? null,
    city: profile?.cityName ?? profile?.city ?? fallback.city ?? '',
    region: profile?.regionName ?? profile?.region ?? fallback.region ?? '',
    creationDate: profile?.creationDate ?? fallback.creationDate ?? '',
    rank: profile?.placement ?? fallback.rank ?? 57,
    points: profile?.score ?? fallback.points ?? 0,
    avatarUrl: getCaseAssetUrl(profile?.avatarUrl || fallback.avatarUrl),
  }
}

export const checkSession = () =>
  request(withBaseUrl(API_URL, `${TEXT_PREFIX}/checkCookie`), { method: 'GET' })

export const resetPassword = ({ oldPassword, newPassword }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/resetpassword`), {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })

export const registerRequest = ({ username, email, password, birthdate, status, cityId, validationMethod }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/register`), {
    method: 'POST',
    body: JSON.stringify({ username, email, password, birthdate, status, cityId, validationMethod }),
  })

export const loginRequest = ({ username, password }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/login`), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const logoutRequest = () =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/logout`), { method: 'GET' })

export const changeEmail = ({ email }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/changeemail`), {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const changeUserParams = ({ firstName, lastName, middleName, nickName, birthdate, status, cityId }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/changeparams`), {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, middleName, nickName, birthdate, status, cityId }),
  })

export const verifyEmail = ({ verification }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/verify/${encodeURIComponent(verification)}`), {
    method: 'POST',
  })

export const setProfilePicture = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return multipartRequest(withBaseUrl(API_URL, `${AUTH_PREFIX}/setProfilePicture`), formData)
}

export const listCases = async () => {
  const items = await request(withBaseUrl(API_URL, `${CASE_PREFIX}/getAll`))
  return Array.isArray(items) ? items.map(normalizeCase) : []
}

export const getCaseByIdRequest = async (id) => {
  const item = await request(
    withBaseUrl(API_URL, `${CASE_PREFIX}/${encodeURIComponent(id)}`)
  )
  return normalizeCase(item)
}

export const listCaseTags = async () => {
  const tags = await request(withBaseUrl(API_URL, `${CASE_PREFIX}/tags`))
  return Array.isArray(tags)
    ? tags.map((tag) => ({
        id: tag?.id ?? null,
        name: tag?.name || '',
        count: Number(tag?.count || 0),
      })).filter((tag) => tag.name)
    : []
}

export const listAdminCases = async () => {
  const items = await request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/cases`))
  return Array.isArray(items) ? items.map(normalizeCase) : []
}

export const createCaseRequest = (item, files = {}) =>
  multipartRequest(
    withBaseUrl(API_URL, `${ADMIN_PREFIX}/createCase`),
    buildCaseFormData(item, files),
    'POST'
  )

export const updateCaseRequest = (id, item, files = {}) =>
  multipartRequest(
    withBaseUrl(API_URL, `${ADMIN_PREFIX}/cases/${encodeURIComponent(id)}`),
    buildCaseFormData(item, files),
    'PUT'
  )

export const createAdminUser = (payload) =>
  request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users`), {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateAdminUser = (id, payload) =>
  request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteAdminUser = (id) =>
  request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })

export const createCaseTag = (name) =>
  request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags`), {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const deactivateCaseTag = (id) =>
  request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags/${encodeURIComponent(id)}/deactivate`), {
    method: 'PATCH',
  })

export const attachCaseTag = (caseId, tagId) =>
  request(
    withBaseUrl(
      API_URL,
      `${ADMIN_PREFIX}/cases/${encodeURIComponent(caseId)}/tags/${encodeURIComponent(tagId)}`
    ),
    { method: 'POST' }
  )

export const detachCaseTag = (caseId, tagId) =>
  request(
    withBaseUrl(
      API_URL,
      `${ADMIN_PREFIX}/cases/${encodeURIComponent(caseId)}/tags/${encodeURIComponent(tagId)}`
    ),
    { method: 'DELETE' }
  )

export const listCities = async (query = '') => {
  const q = String(query).trim()
  if (q.length < 2) return []
  const cities = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/searchLocation/${encodeURIComponent(q)}`)
  )
  return Array.isArray(cities) ? cities : []
}

export const getUserCityById = async (id) => {
  const city = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/user/${encodeURIComponent(id)}/city`)
  )
  return normalizeCity(city)
}

export const getUserProfileById = (id) =>
  request(withBaseUrl(API_URL, `${SITE_PREFIX}/user/${encodeURIComponent(id)}/profile`))

export const getCurrentUserProfile = () =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/me`))

export const listLeaderboard = async () => {
  const users = await request(withBaseUrl(API_URL, `${SITE_PREFIX}/leaderboard/top5`))
  return Array.isArray(users) ? users : []
}

export const listCaseLeaderboard = async (caseId) => {
  const users = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/leaderboard/case/${encodeURIComponent(caseId)}/top5`)
  )
  return Array.isArray(users) ? users : []
}

export const getCaseChatSequence = async (caseId) => {
  const sequence = await request(
    withBaseUrl(API_URL, `${TEXT_PREFIX}/getChatSequence/${encodeURIComponent(caseId)}`)
  )
  return Array.isArray(sequence) ? sequence : []
}

export const evaluateCaseSolution = ({ text, caseId }) =>
  mlRequest(withBaseUrl(ML_URL, '/evaluate'), {
    method: 'POST',
    body: JSON.stringify({ text, case_id: caseId }),
  })

export const isNotFoundError = (error) => {
  const message = error?.message || ''
  return message.includes('не найден') || message.includes('not found')
}

export const isBannedError = (error) => {
  const message = String(error?.body?.errorText || error?.body?.message || error?.message || '').toLowerCase()
  return message.includes('banned') || message.includes('заблокирован')
}
