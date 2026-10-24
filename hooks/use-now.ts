import { useSyncExternalStore } from "react"

// One shared minute-resolution clock so "3d ago" labels and follow-up flags stay current without per-component timers.
let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((notify) => notify())
    }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  )
}
