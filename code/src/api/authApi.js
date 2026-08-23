import mockData from '@/mocks/mockData.json'

const API_URL = process.env.VUE_APP_API_BASE_URL || ''
const ML_URL = process.env.VUE_APP_ML_API_BASE_URL || ''
const CASE_ASSET_URL = process.env.VUE_APP_CASE_ASSET_BASE_URL || ''
const USE_MOCK_API = String(process.env.VUE_APP_USE_MOCK_API || '').toLowerCase() === 'true'
const MOCK_SESSION_KEY = 'alfacasebot-mock-session'

const AUTH_PREFIX = '/api/v1/auth'
const ADMIN_PREFIX = '/api/admin/v1'
const CASE_PREFIX = '/api/v1/cases'
const SITE_PREFIX = '/api/v1/site'
const TEXT_PREFIX = '/api/text/v1'

const mockClone = (value) => JSON.parse(JSON.stringify(value))
const hasMockSession = () => localStorage.getItem(MOCK_SESSION_KEY) === 'active'
const requireMockSession = () => {
  if (!hasMockSession()) {
    throw buildRequestError({ message: 'Please login first', status: 401 })
  }
}

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
  'Email is already taken': 'Email уже используется',
  'Username is already taken': 'Логин уже занят',
  'Tag with this name already exists': 'Тег с таким названием уже существует',
  'Tag is already attached to this case': 'Тег уже привязан к кейсу',
  'Tag is not attached to this case': 'Тег не привязан к кейсу',
  'this case is already in your favourites': 'Кейс уже добавлен в избранное',
  'this case is not in your favourites': 'Кейса уже нет в избранном',
  'Case is not active': 'Этот кейс сейчас недоступен',
  'One or more tags are invalid or inactive': 'Один или несколько выбранных тегов недоступны',
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
  'Account is already verified': 'Аккаунт уже подтверждён. Войдите в него',
  'Invalid email or username': 'Неверно указан email или логин',
  'Account is not verified': 'Подтвердите email перед входом',
  'Backend недоступен': 'Сервис временно недоступен',
}

const httpErrors = {
  401: 'Сначала войдите в аккаунт',
  403: 'Недостаточно прав для этого действия',
  404: 'Ресурс не найден',
  500: 'Сервис временно недоступен',
  502: 'Сервис временно недоступен',
  503: 'Сервис временно недоступен',
  504: 'Сервис временно недоступен',
  530: 'Сервис временно недоступен',
}

const translateError = (message, fallback = 'Не удалось выполнить действие') => {
  const normalized = String(message || '').trim()
  if (!normalized) {
    return fallback
  }

  if (/^\s*(?:<!doctype\s+html|<html[\s>])/i.test(normalized)) {
    return fallback
  }

  return errors[normalized] || normalized
}

const buildRequestError = ({ message, status = 0, body = null, fallback }) => {
  const statusFallback =
    httpErrors[status] || (status >= 500 ? 'Сервис временно недоступен' : 'Не удалось выполнить действие')
  const error = new Error(translateError(message, fallback || statusFallback))
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

  if (/^https?:\/\//i.test(value)) {
    try {
      const absoluteUrl = new URL(value)
      const assetPrefix = '/alfa-cases/'
      const assetPrefixIndex = absoluteUrl.pathname.indexOf(assetPrefix)

      // An absolute storage URL from Java would be blocked as mixed content on
      // the HTTPS site. Route known storage objects through our same-origin URL.
      if (CASE_ASSET_URL && assetPrefixIndex !== -1) {
        const assetKey = absoluteUrl.pathname.slice(assetPrefixIndex + assetPrefix.length)
        return `${CASE_ASSET_URL.replace(/\/$/, '')}/${assetKey}${absoluteUrl.search}`
      }
    } catch {
      return ''
    }

    return value
  }

  const normalizedKey = value.replace(/^\/+/, '')
  if (!CASE_ASSET_URL) return `/${normalizedKey}`
  return `${CASE_ASSET_URL.replace(/\/$/, '')}/${normalizedKey}`
}

const getCaseTagName = (caseTag) => {
  if (typeof caseTag === 'string') return caseTag
  return caseTag?.name || caseTag?.tag?.name || ''
}

const getCaseTagId = (caseTag) => {
  const value =
    caseTag?.tagId ??
    caseTag?.tag?.id ??
    caseTag?.id?.tagId ??
    (typeof caseTag?.id === 'number' || typeof caseTag?.id === 'string' ? caseTag.id : null)
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

export const normalizeCase = (item = {}) => {
  const rawTags = Array.isArray(item.tags) ? item.tags : item.caseTags
  const tags = [...new Set((rawTags || []).map(getCaseTagName).filter(Boolean))]
  const tagIds = [...new Set((rawTags || []).map(getCaseTagId).filter(Boolean))]
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
    tagIds,
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

const normalizeTag = (tag = {}) => ({
  id: Number(tag?.id) || null,
  name: tag?.name || '',
  count: Number(tag?.count ?? tag?.caseCount ?? 0),
  active: tag?.active ?? true,
})

const normalizePageResponse = (payload, fallbackItems = []) => ({
  items: Array.isArray(payload?.items) ? payload.items : fallbackItems,
  page: Number(payload?.page ?? 0),
  size: Number(payload?.size ?? fallbackItems.length),
  totalElements: Number(payload?.totalElements ?? fallbackItems.length),
  totalPages: Number(payload?.totalPages ?? (fallbackItems.length ? 1 : 0)),
})

const buildPageQuery = ({ page = 0, size = 100, search = '', sort = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (String(search).trim()) params.set('search', String(search).trim())
  if (String(sort).trim()) params.set('sort', String(sort).trim())
  return params.toString()
}

const loadAllPages = async ({ path, search = '', sort = '', normalizeItem = (item) => item }) => {
  const loadPage = (page) => request(
    withBaseUrl(API_URL, `${path}?${buildPageQuery({ page, size: 100, search, sort })}`)
  )
  const firstPage = normalizePageResponse(await loadPage(0))
  const remainingPages = firstPage.totalPages > 1
    ? await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) => loadPage(index + 1))
    )
    : []

  return [firstPage, ...remainingPages.map((page) => normalizePageResponse(page))]
    .flatMap((page) => page.items)
    .map(normalizeItem)
}

export const normalizeUserPreferences = (payload = {}) => {
  const preferredTags = Array.isArray(payload.preferredTags) ? payload.preferredTags : []
  return {
    tagIds: preferredTags.map((tag) => Number(tag?.id)).filter((id) => Number.isFinite(id) && id > 0),
    tags: preferredTags.map((tag) => tag?.name || '').filter(Boolean),
    difficulty: String(payload.preferredDifficulty || '').toLowerCase(),
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
  active: item.active ?? item.isActive ?? true,
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
    rank: profile?.placement ?? fallback.rank ?? 0,
    points: profile?.score ?? fallback.points ?? 0,
    avatarUrl: getCaseAssetUrl(profile?.avatarUrl || fallback.avatarUrl),
  }
}

export const checkSession = () =>
  USE_MOCK_API
    ? Promise.resolve().then(() => {
        requireMockSession()
        return { success: true, errorText: '', id: mockData.profile.id }
      })
    : request(withBaseUrl(API_URL, `${TEXT_PREFIX}/checkCookie`), { method: 'GET' })

export const resetPassword = ({ oldPassword, newPassword }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, oldPassword, newPassword })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/resetpassword`), {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })

export const registerRequest = ({ username, email, password, birthdate, status, cityId, validationMethod }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, verification: '123456', id: mockData.profile.id })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/register`), {
    method: 'POST',
    body: JSON.stringify({ username, email, password, birthdate, status, cityId, validationMethod }),
  })

export const resendVerificationEmail = ({ username, email, password, validationMethod = 'EMAIL' }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, verification: '123456', id: mockData.profile.id })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/resendEmail`), {
      method: 'POST',
      body: JSON.stringify({ username, email, password, validationMethod }),
    })

export const forgotUsername = ({ email }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, email })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/forgotUsername`), {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

export const forgotPasswordInit = ({ email, username }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, email, username })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/forgotPassword/init`), {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    })

export const forgotPasswordConfirm = ({ email, username, code, newPassword }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: mockData.profile.id })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/forgotPassword/confirm`), {
      method: 'POST',
      body: JSON.stringify({ email, username, code, newPassword }),
    })

export const loginRequest = ({ username, password }) =>
  USE_MOCK_API
    ? Promise.resolve().then(() => {
        if (!username || !password) throw new Error('Введите логин и пароль')
        localStorage.setItem(MOCK_SESSION_KEY, 'active')
        return { success: true, errorText: '', id: mockData.profile.id }
      })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/login`), {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

export const logoutRequest = () =>
  USE_MOCK_API
    ? Promise.resolve().then(() => {
        localStorage.removeItem(MOCK_SESSION_KEY)
        return { success: true, errorText: '' }
      })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/logout`), { method: 'GET' })

export const changeEmail = ({ email }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, email })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/changeemail`), {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const changeUserParams = ({ firstName, lastName, middleName, nickName, birthdate, status, cityId }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/changeparams`), {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, middleName, nickName, birthdate, status, cityId }),
  })

export const verifyEmail = ({ verification }) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, verification })
    : request(withBaseUrl(API_URL, `${AUTH_PREFIX}/verify/${encodeURIComponent(verification)}`), {
        method: 'POST',
      })

export const setProfilePicture = (file) => {
  if (USE_MOCK_API) return Promise.resolve({ success: true, fileName: file?.name || '' })
  const formData = new FormData()
  formData.append('file', file)
  return multipartRequest(withBaseUrl(API_URL, `${AUTH_PREFIX}/setProfilePicture`), formData)
}

export const listCases = async () => {
  if (USE_MOCK_API) return mockData.cases.map(normalizeCase)
  return loadAllPages({ path: `${CASE_PREFIX}/getAll`, normalizeItem: normalizeCase })
}

export const getCaseByIdRequest = async (id) => {
  if (USE_MOCK_API) {
    const item = mockData.cases.find((caseItem) => Number(caseItem.id) === Number(id))
    if (!item) throw buildRequestError({ message: 'Кейс не найден', status: 404 })
    return normalizeCase(mockClone(item))
  }
  const item = await request(
    withBaseUrl(API_URL, `${CASE_PREFIX}/${encodeURIComponent(id)}`)
  )
  return normalizeCase(item)
}

export const listCaseTags = async () => {
  if (USE_MOCK_API) {
    const tags = new Map()
    mockData.cases.forEach((item) => {
      item.tags.forEach((tag) => {
        const current = tags.get(tag.id) || { ...tag, count: 0 }
        current.count += 1
        tags.set(tag.id, current)
      })
    })
    return [...tags.values()]
  }
  const tags = await loadAllPages({ path: `${CASE_PREFIX}/tags`, normalizeItem: normalizeTag })
  return tags.filter((tag) => tag.name)
}

export const listAdminCases = async () => {
  if (USE_MOCK_API) {
    requireMockSession()
    return mockData.cases.map(normalizeCase)
  }
  return loadAllPages({
    path: `${ADMIN_PREFIX}/cases`,
    sort: 'createdAt,desc',
    normalizeItem: normalizeCase,
  })
}

const buildAdminPageQuery = ({ page = 0, size = 25, search = '', sort = 'createdAt,desc' } = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort })
  if (String(search).trim()) params.set('search', String(search).trim())
  return params.toString()
}

export const listAdminUsers = async (options = {}) => {
  if (USE_MOCK_API) {
    requireMockSession()
    const user = { ...mockClone(mockData.profile), username: mockData.profile.nickName, role: 'USER' }
    return normalizePageResponse({ items: [user], page: 0, size: 25, totalElements: 1, totalPages: 1 })
  }
  return normalizePageResponse(
    await request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users?${buildAdminPageQuery(options)}`))
  )
}

export const getAdminUserById = (id) =>
  USE_MOCK_API
    ? Promise.resolve({ ...mockClone(mockData.profile), id: Number(id), username: mockData.profile.nickName, role: 'USER' })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users/${encodeURIComponent(id)}`))

export const listAdminTags = async (options = {}) => {
  if (USE_MOCK_API) {
    requireMockSession()
    const items = await listCaseTags()
    return normalizePageResponse({
      items: items.map((tag) => ({ ...tag, active: true, caseCount: tag.count })),
      page: 0,
      size: items.length,
      totalElements: items.length,
      totalPages: items.length ? 1 : 0,
    })
  }
  return normalizePageResponse(
    await request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags?${buildAdminPageQuery(options)}`))
  )
}

export const createCaseRequest = (item, files = {}) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Math.max(...mockData.cases.map(({ id }) => id)) + 1 })
    : multipartRequest(
    withBaseUrl(API_URL, `${ADMIN_PREFIX}/createCase`),
    buildCaseFormData(item, files),
    'POST'
  )

export const updateCaseRequest = (id, item, files = {}) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id), item, files })
    : multipartRequest(
    withBaseUrl(API_URL, `${ADMIN_PREFIX}/cases/${encodeURIComponent(id)}`),
    buildCaseFormData(item, files),
    'PUT'
  )

export const createAdminUser = (payload) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: 202, payload })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users`), {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateAdminUser = (id, payload) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id), payload })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteAdminUser = (id) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id) })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })

export const createCaseTag = (name) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Date.now(), name })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags`), {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const deactivateCaseTag = (id) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id) })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags/${encodeURIComponent(id)}/deactivate`), {
    method: 'PATCH',
  })

export const activateCaseTag = (id) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id) })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags/${encodeURIComponent(id)}/activate`), {
    method: 'PATCH',
  })

export const updateCaseTag = (id, payload) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, id: Number(id), payload })
    : request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/tags/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const attachCaseTag = (caseId, tagId) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, caseId: Number(caseId), tagId: Number(tagId) })
    : request(
    withBaseUrl(
      API_URL,
      `${ADMIN_PREFIX}/cases/${encodeURIComponent(caseId)}/tags/${encodeURIComponent(tagId)}`
    ),
    { method: 'POST' }
  )

export const detachCaseTag = (caseId, tagId) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, caseId: Number(caseId), tagId: Number(tagId) })
    : request(
    withBaseUrl(
      API_URL,
      `${ADMIN_PREFIX}/cases/${encodeURIComponent(caseId)}/tags/${encodeURIComponent(tagId)}`
    ),
    { method: 'DELETE' }
  )

export const listCities = async (query = '') => {
  const q = String(query).trim()
  if (q.length < 2) return []
  if (USE_MOCK_API) {
    return mockClone(
      mockData.cities.filter((city) => city.cityName.toLowerCase().includes(q.toLowerCase()))
    )
  }
  const cities = await request(
    withBaseUrl(
      API_URL,
      `${SITE_PREFIX}/searchLocation/${encodeURIComponent(q)}?${buildPageQuery({ size: 25 })}`
    )
  )
  return normalizePageResponse(cities).items
}

export const listFavoriteCases = async () => {
  if (USE_MOCK_API) {
    requireMockSession()
    return []
  }
  return loadAllPages({
    path: `${SITE_PREFIX}/me/favorites`,
    sort: 'added_at,desc',
    normalizeItem: normalizeCase,
  })
}

export const addFavoriteCase = (caseId) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, caseId: Number(caseId) })
    : request(withBaseUrl(API_URL, `${SITE_PREFIX}/me/favorites/${encodeURIComponent(caseId)}`), {
      method: 'POST',
    })

export const removeFavoriteCase = (caseId) =>
  USE_MOCK_API
    ? Promise.resolve({ success: true, caseId: Number(caseId) })
    : request(withBaseUrl(API_URL, `${SITE_PREFIX}/me/favorites/${encodeURIComponent(caseId)}`), {
      method: 'DELETE',
    })

export const getUserPreferences = async () => {
  if (USE_MOCK_API) {
    requireMockSession()
    return normalizeUserPreferences()
  }
  return normalizeUserPreferences(
    await request(withBaseUrl(API_URL, `${SITE_PREFIX}/me/preferences`))
  )
}

export const saveUserPreferences = async ({ tagIds = [], difficulty = '' } = {}) => {
  const normalizedTagIds = [...new Set(
    tagIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  )]
  const normalizedDifficulty = String(difficulty || '').trim().toUpperCase()

  if (USE_MOCK_API) {
    requireMockSession()
    return {
      tagIds: normalizedTagIds,
      tags: [],
      difficulty: normalizedDifficulty.toLowerCase(),
    }
  }

  await request(withBaseUrl(API_URL, `${SITE_PREFIX}/me/preferences`), {
    method: 'PATCH',
    body: JSON.stringify({
      preferredDifficulty: normalizedDifficulty || null,
      preferredTags: normalizedTagIds,
      removeDifficulty: !normalizedDifficulty,
      removeTags: normalizedTagIds.length === 0,
    }),
  })
  return {
    tagIds: normalizedTagIds,
    tags: [],
    difficulty: normalizedDifficulty.toLowerCase(),
  }
}

export const getUserCityById = async (id) => {
  if (USE_MOCK_API) {
    const city = mockData.cities.find((item) => Number(item.id) === Number(mockData.profile.cityId))
    return normalizeCity(city)
  }
  const city = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/user/${encodeURIComponent(id)}/city`)
  )
  return normalizeCity(city)
}

export const getUserProfileById = (id) =>
  USE_MOCK_API
    ? Promise.resolve({ ...mockClone(mockData.profile), id: Number(id) })
    : request(withBaseUrl(API_URL, `${SITE_PREFIX}/user/${encodeURIComponent(id)}/profile`))

const normalizeAchievement = (item = {}) => ({
  id: Number(item.id),
  title: item.name || '',
  description: item.description || '',
  iconUrl: getCaseAssetUrl(item.iconUrl),
  obtainedAt: item.obtainedAt || null,
  active: Boolean(item.obtainedAt),
  progress: item.obtainedAt ? 'Получено' : 'Пока не получено',
})

export const listMyAchievements = async () => {
  if (USE_MOCK_API) return []
  const achievements = await request(withBaseUrl(API_URL, `${SITE_PREFIX}/me/achievements`))
  return Array.isArray(achievements) ? achievements.map(normalizeAchievement) : []
}

export const listUserAchievements = async (id) => {
  if (USE_MOCK_API) return []
  const achievements = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/${encodeURIComponent(id)}/achievements`)
  )
  return Array.isArray(achievements) ? achievements.map(normalizeAchievement) : []
}

export const getCurrentUserProfile = () => {
  if (USE_MOCK_API) {
    return Promise.resolve().then(() => {
      requireMockSession()
      return mockClone(mockData.profile)
    })
  }
  return request(withBaseUrl(API_URL, `${AUTH_PREFIX}/me`))
}

export const listLeaderboard = async () => {
  if (USE_MOCK_API) return mockClone(mockData.leaderboard)
  const users = await request(withBaseUrl(API_URL, `${SITE_PREFIX}/leaderboard/top5`))
  return Array.isArray(users) ? users : []
}

export const listCaseLeaderboard = async (caseId) => {
  if (USE_MOCK_API) {
    return mockData.leaderboard.map((user) => ({
      ...mockClone(user),
      score: Math.max(40, user.score % 101),
      caseId: Number(caseId),
    }))
  }
  const users = await request(
    withBaseUrl(API_URL, `${SITE_PREFIX}/leaderboard/case/${encodeURIComponent(caseId)}/top5`)
  )
  return Array.isArray(users) ? users : []
}

export const getCaseChatSequence = async (caseId) => {
  if (USE_MOCK_API) {
    requireMockSession()
    return mockClone(mockData.chat).map((item) => ({ ...item, caseId: Number(caseId) }))
  }
  return loadAllPages({
    path: `${TEXT_PREFIX}/getChatSequence/${encodeURIComponent(caseId)}`,
  })
}

export const evaluateCaseSolution = ({ text, caseId, solveMinutes }) =>
  USE_MOCK_API
    ? Promise.resolve({
        status: 'accepted',
        message: 'Структура решения понятна. Добавьте метрики успеха и риски внедрения.',
        case_id: Number(caseId),
        rating: Math.min(96, 68 + Math.round(String(text).length / 20)),
      })
    : mlRequest(withBaseUrl(ML_URL, '/evaluate'), {
        method: 'POST',
        body: JSON.stringify({ text, case_id: caseId, solved_min: solveMinutes }),
      })

export const isNotFoundError = (error) => {
  const message = error?.message || ''
  return message.includes('не найден') || message.includes('not found')
}

export const isBannedError = (error) => {
  const message = String(error?.body?.errorText || error?.body?.message || error?.message || '').toLowerCase()
  return message.includes('banned') || message.includes('заблокирован')
}
