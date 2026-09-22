// Match the ordinary Java account validators without changing password text.
export const isPasswordValid = (value) => typeof value === 'string' &&
  value.length >= 8 && value.length <= 30 && /\p{Nd}/u.test(value) &&
  [...value].some(char => '!@#$%^&*()_-+=;:/?|\\<>{}[]'.includes(char))

export const isUsernameValid = (value) => typeof value === 'string' &&
  Boolean(value.trim()) && value.length >= 3 && value.length <= 20 && !value.includes(' ')
