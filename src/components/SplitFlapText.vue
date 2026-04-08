<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  animateIn?: boolean
}>(), {
  animateIn: false
})

const FLIP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const chars = ref<string[]>([])
const timers: ReturnType<typeof setTimeout>[] = []

function cleanup() {
  timers.forEach(t => clearTimeout(t))
  timers.length = 0
}

function setImmediate(text: string) {
  chars.value = text.toUpperCase().split('')
}

function flipTo(newText: string) {
  cleanup()
  const target = newText.toUpperCase().split('')

  // Extend if needed
  while (chars.value.length < target.length) {
    chars.value.push(' ')
  }

  for (let i = 0; i < target.length; i++) {
    if (chars.value[i] === target[i]) continue

    const flips = 3 + Math.floor(Math.random() * 4)
    const delay = i * 22

    // Schedule random intermediate characters
    for (let f = 0; f < flips; f++) {
      const t = setTimeout(() => {
        chars.value[i] = FLIP_CHARS[Math.floor(Math.random() * FLIP_CHARS.length)]
      }, delay + f * 32)
      timers.push(t)
    }

    // Schedule landing on target character
    const t = setTimeout(() => {
      chars.value[i] = target[i]
    }, delay + flips * 32)
    timers.push(t)
  }

  // Trim excess chars after animation completes
  if (target.length < chars.value.length) {
    const maxDelay = Math.max(target.length, chars.value.length) * 22 + 7 * 32 + 50
    const t = setTimeout(() => {
      chars.value.splice(target.length)
    }, maxDelay)
    timers.push(t)
  }
}

onMounted(() => {
  if (props.animateIn) {
    // Start blank, then flip to target
    chars.value = new Array(props.text.length).fill(' ')
    flipTo(props.text)
  } else {
    setImmediate(props.text)
  }
})

onUnmounted(cleanup)

watch(() => props.text, (val) => {
  flipTo(val)
})
</script>

<template>
  <span class="sf-text">
    <span
      v-for="(c, i) in chars"
      :key="i"
      class="sf-char"
    >{{ c === ' ' ? '\u00A0' : c }}</span>
  </span>
</template>

<style scoped>
.sf-text {
  display: inline-flex;
  gap: 1px;
}

.sf-char {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0.65em;
  padding: 0.08em 0.04em;
  background: #141820;
  border-radius: 2px;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
}

.sf-char::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 49%;
  height: 1px;
  background: rgba(0,0,0,0.3);
  pointer-events: none;
}
</style>
