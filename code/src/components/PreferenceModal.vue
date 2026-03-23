<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('skip')">
    <div class="modal card">
      <button class="modal-close" type="button" aria-label="Закрыть" @click="$emit('skip')">
        ×
      </button>

      <h2>Подскажем, с чего начать</h2>
      <p class="intro">
        Вы можете выбрать любимый тег и желаемую сложность. Если пока не хотите, просто пропустите этот шаг.
      </p>

      <form class="modal-form" @submit.prevent="submitPreferences">
        <label for="preference-tag">Я предпочитаю...</label>
        <select id="preference-tag" v-model="form.tag">
          <option value="">Пока без предпочтений</option>
          <option v-for="tag in tagOptions" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>

        <label for="preference-difficulty">По сложности...</label>
        <select id="preference-difficulty" v-model="form.difficulty">
          <option value="">Пока без предпочтений</option>
          <option v-for="item in difficultyOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <div class="actions">
          <button class="btn btn-primary" type="submit">
            Сохранить предпочтения
          </button>
          <button class="btn btn-secondary" type="button" @click="$emit('skip')">
            Пропустить
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PreferenceModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    initialPreferences: {
      type: Object,
      default: () => ({
        tag: '',
        difficulty: '',
      }),
    },
    tagOptions: {
      type: Array,
      default: () => [],
    },
    difficultyOptions: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['save', 'skip'],
  data() {
    return {
      form: {
        tag: '',
        difficulty: '',
      },
    }
  },
  watch: {
    initialPreferences: {
      immediate: true,
      deep: true,
      handler(value) {
        this.form = {
          tag: value?.tag || '',
          difficulty: value?.difficulty || '',
        }
      },
    },
  },
  methods: {
    submitPreferences() {
      this.$emit('save', { ...this.form })
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  position: relative;
  width: min(520px, 100%);
  padding: 22px;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: var(--secondary-bg);
  color: var(--text-main);
  cursor: pointer;
}

.modal h2 {
  margin: 0 0 8px;
}

.intro {
  margin: 0 0 16px;
  color: var(--text-muted);
  line-height: 1.5;
}

.modal-form {
  display: grid;
  gap: 8px;
}

.modal-form select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-main);
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
