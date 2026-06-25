const API_URL = process.env.VUE_APP_API_BASE_URL || ''
const ML_URL = process.env.VUE_APP_ML_API_BASE_URL || ''

const AUTH_PREFIX = '/api/v1/auth'
const ADMIN_PREFIX = '/api/admin/v1'
const SITE_PREFIX = '/api/v1/site'

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
}

const httpErrors = {
  401: 'Сначала войдите в аккаунт',
  403: 'Недостаточно прав для этого действия',
  404: 'Ресурс не найден',
  502: 'Сервис временно недоступен',
}

const translateError = (message, fallback = 'Server error') => {
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
  const error = new Error(translateError(message, fallback || httpErrors[status] || 'Server error'))
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
      fallback: 'Ошибка ML-сервиса',
    })
  }

  return data
}
function normalizeCity(city) {
  if (!city || city.cityName === 'not_set') {
    return { cityId: city?.cityId || null, cityName: '', regionName: '' }
  }
  return {
    cityId: city?.cityId || null,
    cityName: city?.cityName || '',
    regionName: city?.regionName || '',
  }
}

async function addCityToUser(user) {
  if (!user?.id) {
    return { ...user, city: '', region: '', cityId: user?.cityId || null }
  }
  try {
    const city = await getUserCityById(user.id)
    return {
      ...user,
      cityId: city.cityId || user.cityId || null,
      city: city.cityName || '',
      region: city.regionName || '',
    }
  } catch {
    return { ...user, cityId: user?.cityId || null, city: '', region: '' }
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

export const listUsers = async () => {
  const users = await request(`${API_URL}${ADMIN_PREFIX}/users`)
  return Array.isArray(users) ? Promise.all(users.map(addCityToUser)) : []
}

export const resetPassword = ({ oldPassword, newPassword }) =>
  request(`${API_URL}${AUTH_PREFIX}/resetpassword`, {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })

export const registerRequest = ({ username, email, password, birthdate, status, cityId }) =>
  request(`${API_URL}${AUTH_PREFIX}/register`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, birthdate, status, cityId }),
  })

export const loginRequest = ({ username, password }) =>
  request(`${API_URL}${AUTH_PREFIX}/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const logoutRequest = () =>
  request(`${API_URL}${AUTH_PREFIX}/logout`, { method: 'GET' })

export const changeEmail = ({ email }) =>
  request(`${API_URL}${AUTH_PREFIX}/changeemail`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const changeUserParams = ({ firstName, lastName, birthdate, status, cityId }) =>
  request(`${API_URL}${AUTH_PREFIX}/changeparams`, {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, birthdate, status, cityId }),
  })

export const listCities = async (query = '') => {
  const q = String(query).trim()
  if (q.length < 2) return []
  const cities = await request(`${API_URL}${SITE_PREFIX}/searchLocation/${encodeURIComponent(q)}`)
  return Array.isArray(cities) ? cities : []
}

export const getUserCityById = async (id) => {
  const city = await request(`${API_URL}${SITE_PREFIX}/user/${encodeURIComponent(id)}/city`)
  return normalizeCity(city)
}

export const evaluateCaseSolution = ({ text, caseId }) =>
  mlRequest(`${ML_URL}/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ text, case_id: caseId }),
  })

export const isNotFoundError = (error) => {
  const message = error?.message || ''
  return message.includes('не найден') || message.includes('not found')
}
