<template>
  <div class="container chat-page">
    <section class="card chat-card">
      <router-link class="back-link" :to="`/case/${caseId}`">
        <span aria-hidden="true">←</span> К описанию кейса
      </router-link>
      <header class="chat-header">
        <div class="case-heading">
          <h1>Чат по кейсу: {{ caseTitle }}</h1>
          <span v-if="currentCaseScore !== null" class="case-score">
            {{ currentCaseScore }} / 100
          </span>
        </div>
        <button class="btn btn-secondary" type="button" @click="openConditions">
          {{ casePdfUrl ? 'Полные условия (PDF)' : 'Просмотр условия' }}
        </button>
      </header>

      <div class="messages">
        <div v-for="message in messages" :key="message.id" class="message" :class="message.author">
          <p>{{ message.text }}</p>
          <span v-if="message.rating !== null && message.rating !== undefined" class="message-score">
            Оценка: {{ message.rating }} / 100
          </span>
        </div>
      </div>

      <p v-if="statusMessage" class="status-text">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

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
    </section>

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
import { evaluateCaseSolution, getCaseByIdRequest, getCaseChatSequence } from '@/api/authApi'
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
      isSending: false,
      isHistoryLoading: false,
      errorMessage: '',
      statusMessage: '',
      openedAt: Date.now(),
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
  },
  async created() {
    markCaseViewed(this.caseId)
    await Promise.all([this.loadCase(), this.loadChatHistory()])
  },
  methods: {
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
    buildSolveMinutes() {
      const diffMs = Date.now() - this.openedAt
      return Math.max(1, Math.round(diffMs / 60000))
    },
    async sendMessage() {
      const text = this.draft.trim()
      if (!text || this.isSending) {
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
        const solveMinutes = this.buildSolveMinutes()
        const response = await evaluateCaseSolution({
          text,
          caseId: this.caseId,
          solveMinutes,
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
          saveSolvedCaseResult(this.caseId, response.rating, {
            solveMinutes,
          })
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
  padding: clamp(18px, 3vw, 32px);
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
  font-size: clamp(1.7rem, 4vw, 3.8rem);
  line-height: .95;
  text-transform: uppercase;
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
  padding: 5px 10px;
  white-space: nowrap;
}

.messages {
  min-height: clamp(220px, 40vh, 300px);
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 18px;
  display: grid;
  gap: 8px;
  background: var(--chat-bg);
  align-content: start;
}

.message {
  width: fit-content;
  max-width: min(80%, 560px);
  padding: 10px 12px;
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
  .chat-form {
    flex-direction: column;
  }
}
</style>


