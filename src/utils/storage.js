const PROGRESS_KEY = 'phonogram_progress'
const RULES_MODE_KEY = 'phonogram_rules_mode'

export function getRulesMode() {
  return localStorage.getItem(RULES_MODE_KEY) === 'true'
}

export function setRulesMode(val) {
  localStorage.setItem(RULES_MODE_KEY, val)
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY)
}

// Returns true if a phonogram is considered mastered
// Criteria: >= 5 attempts AND >= 80% accuracy
export function isMastered(entry) {
  if (!entry || entry.attempts < 5) return false
  return entry.correct / entry.attempts >= 0.8
}

// Record a quiz result for one phonogram
export function recordResult(progress, id, wasCorrect) {
  const prev = progress[id] || { attempts: 0, correct: 0, streak: 0, lastPracticed: null }
  return {
    ...progress,
    [id]: {
      attempts: prev.attempts + 1,
      correct: prev.correct + (wasCorrect ? 1 : 0),
      streak: wasCorrect ? prev.streak + 1 : 0,
      lastPracticed: new Date().toISOString().split('T')[0],
    }
  }
}
