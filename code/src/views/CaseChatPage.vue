<template>
  <div class="container chat-page">
    <section class="card chat-card">
      <header class="chat-header">
        <h1>Чат по кейсу: {{ caseTitle }}</h1>
        <button class="btn btn-secondary" type="button" @click="isConditionModalOpen = true">
          Просмотр условия
        </button>
      </header>

      <div class="messages">
        <div v-for="message in messages" :key="message.id" class="message" :class="message.author">
          <p>{{ message.text }}</p>
        </div>
      </div>

      <form class="chat-form" @submit.prevent="sendMessage">
        <input v-model.trim="draft" type="text" placeholder="Введите сообщение..." />
        <button class="btn btn-primary" type="submit" :disabled="!draft">Отправить</button>
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
import { getCaseById } from '@/store/appState'

export default {
  name: 'CaseChatPage',
  data() {
    return {
      draft: '',
      messages: [],
      nextId: 1,
      isConditionModalOpen: false,
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
  },
  methods: {
    sendMessage() {
      if (!this.draft) {
        return
      }
      this.messages.push({
        id: this.nextId,
        author: 'user',
        text: this.draft,
      })
      this.nextId += 1
      this.draft = ''
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
  background: #fbfdff;
  align-content: start;
}

.message {
  width: fit-content;
  max-width: min(80%, 560px);
  padding: 10px 12px;
  border-radius: 12px;
  background: #ebf0ff;
  justify-self: start;
}

.message.user {
  justify-self: end;
  background: #ffe5e1;
}

.message p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
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
  min-width: 0;
}

.condition-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 14, 31, 0.45);
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
  cursor: pointer;
  font-size: 1.1rem;
}

@media (max-width: 620px) {
  .chat-form {
    flex-direction: column;
  }
}
</style>


