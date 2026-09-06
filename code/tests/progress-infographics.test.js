const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function component(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"]\s*/g, '')
    .replace('export default', 'globalThis.component =')
  const context = vm.createContext({ ...dependencies })
  vm.runInContext(script, context)
  return context.component
}

test('profile restores best case results from solving statuses', async () => {
  const options = component('views/ProfilePage.vue', {
    CitySelect: {},
    ProgressBarChart: {},
    SOLVE_SCORE_THRESHOLD: 70,
    getSolvedCasesForUser: () => [],
    getCaseSolvingState: async (caseId) => ({ bestRating: caseId === 1 ? 92 : 55 }),
  })
  const instance = {
    appState: {
      isAuthenticated: true,
      user: { id: 7 },
      cases: [{ id: 1, title: 'Первый' }, { id: 2, title: 'Второй' }],
    },
    caseProgressStatuses: [],
    caseProgressLoading: false,
    caseProgressError: '',
    caseProgressRequestKey: '',
  }

  await options.methods.loadCaseProgress.call(instance)
  assert.equal(instance.caseProgressStatuses.length, 2)
  const solved = options.computed.solvedCases.call(instance)
  assert.equal(solved.length, 1)
  assert.equal(solved[0].caseId, 1)
  assert.equal(solved[0].scorePercent, 92)
})

test('case progress maps server state to journey stages', () => {
  const options = component('views/CaseDetailPage.vue', { CaseLeaderboard: {}, ProgressBarChart: {} })
  const calculate = (state) => {
    const hasStartedCase = options.computed.hasStartedCase.call(state)
    return {
      percent: options.computed.caseJourneyPercent.call({ ...state, hasStartedCase }),
      label: options.computed.caseProgressLabel.call({ ...state, hasStartedCase }),
      steps: options.computed.caseProgressSteps.call({ ...state, hasStartedCase }),
    }
  }

  const untouched = calculate({ isSolvingActive: false, isCaseCompleted: false, caseBestRating: 0 })
  assert.equal(untouched.percent, 33)
  assert.equal(untouched.steps.filter((step) => step.done).length, 1)

  const active = calculate({ isSolvingActive: true, isCaseCompleted: false, caseBestRating: 84 })
  assert.equal(active.percent, 67)
  assert.match(active.label, /процессе/)

  const completed = calculate({ isSolvingActive: false, isCaseCompleted: true, caseBestRating: 100 })
  assert.equal(completed.percent, 100)
  assert.equal(completed.steps.filter((step) => step.done).length, 3)
})

test('case comparison chart calculates average and leader scores', () => {
  const options = component('views/CaseDetailPage.vue', { CaseLeaderboard: {}, ProgressBarChart: {} })
  const items = options.computed.caseComparisonChartItems.call({
    caseBestRating: 82,
    leaderboardEntries: [{ score: 70 }, { score: 90 }, { score: 80 }],
  })
  assert.equal(items[0].value, 82)
  assert.equal(items[1].value, 80)
  assert.equal(items[2].value, 90)
})
