import { useState, useRef, useCallback } from 'react'
import { isMastered } from '../utils/storage'

export default function PhonogramCard({ phonogram, entry, compact = false }) {
  const [playing, setPlaying] = useState(false)
  const [tapped, setTapped] = useState(false)
  const audioRef = useRef(null)

  const handleTap = useCallback(() => {
    // Visual feedback
    setTapped(true)
    setTimeout(() => setTapped(false), 300)

    // Play audio
    const src = `/audio/${phonogram.id}.mp3`
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
    }
    audioRef.current.currentTime = 0
    setPlaying(true)
    audioRef.current.play().catch(() => {
      // Audio file not yet added — silent fail in dev
    })
    audioRef.current.onended = () => setPlaying(false)
  }, [phonogram.id])

  const mastered = entry ? isMastered(entry) : false
  const attempted = entry && entry.attempts > 0

  if (compact) {
    return (
      <button
        onClick={handleTap}
        className={`card-base flex flex-col items-center justify-center p-4 gap-1 w-full
          ${tapped ? 'scale-95 shadow-md' : ''}
          ${mastered ? 'border-green-200 bg-green-50' : ''}
        `}
        aria-label={`Play phonogram ${phonogram.symbol}`}
      >
        <span className="text-3xl font-bold text-slate-800 font-mono leading-none">
          {phonogram.symbol}
        </span>
        {mastered && (
          <span className="text-green-500 text-xs">✓</span>
        )}
        {playing && <SoundWave />}
      </button>
    )
  }

  return (
    <button
      onClick={handleTap}
      className={`card-base w-full flex flex-col items-start gap-3 p-5 relative overflow-hidden
        ${tapped ? 'animate-card-tap' : ''}
        ${mastered ? 'border-green-200' : ''}
      `}
      aria-label={`Play phonogram ${phonogram.symbol}`}
    >
      {/* Status badge */}
      {mastered && (
        <span className="badge bg-green-100 text-green-700 absolute top-4 right-4">
          Mastered
        </span>
      )}
      {!mastered && attempted && (
        <span className="badge bg-amber-100 text-amber-700 absolute top-4 right-4">
          Practicing
        </span>
      )}

      {/* Phonogram number */}
      <span className="text-xs font-medium text-slate-400">#{phonogram.number}</span>

      {/* Symbol — large and prominent */}
      <div className="flex items-end gap-3">
        <span className="text-6xl font-bold text-slate-900 font-mono leading-none">
          {phonogram.symbol}
        </span>
        {playing && <SoundWave />}
      </div>

      {/* Sounds */}
      <div className="flex flex-wrap gap-1.5">
        {phonogram.sounds.map((sound, i) => (
          <span key={i} className="badge bg-brand-50 text-brand-700 text-sm font-mono">
            {sound}
          </span>
        ))}
      </div>

      {/* Examples */}
      <p className="text-sm text-slate-500">
        {phonogram.examples.join(', ')}
      </p>

      {/* Teaching note */}
      {phonogram.notes && (
        <p className="text-xs text-slate-400 italic leading-snug">
          {phonogram.notes}
        </p>
      )}

      {/* Progress pip */}
      {entry && (
        <div className="w-full mt-1">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${mastered ? 'bg-green-400' : 'bg-brand-400'}`}
              style={{ width: `${Math.min(100, (entry.correct / Math.max(entry.attempts, 1)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {entry.correct}/{entry.attempts} correct
          </p>
        </div>
      )}

      {/* Tap hint for first-time users */}
      {!attempted && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.029 5.66 4.75 6.718V18.5h-1a.75.75 0 000 1.5h4a.75.75 0 000-1.5h-1v-1.782A6.978 6.978 0 0016 10v-.357a.75.75 0 00-1.5 0V10a5.5 5.5 0 01-9 0v-.357z" />
          </svg>
          Tap to hear
        </div>
      )}
    </button>
  )
}

function SoundWave() {
  return (
    <div className="flex items-end gap-0.5 h-8 mb-1" aria-hidden="true">
      {[1, 2, 3, 2, 1].map((h, i) => (
        <div
          key={i}
          className="w-1 bg-brand-400 rounded-full"
          style={{
            height: `${h * 8}px`,
            animation: `bounce 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
