<template>
  <div class="theory-admin">
    <div class="case-choice">
      <label for="theory-case">Кейс</label>
      <select id="theory-case" v-model="caseId" :disabled="saving || Boolean(materialId)" @change="changeCase">
        <option value="">Выберите кейс</option>
        <option v-for="item in cases" :key="item.id" :value="item.id">{{ item.title }}</option>
      </select>
    </div>
    <div v-if="caseId" class="theory-grid">
      <article class="card">
        <h2>Блоки теории</h2>
        <p v-if="loading" role="status">Загружаем блоки...</p>
        <p v-if="listError" class="error-text" role="alert">{{ listError }}</p>
        <button v-if="listError" class="btn btn-secondary" type="button" :disabled="loading || saving" @click="loadMaterials">Повторить загрузку</button>
        <p v-if="!loading && !listError && !materials.length" class="hint">В этом кейсе пока нет теории.</p>
        <div v-for="item in materials" :key="item.id" class="material-item">
          <strong>{{ item.position }}. {{ item.title }}</strong>
          <span class="hint">{{ item.isActive ? 'Опубликован' : 'Черновик' }}</span>
          <div class="material-actions">
            <button class="btn btn-secondary" type="button" :disabled="saving || loading || Boolean(materialActionId)" @click="editMaterial(item.id)">Открыть</button>
            <button
              v-if="item.isActive"
              class="btn btn-secondary deactivate-btn"
              type="button"
              :disabled="saving || loading || Boolean(materialActionId)"
              @click="deactivateMaterial(item)"
            >
              {{ materialActionId === item.id ? 'Деактивация...' : 'Деактивировать' }}
            </button>
          </div>
        </div>
      </article>
      <article class="card">
        <h2>{{ materialId ? 'Изменить блок теории' : 'Добавить блок теории' }}</h2>
        <button v-if="materialId" class="btn btn-secondary" type="button" :disabled="saving" @click="resetForm">Новый блок</button>
        <form @submit.prevent="save">
          <fieldset :disabled="saving" class="editor-fields">
            <label for="theory-title">Название блока</label>
            <input id="theory-title" v-model.trim="form.title" required maxlength="255" />
            <label for="theory-position">Порядок в кейсе</label>
            <input id="theory-position" v-model.number="form.position" type="number" min="1" step="1" max="2147483647" required />
            <label for="theory-text">Текст теории</label>
            <textarea id="theory-text" v-model="form.text" rows="10" required />
            <h3>Тест по этому блоку</h3>
            <label for="theory-quiz-title">Название теста</label>
            <input id="theory-quiz-title" v-model.trim="quizTitle" required maxlength="255" />
            <fieldset v-for="(question, qi) in questions" :key="question.key" class="question-editor">
              <legend>Вопрос {{ qi + 1 }}</legend>
              <label :for="`question-${question.key}`">Текст вопроса</label>
              <textarea :id="`question-${question.key}`" v-model.trim="question.text" required rows="2" />
              <p class="hint">Отметьте один правильный ответ.</p>
              <div v-for="(option, oi) in question.options" :key="option.key" class="option-editor">
                <input v-model="question.correctKey" type="radio" :name="`correct-${question.key}`" :value="option.key" :aria-label="`Ответ ${oi + 1} правильный`" required />
                <input v-model.trim="option.text" :aria-label="`Ответ ${oi + 1} на вопрос ${qi + 1}`" placeholder="Вариант ответа" required maxlength="1000" />
                <button class="btn btn-secondary" type="button" :disabled="question.options.length <= 2" :aria-label="`Удалить ответ ${oi + 1}`" @click="removeOption(question, oi)">×</button>
              </div>
              <div class="actions">
                <button class="btn btn-secondary" type="button" @click="question.options.push(newOption())">Добавить ответ</button>
                <button class="btn btn-secondary" type="button" :disabled="questions.length <= 1" @click="questions.splice(qi, 1)">Удалить вопрос</button>
              </div>
            </fieldset>
            <button class="btn btn-secondary" type="button" @click="questions.push(newQuestion())">Добавить вопрос</button>
            <label class="publish-choice"><input v-model="form.isActive" type="checkbox" /> Опубликовать блок с тестом</label>
            <button class="btn btn-primary" type="submit" :disabled="loading || Boolean(listError)">{{ saving ? 'Сохраняем...' : 'Сохранить блок и тест' }}</button>
          </fieldset>
          <p v-if="error" class="error-text" role="alert">{{ error }}</p>
          <p v-if="message" class="success-text" role="status">{{ message }}</p>
        </form>
      </article>
    </div>
  </div>
</template>

<script>
import { createAdminTheory, getAdminTheory, getAdminTheoryQuiz, listAdminTheory, saveAdminTheoryQuiz, updateAdminTheory } from '@/api/authApi'

let nextKey = 0
const newOption = () => ({ key: ++nextKey, text: '' })
const newQuestion = () => ({ key: ++nextKey, text: '', correctKey: null, options: [newOption(), newOption()] })
const newForm = (position = 1) => ({ title: '', position, text: '', isActive: true })

export default {
  name: 'AdminTheoryPanel',
  props: { cases: { type: Array, required: true } },
  data() {
    return {
      caseId: '', materials: [], loading: false, listError: '', saving: false,
      form: newForm(), quizTitle: '', questions: [newQuestion()],
      materialId: null, materialActionId: null, savedQuiz: null, error: '', message: '', loadVersion: 0,
    }
  },
  methods: {
    newOption,
    newQuestion,
    quizPayload() {
      return {
        title: this.quizTitle.trim(), isActive: true,
        questions: this.questions.map((q, qi) => ({
          text: q.text.trim(), position: qi + 1, isActive: true,
          options: q.options.map((o, oi) => ({ text: o.text.trim(), position: oi + 1, isCorrect: o.key === q.correctKey })),
        })),
      }
    },
    async deactivateMaterial(item) {
      if (!item?.isActive || this.saving || this.loading || this.materialActionId) return
      this.error = ''
      this.message = ''
      this.materialActionId = item.id
      try {
        await updateAdminTheory(item.id, { isActive: false })
        item.isActive = false
        if (Number(this.materialId) === Number(item.id)) this.form.isActive = false
        this.message = `Блок «${item.title}» деактивирован.`
      } catch (error) {
        this.error = error?.message || 'Не удалось деактивировать блок теории.'
      } finally {
        this.materialActionId = null
      }
    },
    async editMaterial(id) {
      if (this.saving || this.loading) return
      this.saving = true
      this.error = ''
      this.message = ''
      try {
        const material = await getAdminTheory(id)
        let quiz = null
        try { quiz = await getAdminTheoryQuiz(id) } catch (error) {
          if (Number(error?.status) !== 404) throw error
        }
        this.resetForm()
        this.materialId = material.id
        this.form = { title: material.title, text: material.text, position: material.position, isActive: material.isActive }
        if (quiz) {
          this.quizTitle = quiz.title
          this.questions = [...quiz.questions].sort((a, b) => a.position - b.position).map(q => {
            const options = [...q.options].sort((a, b) => a.position - b.position).map(o => ({ ...newOption(), text: o.text, isCorrect: o.isCorrect }))
            return { key: ++nextKey, text: q.text, options, correctKey: options.find(o => o.isCorrect)?.key ?? null }
          })
          this.savedQuiz = quiz.isActive && quiz.questions.every(q => q.isActive)
            ? JSON.stringify(this.quizPayload()) : null
        }
      } catch (error) {
        this.error = error?.message || 'Не удалось открыть блок.'
      } finally { this.saving = false }
    },
    removeOption(question, index) {
      const [removed] = question.options.splice(index, 1)
      if (question.correctKey === removed.key) question.correctKey = null
    },
    resetForm() {
      this.form = newForm(Math.max(0, ...this.materials.map(item => Number(item.position) || 0)) + 1)
      this.quizTitle = ''
      this.questions = [newQuestion()]
      this.materialId = null
      this.savedQuiz = null
    },
    async changeCase() {
      this.error = ''
      this.message = ''
      this.materials = []
      this.resetForm()
      await this.loadMaterials()
    },
    async loadMaterials() {
      const version = ++this.loadVersion
      this.listError = ''
      if (!this.caseId) { this.loading = false; return }
      this.loading = true
      try {
        const response = await listAdminTheory(this.caseId)
        if (version !== this.loadVersion) return
        this.materials = [...response.materials].sort((a, b) => a.position - b.position)
        if (!this.materialId && !this.form.title && !this.form.text) {
          this.form.position = Math.max(0, ...this.materials.map(item => Number(item.position) || 0)) + 1
        }
      } catch (error) {
        if (version === this.loadVersion) this.listError = error?.message || 'Не удалось загрузить теорию.'
      } finally {
        if (version === this.loadVersion) this.loading = false
      }
    },
    async save() {
      if (this.saving || this.loading || this.listError || !this.caseId) return
      this.error = ''
      this.message = ''
      const material = { ...this.form, title: this.form.title.trim(), text: this.form.text.trim() }
      if (!material.title || !material.text || !Number.isInteger(material.position) || material.position < 1) {
        this.error = 'Заполните название, текст и целый положительный номер блока.'
        return
      }
      if (this.materials.some(item => Number(item.position) === material.position && Number(item.id) !== Number(this.materialId))) {
        this.error = 'В этом кейсе уже есть блок с таким номером.'
        return
      }
      if (!this.quizTitle.trim() || !this.questions.length || this.questions.some(q =>
        !q.text.trim() || q.options.length < 2 || q.options.some(o => !o.text.trim()) ||
        !q.options.some(o => o.key === q.correctKey))) {
        this.error = 'Заполните тест: для каждого вопроса нужны минимум два ответа и один правильный.'
        return
      }
      const quiz = this.quizPayload()
      this.saving = true
      try {
        if (!this.materialId) {
          const result = await createAdminTheory(this.caseId, { ...material, isActive: false })
          this.materialId = result.id
          if (!this.materialId) throw new Error('Сервер не вернул ID созданного блока. Обновите список перед повторным сохранением.')
        }
        if (this.savedQuiz !== JSON.stringify(quiz)) {
          await saveAdminTheoryQuiz(this.materialId, quiz)
          this.savedQuiz = JSON.stringify(quiz)
        }
        await updateAdminTheory(this.materialId, material)
        this.message = material.isActive ? 'Блок теории и тест опубликованы.' : 'Блок теории с тестом сохранён как черновик.'
        this.resetForm()
        await this.loadMaterials()
      } catch (error) {
        this.error = (this.materialId ? 'Блок уже создан. Повторное сохранение продолжит работу с ним. ' : '') +
          (error?.message || 'Не удалось сохранить теорию с тестом.')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.theory-admin { display: grid; gap: 22px; min-width: 0; }
.case-choice { display: grid; gap: 8px; min-width: 0; }
.case-choice label,
.editor-fields > label,
.question-editor > label { font-weight: 600; }
.theory-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr); gap: 24px; }
.theory-grid > .card { min-width: 0; align-self: start; padding: clamp(18px, 2vw, 26px); }
.theory-grid h2 { margin: 0 0 20px; }
.theory-grid h3 { margin: 14px 0 2px; }
.theory-grid form { display: grid; gap: 16px; }
.editor-fields { display: grid; gap: 10px; min-width: 0; border: 0; padding: 0; margin: 0; }
.editor-fields > label:not(:first-child),
.editor-fields > h3 { margin-top: 10px; }
.question-editor { display: grid; gap: 12px; min-width: 0; border: 1px solid var(--border); padding: 18px; margin: 8px 0; }
.question-editor legend { padding: 0 6px; font-weight: 700; }
.option-editor { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.publish-choice { display: flex; align-items: center; gap: 8px; }
input:not([type=radio]):not([type=checkbox]), select, textarea { width: 100%; min-width: 0; min-height: 44px; box-sizing: border-box; padding: 10px 12px; color: var(--text-main); background: var(--input-bg); border: 1px solid var(--border); font: inherit; }
textarea { resize: vertical; }
.material-item { display: grid; gap: 8px; padding: 16px 0; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
.material-item:first-of-type { border-top: 1px solid var(--border); }
.material-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.material-actions .btn { flex: 1 1 150px; }
.deactivate-btn { border-color: var(--primary); }
.hint { margin: 0; color: var(--text-muted); }
.error-text { color: var(--primary); }
.success-text { color: var(--text-main); }
@media (max-width: 800px) {
  .theory-admin { gap: 18px; }
  .theory-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .theory-grid > .card { padding: 16px; }
  .question-editor { padding: 14px; }
}
</style>
