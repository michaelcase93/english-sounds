import { useState, useCallback } from 'react'
import { loadProgress, saveProgress, clearProgress, recordResult, isMastered } from '../utils/storage'
import { PHONOGRAMS } from '../data/phonograms'

export function useProgress() {
  const [progress, setProgress] = useState(() => loadProgress())

  const markResult = useCallback((id, wasCorrect) => {
    setProgress(prev => {
      const next = recordResult(prev, id, wasCorrect)
      saveProgress(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    clearProgress()
    setProgress({})
  }, [])

  const stats = {
    total: PHONOGRAMS.length,
    attempted: Object.keys(progress).length,
    mastered: Object.entries(progress).filter(([, v]) => isMastered(v)).length,
    practicing: Object.entries(progress).filter(([, v]) => !isMastered(v) && v.attempts > 0).length,
    notStarted: PHONOGRAMS.length - Object.keys(progress).length,
  }

  const getEntry = useCallback((id) => progress[id] || null, [progress])

  return { progress, markResult, reset, stats, getEntry, isMastered }
}
