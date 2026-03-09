import { useState, useCallback, useRef } from 'react'
import { PHONOGRAMS } from '../data/phonograms'
import { useProgress } from '../hooks/useProgress'
import { isMastered, getRulesMode } from '../utils/storage'
import { playAudio } from '../utils/audioPlayer'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Quiz states
const S = {
  IDLE:      'idle',
  QUESTION:  'question',
  REVEALED:  'revealed',
  DONE:      'done',
}

export default function Quiz() {
  const { progress, markResult, stats } = useProgress()
  const [phase, setPhase] = useState(S.IDLE)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [sessionResults, setSessionResults] = useState({ correct: 0, incorrect: 0 })
  const [playing, setPlaying] = useState(false)

  // Prioritize unmastered phonograms, shuffle
  const buildQueue = useCallback((mode) => {
    let pool
    if (mode === 'all') {
      pool = PHONOGRAMS
    } else if (mode === 'struggling') {
      pool = PHONOGRAMS.filter(p => {
        const e = progress[p.id]
        return !e || !isMastered(e)
      })
      if (pool.length === 0) pool = PHONOGRAMS
    } else {
      pool = PHONOGRAMS.filter(p => !progress[p.id] || progress[p.id].attempts === 0)
      if (pool.length === 0) pool = PHONOGRAMS
    }
    return shuffle(pool)
  }, [progress])

  const currentPhonogram = queue[index]

  function startQuiz(mode) {
    const q = buildQueue(mode)
    setQueue(q)
    setIndex(0)
    setSessionResults({ correct: 0, incorrect: 0 })
    setPhase(S.QUESTION)
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
    markResult(currentPhonogram.id, wasCorrect)
    setSessionResults(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
    }))
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
    return (
      <div className="page-scroll flex flex-col">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Quiz</h1>
          <p className="text-slate-500 text-sm mt-1">Choose what to practice</p>
        </div>

        <div className="px-4 flex flex-col gap-3 mt-2">
          <QuizModeCard
            title="All Phonograms"
            description={`Practice all ${stats.total} phonograms in random order`}
            icon="✦"
            color="brand"
            onClick={() => startQuiz('all')}
          />
          <QuizModeCard
            title="Still Learning"
            description={`Focus on the ${stats.total - stats.mastered} phonograms you haven't mastered yet`}
            icon="⟳"
            color="amber"
            onClick={() => startQuiz('struggling')}
          />
          <QuizModeCard
            title="New Only"
            description={`Start fresh with ${stats.notStarted} phonograms you haven't tried`}
            icon="★"
            color="green"
            onClick={() => startQuiz('new')}
          />
        </div>

        {stats.attempted > 0 && (
          <div className="px-4 mt-6">
            <p className="text-xs text-slate-400 text-center">
              {stats.mastered} mastered · {stats.practicing} practicing · {stats.notStarted} not started
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── DONE screen ────────────────────────────────────────────────────────────
  if (phase === S.DONE) {
    const pct = Math.round((sessionResults.correct / queue.length) * 100)
    return (
      <div className="page-scroll flex flex-col items-center justify-center min-h-full px-6 text-center">
        <div className="animate-pop-in">
          <div className="text-7xl mb-4">{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</div>
          <h2 className="text-2xl font-bold text-slate-900">Round Complete!</h2>
          <p className="text-slate-500 mt-1">{queue.length} phonograms reviewed</p>

          <div className="mt-6 flex gap-4 justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{sessionResults.correct}</div>
              <div className="text-xs text-slate-500 mt-1">Got It</div>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">{sessionResults.incorrect}</div>
              <div className="text-xs text-slate-500 mt-1">Keep Practicing</div>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-500">{pct}%</div>
              <div className="text-xs text-slate-500 mt-1">Score</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button className="btn-primary" onClick={() => startQuiz('struggling')}>
              Practice Again
            </button>
            <button className="btn-secondary" onClick={() => setPhase(S.IDLE)}>
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTION / REVEALED ────────────────────────────────────────────────────
  return (
    <div className="page-scroll flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{index + 1} of {queue.length}</span>
          <span>{sessionResults.correct} correct so far</span>
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
            <span className="text-8xl font-bold text-slate-900 font-mono leading-none">
              {currentPhonogram?.symbol}
            </span>

            {phase === S.QUESTION && (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <SoundIcon playing={playing} />
                <span className="text-sm">{playing ? 'Listening...' : 'Tap to hear'}</span>
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
                  <span>Tap to hear again</span>
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
              <span className="text-sm">Keep Practicing</span>
            </button>
            <button
              onClick={() => handleResult(true)}
              className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 font-semibold active:scale-95 transition-transform"
            >
              <span className="text-2xl">✓</span>
              <span className="text-sm">Got It!</span>
            </button>
          </div>
        )}

        {phase === S.QUESTION && (
          <button
            onClick={handleReveal}
            className="btn-primary w-full max-w-sm"
          >
            Show Answer
          </button>
        )}
      </div>
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
