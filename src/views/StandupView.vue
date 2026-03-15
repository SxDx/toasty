<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import confetti from 'canvas-confetti'

const router = useRouter()

const people = ref<string[]>([])
const shuffled = ref<string[]>([])
const currentIndex = ref(0)
const started = ref(false)
const finished = ref(false)
const elapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
const transitioning = ref(false)

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
  if (e.key === 'n' && started.value && !finished.value && !transitioning.value) {
    next()
  }
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
  timerInterval = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

function next() {
  if (transitioning.value) return
  if (currentIndex.value >= shuffled.value.length - 1) {
    finishStandup()
    return
  }
  transitioning.value = true
  currentIndex.value++
  setTimeout(() => {
    transitioning.value = false
  }, 500)
  if (currentIndex.value >= shuffled.value.length - 1) {
    finishStandup()
  }
}

function finishStandup() {
  finished.value = true
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  launchConfetti()
}

function launchConfetti() {
  const duration = 4000
  const end = Date.now() + duration

  const colors = ['#ff0a0a', '#ff6b00', '#ffd000', '#00d26a', '#00b4d8', '#2979ff', '#7c4dff', '#ff4081', '#ff1744', '#76ff03']

  function frame() {
    confetti({
      particleCount: 12,
      angle: 70,
      spread: 70,
      origin: { x: 0, y: 1 },
      colors,
    })
    confetti({
      particleCount: 12,
      angle: 110,
      spread: 70,
      origin: { x: 1, y: 1 },
      colors,
    })
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

const formattedTime = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const visiblePeople = computed(() => {
  return shuffled.value.slice(currentIndex.value, currentIndex.value + 3)
})

const isLastPerson = computed(() => currentIndex.value >= shuffled.value.length - 1)
</script>

<template>
  <div class="h-screen bg-zinc-950 text-white flex flex-col">
    <!-- No people state -->
    <div v-if="people.length === 0" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-8">
        <h1 class="text-5xl font-bold tracking-tight">Toasty</h1>
        <p class="text-2xl text-zinc-400">No people added yet</p>
        <button
          @click="router.push('/people')"
          class="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-3xl font-semibold rounded-2xl transition-colors cursor-pointer"
        >
          Add People
        </button>
      </div>
    </div>

    <!-- Ready to start -->
    <div v-else-if="!started" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-8">
        <h1 class="text-5xl font-bold tracking-tight">Toasty</h1>
        <p class="text-2xl text-zinc-400">{{ people.length }} people ready</p>
        <div class="flex gap-4 justify-center">
          <button
            @click="startStandup"
            class="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-3xl font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            Start
          </button>
          <button
            @click="router.push('/people')"
            class="px-10 py-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-3xl font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            Edit People
          </button>
        </div>
      </div>
    </div>

    <!-- Active standup -->
    <template v-else>
      <!-- Timer -->
      <div class="flex justify-end p-8">
        <div class="text-4xl font-mono text-zinc-400 tabular-nums">
          {{ formattedTime }}
        </div>
      </div>

      <!-- Finished state -->
      <div v-if="finished" class="flex-1 flex items-center justify-center -mt-20">
        <div class="text-center space-y-6">
          <div class="text-6xl font-bold text-indigo-400">Done!</div>
          <div class="text-3xl text-zinc-300">
            Finished standup in {{ formattedTime }}
          </div>
        </div>
      </div>

      <!-- Current speaker + upcoming -->
      <div v-else class="flex-1 flex flex-col items-center justify-center -mt-20">
        <TransitionGroup name="names" tag="div" class="flex flex-col items-center gap-4">
          <div
            v-for="(person, i) in visiblePeople"
            :key="person"
            class="name-item whitespace-nowrap"
            :data-position="i"
          >
            {{ person }}
          </div>
        </TransitionGroup>

        <!-- Next button pinned to bottom -->
        <div class="absolute bottom-12">
          <button
            @click="next"
            class="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-3xl font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            {{ isLastPerson ? 'Finish' : 'Next' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.name-item {
  transition: all 0.45s ease;
  text-align: center;
}

.name-item[data-position="0"] {
  font-size: 4.5rem;
  line-height: 1.1;
  font-weight: 700;
  color: white;
}

.name-item[data-position="1"] {
  font-size: 2rem;
  line-height: 1.2;
  font-weight: 600;
  color: #a1a1aa;
}

.name-item[data-position="2"] {
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 500;
  color: #52525b;
}

/* FLIP move transition */
.names-move {
  transition: all 0.45s ease;
}

/* Entering from bottom */
.names-enter-active {
  transition: all 0.45s ease;
}

.names-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

/* Leaving out the top */
.names-leave-active {
  transition: all 0.45s ease;
  position: absolute;
}

.names-leave-to {
  opacity: 0;
  transform: translateY(-40px);
}
</style>
