<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'

interface StandupRecord {
  date: string
  totalSeconds: number
  totalPeople: number
  activePeople: number
}

type FilterKey = '7d' | '30d' | 'all'

const router = useRouter()
const history = ref<StandupRecord[]>([])
const activeFilter = ref<FilterKey>('7d')
const timeChartEl = ref<HTMLDivElement | null>(null)
const peopleChartEl = ref<HTMLDivElement | null>(null)

const filters: { key: FilterKey; label: string }[] = [
  { key: '7d', label: 'PAST 7 DAYS' },
  { key: '30d', label: 'PAST 30 DAYS' },
  { key: 'all', label: 'ALL TIME' },
]

onMounted(() => {
  loadHistory()
})

function loadHistory() {
  const stored = localStorage.getItem('standup-history')
  history.value = stored ? JSON.parse(stored) : []
  // Auto-select best filter based on data availability
  if (history.value.length > 0) {
    const oldest = new Date(history.value[0].date)
    const now = new Date()
    const diffDays = (now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays <= 7) {
      activeFilter.value = '7d'
    } else if (diffDays <= 30) {
      activeFilter.value = '30d'
    } else {
      activeFilter.value = '7d'
    }
  }
}

function clearHistory() {
  localStorage.removeItem('standup-history')
  history.value = []
}

const filtered = computed(() => {
  if (activeFilter.value === 'all') return history.value
  const now = new Date()
  const days = activeFilter.value === '7d' ? 7 : 30
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return history.value.filter(r => new Date(r.date) >= cutoff)
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const avgTime = computed(() => {
  if (filtered.value.length === 0) return '--:--'
  const total = filtered.value.reduce((sum, r) => sum + r.totalSeconds, 0)
  return formatTime(Math.round(total / filtered.value.length))
})

const avgPeople = computed(() => {
  if (filtered.value.length === 0) return '--'
  const total = filtered.value.reduce((sum, r) => sum + r.activePeople, 0)
  return (total / filtered.value.length).toFixed(1)
})

// Chart rendering with d3
const margin = { top: 20, right: 20, bottom: 36, left: 56 }
const chartHeight = 200

function drawChart(
  container: HTMLDivElement,
  data: StandupRecord[],
  accessor: (d: StandupRecord) => number,
  color: string,
  yFormat: (v: number) => string,
) {
  d3.select(container).selectAll('*').remove()

  const width = container.clientWidth
  const innerW = width - margin.left - margin.right
  const innerH = chartHeight - margin.top - margin.bottom

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', chartHeight)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const dates = data.map(d => new Date(d.date))
  const values = data.map(accessor)

  const xScale = d3.scaleTime()
    .domain(d3.extent(dates) as [Date, Date])
    .range([0, innerW])

  const yMin = (d3.min(values) ?? 0) * 0.9
  const yMax = (d3.max(values) ?? 1) * 1.1
  const yScale = d3.scaleLinear()
    .domain([Math.max(0, yMin), yMax])
    .range([innerH, 0])
    .nice()

  // Grid lines
  const yTicks = yScale.ticks(4)
  g.selectAll('.grid-line')
    .data(yTicks)
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .attr('stroke', '#1e2030')
    .attr('stroke-width', 1)

  // X axis
  const xAxis = d3.axisBottom(xScale)
    .ticks(Math.min(data.length, 7))
    .tickFormat(d => formatDate((d as Date).toISOString()))
    .tickSize(0)
    .tickPadding(10)

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(xAxis)
    .call(g => g.select('.domain').remove())
    .selectAll('text')
    .attr('fill', '#555')
    .attr('font-size', '11px')
    .attr('font-family', 'inherit')
    .attr('letter-spacing', '0.08em')

  // Y axis
  const yAxis = d3.axisLeft(yScale)
    .ticks(4)
    .tickFormat(d => yFormat(d as number))
    .tickSize(0)
    .tickPadding(8)

  g.append('g')
    .call(yAxis)
    .call(g => g.select('.domain').remove())
    .selectAll('text')
    .attr('fill', '#555')
    .attr('font-size', '11px')
    .attr('font-family', 'inherit')
    .attr('letter-spacing', '0.08em')

  // Line
  const line = d3.line<number>()
    .x((_, i) => xScale(dates[i]))
    .y(d => yScale(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(values)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', line)

  // Area fill (subtle)
  const area = d3.area<number>()
    .x((_, i) => xScale(dates[i]))
    .y0(innerH)
    .y1(d => yScale(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(values)
    .attr('fill', color)
    .attr('fill-opacity', 0.06)
    .attr('d', area)

  // Dots
  g.selectAll('.dot')
    .data(values)
    .enter()
    .append('circle')
    .attr('cx', (_, i) => xScale(dates[i]))
    .attr('cy', d => yScale(d))
    .attr('r', data.length > 20 ? 2 : 3.5)
    .attr('fill', color)
}

function renderCharts() {
  const data = filtered.value
  if (data.length < 2) return

  if (timeChartEl.value) {
    drawChart(
      timeChartEl.value,
      data,
      d => d.totalSeconds,
      '#f5bf36',
      v => formatTime(Math.round(v)),
    )
  }
  if (peopleChartEl.value) {
    drawChart(
      peopleChartEl.value,
      data,
      d => d.activePeople,
      '#4ade80',
      v => String(Math.round(v)),
    )
  }
}

watch([filtered, timeChartEl, peopleChartEl], () => {
  nextTick(renderCharts)
}, { immediate: true })
</script>

<template>
  <div class="history-screen">
    <div class="history-panel">
      <header class="history-header">
        <h1 class="history-title">FLIGHT LOG</h1>
        <button @click="router.push('/')" class="btn btn-ghost">BACK TO TERMINAL</button>
      </header>

      <div v-if="history.length === 0" class="empty-state">
        <p class="info-line">NO FLIGHTS RECORDED</p>
        <p class="info-sub">COMPLETE A STANDUP TO SEE TRENDS</p>
      </div>

      <template v-else>
        <!-- Filter tabs -->
        <div class="filter-row">
          <button
            v-for="f in filters"
            :key="f.key"
            class="filter-btn"
            :class="{ active: activeFilter === f.key }"
            @click="activeFilter = f.key"
          >{{ f.label }}</button>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-label">FLIGHTS</div>
            <div class="stat-value">{{ filtered.length }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">AVG FLIGHT TIME</div>
            <div class="stat-value">{{ avgTime }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">AVG PASSENGERS</div>
            <div class="stat-value">{{ avgPeople }}</div>
          </div>
        </div>

        <!-- Charts -->
        <template v-if="filtered.length >= 2">
          <div class="chart-section">
            <div class="chart-label">FLIGHT TIME</div>
            <div ref="timeChartEl" class="chart-container"></div>
          </div>

          <div class="chart-section">
            <div class="chart-label">ACTIVE PASSENGERS</div>
            <div ref="peopleChartEl" class="chart-container"></div>
          </div>
        </template>

        <div v-else class="chart-placeholder">
          <p class="info-sub">NOT ENOUGH DATA FOR TRENDS IN THIS PERIOD</p>
        </div>

        <!-- History table -->
        <div class="log-table">
          <div class="log-head">
            <span class="log-col log-col-date">DATE</span>
            <span class="log-col log-col-time">TIME</span>
            <span class="log-col log-col-pax">PASSENGERS</span>
          </div>
          <div class="log-divider"></div>
          <div class="log-body">
            <div v-for="(r, i) in [...filtered].reverse()" :key="i" class="log-row">
              <span class="log-col log-col-date">{{ formatDate(r.date) }}</span>
              <span class="log-col log-col-time">{{ formatTime(r.totalSeconds) }}</span>
              <span class="log-col log-col-pax">
                {{ r.activePeople }} / {{ r.totalPeople }}
              </span>
            </div>
          </div>
        </div>

        <div class="clear-section">
          <button @click="clearHistory" class="btn btn-ghost btn-danger">CLEAR FLIGHT LOG</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.history-screen {
  min-height: 100vh;
  padding: 2rem 2.5rem;
}

.history-panel {
  max-width: 800px;
  margin: 0 auto;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #1e2030;
  margin-bottom: 2rem;
}

.history-title {
  font-size: 2rem;
  letter-spacing: 0.25em;
  color: #f5bf36;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 6rem 0;
}

.info-line {
  font-size: 1.6rem;
  color: #6b7280;
  letter-spacing: 0.12em;
  margin: 0;
}

.info-sub {
  font-size: 1rem;
  color: #3f3f46;
  letter-spacing: 0.1em;
  margin-top: 0.8rem;
}

/* Filters */
.filter-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filter-btn {
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  padding: 0.5rem 1.2rem;
  border: 1px solid #1e2030;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  border-color: #3a3a4a;
  color: #999;
}

.filter-btn.active {
  border-color: #f5bf36;
  color: #f5bf36;
  background: rgba(245, 191, 54, 0.05);
}

/* Stats */
.stats-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-box {
  flex: 1;
  background: #0e1018;
  border: 1px solid #1e2030;
  padding: 1.2rem;
  text-align: center;
}

.stat-label {
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  color: #555;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.8rem;
  color: #f5bf36;
  letter-spacing: 0.1em;
}

/* Charts */
.chart-section {
  margin-bottom: 2rem;
}

.chart-label {
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  color: #555;
  margin-bottom: 0.5rem;
}

.chart-container {
  width: 100%;
  background: #0a0b12;
  border: 1px solid #1e2030;
  border-radius: 4px;
  overflow: hidden;
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 0;
}

/* Log table */
.log-table {
  margin-top: 1rem;
}

.log-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  color: #555;
}

.log-divider {
  height: 1px;
  background: #1e2030;
  margin: 0.4rem 0;
}

.log-body {
  max-height: 300px;
  overflow-y: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0.6rem 0.8rem;
  font-size: 1.1rem;
  color: #6b7280;
  border-bottom: 1px solid #111318;
}

.skipped-note {
  color: #3f3f46;
}

.clear-section {
  margin-top: 2rem;
  text-align: center;
}

/* Buttons */
.btn {
  font-family: inherit;
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  padding: 0.9rem 2rem;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost {
  background: transparent;
  border-color: #3a3a4a;
  color: #777;
}

.btn-ghost:hover {
  border-color: #666;
  color: #aaa;
}

.btn-danger {
  border-color: #52252580;
  color: #ef444480;
}

.btn-danger:hover {
  border-color: #ef4444;
  color: #ef4444;
}
</style>
