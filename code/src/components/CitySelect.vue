<template>
  <div ref="root" class="city-select">
    <div
      class="search-shell"
      :class="{
        focused: isFocused,
        disabled,
        invalid: Boolean(backendError),
      }"
    >
      <span class="search-icon" aria-hidden="true">⌕</span>
      <input
        v-model.trim="search"
        type="text"
        class="search-input"
        :placeholder="placeholderText"
        :disabled="disabled"
        @focus="handleFocus"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc.prevent="closeDropdown"
      />
      <span v-if="loading" class="loading-badge">Ищем...</span>
    </div>

    <div v-if="selectedCityLabel" class="selected-chip">
      <span class="chip-label">Выбранный город</span>
      <strong>{{ selectedCityLabel }}</strong>
    </div>

    <div v-if="shouldShowDropdown" class="dropdown-card">
      <p v-if="backendError" class="dropdown-state error-text">
        {{ backendError }}
      </p>
      <p v-else-if="loading" class="dropdown-state muted">
        Подбираем города из базы...
      </p>
      <p v-else-if="!hasEnoughQuery" class="dropdown-state muted">
        Введите минимум 2 символа, например: Мо, Каз, Ново
      </p>
      <p v-else-if="!resolvedOptions.length" class="dropdown-state empty">
        По этому запросу база пока ничего не вернула. Если вашего города нет в списке, выберите ближайший.
      </p>
      <button
        v-for="(city, index) in resolvedOptions"
        v-else
        :key="city.id"
        type="button"
        class="dropdown-option"
        :class="{ active: index === highlightedIndex }"
        @mousedown.prevent="selectCity(city)"
      >
        <span class="city-name">{{ city.cityName }}</span>
        <span v-if="city.regionName" class="region-name">{{ city.regionName }}</span>
      </button>
    </div>

    <p class="hint">
      Если вашего города нет в списке, выберите ближайший.
    </p>
  </div>
</template>

<script>
export default {
  name: 'CitySelect',
  props: {
    modelValue: {
      type: [Number, String, null],
      default: null,
    },
    cities: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    backendError: {
      type: String,
      default: '',
    },
    selectedCityLabel: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'search-change'],
  data() {
    return {
      search: '',
      isFocused: false,
      highlightedIndex: 0,
      debounceId: null,
    }
  },
  computed: {
    hasEnoughQuery() {
      return this.search.trim().length >= 2
    },
    placeholderText() {
      return 'Начните вводить город'
    },
    resolvedOptions() {
      return Array.isArray(this.cities) ? this.cities : []
    },
    shouldShowDropdown() {
      return this.isFocused && (this.hasEnoughQuery || this.loading || this.resolvedOptions.length > 0 || Boolean(this.backendError))
    },
  },
  watch: {
    search(value) {
      clearTimeout(this.debounceId)
      this.highlightedIndex = 0
      this.debounceId = setTimeout(() => {
        this.$emit('search-change', value)
      }, 250)
    },
    cities() {
      this.highlightedIndex = 0
    },
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideClick)
  },
  beforeUnmount() {
    clearTimeout(this.debounceId)
    document.removeEventListener('click', this.handleOutsideClick)
  },
  methods: {
    handleFocus() {
      this.isFocused = true
    },
    closeDropdown() {
      this.isFocused = false
    },
    handleOutsideClick(event) {
      if (!this.$refs.root?.contains(event.target)) {
        this.closeDropdown()
      }
    },
    moveHighlight(direction) {
      if (!this.shouldShowDropdown || !this.resolvedOptions.length) {
        return
      }

      const lastIndex = this.resolvedOptions.length - 1
      const nextIndex = this.highlightedIndex + direction

      if (nextIndex < 0) {
        this.highlightedIndex = lastIndex
        return
      }

      if (nextIndex > lastIndex) {
        this.highlightedIndex = 0
        return
      }

      this.highlightedIndex = nextIndex
    },
    selectHighlighted() {
      if (!this.resolvedOptions.length) {
        return
      }

      this.selectCity(this.resolvedOptions[this.highlightedIndex])
    },
    selectCity(city) {
      this.$emit('update:modelValue', city?.id ? Number(city.id) : null)
      this.search = city?.cityName || ''
      this.closeDropdown()
    },
  },
}
</script>

<style scoped>
.city-select {
  display: grid;
  gap: 10px;
}

.search-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 0;
  background: var(--input-bg);
  box-shadow: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.search-shell.focused {
  border-color: rgba(15, 98, 254, 0.45);
  box-shadow: 0 18px 36px rgba(15, 98, 254, 0.12);
  transform: translateY(-1px);
}

.search-shell.invalid {
  border-color: rgba(190, 42, 42, 0.4);
}

.search-shell.disabled {
  opacity: 0.7;
}

.search-icon {
  color: var(--text-muted);
  font-size: 1rem;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 0.98rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

@media (prefers-color-scheme: dark) {
  .search-shell {
    background: var(--input-bg);
    border-color: var(--border);
  }

  .dropdown-card {
    background: var(--card-bg);
    border-color: var(--border);
  }
}

.loading-badge {
  padding: 6px 10px;
  border-radius: 0;
  background: rgba(15, 98, 254, 0.08);
  color: #0f62fe;
  font-size: 0.78rem;
  font-weight: 700;
}

.selected-chip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 0;
  background: rgba(14, 116, 144, 0.08);
  color: var(--text-main);
}

.chip-label {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.dropdown-card {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 0;
  background: var(--card-bg);
  box-shadow: 0 18px 45px rgba(17, 24, 39, 0.08);
}

.dropdown-state {
  margin: 0;
  padding: 10px 12px;
  border-radius: 0;
  font-size: 0.9rem;
}

.dropdown-state.muted {
  background: rgba(15, 23, 42, 0.04);
  color: var(--text-muted);
}

.dropdown-state.empty {
  background: rgba(245, 158, 11, 0.09);
  color: #9a6700;
}

.dropdown-option {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.dropdown-option:hover,
.dropdown-option.active {
  background: rgba(15, 98, 254, 0.08);
  transform: translateX(2px);
}

.city-name {
  font-weight: 700;
  color: var(--text-main);
}

.region-name {
  color: var(--text-muted);
  font-size: 0.88rem;
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.4;
}

.error-text {
  color: #be2a2a;
}
</style>
