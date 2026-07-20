const API_URL = process.env.VUE_APP_API_BASE_URL || ''
const ML_URL = process.env.VUE_APP_ML_API_BASE_URL || ''

const AUTH_PREFIX = '/api/v1/auth'
const ADMIN_PREFIX = '/api/admin/v1'
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
  'Account is not verified': 'Подтвердите email перед входом',
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

async function multipartRequest(url, formData) {
  const res = await fetch(url, {
    method: 'POST',
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
  const users = await request(withBaseUrl(API_URL, `${ADMIN_PREFIX}/users`))
  return Array.isArray(users) ? Promise.all(users.map(addCityToUser)) : []
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
    avatarUrl: profile?.id ? getUserAvatarUrl(profile.id) : '',
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

export const verifyEmail = ({ userId, verification }) =>
  request(withBaseUrl(API_URL, `${AUTH_PREFIX}/verify`), {
    method: 'POST',
    body: JSON.stringify({ userId, verification }),
  })

export const setProfilePicture = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return multipartRequest(withBaseUrl(API_URL, `${AUTH_PREFIX}/setProfilePicture`), formData)
}

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

export const getUserAvatarUrl = (id) =>
  withBaseUrl(API_URL, `${SITE_PREFIX}/user/${encodeURIComponent(id)}/avatar`)

export const listLeaderboard = async () => {
  const users = await request(withBaseUrl(API_URL, `${SITE_PREFIX}/leaderboard/top5`))
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
