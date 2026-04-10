const DIRECT_BACKEND_URL = 'http://localhost:8080'
const configuredBaseUrl = (process.env.VUE_APP_API_BASE_URL || '').trim().replace(/\/$/, '')
const API_BASE_CANDIDATES = configuredBaseUrl ? [configuredBaseUrl] : ['', DIRECT_BACKEND_URL]

const AUTH_PREFIX = '/api/v1/auth'
const ADMIN_PREFIX = '/api/admin/v1'
const SITE_PREFIX = '/api/v1/site'

const BACKEND_ERROR_MAP = {
  'Account does not exist': 'Аккаунт с таким логином не найден.',
  'Incorrect password': 'Неверный пароль.',
  'This email address is invalid': 'Укажите корректный email.',
  'This email address is already taken': 'Этот email уже используется.',
  'This username is already taken': 'Этот логин уже занят.',
  'Password cannot be empty': 'Введите пароль.',
  'Password cannot be longer than 30 characters': 'Пароль должен быть не длиннее 30 символов.',
  'Password cannot be shorter than 8 characters': 'Пароль должен быть не короче 8 символов.',
  'Password must contain at least 1 digit': 'Пароль должен содержать минимум одну цифру.',
  'Password must contain at least 1 special character': 'Пароль должен содержать минимум один спецсимвол.',
  'Username cannot be longer than 20 characters': 'Логин должен быть не длиннее 20 символов.',
  'Username cannot be shorter than 3 characters': 'Логин должен быть не короче 3 символов.',
  'Username cannot be empty': 'Введите логин.',
  'Username cannot contain spaces': 'Логин не должен содержать пробелы.',
  'Invalid user status code': 'Не удалось сохранить выбранный статус.',
  'Please login first': 'Сначала войдите в аккаунт.',
  'Session expired': 'Сессия истекла. Войдите снова.',
  'You are already logged in': 'Вы уже вошли в аккаунт.',
  'You are not logged in': 'Вы не вошли в аккаунт.',
}

const ERROR_STATUS_BY_MESSAGE = {
  'Account does not exist': 404,
  'Please login first': 401,
  'Session expired': 401,
}

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = Number(options.status || 0)
    this.code = options.code || 'API_ERROR'
    this.body = options.body
    this.cause = options.cause
  }
}

const parseBody = async (response) => {
  const raw = await response.text()
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isLikelyHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''))
const isRouteNotFoundText = (value) => /Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+/i.test(String(value || ''))

const extractErrorText = (body) => {
  if (!body) {
    return ''
  }
  if (typeof body === 'string') {
    return isLikelyHtml(body) ? stripHtml(body) : body
  }
  return body.errorText || body.ErrorText || body.message || body.error || ''
}

const toUserErrorText = (message, fallback = 'Не удалось выполнить запрос. Попробуйте еще раз.') => {
  const normalizedMessage = isLikelyHtml(message) ? stripHtml(message) : String(message || '').trim()

  if (!normalizedMessage) {
    return fallback
  }

  if (isRouteNotFoundText(normalizedMessage)) {
    return 'API endpoint не найден. Проверьте адрес backend или dev-proxy.'
  }

  return BACKEND_ERROR_MAP[normalizedMessage] || normalizedMessage
}

const getFallbackByStatus = (status) => {
  if (status === 400) {
    return 'Некорректный запрос (400). Проверьте введенные данные.'
  }
  if (status === 401) {
    return 'Требуется авторизация (401).'
  }
  if (status === 403) {
    return 'Недостаточно прав для выполнения операции (403).'
  }
  if (status === 404) {
    return 'Ресурс не найден (404).'
  }
  if (status === 409) {
    return 'Конфликт данных (409).'
  }
  if (status === 422) {
    return 'Ошибка валидации данных (422).'
  }
  if (status >= 500) {
    return `Ошибка сервера (${status}). Попробуйте повторить позже.`
  }
  return `Ошибка запроса (${status || 'N/A'}). Попробуйте повторить позже.`
}

const buildUrl = (baseUrl, path) => `${baseUrl}${path}`

const normalizeStatus = (statusCandidate, defaultStatus = 400) => {
  const numeric = Number(statusCandidate)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : defaultStatus
}

const request = async (path, options = {}) => {
  let lastError = null

  for (let index = 0; index < API_BASE_CANDIDATES.length; index += 1) {
    const baseUrl = API_BASE_CANDIDATES[index]
    const hasNextCandidate = index < API_BASE_CANDIDATES.length - 1
    let response

    try {
      response = await fetch(buildUrl(baseUrl, path), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      })
    } catch (error) {
      lastError = new ApiError('Не удалось подключиться к серверу. Проверьте, что backend запущен.', {
        status: 0,
        code: 'NETWORK_ERROR',
        cause: error,
      })
      continue
    }

    const body = await parseBody(response)

    if (!response.ok) {
      const backendMessage = extractErrorText(body)
      const shouldRetryWithNext = hasNextCandidate && isRouteNotFoundText(backendMessage)

      if (shouldRetryWithNext) {
        continue
      }

      throw new ApiError(toUserErrorText(backendMessage, getFallbackByStatus(response.status)), {
        status: response.status,
        code: 'HTTP_ERROR',
        body,
      })
    }

    if (body && typeof body === 'object' && typeof body.success === 'boolean' && !body.success) {
      const backendMessage = extractErrorText(body)
      const statusFromMessage = ERROR_STATUS_BY_MESSAGE[backendMessage]
      const normalizedStatus = normalizeStatus(body.status || statusFromMessage)

      throw new ApiError(toUserErrorText(backendMessage, getFallbackByStatus(normalizedStatus)), {
        status: normalizedStatus,
        code: 'BUSINESS_ERROR',
        body,
      })
    }

    return body
  }

  if (lastError) {
    throw lastError
  }

  throw new ApiError('Не удалось выполнить запрос. Проверьте настройки backend URL.', {
    status: 0,
    code: 'API_CONFIG_ERROR',
  })
}

const normalizeCityResponse = (city) => {
  if (!city || city.cityName === 'not_set') {
    return {
      cityId: city?.cityId ?? null,
      cityName: '',
      regionName: '',
    }
  }

  return {
    cityId: city?.cityId ?? null,
    cityName: city?.cityName || '',
    regionName: city?.regionName || '',
  }
}

const mergeUserWithCity = async (user) => {
  if (!user || !user.id) {
    return {
      ...user,
      city: '',
      region: '',
      cityId: user?.cityId ?? null,
    }
  }

  try {
    const city = await getUserCityById(user.id)
    return {
      ...user,
      cityId: city.cityId ?? user.cityId ?? null,
      city: city.cityName || '',
      region: city.regionName || '',
    }
  } catch {
    return {
      ...user,
      cityId: user?.cityId ?? null,
      city: '',
      region: '',
    }
  }
}

export const isNotFoundError = (error) => {
  if (Number(error?.status) === 404) {
    return true
  }
  const message = String(error?.message || '').toLowerCase()
  return message.includes('404') || message.includes('не найден')
}

export const formatBirthdateForApi = (isoDate) => {
  if (!isoDate || !isoDate.includes('-')) {
    return isoDate || ''
  }
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

export const parseBirthdateFromApi = (birthdate) => {
  if (!birthdate || !birthdate.includes('.')) {
    return birthdate || ''
  }
  const [day, month, year] = birthdate.split('.')
  return `${year}-${month}-${day}`
}

export const listUsers = async () => {
  const users = await request(`${ADMIN_PREFIX}/users`)
  return Array.isArray(users) ? Promise.all(users.map((user) => mergeUserWithCity(user))) : []
}

export const getUserByUsername = async (username) => {
  const user = await request(`${ADMIN_PREFIX}/users/${encodeURIComponent(username)}`)
  if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
    throw new ApiError('Аккаунт с таким логином не найден.', {
      status: 404,
      code: 'NOT_FOUND',
    })
  }
  return mergeUserWithCity(user)
}

export const deleteUserByUsername = (username) =>
  request(`${ADMIN_PREFIX}/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })

export const resetPassword = ({ oldPassword, newPassword }) =>
  request(`${AUTH_PREFIX}/resetpassword`, {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })

export const registerRequest = ({ username, email, password, birthdate, status, cityId }) =>
  request(`${AUTH_PREFIX}/register`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, birthdate, status, cityId }),
  })

export const loginRequest = ({ username, password }) =>
  request(`${AUTH_PREFIX}/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const logoutRequest = () =>
  request(`${AUTH_PREFIX}/logout`, {
    method: 'GET',
  })

export const changeEmail = ({ email }) =>
  request(`${AUTH_PREFIX}/changeemail`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const changeUserParams = ({ firstName, lastName, birthdate, status, cityId }) =>
  request(`${AUTH_PREFIX}/changeparams`, {
    method: 'POST',
    body: JSON.stringify({
      firstName,
      lastName,
      birthdate,
      status,
      cityId,
    }),
  })

export const listCities = async (query = '') => {
  const normalizedQuery = String(query || '').trim()
  if (normalizedQuery.length < 2) {
    return []
  }
  const cities = await request(`${SITE_PREFIX}/searchLocation/${encodeURIComponent(normalizedQuery)}`)
  return Array.isArray(cities) ? cities : []
}

export const getUserCityById = async (id) => {
  const city = await request(`${SITE_PREFIX}/user/${encodeURIComponent(id)}/city`)
  return normalizeCityResponse(city)
}
