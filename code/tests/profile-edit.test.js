const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function apiModule() {
  const calls = []
  const source = fs.readFileSync(path.join(__dirname, '../src/api/authApi.js'), 'utf8')
    .replace(/import [^\r\n]+\r?\n/, '')
    .replace(/export /g, '')
  const context = vm.createContext({
    process: { env: {} }, mockData: {},
    fetch: async (url, options) => {
      calls.push({ url, ...options })
      return { ok: true, status: 200, text: async () => '{"success":true}' }
    },
  })
  vm.runInContext(source + '\nglobalThis.api = { changeUserParams, changeEmail, resetPassword, mapApiProfileToState }', context)
  return { api: context.api, calls }
}

function profile(overrides = {}) {
  const user = { firstName: 'Anna', lastName: 'Ivanova', middleName: 'Old', nickname: 'anna', gender: 'FEMALE', email: 'a@example.org', birthDate: '2000-01-02', role: 'WORKER', cityId: 1 }
  const state = { user }
  const calls = []
  const { api } = apiModule()
  const dependencies = {
    CitySelect: {}, ProgressBarChart: {}, appState: state,
    getRoleOptions: () => [], getDifficultyPreferenceOptions: () => [],
    changeUserParams: async (payload) => calls.push(payload),
    changeEmail: async () => {},
    getCurrentUserProfile: async () => ({ firstName: 'Server', nickName: 'newnick', middleName: '', gender: 'NOT_STATED' }),
    mapApiProfileToState: api.mapApiProfileToState,
    isPasswordValid: value => value === 'valid_123',
    updateUserProfile: (payload) => Object.assign(state.user, payload),
    saveUserPreferences: async () => ({ tagIds: [], tags: [] }),
    updateUserPreferences: () => {},
    formatBirthdateForApi: (date) => date.split('-').reverse().join('.'),
    ...overrides,
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/views/ProfilePage.vue'), 'utf8')
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"]\s*/g, '')
    .replace('export default', 'globalThis.component =')
  const context = vm.createContext(dependencies)
  vm.runInContext(source, context)
  const instance = context.component.data()
  Object.entries(context.component.methods).forEach(([key, method]) => { instance[key] = method.bind(instance) })
  instance.preferenceTagOptions = []
  instance.fillFormFromState()
  instance.isEditingProfile = true
  return { instance, state, calls }
}

test('profile API uses Java route casing and includes every editable field', async () => {
  const { api, calls } = apiModule()
  const fields = { firstName: 'A', lastName: 'B', middleName: '', nickName: 'abc', gender: 'NOT_STATED', birthdate: '02.01.2000', status: 'WORKER', cityId: 1 }
  await api.changeUserParams(fields)
  await api.changeEmail({ email: 'a@example.org' })
  await api.resetPassword({ oldPassword: 'old', newPassword: 'new' })
  assert.deepEqual(calls.map((call) => call.url), ['/api/v1/auth/changeParams', '/api/v1/auth/changeEmail', '/api/v1/auth/resetPassword'])
  assert.deepEqual(JSON.parse(calls[0].body), fields)
  assert.ok(calls.every((call) => call.credentials === 'include'))
})

test('save sends changed fields, supports clearing middle name and uses the server result', async () => {
  const { instance, state, calls } = profile()
  Object.assign(instance.profileForm, { middleName: '', nickName: 'newnick', gender: 'NOT_STATED', birthDate: '2001-03-04' })
  await instance.saveProfile()
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ middleName: '', nickName: 'newnick', gender: 'NOT_STATED', birthdate: '04.03.2001' }])
  assert.equal(state.user.firstName, 'Server')
  assert.equal(state.user.middleName, '')
  assert.equal(state.user.gender, 'NOT_STATED')
  assert.equal(state.user.nickname, 'newnick')
  assert.equal(instance.isEditingProfile, false)
  assert.ok(instance.profileMessage)
})

test('nickname does not replace the account username when restoring a profile', () => {
  const { api } = apiModule()
  assert.equal(api.mapApiProfileToState({ nickName: 'public-name' }).username, '')
  const restored = api.mapApiProfileToState({ nickName: 'public-name' }, { username: 'account-login' })
  assert.equal(restored.username, 'account-login')
  assert.equal(restored.nickname, 'public-name')
})

test('invalid nickname and unsupported clearing do not send mutations', async () => {
  for (const fields of [{ nickName: 'a b' }, { nickName: 'ab' }, { firstName: '' }, { birthDate: '' }]) {
    const { instance, calls } = profile()
    Object.assign(instance.profileForm, fields)
    await instance.saveProfile()
    assert.equal(calls.length, 0)
    assert.ok(instance.profileError)
    assert.equal(instance.isSavingProfile, false)
  }
})

test('partial save failure refreshes confirmed data and keeps form open', async () => {
  const { instance, state } = profile({ saveUserPreferences: async () => { throw new Error('Preferences unavailable') } })
  instance.profileForm.nickName = 'newnick'
  await instance.saveProfile()
  assert.equal(state.user.nickname, 'newnick')
  assert.equal(instance.isEditingProfile, true)
  assert.equal(instance.profileMessage, '')
  assert.match(instance.profileError, /Preferences unavailable/)
})

test('password mismatch and server failure retain session; success clears it and opens login', async () => {
  const events = []
  let reject = true
  const { instance } = profile({
    resetPassword: async () => { if (reject) throw new Error('Wrong current password'); events.push('saved') },
    logoutUser: () => events.push('logout'),
  })
  instance.$router = { replace: async () => events.push('home') }
  instance.$emit = (event) => events.push(event)
  instance.passwordForm = { oldPassword: 'old', newPassword: 'valid_123', confirmPassword: 'mismatch' }
  await instance.savePassword()
  assert.ok(instance.passwordError)
  assert.deepEqual(events, [])
  instance.passwordForm.confirmPassword = 'valid_123'
  await instance.savePassword()
  assert.match(instance.passwordError, /Wrong current password/)
  assert.deepEqual(events, [])
  reject = false
  await instance.savePassword()
  assert.deepEqual(events, ['saved', 'logout', 'home', 'open-login'])
  assert.equal(instance.passwordForm.newPassword, '')
})
