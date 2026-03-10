import { useState, useCallback, useMemo, useEffect } from 'react'
import { PHONOGRAMS, GROUPS } from '../data/phonograms'
import { useProgress } from '../hooks/useProgress'
import { isMastered, getRulesMode } from '../utils/storage'
import { playAudio, stopCurrent } from '../utils/audioPlayer'
import { useLanguage } from '../contexts/LanguageContext'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Lower score = higher priority (worst accuracy + least recently practiced)
function priorityScore(p, progress) {
  const e = progress[p.id]
  if (!e || e.attempts === 0) return -30 + Math.random() * 5
  const acc = e.correct / e.attempts
  const daysSince = e.lastPracticed
    ? (Date.now() - new Date(e.lastPracticed)) / 86400000
    : 999
  return acc * 100 - Math.min(daysSince, 30) + Math.random() * 5
}

// Quiz states
const S = {
  IDLE:      'idle',
  QUESTION:  'question',
  REVEALED:  'revealed',
  DONE:      'done',
}

function playGotItSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {}
}

function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.start(t)
      osc.stop(t + 0.3)
    })
  } catch (e) {}
}

export default function Quiz() {
  const { progress, markResult, dailyStreak } = useProgress()
  const { t } = useLanguage()
  const [phase, setPhase] = useState(S.IDLE)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [sessionResults, setSessionResults] = useState({ correct: 0, incorrect: 0, wrongIds: [] })
  const [playing, setPlaying] = useState(false)
  const [streak, setStreak] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [openTip, setOpenTip] = useState(null)

  // Stats scoped to the selected group
  const groupPhonograms = selectedGroup === 'all'
    ? PHONOGRAMS
    : PHONOGRAMS.filter(p => p.group === selectedGroup)

  const groupStats = {
    total:      groupPhonograms.length,
    mastered:   groupPhonograms.filter(p => isMastered(progress[p.id])).length,
    practicing: groupPhonograms.filter(p => progress[p.id]?.attempts > 0 && !isMastered(progress[p.id])).length,
    notStarted: groupPhonograms.filter(p => !progress[p.id] || progress[p.id].attempts === 0).length,
    attempted:  groupPhonograms.filter(p => progress[p.id]?.attempts > 0).length,
  }

  const buildQueue = useCallback((mode) => {
    const base = selectedGroup === 'all'
      ? PHONOGRAMS
      : PHONOGRAMS.filter(p => p.group === selectedGroup)
    let pool
    if (mode === 'all') {
      pool = shuffle(base)
    } else if (mode === 'struggling') {
      pool = base.filter(p => {
        const e = progress[p.id]
        return !e || !isMastered(e)
      })
      if (pool.length === 0) pool = base
      // SRS: sort by priority score (lowest = highest priority)
      pool = [...pool].sort((a, b) => priorityScore(a, progress) - priorityScore(b, progress))
    } else {
      pool = shuffle(base.filter(p => !progress[p.id] || progress[p.id].attempts === 0))
      if (pool.length === 0) pool = shuffle(base)
    }
    return pool
  }, [progress, selectedGroup])

  const currentPhonogram = queue[index]

  function startQuiz(mode) {
    const q = buildQueue(mode)
    setQueue(q)
    setIndex(0)
    setSessionResults({ correct: 0, incorrect: 0, wrongIds: [] })
    setStreak(0)
    setPlaying(false)
    setPhase(S.QUESTION)
  }

  function goToMenu() {
    stopCurrent()
    setPlaying(false)
    setPhase(S.IDLE)
  }

  function handlePlayAudio() {
    if (!currentPhonogram) return
    const rulesMode = getRulesMode()
    const primarySrc = rulesMode
      ? `/audio/${currentPhonogram.id}_rule.wav`
      : `/audio/${currentPhonogram.id}.wav`
    const fallbackSrc = `/audio/${currentPhonogram.id}.wav`

    setPlaying(true)
    playAudio(primarySrc, {
      fallbackSrc: rulesMode ? fallbackSrc : undefined,
      onEnd: () => setPlaying(false),
    })
  }

  function handleReveal() {
    handlePlayAudio()
    setPhase(S.REVEALED)
  }

  function handleResult(wasCorrect) {
    stopCurrent()
    setPlaying(false)

    markResult(currentPhonogram.id, wasCorrect)
    setSessionResults(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
      wrongIds: wasCorrect ? prev.wrongIds : [...prev.wrongIds, currentPhonogram.id],
    }))

    const newStreak = wasCorrect ? streak + 1 : 0
    setStreak(newStreak)

    if (wasCorrect) {
      playGotItSound()
      if (newStreak > 0 && newStreak % 5 === 0) {
        playCelebrationSound()
        setShowCelebration(true)
      }
    }

    const next = index + 1
    if (next >= queue.length) {
      setPhase(S.DONE)
    } else {
      setIndex(next)
      setPhase(S.QUESTION)
    }
  }

  // ── IDLE screen ────────────────────────────────────────────────────────────
  if (phase === S.IDLE) {
    const groupTabs = [{ id: 'all', label: t('tab_all') }, ...GROUPS.map(g => ({ id: g.id, label: t(g.id) }))]
    return (
      <div className="page-scroll flex flex-col">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{t('quiz_title')}</h1>
            {dailyStreak > 0 && (
              <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                <span>🔥</span>
                <span>{t('streak_days', dailyStreak)}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{t('quiz_subtitle')}</p>
        </div>

        {/* Group tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 px-2 scrollbar-none" style={{ touchAction: 'pan-x' }}>
          {groupTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedGroup(tab.id)}
              className={`
                flex-shrink-0 px-3 py-3 text-sm font-semibold tracking-tight transition-colors
                border-b-2 -mb-px whitespace-nowrap
                ${selectedGroup === tab.id
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-4 flex flex-col gap-3 mt-4">
          <QuizModeCard
            title={t('mode_all_title')}
            description={t('mode_all_desc', groupStats.total)}
            icon="✦"
            color="brand"
            onClick={() => startQuiz('all')}
          />
          <QuizModeCard
            title={t('mode_struggling_title')}
            description={t('mode_struggling_desc', groupStats.total - groupStats.mastered)}
            icon="⟳"
            color="amber"
            onClick={() => startQuiz('struggling')}
          />
          <QuizModeCard
            title={t('mode_new_title')}
            description={t('mode_new_desc', groupStats.notStarted)}
            icon="★"
            color="green"
            onClick={() => startQuiz('new')}
          />
        </div>

        <div className="px-4 mt-6 flex justify-around text-center">
          {[
            { key: 'mastered',   count: groupStats.mastered,   label: t('stat_mastered'),   tip: t('tip_mastered') },
            { key: 'practicing', count: groupStats.practicing, label: t('stat_practicing'), tip: t('tip_practicing') },
            { key: 'notStarted', count: groupStats.notStarted, label: t('stat_not_started'), tip: t('tip_not_started') },
          ].map(({ key, count, label, tip }) => (
            <div key={key} className="relative">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-xs text-slate-500">{label}</span>
                <button
                  onClick={() => setOpenTip(openTip === key ? null : key)}
                  className="text-slate-300 active:text-slate-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {openTip === key && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 w-44 z-20 shadow-lg leading-relaxed">
                  {tip}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-1.5 overflow-hidden">
                    <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── DONE screen ────────────────────────────────────────────────────────────
  if (phase === S.DONE) {
    const pct = Math.round((sessionResults.correct / queue.length) * 100)
    const wrongPhonograms = PHONOGRAMS.filter(p => sessionResults.wrongIds.includes(p.id))
    return (
      <>
        {showCelebration && <StreakCelebration onDismiss={() => setShowCelebration(false)} />}
        <div className="page-scroll flex flex-col items-center justify-center min-h-full px-6 text-center">
          <div className="animate-pop-in w-full max-w-xs mx-auto">
            <div className="text-7xl mb-4">{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</div>
            <h2 className="text-2xl font-bold text-slate-900">{t('round_complete')}</h2>
            <p className="text-slate-500 mt-1">{t('phonograms_reviewed', queue.length)}</p>

            <div className="mt-6 flex gap-4 justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{sessionResults.correct}</div>
                <div className="text-xs text-slate-500 mt-1">{t('got_it')}</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">{sessionResults.incorrect}</div>
                <div className="text-xs text-slate-500 mt-1">{t('keep_practicing')}</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-500">{pct}%</div>
                <div className="text-xs text-slate-500 mt-1">Score</div>
              </div>
            </div>

            {wrongPhonograms.length > 0 && (
              <div className="mt-6 text-left">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('review_label')}</p>
                <div className="flex flex-wrap gap-2">
                  {wrongPhonograms.map(p => (
                    <div
                      key={p.id}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-amber-200 bg-amber-50 font-bold text-amber-700 text-sm"
                    >
                      {p.symbol}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 w-full">
              <button className="btn-primary" onClick={() => startQuiz('struggling')}>
                {t('practice_again')}
              </button>
              <button className="btn-secondary" onClick={() => setPhase(S.IDLE)}>
                {t('back')}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── QUESTION / REVEALED ────────────────────────────────────────────────────
  return (
    <>
      {showCelebration && <StreakCelebration onDismiss={() => setShowCelebration(false)} />}
      <div className="page-scroll flex flex-col">
        {/* Back button + Progress bar */}
        <div className="px-4 pt-12 pb-4">
          <button
            onClick={goToMenu}
            className="flex items-center gap-1 text-sm text-slate-400 mb-3 -ml-1 active:opacity-60 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            <span>{t('back')}</span>
          </button>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{t('of_label', index + 1, queue.length)}</span>
            <span>{t('correct_so_far', sessionResults.correct)}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${((index) / queue.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-full max-w-sm">
            <button
              onClick={phase === S.QUESTION ? handleReveal : handlePlayAudio}
              className={`card-base w-full flex flex-col items-center justify-center py-16 gap-4 relative overflow-hidden
                ${playing ? 'border-brand-300 shadow-md shadow-brand-100' : ''}
              `}
            >
              {/* Symbol */}
              <span className="text-8xl font-bold text-slate-900 leading-none">
                {currentPhonogram?.symbol}
              </span>

              {phase === S.QUESTION && (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <SoundIcon playing={false} />
                  <span className="text-sm">{t('tap_to_hear')}</span>
                </div>
              )}

              {phase === S.REVEALED && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {currentPhonogram?.sounds.map((s, i) => (
                      <span key={i} className="badge bg-brand-50 text-brand-700 text-base font-mono px-3 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 text-center">
                    {currentPhonogram?.examples.join(', ')}
                  </p>
                  {currentPhonogram?.notes && (
                    <p className="text-xs text-slate-400 italic text-center px-4">
                      {currentPhonogram.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <SoundIcon playing={playing} small />
                    <span>{t('tap_to_hear_again')}</span>
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Action buttons — only show after reveal */}
          {phase === S.REVEALED && (
            <div className="w-full max-w-sm flex gap-3 animate-slide-up">
              <button
                onClick={() => handleResult(false)}
                className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold active:scale-95 transition-transform"
              >
                <span className="text-2xl">🔁</span>
                <span className="text-sm">{t('keep_practicing')}</span>
              </button>
              <button
                onClick={() => handleResult(true)}
                className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 font-semibold active:scale-95 transition-transform"
              >
                <span className="text-2xl">✓</span>
                <span className="text-sm">{t('got_it')}</span>
              </button>
            </div>
          )}

          {phase === S.QUESTION && (
            <button
              onClick={handleReveal}
              className="btn-primary w-full max-w-sm"
            >
              {t('show_answer')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function StreakCelebration({ onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDismiss}
    >
      <Confetti />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-pop-in mx-4">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-xl font-bold text-slate-900">Great job!</h2>
        <p className="text-slate-600 mt-1 text-lg font-semibold">5 in a row!</p>
      </div>
    </div>
  )
}

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.5}s`,
      duration: `${0.9 + Math.random() * 1}s`,
      color: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4'][i % 7],
      size: `${6 + Math.floor(Math.random() * 10)}px`,
    })),
  [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationName: 'confetti-fall',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  )
}

function QuizModeCard({ title, description, icon, color, onClick }) {
  const colors = {
    brand: 'bg-brand-50 border-brand-100 text-brand-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    green: 'bg-green-50 border-green-100 text-green-600',
  }
  return (
    <button
      onClick={onClick}
      className="card-base flex items-center gap-4 p-5 text-left w-full"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-sm text-slate-500 mt-0.5">{description}</div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className="w-5 h-5 text-slate-300 ml-auto flex-shrink-0">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

function SoundIcon({ playing, small }) {
  const cls = small ? 'w-4 h-4' : 'w-6 h-6'
  return playing ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${cls} text-brand-500 animate-pulse`}>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${cls} text-slate-400`}>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
    </svg>
  )
}
