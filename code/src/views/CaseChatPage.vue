<template>
  <div class="container chat-page">
    <section class="card chat-card">
      <router-link class="back-link" :to="`/case/${caseId}`">
        <span aria-hidden="true">←</span> К описанию кейса
      </router-link>
      <header class="chat-header">
        <div class="case-heading">
          <h1>Чат по кейсу: {{ caseTitle }}</h1>
        </div>
        <div v-if="isSolvingActive" class="chat-header-actions">
          <div class="solve-timer" role="timer" aria-label="Время решения">
            <span>Время решения</span>
            <strong>{{ formattedSolveTime }}</strong>
          </div>
          <button class="btn btn-secondary" type="button" @click="openConditions">
            {{ casePdfUrl ? 'Полные условия (PDF)' : 'Просмотр условия' }}
          </button>
          <button class="btn btn-primary" type="button" :disabled="isSending" @click="isFinishModalOpen = true">
            Завершить решение
          </button>
          <span v-if="currentCaseScore !== null" class="case-score" aria-label="Текущая оценка">
            Текущая оценка: {{ currentCaseScore }} / 100
          </span>
        </div>
      </header>

      <p v-if="isSolvingStateLoading" class="solving-state-text">Проверяем состояние решения...</p>

      <div v-else-if="isSolvingCompleted" class="start-solving-panel completed-solving-panel">
        <strong>Решение завершено</strong>
        <p>Лучшая оценка: {{ solvingBestRating }} / 100</p>
        <p>Продолжить или начать решение заново уже нельзя.</p>
      </div>

      <div v-else-if="!isSolvingActive" class="start-solving-panel">
        <p>Таймер ещё не запущен. Начните решение, чтобы открыть условие и чат.</p>
        <button class="btn btn-primary" type="button" @click="isStartModalOpen = true">
          Начать решение
        </button>
      </div>

      <template v-else>
        <div class="messages">
          <div v-for="message in messages" :key="message.id" class="message" :class="message.author">
            <p>{{ message.text }}</p>
            <span v-if="message.rating !== null && message.rating !== undefined" class="message-score">
              Оценка: {{ message.rating }} / 100
            </span>
          </div>
          <div
            v-if="isSending"
            class="message bot typing-message"
            role="status"
            aria-label="ИИ готовит ответ"
          >
            <span class="typing-dot" aria-hidden="true"></span>
            <span class="typing-dot" aria-hidden="true"></span>
            <span class="typing-dot" aria-hidden="true"></span>
          </div>
        </div>

        <p v-if="statusMessage" class="status-text">{{ statusMessage }}</p>

        <form class="chat-form" @submit.prevent="sendMessage">
          <textarea
            ref="messageInput"
            v-model="draft"
            rows="1"
            :disabled="isSending"
            placeholder="Введите сообщение..."
            @input="resizeMessageInput"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button class="btn btn-primary" type="submit" :disabled="!draft.trim() || isSending">
            {{ isSending ? 'Отправка...' : 'Отправить' }}
          </button>
        </form>
      </template>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </section>

    <div v-if="isStartModalOpen" class="condition-modal-overlay" @click.self="closeStartModal">
      <div class="start-solving-modal card" role="dialog" aria-modal="true" aria-labelledby="start-solving-title">
        <button
          class="condition-modal-close"
          type="button"
          aria-label="Закрыть"
          :disabled="isStartingSolving"
          @click="closeStartModal"
        >×</button>
        <h2 id="start-solving-title">Начать решение?</h2>
        <p>Это запустит таймер, вы уверены, что хотите начать?</p>
        <div class="start-solving-modal-actions">
          <button class="btn btn-secondary" type="button" :disabled="isStartingSolving" @click="closeStartModal">
            Отмена
          </button>
          <button class="btn btn-primary" type="button" :disabled="isStartingSolving" @click="confirmStartSolving">
            {{ isStartingSolving ? 'Запускаем...' : 'Начать решение' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isFinishModalOpen" class="condition-modal-overlay" @click.self="closeFinishModal">
      <div class="start-solving-modal card" role="dialog" aria-modal="true" aria-labelledby="finish-solving-title">
        <button
          class="condition-modal-close"
          type="button"
          aria-label="Закрыть"
          :disabled="isFinishingSolving"
          @click="closeFinishModal"
        >×</button>
        <h2 id="finish-solving-title">Завершить решение?</h2>
        <p>После завершения продолжить решение или начать его заново будет нельзя.</p>
        <p>Будет засчитана ваша лучшая оценка. Если решений ещё нет, оценка составит 0.</p>
        <div class="start-solving-modal-actions">
          <button class="btn btn-secondary" type="button" :disabled="isFinishingSolving" @click="closeFinishModal">
            Отмена
          </button>
          <button class="btn btn-primary" type="button" :disabled="isFinishingSolving" @click="confirmFinishSolving">
            {{ isFinishingSolving ? 'Завершаем...' : 'Завершить решение' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isConditionModalOpen" class="condition-modal-overlay" @click.self="isConditionModalOpen = false">
      <div class="condition-modal card">
        <button class="condition-modal-close" type="button" @click="isConditionModalOpen = false">×</button>
        <h2>{{ caseTitle }}</h2>
        <p>{{ caseDescription }}</p>
      </div>
    </div>
  </div>
</template>

<script>
// CaseChatPage.vue: страница чата по кейсу с вводом сообщений и просмотром условия.
import {
  evaluateCaseSolution,
  finishCaseSolving,
  getCaseByIdRequest,
  getCaseChatSequence,
  getCaseSolvingState,
  startCaseSolving,
} from '@/api/authApi'
import {
  appState,
  getCaseById,
  logoutUser,
  markCaseViewed,
  saveSolvedCaseResult,
  showBanNotice,
  upsertCase,
} from '@/store/appState'

export default {
  name: 'CaseChatPage',
  data() {
    return {
      appState,
      draft: '',
      messages: [
        {
          id: 0,
          author: 'bot',
          text: 'Привет! Это чат для обсуждения решения кейса. Введите ваше решение в поле ниже и отправьте его, чтобы получить обратную связь.',
        },
      ],
      nextId: 1,
      isConditionModalOpen: false,
      isStartModalOpen: false,
      isStartingSolving: false,
      isFinishModalOpen: false,
      isFinishingSolving: false,
      isSolvingStateLoading: true,
      isSolvingActive: false,
      isSolvingCompleted: false,
      solvingBestRating: 0,
      solvingStartedAtMs: null,
      elapsedSeconds: 0,
      timerIntervalId: null,
      isSending: false,
      isHistoryLoading: false,
      errorMessage: '',
      statusMessage: '',
    }
  },
  computed: {
    caseId() {
      return this.$route.params.caseId
    },
    caseItem() {
      return getCaseById(this.caseId)
    },
    caseTitle() {
      return this.caseItem ? this.caseItem.title : 'Неизвестный кейс'
    },
    caseDescription() {
      return this.caseItem ? this.caseItem.fullDescription : 'Условие кейса недоступно.'
    },
    casePdfUrl() {
      return this.caseItem?.pdfUrl || ''
    },
    currentCaseScore() {
      const solvedCase = this.appState.userSolvedCases.find(
        (item) => Number(item.caseId) === Number(this.caseId)
      )
      return solvedCase ? Number(solvedCase.scorePercent) : null
    },
    formattedSolveTime() {
      const totalSeconds = Math.max(0, this.elapsedSeconds)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':')
    },
  },
  async created() {
    markCaseViewed(this.caseId)
    await Promise.all([this.loadCase(), this.loadSolvingState()])
    if (this.isSolvingActive) await this.loadChatHistory()
  },
  beforeUnmount() {
    this.stopTimer()
  },
  methods: {
    async loadSolvingState() {
      this.isSolvingStateLoading = true
      try {
        const state = await getCaseSolvingState(this.caseId)
        this.applySolvingState(state)
      } catch (error) {
        this.isSolvingActive = false
        this.isSolvingCompleted = false
        this.stopTimer()
        this.errorMessage = error?.message || 'Не удалось проверить состояние решения.'
      } finally {
        this.isSolvingStateLoading = false
      }
    },
    applySolvingState(state) {
      this.isSolvingCompleted = Boolean(state?.completed)
      this.solvingBestRating = Number.isFinite(Number(state?.bestRating))
        ? Number(state.bestRating)
        : 0

      if (this.isSolvingCompleted) {
        this.isSolvingActive = false
        this.solvingStartedAtMs = null
        this.elapsedSeconds = 0
        this.stopTimer()
        return
      }

      const timestampMs = state?.timestamp ? new Date(state.timestamp).getTime() : NaN
      if (!state?.active || !Number.isFinite(timestampMs)) {
        this.isSolvingActive = false
        this.solvingStartedAtMs = null
        this.elapsedSeconds = 0
        this.stopTimer()
        return
      }
      this.isSolvingActive = true
      this.solvingStartedAtMs = timestampMs
      this.updateTimer()
      this.startTimer()
    },
    startTimer() {
      this.stopTimer()
      this.timerIntervalId = window.setInterval(this.updateTimer, 1000)
    },
    stopTimer() {
      if (this.timerIntervalId !== null) {
        window.clearInterval(this.timerIntervalId)
        this.timerIntervalId = null
      }
    },
    updateTimer() {
      if (!Number.isFinite(this.solvingStartedAtMs)) return
      this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.solvingStartedAtMs) / 1000))
    },
    closeStartModal() {
      if (!this.isStartingSolving) this.isStartModalOpen = false
    },
    closeFinishModal() {
      if (!this.isFinishingSolving) this.isFinishModalOpen = false
    },
    async confirmStartSolving() {
      if (this.isStartingSolving) return
      this.isStartingSolving = true
      this.errorMessage = ''
      try {
        const state = await startCaseSolving(this.caseId)
        this.applySolvingState(state)
        if (!this.isSolvingActive) throw new Error('Сервер не вернул время начала решения.')
        this.isStartModalOpen = false
        await this.loadChatHistory()
      } catch (error) {
        this.errorMessage = error?.message || 'Не удалось начать решение.'
      } finally {
        this.isStartingSolving = false
      }
    },
    async confirmFinishSolving() {
      if (this.isFinishingSolving || this.isSending) return
      this.isFinishingSolving = true
      this.errorMessage = ''
      try {
        const state = await finishCaseSolving(this.caseId)
        this.applySolvingState(state)
        if (!this.isSolvingCompleted) throw new Error('Сервер не подтвердил завершение решения.')
        this.isFinishModalOpen = false
        this.draft = ''
        this.statusMessage = ''
      } catch (error) {
        this.errorMessage = error?.message || 'Не удалось завершить решение.'
      } finally {
        this.isFinishingSolving = false
      }
    },
    async loadCase() {
      if (this.caseItem) return
      try {
        upsertCase(await getCaseByIdRequest(this.caseId))
      } catch (error) {
        this.errorMessage = error?.message || 'Не удалось загрузить кейс.'
      }
    },
    resizeMessageInput() {
      const input = this.$refs.messageInput
      if (!input) {
        return
      }
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    },
    resetMessageInputHeight() {
      this.$nextTick(() => {
        const input = this.$refs.messageInput
        if (input) {
          input.style.height = 'auto'
        }
      })
    },
    async loadChatHistory() {
      this.isHistoryLoading = true
      try {
        const sequence = await getCaseChatSequence(this.caseId)
        const history = []
        sequence.forEach((item) => {
          if (item.solutionText) {
            history.push({ id: this.nextId++, author: 'user', text: item.solutionText })
          }
          if (item.solutionResponse) {
            history.push({
              id: this.nextId++,
              author: 'bot',
              text: item.solutionResponse,
              rating: item.rating,
            })
          }
        })
        const messagesAddedWhileLoading = this.messages.slice(1)
        this.messages = [this.messages[0], ...history, ...messagesAddedWhileLoading]
      } catch (error) {
        if (Number(error?.status) === 401 || Number(error?.status) === 403) {
          this.errorMessage = 'Не удалось загрузить историю: сессия истекла.'
        }
      } finally {
        this.isHistoryLoading = false
      }
    },
    openConditions() {
      if (this.casePdfUrl) {
        window.open(this.casePdfUrl, '_blank', 'noopener')
        return
      }
      this.isConditionModalOpen = true
    },
    async sendMessage() {
      const text = this.draft.trim()
      if (!text || this.isSending || !this.isSolvingActive || this.isSolvingCompleted) {
        return
      }

      this.errorMessage = ''
      this.statusMessage = ''
      this.isSending = true

      this.messages.push({
        id: this.nextId,
        author: 'user',
        text,
      })
      this.nextId += 1
      this.draft = ''
      this.resetMessageInputHeight()

      try {
        const response = await evaluateCaseSolution({
          text,
          caseId: this.caseId,
        })

        this.messages.push({
          id: this.nextId,
          author: 'bot',
          text: response.message || `Решение принято. Итоговая оценка: ${response.rating ?? 0}.`,
          rating: response.rating,
        })
        this.nextId += 1

        this.statusMessage =
          response.rating === null || response.rating === undefined ? 'Ответ обработан.' : ''

        if (typeof response.rating === 'number' && this.appState.isAuthenticated) {
          saveSolvedCaseResult(this.caseId, response.rating)
        }
      } catch (error) {
        const toxicResponse = error?.body

        if (toxicResponse?.status === 'toxic') {
          this.messages.push({
            id: this.nextId,
            author: 'bot',
            text: toxicResponse.message,
          })
          this.nextId += 1
          this.statusMessage = 'Ответ не принят из-за токсичности.'
          if (toxicResponse.user_banned) {
            showBanNotice(toxicResponse.message)
            logoutUser()
            this.$router.replace('/')
          }
          return
        }

        if (Number(error?.status) === 401) {
          this.errorMessage = 'Сначала войдите в аккаунт, чтобы отправить решение.'
          return
        }

        this.errorMessage = error?.message || 'Не удалось отправить решение. Попробуйте ещё раз.'
      } finally {
        this.isSending = false
      }
    },
  },
}
</script>

<style scoped>
.chat-card {
  padding: clamp(16px, 2.4vw, 26px);
  display: grid;
  gap: 14px;
  border-top-width: 5px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chat-header h1 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.9rem);
  line-height: .95;
  text-transform: uppercase;
}

.chat-header-actions {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex-wrap: wrap;
}

.solve-timer {
  min-width: 150px;
  border: 1px solid var(--border);
  padding: 7px 12px;
  display: grid;
  align-content: center;
  background: var(--secondary-bg);
  font-family: var(--mono-font);
}

.solve-timer span {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.solve-timer strong {
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}

.back-link {
  width: fit-content;
  color: var(--text-main);
  font-family: var(--mono-font);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
}

.back-link span { margin-right: 8px; color: var(--primary); font-size: 1.2rem; }
.back-link:hover { text-decoration: underline; text-underline-offset: 5px; }

.case-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.case-score,
.message-score {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 0;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

.case-score {
  min-height: 38px;
  padding: 7px 12px;
  white-space: nowrap;
  align-self: stretch;
  font-family: var(--mono-font);
  font-size: 0.78rem;
  text-transform: uppercase;
}

.messages {
  min-height: clamp(210px, 38vh, 280px);
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 14px;
  display: grid;
  gap: 8px;
  background: var(--chat-bg);
  align-content: start;
}

.solving-state-text,
.start-solving-panel {
  min-height: clamp(220px, 40vh, 300px);
  border: 1px solid var(--border);
  background: var(--chat-bg);
}

.solving-state-text {
  margin: 0;
  padding: 24px;
  display: grid;
  place-items: center;
  color: var(--text-muted);
}

.start-solving-panel {
  padding: clamp(24px, 5vw, 56px);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 18px;
  text-align: center;
}

.start-solving-panel p {
  margin: 0;
  max-width: 520px;
  font-size: 1.05rem;
  line-height: 1.5;
}

.completed-solving-panel strong {
  font-size: clamp(1.25rem, 3vw, 1.8rem);
  text-transform: uppercase;
}

.message {
  width: fit-content;
  max-width: min(80%, 560px);
  padding: 8px 10px;
  border-radius: 0;
  border: 1px solid var(--border);
  background: var(--surface-bot-message);
  justify-self: start;
}

.message.user {
  justify-self: end;
  background: var(--primary);
  color: #fff;
}

.message.bot {
  background: var(--surface-bot-message);
}

.typing-message {
  min-width: 58px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.28;
  animation: typing-pulse 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.16s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes typing-pulse {
  0%,
  60%,
  100% {
    opacity: 0.28;
    transform: translateY(0) scale(0.85);
  }

  30% {
    opacity: 1;
    transform: translateY(-3px) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dot {
    animation: none;
    opacity: 0.7;
  }
}

.message p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
}

.message-score {
  margin-top: 8px;
  padding: 4px 9px;
  font-size: 0.82rem;
}

.status-text,
.error-text {
  margin: 0;
  font-size: 0.95rem;
}

.status-text {
  color: var(--text-muted);
}

.error-text {
  color: #b42318;
}

.chat-form {
  display: flex;
  gap: 10px;
}

.chat-form textarea {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 10px 12px;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.4;
  color: var(--text-main);
  background: var(--input-bg);
  min-width: 0;
  min-height: 42px;
  max-height: 180px;
  resize: none;
  overflow-y: auto;
}

.condition-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  display: grid;
  place-items: center;
  padding: 16px;
}

.condition-modal {
  position: relative;
  width: min(680px, 100%);
  padding: 20px;
}

.start-solving-modal {
  position: relative;
  width: min(520px, 100%);
  padding: clamp(22px, 4vw, 34px);
}

.start-solving-modal h2 {
  margin: 0 40px 12px 0;
  text-transform: uppercase;
}

.start-solving-modal p {
  margin: 0;
  line-height: 1.5;
}

.start-solving-modal p + p {
  margin-top: 10px;
}

.start-solving-modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.condition-modal h2 {
  margin: 0 0 12px;
}

.condition-modal p {
  margin: 0;
  line-height: 1.6;
}

.condition-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 0;
  background: var(--secondary-bg);
  color: var(--text-main);
  cursor: pointer;
  font-size: 1.1rem;
}

@media (max-width: 620px) {
  .chat-header-actions,
  .chat-header-actions .btn,
  .solve-timer,
  .case-score {
    width: 100%;
  }

  .chat-form {
    flex-direction: column;
  }

  .start-solving-modal-actions {
    flex-direction: column-reverse;
  }

  .start-solving-modal-actions .btn {
    width: 100%;
  }
}
</style>


