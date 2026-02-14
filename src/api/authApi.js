// API-слой для интеграции с backend авторизацией.
// HTTP-запросы к /auth, чтобы компоненты не работали с fetch напрямую.
const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:8080'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const errorText = typeof body === 'string' ? body : body?.errorText || 'Request failed'
    throw new Error(errorText)
  }

  return body
}

// Получить список пользователей.
export const listUsers = () => request('/auth/ls')

// Получить пользователя по логину.
export const getUserByUsername = (username) =>
  request(`/auth/ls/${encodeURIComponent(username)}`)

// Удалить пользователя по логину.
export const deleteUserByUsername = (username) =>
  request(`/auth/ls/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })

// Сменить пароль пользователя.
export const resetPassword = ({ oldPassword, id, newPassword }) =>
  request('/auth/resetpassword', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, id, newPassword }),
  })

// Зарегистрировать пользователя.
export const registerRequest = ({ username, email, password }) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })

// Выполнить вход.
export const loginRequest = ({ username, password }) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

// Изменить почту пользователя.
export const changeEmail = ({ id, email }) =>
  request('/auth/changeemail', {
    method: 'POST',
    body: JSON.stringify({ id, email }),
  })
