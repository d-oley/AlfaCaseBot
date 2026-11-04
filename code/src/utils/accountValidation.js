// пароль проверяем как есть, пробелы по краям не убираем
export const isPasswordValid = (value) => {
  if (typeof value !== 'string') return false
  if (value.length < 8 || value.length > 30) return false
  if (!/\p{Nd}/u.test(value)) return false

 const marks='!@#$%^&*()_-+=;:/?|\\<>{}[]'
  for (const char of value) {
     if (marks.includes(char)) return true
  }
  return false
}

export const isUsernameValid = (value) => {
  if (typeof value !== 'string') return false
  if (!value.trim()) return false
  if (value.length < 3 || value.length > 20) return false
  return !value.includes(' ')
}
