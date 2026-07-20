<template>
  <div class="container chat-page">
    <section class="card chat-card">
      <header class="chat-header">
        <h1>Чат по кейсу: {{ caseTitle }}</h1>
        <button class="btn btn-secondary" type="button" @click="openConditions">
          {{ casePdfUrl ? 'Полные условия (PDF)' : 'Просмотр условия' }}
        </button>
      </header>

      <div class="messages">
        <div v-for="message in messages" :key="message.id" class="message" :class="message.author">
          <p>{{ message.text }}</p>
        </div>
      </div>

      <p v-if="statusMessage" class="status-text">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <form class="chat-form" @submit.prevent="sendMessage">
        <input v-model.trim="draft" type="text" :disabled="isSending || isHistoryLoading" placeholder="Введите сообщение..." />
        <button class="btn btn-primary" type="submit" :disabled="!draft || isSending || isHistoryLoading">
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
import { evaluateCaseSolution, getCaseChatSequence } from '@/api/authApi'
import {
  appState,
  getCaseById,
  logoutUser,
  markCaseViewed,
  saveSolvedCaseResult,
  showBanNotice,
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
  },
  async created() {
    markCaseViewed(this.caseId)
    await this.loadChatHistory()
  },
  methods: {
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
            history.push({ id: this.nextId++, author: 'bot', text: item.solutionResponse })
          }
        })
        this.messages = [this.messages[0], ...history]
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
      if (!this.draft) {
        return
      }

      const text = this.draft
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

      try {
        const response = await evaluateCaseSolution({
          text,
          caseId: this.caseId,
        })

        this.messages.push({
          id: this.nextId,
          author: 'bot',
          text: response.message || `Решение принято. Итоговая оценка: ${response.rating ?? 0}.`,
        })
        this.nextId += 1

        this.statusMessage =
          response.rating === null || response.rating === undefined
            ? 'Ответ обработан.'
            : `Рейтинг по кейсу: ${response.rating} / 100`

        if (typeof response.rating === 'number' && this.appState.isAuthenticated) {
          saveSolvedCaseResult(this.caseId, response.rating, {
            solveMinutes: this.buildSolveMinutes(),
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
  padding: clamp(14px, 2.8vw, 20px);
  display: grid;
  gap: 14px;
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
  font-size: clamp(1.15rem, 2.8vw, 1.4rem);
}

.messages {
  min-height: clamp(220px, 40vh, 300px);
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: var(--chat-bg);
  align-content: start;
}

.message {
  width: fit-content;
  max-width: min(80%, 560px);
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-bot-message);
  justify-self: start;
}

.message.user {
  justify-self: end;
  background: var(--surface-user-message);
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

.chat-form input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  color: var(--text-main);
  background: var(--input-bg);
  min-width: 0;
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
  border-radius: 8px;
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


