<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="skip">
    <div class="modal card">
      <button class="modal-close" type="button" aria-label="Закрыть" :disabled="saving" @click="skip">
        ×
      </button>

      <h2>Подскажем, с чего начать</h2>
      <p class="intro">
        Вы можете выбрать интересные вам теги и желаемую сложность. Если пока не хотите, просто пропустите этот шаг.
      </p>

      <form class="modal-form" @submit.prevent="submitPreferences">
        <fieldset class="tag-picker">
          <legend>Мне интересны...</legend>
          <label v-for="tag in tagOptions" :key="tag.id" class="tag-option">
            <input v-model="form.tagIds" type="checkbox" :value="Number(tag.id)" :disabled="saving">
            <span>{{ tag.name }}</span>
          </label>
        </fieldset>

        <label for="preference-difficulty">По сложности...</label>
        <select id="preference-difficulty" v-model="form.difficulty" :disabled="saving">
          <option value="">Пока без предпочтений</option>
          <option v-for="item in difficultyOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="saving">
            {{ saving ? 'Сохраняем...' : 'Сохранить предпочтения' }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="saving" @click="skip">
            Пропустить
          </button>
        </div>
        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
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
        tagIds: [],
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
    saving: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  emits: ['save', 'skip'],
  data() {
    return {
      form: {
        tagIds: [],
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
          tagIds: [...(value?.tagIds || [])],
          difficulty: value?.difficulty || '',
        }
      },
    },
  },
  methods: {
    submitPreferences() {
      this.$emit('save', { ...this.form, tagIds: [...this.form.tagIds] })
    },
    skip() {
      if (!this.saving) this.$emit('skip')
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
  border-radius: 0;
  box-shadow: 10px 10px 0 var(--primary);
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 0;
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
  border-radius: 0;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-main);
}

.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 6px;
  padding: 0;
  border: 0;
}

.tag-picker legend {
  width: 100%;
  margin-bottom: 8px;
}

.tag-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  background: var(--secondary-bg);
  cursor: pointer;
}

.tag-option:has(input:checked) {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, var(--secondary-bg));
}

.form-error {
  margin: 4px 0 0;
  color: #b42318;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
