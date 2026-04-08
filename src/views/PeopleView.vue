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
  <div class="check-in-screen">
    <div class="check-in-panel">
      <h1 class="check-in-title">PASSENGER CHECK-IN</h1>
      <p class="check-in-info">ENTER ONE PASSENGER PER LINE</p>
      <textarea
        v-model="text"
        rows="12"
        class="check-in-input"
        placeholder="ALICE&#10;BOB&#10;CHARLIE"
        autofocus
      />
      <div class="check-in-actions">
        <button @click="save" class="btn btn-primary">CONFIRM CHECK-IN</button>
        <button @click="router.push('/')" class="btn btn-ghost">CANCEL</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.check-in-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.check-in-panel {
  width: 100%;
  max-width: 700px;
}

.check-in-title {
  font-size: 2.2rem;
  letter-spacing: 0.25em;
  color: #f5bf36;
  margin: 0 0 0.5rem;
}

.check-in-info {
  font-size: 1rem;
  color: #555;
  letter-spacing: 0.15em;
  margin: 0 0 2rem;
}

.check-in-input {
  width: 100%;
  box-sizing: border-box;
  background: #0e1018;
  border: 1px solid #1e2030;
  border-radius: 4px;
  color: #f5bf36;
  font-family: inherit;
  font-size: 1.2rem;
  padding: 1.5rem;
  resize: none;
  outline: none;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.check-in-input:focus {
  border-color: #f5bf36;
}

.check-in-input::placeholder {
  color: #2a2a3a;
}

.check-in-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

/* ── Buttons ── */
.btn {
  font-family: inherit;
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  padding: 0.9rem 2rem;
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
</style>
