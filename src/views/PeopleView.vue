<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const text = ref('')

onMounted(() => {
  const stored = localStorage.getItem('standup-people')
  if (stored) {
    text.value = JSON.parse(stored).join('\n')
  }
})

function save() {
  const people = text.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  localStorage.setItem('standup-people', JSON.stringify(people))
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
    <div class="w-full max-w-2xl space-y-8">
      <h1 class="text-4xl font-bold tracking-tight">People</h1>
      <p class="text-xl text-zinc-400">One person per line</p>
      <textarea
        v-model="text"
        rows="12"
        class="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-2xl p-6 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        placeholder="Alice&#10;Bob&#10;Charlie"
        autofocus
      />
      <div class="flex gap-4">
        <button
          @click="save"
          class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Save & Start
        </button>
        <button
          @click="router.push('/')"
          class="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-2xl font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
