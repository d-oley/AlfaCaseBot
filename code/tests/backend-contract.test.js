const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function loadApi(responder) {
  const calls = []
  const source = fs.readFileSync(path.join(__dirname, '../src/api/authApi.js'), 'utf8')
    .replace(/import [^\r\n]+\r?\n/, '')
    .replace(/export /g, '')
  const context = vm.createContext({
    process: { env: {} },
    mockData: {},
    URLSearchParams,
    fetch: async (url, options = {}) => {
      calls.push({ url, ...options })
      const payload = await responder(url, options)
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify(payload),
      }
    },
  })
  vm.runInContext(source + '\nglobalThis.api = { getCaseChatSequence, listMySolutions, listAdminCaseSolutions, getMyPlacement, forgotUsername, forgotPasswordInit, forgotPasswordConfirm, registerRequest, mapApiProfileToState }', context)
  return { api: context.api, calls }
}

test('solution history uses the Java route and reads every page', async () => {
  const { api, calls } = loadApi((url) => ({
    items: [{ solutionId: url.includes('page=0') ? 1 : 2 }],
    page: url.includes('page=0') ? 0 : 1,
    size: 100,
    totalElements: 2,
    totalPages: 2,
  }))
  const items = await api.getCaseChatSequence(7)
  assert.deepEqual(JSON.parse(JSON.stringify(items.map(item => item.solutionId))), [1, 2])
  assert.deepEqual(calls.map(call => call.url), [
    '/api/text/v1/solutions/7?page=0&size=100',
    '/api/text/v1/solutions/7?page=1&size=100',
  ])
})

test('journal and placement preserve the Java page and placement contracts', async () => {
  const { api, calls } = loadApi((url) => url.includes('myPlace')
    ? { placement: 17, total: 230 }
    : { items: [{ solutionId: 8 }], page: 2, size: 10, totalElements: 21, totalPages: 3 })
  const page = await api.listMySolutions({ page: 2, size: 10 })
  const placement = await api.getMyPlacement(9)
  const adminPage = await api.listAdminCaseSolutions(9, { page: 1, size: 10 })
  assert.equal(page.items[0].solutionId, 8)
  assert.equal(page.page, 2)
  assert.equal(page.totalPages, 3)
  assert.deepEqual(JSON.parse(JSON.stringify(placement)), { placement: 17, total: 230 })
  assert.equal(adminPage.items[0].solutionId, 8)
  assert.equal(calls[0].url, '/api/text/v1/solutions?page=2&size=10')
  assert.equal(calls[1].url, '/api/v1/site/leaderboard/local/myPlace/9')
  assert.equal(calls[2].url, '/api/admin/v1/cases/9/solutions?page=1&size=10')
})

test('account recovery and full registration send the Java field names', async () => {
  const { api, calls } = loadApi(() => ({ success: true, id: 1 }))
  await api.forgotUsername({ email: 'user@example.org' })
  await api.forgotPasswordInit({ email: 'user@example.org', username: 'user' })
  await api.forgotPasswordConfirm({ email: 'user@example.org', username: 'user', code: 123456, newPassword: ' valid_123 ' })
  await api.registerRequest({
    username: 'user', email: 'user@example.org', password: ' valid_123 ',
    firstName: 'Анна', lastName: 'Иванова', middleName: 'Игоревна', gender: 'FEMALE',
    birthdate: '01.02.2000', status: 'STUDENT', cityId: 5, validationMethod: 'EMAIL',
  })
  assert.deepEqual(calls.map(call => call.url), [
    '/api/v1/auth/forgotUsername',
    '/api/v1/auth/forgotPassword/init',
    '/api/v1/auth/forgotPassword/confirm',
    '/api/v1/auth/register',
  ])
  assert.equal(JSON.parse(calls[2].body).newPassword, ' valid_123 ')
  assert.deepEqual(JSON.parse(calls[3].body), {
    username: 'user', email: 'user@example.org', password: ' valid_123 ',
    firstName: 'Анна', lastName: 'Иванова', middleName: 'Игоревна', gender: 'FEMALE',
    birthdate: '01.02.2000', status: 'STUDENT', cityId: 5, validationMethod: 'EMAIL',
  })
  assert.equal(api.mapApiProfileToState({ cityName: 'not_set', regionName: 'not_set' }).city, '')
})
