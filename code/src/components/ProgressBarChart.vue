<template>
  <div class="progress-chart" role="img" :aria-label="accessibleLabel">
    <div class="progress-chart-scroll">
      <svg :viewBox="`0 0 ${chartWidth} 260`" :style="{ minWidth: `${chartWidth}px` }" aria-hidden="true">
        <g v-for="tick in ticks" :key="tick">
          <line
            class="progress-chart-grid-line"
            :x1="plotLeft"
            :x2="chartWidth - plotRight"
            :y1="valueY(tick)"
            :y2="valueY(tick)"
          />
          <text class="progress-chart-axis-label" :x="plotLeft - 10" :y="valueY(tick) + 4" text-anchor="end">
            {{ tick }}
          </text>
        </g>

        <line class="progress-chart-axis" :x1="plotLeft" :x2="plotLeft" :y1="plotTop" :y2="plotBottom" />
        <line class="progress-chart-axis" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="plotBottom" :y2="plotBottom" />

        <g v-for="(item, index) in normalizedItems" :key="`${item.label}-${index}`">
          <title>{{ item.label }}: {{ item.value }} из 100</title>
          <rect
            class="progress-chart-bar"
            :class="{ secondary: item.secondary }"
            :x="barX(index)"
            :y="valueY(item.value)"
            :width="barWidth"
            :height="barHeight(item.value)"
          />
          <text class="progress-chart-value" :x="barX(index) + barWidth / 2" :y="Math.max(18, valueY(item.value) - 8)" text-anchor="middle">
            {{ item.value }}
          </text>
          <text class="progress-chart-item-label" :x="barX(index) + barWidth / 2" :y="plotBottom + 24" text-anchor="middle">
            {{ shortenLabel(item.label) }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProgressBarChart',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    ariaLabel: {
      type: String,
      default: 'График результатов',
    },
  },
  data() {
    return {
      ticks: [100, 75, 50, 25, 0],
      plotLeft: 48,
      plotRight: 20,
      plotTop: 28,
      plotBottom: 194,
      barWidth: 46,
      itemSlotWidth: 88,
    }
  },
  computed: {
    normalizedItems() {
      return this.items.map((item) => ({
        label: String(item?.label || 'Без названия'),
        value: Math.min(100, Math.max(0, Math.round(Number(item?.value) || 0))),
        secondary: Boolean(item?.secondary),
      }))
    },
    chartWidth() {
      return Math.max(520, this.plotLeft + this.plotRight + this.normalizedItems.length * this.itemSlotWidth)
    },
    plotHeight() {
      return this.plotBottom - this.plotTop
    },
    accessibleLabel() {
      const values = this.normalizedItems.map((item) => `${item.label}: ${item.value} из 100`).join('; ')
      return values ? `${this.ariaLabel}. ${values}` : this.ariaLabel
    },
  },
  methods: {
    valueY(value) {
      return this.plotTop + ((100 - value) / 100) * this.plotHeight
    },
    barX(index) {
      return this.plotLeft + index * this.itemSlotWidth + (this.itemSlotWidth - this.barWidth) / 2
    },
    barHeight(value) {
      return Math.max(1, this.plotBottom - this.valueY(value))
    },
    shortenLabel(value) {
      const label = String(value || '')
      return label.length > 13 ? `${label.slice(0, 12)}…` : label
    },
  },
}
</script>

<style scoped>
.progress-chart {
  min-width: 0;
}

.progress-chart-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-color: var(--primary) var(--surface-muted);
}

.progress-chart svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
}

.progress-chart-grid-line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 4 5;
}

.progress-chart-axis {
  stroke: var(--text-muted);
  stroke-width: 1;
}

.progress-chart-axis-label,
.progress-chart-item-label,
.progress-chart-value {
  fill: var(--text-muted);
  font-family: var(--mono-font);
  font-size: 11px;
}

.progress-chart-value {
  fill: var(--text-main);
  font-size: 12px;
  font-weight: 800;
}

.progress-chart-bar {
  fill: var(--primary);
}

.progress-chart-bar.secondary {
  fill: var(--text-main);
}
</style>
