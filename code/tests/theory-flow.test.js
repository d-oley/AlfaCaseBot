const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Exercise component logic without a browser or requests to the real backend.
function component(file, api = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"]\s*/g, '')
    .replace('export default', 'globalThis.component =')
  const context = vm.createContext({ ...api })
  vm.runInContext(script, context)
  return context.component
}

function editor(api) {
  const options = component('components/AdminTheoryPanel.vue', api)
  const instance = options.data()
  for (const [name, method] of Object.entries(options.methods)) instance[name] = method.bind(instance)
  instance.caseId = 6
  instance.form = { title: 'Теория', text: 'Текст', position: 1, isActive: true }
  instance.quizTitle = 'Проверка'
  const question = instance.questions[0]
  question.text = 'Вопрос'
  question.options[0].text = 'Да'
  question.options[1].text = 'Нет'
  question.correctKey = question.options[0].key
  return instance
}

test('a failed quiz save leaves a draft; retry publishes the same material', async () => {
  const calls = []
  let fail = true
  const instance = editor({
    createAdminTheory: async (caseId, payload) => { calls.push(['create', caseId, payload]); return { id: 42 } },
    saveAdminTheoryQuiz: async (id, payload) => {
      calls.push(['quiz', id, payload])
      if (fail) { fail = false; throw new Error('Тест не сохранён') }
    },
    updateAdminTheory: async (id, payload) => { calls.push(['publish', id, payload]) },
    listAdminTheory: async () => ({ materials: [{ id: 42, position: 1, title: 'Теория', isActive: true }] }),
  })
  await instance.save()
  assert.equal(instance.materialId, 42)
  assert.equal(calls[0][2].isActive, false)
  assert.equal(calls.some(call => call[0] === 'publish'), false)
  await instance.save()
  assert.equal(calls.filter(call => call[0] === 'create').length, 1)
  assert.equal(calls.at(-1)[0], 'publish')
  assert.equal(calls.at(-1)[1], 42)
  assert.equal(calls.at(-1)[2].isActive, true)
  const options = calls[1][2].questions[0].options
  assert.equal(options.filter(option => option.isCorrect).length, 1)
  assert.equal(instance.materialId, null)
  assert.equal(instance.form.position, 2)
})

test('retry after publication failure does not rewrite the saved quiz', async () => {
  let quizzes = 0
  let attempts = 0
  const instance = editor({
    createAdminTheory: async () => ({ id: 42 }),
    saveAdminTheoryQuiz: async () => { quizzes++ },
    updateAdminTheory: async () => { if (++attempts === 1) throw new Error('Не сохранено') },
    listAdminTheory: async () => ({ materials: [] }),
  })
  await instance.save()
  await instance.save()
  assert.equal(quizzes, 1)
  assert.equal(attempts, 2)
})

test('a question without a correct answer cannot create a material', async () => {
  let requests = 0
  const instance = editor({ createAdminTheory: async () => { requests++ } })
  instance.questions[0].correctKey = null
  await instance.save()
  assert.equal(requests, 0)
  assert.ok(instance.error)
})

test('an active theory block can be deactivated without deleting it', async () => {
  const calls = []
  const instance = editor({
    updateAdminTheory: async (id, payload) => calls.push([id, payload]),
  })
  const material = { id: 42, title: 'Теория', isActive: true }
  instance.materialId = 42
  await instance.deactivateMaterial(material)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 42)
  assert.equal(calls[0][1].isActive, false)
  assert.equal(material.isActive, false)
  assert.equal(instance.form.isActive, false)
  assert.equal(instance.materialActionId, null)
  assert.match(instance.message, /деактивирован/)
})

test('recommendation requires an actual low score and an unfinished active case', () => {
  const options = component('views/CaseChatPage.vue', { SOLVE_SCORE_THRESHOLD: 70 })
  const base = { theorySections: [{ id: 1 }], isSolvingActive: true, isSolvingCompleted: false }
  const recommend = overrides => options.computed.shouldRecommendTheory.call({ ...base, ...overrides })
  for (const rating of [null, undefined, NaN, 70, 100]) assert.equal(recommend({ latestSubmittedRating: rating }), false)
  assert.equal(recommend({ latestSubmittedRating: 0 }), true)
  assert.equal(recommend({ latestSubmittedRating: 69 }), true)
  assert.equal(recommend({ latestSubmittedRating: 30, isSolvingCompleted: true }), false)
  assert.equal(recommend({ latestSubmittedRating: 30, isSolvingActive: false }), false)
  assert.equal(recommend({ latestSubmittedRating: 30, theorySections: [] }), false)
})

test('a case block link opens the requested theory section', async () => {
  const options = component('views/TheoryPage.vue', {
    listCaseTheory: async () => ({ materials: [{ id: 1 }, { id: 2 }] }),
  })
  let selected
  const instance = { caseId: 6, $route: { query: { material: '2' } }, selectSection: async id => { selected = id } }
  await options.methods.loadSections.call(instance)
  assert.equal(selected, 2)
  instance.$route.query.material = '999'
  await options.methods.loadSections.call(instance)
  assert.equal(selected, 1)
})

test('quiz result exposes a bounded percentage of correct answers', () => {
  const options = component('views/TheoryPage.vue')
  const score = value => options.computed.attemptScorePercent.call({ displayedResult: value })
  assert.equal(score({ score: 67 }), 67)
  assert.equal(score({ score: 0 }), 0)
  assert.equal(score({ score: 110 }), 100)
  assert.equal(score({ score: 'unknown' }), null)
  assert.equal(score(null), null)
})

test('saved quiz status restores the result until the user starts a retry', () => {
  const options = component('views/TheoryPage.vue')
  const result = state => options.computed.displayedResult.call(state)
  assert.equal(result({ attemptResult: null, quizStatus: { attemptsCount: 0, score: 0 }, isRetaking: false }), null)
  assert.equal(result({ attemptResult: null, quizStatus: { attemptsCount: 0, score: 100, isSolved: true }, isRetaking: false }).score, 100)
  assert.equal(result({ attemptResult: null, quizStatus: { attemptsCount: 1, score: 0, isSolved: false }, isRetaking: false }).score, 0)
  assert.equal(result({ attemptResult: null, quizStatus: { attemptsCount: 2, score: 100, isSolved: true }, isRetaking: false }).score, 100)
  assert.equal(result({ attemptResult: null, quizStatus: { attemptsCount: 2, score: 100, isSolved: true }, isRetaking: true }), null)
  const currentAttempt = { score: 40, isSolved: false }
  assert.equal(result({ attemptResult: currentAttempt, quizStatus: { attemptsCount: 2, score: 100 }, isRetaking: false }), currentAttempt)
})
