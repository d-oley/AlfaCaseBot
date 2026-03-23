// API-слой для интеграции с backend авторизацией, профилем и городами.
const DIRECT_BACKEND_URL = 'http://localhost:8080'
const configuredBaseUrl = (process.env.VUE_APP_API_BASE_URL || '').trim().replace(/\/$/, '')
const API_BASE_CANDIDATES = configuredBaseUrl ? [configuredBaseUrl] : ['', DIRECT_BACKEND_URL]

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
}

const ERROR_STATUS_BY_MESSAGE = {
  'Account does not exist': 404,
}

const AUTH_PREFIX = '/api/v1/auth'
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

export const listUsers = () => request(`${AUTH_PREFIX}/users`)

export const getUserByUsername = async (username) => {
  const user = await request(`${AUTH_PREFIX}/users/${encodeURIComponent(username)}`)
  if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
    throw new ApiError('Аккаунт с таким логином не найден.', {
      status: 404,
      code: 'NOT_FOUND',
    })
  }
  return user
}

export const deleteUserByUsername = (username) =>
  request(`${AUTH_PREFIX}/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })

export const resetPassword = ({ oldPassword, id, newPassword }) =>
  request(`${AUTH_PREFIX}/resetpassword`, {
    method: 'POST',
    body: JSON.stringify({ oldPassword, id: String(id), newPassword }),
  })

export const registerRequest = ({
  username,
  email,
  password,
  birthdate,
  status,
  cityId,
  city,
}) =>
  request(`${AUTH_PREFIX}/register`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, birthdate, status, cityId, city }),
  })

export const loginRequest = ({ username, password }) =>
  request(`${AUTH_PREFIX}/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const changeEmail = ({ id, email }) =>
  request(`${AUTH_PREFIX}/changeemail`, {
    method: 'POST',
    body: JSON.stringify({ id: String(id), email }),
  })

export const changeUserParams = ({ id, username, birthdate, status, cityId, city, firstName, lastName }) =>
  request(`${AUTH_PREFIX}/changeparams`, {
    method: 'POST',
    body: JSON.stringify({
      id: String(id),
      username,
      birthdate,
      status,
      cityId,
      city,
      firstName,
      lastName,
    }),
  })

export const listCities = async () => {
  throw new ApiError(
    'Текущий backend не отдает список городов через отдельный GET endpoint. Для выбора города фронту нужен endpoint вида GET /api/v1/site/cities.',
    {
      status: 501,
      code: 'CITY_API_NOT_AVAILABLE',
    }
  )
}

export const getUserCityById = async () => {
  throw new ApiError(
    'Текущий backend не отдает город пользователя через браузерно-совместимый endpoint. Нужен отдельный GET endpoint без request body.',
    {
      status: 501,
      code: 'CITY_API_NOT_AVAILABLE',
    }
  )
}
