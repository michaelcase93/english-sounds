import { useState, useRef, useEffect } from 'react'
import { PHONOGRAMS, GROUPS } from '../../data/phonograms'

// ── WAV encoder (same as AudioTrim) ──────────────────────────────────────────

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function encodeWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const samples = (() => {
    const ch = numChannels
    const len = audioBuffer.length * ch
    const result = new Float32Array(len)
    let idx = 0
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let c = 0; c < ch; c++) result[idx++] = audioBuffer.getChannelData(c)[i]
    }
    return result
  })()
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }
  return buffer
}

// ── Auto-trim silence ─────────────────────────────────────────────────────────
// Scans from both ends for the first sample above threshold.
// Adds a small pad so the sound doesn't get cut too tight.

function trimSilence(audioBuffer, threshold = 0.02, padSec = 0.05) {
  const sr = audioBuffer.sampleRate
  const data = audioBuffer.getChannelData(0)
  const len = data.length
  const pad = Math.floor(padSec * sr)

  let start = 0
  for (let i = 0; i < len; i++) {
    if (Math.abs(data[i]) >= threshold) { start = Math.max(0, i - pad); break }
  }

  let end = len
  for (let i = len - 1; i >= 0; i--) {
    if (Math.abs(data[i]) >= threshold) { end = Math.min(len, i + pad); break }
  }

  if (end <= start) return audioBuffer // nothing found — return as-is

  const trimmed = new AudioContext().createBuffer(
    audioBuffer.numberOfChannels,
    end - start,
    sr
  )
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    trimmed.getChannelData(c).set(audioBuffer.getChannelData(c).slice(start, end))
  }
  return trimmed
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const RECORDED_KEY = 'admin_recorded'

function loadRecorded() {
  try { return JSON.parse(localStorage.getItem(RECORDED_KEY) || '{}') } catch { return {} }
}

function saveRecorded(recorded) {
  localStorage.setItem(RECORDED_KEY, JSON.stringify(recorded))
}

// ── Status dot ────────────────────────────────────────────────────────────────

function statusColor(recorded, id) {
  const hasSound = recorded[id]
  const hasRule = recorded[`${id}_rule`]
  if (hasSound && hasRule) return '#22c55e'  // green — both
  if (hasSound || hasRule) return '#f59e0b'  // amber — partial
  return null                                 // none
}

// ── Recording panel ───────────────────────────────────────────────────────────

function RecordingPanel({ phonogram, onClose, onSaved }) {
  const [clipType, setClipType] = useState('sound')
  const [phase, setPhase] = useState('idle') // idle | recording | processing | preview
  const [audioUrl, setAudioUrl] = useState(null)
  const [wavBuffer, setWavBuffer] = useState(null)
  const [duration, setDuration] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleStop

      mr.start()
      setPhase('recording')
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setPhase('processing')
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const ctx = new AudioContext()
      const decoded = await ctx.decodeAudioData(arrayBuffer)
      await ctx.close()

      const trimmed = trimSilence(decoded)
      const wav = encodeWav(trimmed)
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))

      setWavBuffer(wav)
      setAudioUrl(url)
      setDuration(trimmed.duration)
      setPhase('preview')
    } catch (err) {
      setError('Could not process recording. Please try again.')
      setPhase('idle')
    }
  }

  function reRecord() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setWavBuffer(null)
    setDuration(null)
    setPhase('idle')
  }

  function handleSave() {
    if (!wavBuffer) return
    const key = clipType === 'rule' ? `${phonogram.id}_rule` : phonogram.id
    const filename = `${key}.wav`
    downloadBlob(wavBuffer, filename)
    onSaved(key)
    onClose()
  }

  const filename = clipType === 'rule' ? `${phonogram.id}_rule.wav` : `${phonogram.id}.wav`

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-t-2xl p-6 border-t border-slate-700 max-w-lg w-full mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Phonogram header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-5xl font-bold font-mono text-white leading-none">
              {phonogram.symbol}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {phonogram.sounds.map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-900/60 text-brand-300 font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Sound / Rule toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setClipType('sound')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              clipType === 'sound'
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-400'
            }`}
          >
            Sound
          </button>
          <button
            onClick={() => setClipType('rule')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              clipType === 'rule'
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-400'
            }`}
          >
            Rule
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/30 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {/* Controls */}
        {phase === 'idle' && (
          <button
            onClick={startRecording}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-3 transition-colors"
          >
            <span className="w-3 h-3 rounded-full bg-white" />
            Start Recording
          </button>
        )}

        {phase === 'recording' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <button
              onClick={stopRecording}
              className="w-full py-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
            >
              Stop
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex items-center justify-center gap-3 py-4 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
            <span className="text-sm">Trimming silence...</span>
          </div>
        )}

        {phase === 'preview' && audioUrl && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-700/50 rounded-xl p-3 flex items-center gap-3">
              <audio controls src={audioUrl} className="flex-1 h-8" style={{ colorScheme: 'dark' }} />
              {duration != null && (
                <span className="text-xs text-slate-400 flex-shrink-0">{duration.toFixed(2)}s</span>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center">Saves as <code className="text-slate-400">{filename}</code></p>
            <div className="flex gap-2">
              <button
                onClick={reRecord}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-sm transition-colors"
              >
                Re-record
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
              >
                Save & Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(58px, 10vw, 90px), 1fr))',
}

export default function AudioRecord() {
  const [recorded, setRecorded] = useState(loadRecorded)
  const [selected, setSelected] = useState(null) // phonogram object

  function handleSaved(key) {
    const next = { ...recorded, [key]: true }
    setRecorded(next)
    saveRecorded(next)
  }

  const totalSound = PHONOGRAMS.filter(p => recorded[p.id]).length
  const totalRule = PHONOGRAMS.filter(p => recorded[`${p.id}_rule`]).length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-red-500/20 text-red-400 text-xs uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold">Record Phonograms</h1>
          <p className="text-slate-400 text-sm mt-1">
            Tap a phonogram to record its sound or rule. Silence is trimmed automatically.
          </p>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span><span className="text-amber-400 font-semibold">{totalSound}</span> / {PHONOGRAMS.length} sounds recorded</span>
            <span><span className="text-violet-400 font-semibold">{totalRule}</span> / {PHONOGRAMS.length} rules recorded</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />both recorded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />one recorded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" />not recorded</span>
        </div>

        {/* Phonogram groups */}
        {GROUPS.map((group, gi) => {
          const phonograms = PHONOGRAMS.filter(p => p.group === group.id)
          return (
            <div key={group.id} className={gi > 0 ? 'mt-7' : ''}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                {group.label}
              </p>
              <div className="grid gap-2" style={GRID_STYLE}>
                {phonograms.map(p => {
                  const dot = statusColor(recorded, p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="relative flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all font-bold font-mono text-white"
                      style={{ aspectRatio: '1 / 1', width: '100%', fontSize: p.symbol.length > 3 ? '0.75rem' : p.symbol.length > 2 ? '0.95rem' : p.symbol.length > 1 ? '1.1rem' : '1.5rem' }}
                      aria-label={`Record ${p.symbol}`}
                    >
                      {p.symbol}
                      {/* Status dot */}
                      <span
                        className="absolute top-1 right-1 w-2 h-2 rounded-full"
                        style={{ backgroundColor: dot ?? '#475569' }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recording panel */}
      {selected && (
        <RecordingPanel
          phonogram={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
