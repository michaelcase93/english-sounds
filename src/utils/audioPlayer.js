// Module-level singleton so only one sound plays at a time across all components.
let current = null

export function playAudio(src, { fallbackSrc, onEnd } = {}) {
  // Stop whatever is currently playing
  if (current) {
    current.onended = null
    current.pause()
    current = null
  }

  const audio = new Audio(src)
  current = audio

  audio.onended = () => {
    current = null
    onEnd?.()
  }

  audio.play().catch(() => {
    current = null
    // If a fallback is provided (e.g. no _rule file exists), play that instead
    if (fallbackSrc) playAudio(fallbackSrc, { onEnd })
  })
}

export function stopCurrent() {
  if (current) {
    current.onended = null
    current.pause()
    current = null
  }
}
