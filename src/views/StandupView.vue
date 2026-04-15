<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import SplitFlapText from '../components/SplitFlapText.vue'

const router = useRouter()

const people = ref<string[]>([])
const shuffled = ref<string[]>([])
const currentIndex = ref(0)
const started = ref(false)
const finished = ref(false)
const elapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
const transitioning = ref(false)
const skipped = ref(new Set<number>())

onMounted(() => {
  const stored = localStorage.getItem('standup-people')
  if (stored) {
    people.value = JSON.parse(stored)
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if (!started.value || finished.value || transitioning.value) return
  if (e.key === 'n') next()
  if (e.key === 's') skip()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function startStandup() {
  shuffled.value = shuffle(people.value)
  currentIndex.value = 0
  started.value = true
  finished.value = false
  elapsedSeconds.value = 0
  skipped.value = new Set()
  timerInterval = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

function findNextActive(fromIndex: number): number {
  for (let i = fromIndex + 1; i < shuffled.value.length; i++) {
    if (!skipped.value.has(i)) return i
  }
  return -1
}

function next() {
  if (transitioning.value) return
  const nextIdx = findNextActive(currentIndex.value)
  if (nextIdx === -1) {
    finishStandup()
    return
  }
  transitioning.value = true
  currentIndex.value = nextIdx
  setTimeout(() => {
    transitioning.value = false
  }, 500)
}

function skip() {
  if (transitioning.value) return
  skipped.value.add(currentIndex.value)
  skipped.value = new Set(skipped.value) // trigger reactivity
  const nextIdx = findNextActive(currentIndex.value)
  if (nextIdx === -1) {
    finishStandup()
    return
  }
  transitioning.value = true
  currentIndex.value = nextIdx
  setTimeout(() => {
    transitioning.value = false
  }, 500)
}

function finishStandup() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  finished.value = true
  saveHistory()
}

function saveHistory() {
  const record = {
    date: new Date().toISOString(),
    totalSeconds: elapsedSeconds.value,
    totalPeople: shuffled.value.length,
    activePeople: shuffled.value.length - skipped.value.size,
  }
  const stored = localStorage.getItem('standup-history')
  const history = stored ? JSON.parse(stored) : []
  history.push(record)
  if (history.length > 100) history.splice(0, history.length - 100)
  localStorage.setItem('standup-history', JSON.stringify(history))
}

function reset() {
  started.value = false
  finished.value = false
  currentIndex.value = 0
  shuffled.value = []
  elapsedSeconds.value = 0
  skipped.value = new Set()
}

const formattedTime = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const activeCount = computed(() => shuffled.value.length - skipped.value.size)

const currentActiveIndex = computed(() => {
  let count = 0
  for (let i = 0; i < shuffled.value.length; i++) {
    if (skipped.value.has(i)) continue
    count++
    if (i === currentIndex.value) return count
  }
  return count
})

const progressText = computed(() => {
  return `FLIGHT ${currentActiveIndex.value} OF ${activeCount.value}`
})

function gateLabel(index: number): string {
  return `A${String(index + 1).padStart(2, '0')}`
}

function statusOf(index: number): string {
  if (skipped.value.has(index)) return 'CANCELLED'
  if (finished.value) return 'LANDED'
  if (index < currentIndex.value) return 'LANDED'
  if (index === currentIndex.value) return 'DEPARTING'
  const nextIdx = findNextActive(currentIndex.value)
  if (index === nextIdx) return 'BOARDING'
  return 'SCHEDULED'
}

function rowClass(index: number): string {
  return `row-${statusOf(index).toLowerCase()}`
}

const isLastPerson = computed(() => findNextActive(currentIndex.value) === -1)
</script>

<template>
  <div class="board-screen">

    <!-- No people -->
    <div v-if="people.length === 0" class="center-panel">
      <div class="title-block">
        <h1 class="terminal-name">STANDUP TERMINAL</h1>
        <div class="terminal-sub">DEPARTURES</div>
      </div>
      <p class="info-line">NO FLIGHTS SCHEDULED</p>
      <button @click="router.push('/people')" class="btn btn-primary">
        CHECK IN PASSENGERS
      </button>
    </div>

    <!-- Ready to start -->
    <div v-else-if="!started" class="center-panel">
      <div class="title-block">
        <h1 class="terminal-name">STANDUP TERMINAL</h1>
        <div class="terminal-sub">DEPARTURES</div>
      </div>
      <p class="info-line">
        <SplitFlapText :text="`${people.length} PASSENGERS CHECKED IN`" />
      </p>
      <div class="btn-row">
        <button @click="startStandup" class="btn btn-primary">BEGIN BOARDING</button>
        <button @click="router.push('/people')" class="btn btn-ghost">EDIT PASSENGERS</button>
        <button @click="router.push('/history')" class="btn btn-ghost">FLIGHT LOG</button>
      </div>
    </div>

    <!-- Active standup -->
    <div v-else class="board-layout">

      <!-- Header bar -->
      <header class="board-header">
        <span class="header-left">STANDUP TERMINAL</span>
        <span class="header-center">DEPARTURES</span>
        <span class="header-right">
          <span class="header-progress">
            <SplitFlapText v-if="!finished" :text="progressText" />
            <SplitFlapText v-else text="COMPLETE" />
          </span>
          <span class="header-clock">
            <SplitFlapText :text="formattedTime" />
          </span>
        </span>
      </header>

      <!-- Finished message -->
      <div v-if="finished" class="finish-panel">
        <div class="finish-icon">✈</div>
        <div class="finish-title">
          <SplitFlapText text="ALL FLIGHTS LANDED" animate-in />
        </div>
        <div class="finish-time">TOTAL FLIGHT TIME&ensp;{{ formattedTime }}</div>
      </div>

      <!-- Departure table -->
      <div v-if="!finished" class="table-wrap">
        <div class="table-head">
          <span class="col col-gate">GATE</span>
          <span class="col col-name">PASSENGER</span>
          <span class="col col-status">STATUS</span>
        </div>
        <div class="table-divider"></div>
        <div class="table-body">
          <div
            v-for="(person, i) in shuffled"
            :key="person"
            class="table-row"
            :class="rowClass(i)"
          >
            <span class="col col-gate">{{ gateLabel(i) }}</span>
            <span class="col col-name">{{ person.toUpperCase() }}</span>
            <span class="col col-status status-cell">
              <span v-if="statusOf(i) === 'DEPARTING'" class="plane-icon">✈</span>
              <SplitFlapText :text="statusOf(i)" />
            </span>
          </div>
        </div>
      </div>

      <!-- Bottom action -->
      <footer class="board-footer">
        <div v-if="!finished" class="btn-row">
          <button @click="next" class="btn btn-primary">
            {{ isLastPerson ? 'FINAL LANDING' : 'NEXT FLIGHT' }} <span class="key-hint">[N]</span>
          </button>
          <button @click="skip" class="btn btn-ghost btn-skip">
            CANCEL FLIGHT <span class="key-hint">[S]</span>
          </button>
        </div>
        <div v-if="finished" class="btn-row">
          <button @click="reset" class="btn btn-primary">
            NEW FLIGHT PLAN
          </button>
          <button @click="router.push('/history')" class="btn btn-ghost">
            VIEW FLIGHT LOG
          </button>
        </div>
      </footer>
    </div>

    <!-- Scanline overlay -->
    <div class="scanlines"></div>
  </div>
</template>

<style scoped>
/* ── Screen ── */
.board-screen {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Subtle CRT scanline overlay */
.scanlines {
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 3px,
    rgba(0,0,0,0.035) 3px,
    rgba(0,0,0,0.035) 4px
  );
  pointer-events: none;
  z-index: 1000;
}

/* ── Center panels (no-people, ready) ── */
.center-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
}

.title-block {
  text-align: center;
}

.terminal-name {
  font-size: 4rem;
  letter-spacing: 0.3em;
  color: #f5bf36;
  margin: 0;
}

.terminal-sub {
  font-size: 2rem;
  letter-spacing: 0.4em;
  color: #6b7280;
  margin-top: 0.5rem;
}

.info-line {
  font-size: 1.6rem;
  color: #6b7280;
  letter-spacing: 0.12em;
  margin: 0;
}

.btn-row {
  display: flex;
  gap: 1.2rem;
}

/* ── Buttons ── */
.btn {
  font-family: inherit;
  font-size: 1.4rem;
  letter-spacing: 0.15em;
  padding: 1rem 2.5rem;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background: #f5bf36;
  color: #08090f;
  border-color: #f5bf36;
}

.btn-primary:hover {
  background: #ffd95c;
  border-color: #ffd95c;
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

/* ── Board layout (active standup) ── */
.board-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.2rem 2.5rem;
}

/* ── Header ── */
.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0 1.2rem;
  border-bottom: 2px solid #1e2030;
  flex-shrink: 0;
}

.header-left {
  font-size: 1.2rem;
  letter-spacing: 0.2em;
  color: #555;
}

.header-center {
  font-size: 2rem;
  letter-spacing: 0.35em;
  color: #f5bf36;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.header-progress {
  font-size: 1.1rem;
  color: #6b7280;
}

.header-clock {
  font-size: 2rem;
  color: #f5bf36;
}

/* ── Finish panel ── */
.finish-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.finish-icon {
  font-size: 5rem;
  animation: landed-bounce 0.6s ease-out;
}

@keyframes landed-bounce {
  0% { transform: translateY(-40px) rotate(-15deg); opacity: 0; }
  60% { transform: translateY(5px) rotate(2deg); opacity: 1; }
  100% { transform: translateY(0) rotate(0); }
}

.finish-title {
  font-size: 3.5rem;
  letter-spacing: 0.2em;
  color: #4ade80;
}

.finish-time {
  font-size: 1.8rem;
  color: #6b7280;
  letter-spacing: 0.12em;
}

/* ── Table ── */
.table-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 1rem;
}

.table-head {
  display: grid;
  grid-template-columns: 100px 1fr 260px;
  padding: 0.5rem 1.2rem;
  font-size: 1.1rem;
  letter-spacing: 0.2em;
  color: #555;
  flex-shrink: 0;
}

.table-divider {
  height: 1px;
  background: #1e2030;
  margin: 0.4rem 0;
  flex-shrink: 0;
}

.table-body {
  flex: 1;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 100px 1fr 260px;
  padding: 0.7rem 1.2rem;
  font-size: 1.5rem;
  border-bottom: 1px solid #111318;
  transition: background 0.3s ease;
  align-items: center;
}

/* ── Row status styles ── */
.row-landed {
  color: #52525b;
}

.row-departing {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
  border-left: 4px solid #4ade80;
  margin-left: -4px;
}

.row-boarding {
  color: #fbbf24;
}

.row-scheduled {
  color: #3f3f46;
}

.row-cancelled {
  color: #ef4444;
  opacity: 0.4;
  text-decoration: line-through;
}

/* ── Status cell ── */
.status-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.plane-icon {
  display: inline-block;
  animation: plane-bob 1.5s ease-in-out infinite;
  font-size: 1.2em;
}

@keyframes plane-bob {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
}

/* ── Key hints ── */
.key-hint {
  font-size: 0.75em;
  opacity: 0.5;
  margin-left: 0.3em;
}

.btn-skip {
  border-color: #52252580;
  color: #ef444480;
}

.btn-skip:hover {
  border-color: #ef4444;
  color: #ef4444;
}

/* ── Footer ── */
.board-footer {
  padding: 1.5rem 0;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
</style>
