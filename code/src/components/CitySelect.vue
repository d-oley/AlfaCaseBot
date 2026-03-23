<template>
  <div class="city-select">
    <input
      v-model.trim="search"
      type="text"
      class="search-input"
      placeholder="Поиск по списку городов"
      :disabled="disabled"
    />

    <select
      :value="modelValue"
      class="city-dropdown"
      :disabled="disabled || !filteredCities.length"
      @change="$emit('update:modelValue', normalizeValue($event.target.value))"
    >
      <option :value="emptyValue" disabled>
        {{ filteredCities.length ? placeholder : 'Список городов недоступен' }}
      </option>
      <option v-for="city in filteredCities" :key="city.id" :value="city.id">
        {{ formatCity(city) }}
      </option>
    </select>

    <p class="hint">
      Если вашего города нет в списке, выберите ближайший.
    </p>
    <p v-if="backendError" class="error-text">
      {{ backendError }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'CitySelect',
  props: {
    modelValue: {
      type: [Number, String, null],
      default: '',
    },
    cities: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: 'Выберите город',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    backendError: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      search: '',
      emptyValue: '',
    }
  },
  computed: {
    filteredCities() {
      const normalizedQuery = this.search.toLowerCase()
      if (!normalizedQuery) {
        return this.cities
      }
      return this.cities.filter((city) => this.formatCity(city).toLowerCase().includes(normalizedQuery))
    },
  },
  methods: {
    formatCity(city) {
      return [city?.cityName, city?.regionName].filter(Boolean).join(', ')
    },
    normalizeValue(value) {
      return value ? Number(value) : null
    },
  },
}
</script>

<style scoped>
.city-select {
  display: grid;
  gap: 8px;
}

.search-input,
.city-dropdown {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--input-bg);
  color: var(--text-main);
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.error-text {
  margin: 0;
  color: #be2a2a;
  font-size: 0.85rem;
}
</style>
