import { useState, useEffect, useRef, useCallback } from 'react'

// ── WAV encoder ──────────────────────────────────────────────────────────────

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function interleave(audioBuffer) {
  const ch = audioBuffer.numberOfChannels
  const len = audioBuffer.length * ch
  const result = new Float32Array(len)
  let idx = 0
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let c = 0; c < ch; c++) result[idx++] = audioBuffer.getChannelData(c)[i]
  }
  return result
}

function encodeWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const samples = interleave(audioBuffer)
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // bit depth
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

async function extractClip(file, startSec, endSec) {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  const sr = audioBuffer.sampleRate
  const startSample = Math.floor(startSec * sr)
  const endSample = Math.min(Math.ceil(endSec * sr), audioBuffer.length)
  const length = endSample - startSample

  const clip = ctx.createBuffer(audioBuffer.numberOfChannels, length, sr)
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    clip.getChannelData(c).set(audioBuffer.getChannelData(c).slice(startSample, endSample))
  }
  await ctx.close()
  return encodeWav(clip)
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

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(sec) {
  if (!sec && sec !== 0) return '--:--'
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(2).padStart(5, '0')
  return `${m}:${s}`
}

// ── Waveform canvas component ─────────────────────────────────────────────────

function WaveformCanvas({ audioBuffer, selection, onSeek, currentTime, duration }) {
  const canvasRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'start' | 'end' | 'new'
  const dragStartX = useRef(null)
  const pendingAnim = useRef(null)

  // Draw waveform whenever buffer or selection changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !audioBuffer) return

    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
    const amp = height / 2

    ctx.clearRect(0, 0, width, height)

    // Selection background
    if (selection) {
      const sx = (selection.start / audioBuffer.duration) * width
      const ex = (selection.end / audioBuffer.duration) * width
      ctx.fillStyle = 'rgba(99,102,241,0.15)'
      ctx.fillRect(sx, 0, ex - sx, height)
    }

    // Waveform bars
    for (let x = 0; x < width; x++) {
      let min = 1, max = -1
      for (let i = 0; i < step; i++) {
        const sample = data[x * step + i] || 0
        if (sample < min) min = sample
        if (sample > max) max = sample
      }
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(x, amp + min * amp, 1, Math.max(1, (max - min) * amp))
    }

    // Selection handles
    if (selection) {
      const sx = (selection.start / audioBuffer.duration) * width
      const ex = (selection.end / audioBuffer.duration) * width
      // Start line
      ctx.strokeStyle = '#4f46e5'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, height); ctx.stroke()
      // End line
      ctx.strokeStyle = '#7c3aed'
      ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ex, height); ctx.stroke()
      // Handle circles
      ctx.fillStyle = '#4f46e5'
      ctx.beginPath(); ctx.arc(sx, height / 2, 6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#7c3aed'
      ctx.beginPath(); ctx.arc(ex, height / 2, 6, 0, Math.PI * 2); ctx.fill()
    }

    // Playhead
    if (currentTime > 0) {
      const px = (currentTime / audioBuffer.duration) * width
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke()
    }
  }, [audioBuffer, selection, currentTime])

  function xToTime(clientX) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(audioBuffer.duration, ratio * audioBuffer.duration))
  }

  function handlePointerDown(e) {
    if (!audioBuffer) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const t = xToTime(e.clientX)

    // Check if near a handle (within ~12px)
    if (selection) {
      const canvas = canvasRef.current
      const w = canvas.getBoundingClientRect().width
      const sxPx = (selection.start / audioBuffer.duration) * w
      const exPx = (selection.end / audioBuffer.duration) * w
      const clickPx = e.clientX - canvas.getBoundingClientRect().left
      if (Math.abs(clickPx - sxPx) < 14) { setDragging('start'); return }
      if (Math.abs(clickPx - exPx) < 14) { setDragging('end'); return }
    }

    dragStartX.current = t
    setDragging('new')
    onSeek('new', t, t)
  }

  function handlePointerMove(e) {
    if (!dragging || !audioBuffer) return
    const t = xToTime(e.clientX)
    if (dragging === 'start') {
      onSeek('start', Math.min(t, selection.end - 0.05))
    } else if (dragging === 'end') {
      onSeek('end', Math.max(t, selection.start + 0.05))
    } else {
      const anchor = dragStartX.current
      onSeek('new', Math.min(anchor, t), Math.max(anchor, t))
    }
  }

  function handlePointerUp() {
    setDragging(null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={120}
      className="w-full h-28 rounded-xl cursor-crosshair touch-none"
      style={{ background: '#f1f5f9' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AudioTrim() {
  const [file, setFile] = useState(null)
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [duration, setDuration] = useState(0)
  const [selection, setSelection] = useState(null) // { start, end }
  const [label, setLabel] = useState('')
  const [clipType, setClipType] = useState('sound') // 'sound' | 'rule'
  const [clips, setClips] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_clips') || '[]') } catch { return [] }
  })
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(null)

  const sourceRef = useRef(null)
  const ctxRef = useRef(null)
  const animRef = useRef(null)
  const startedAtRef = useRef(0)
  const offsetRef = useRef(0)

  // Persist clips
  useEffect(() => {
    localStorage.setItem('admin_clips', JSON.stringify(clips))
  }, [clips])

  // Load file → AudioContext + AudioBuffer for waveform
  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setLoading(true)
    setSelection(null)
    setAudioBuffer(null)
    stopPlayback()

    try {
      const arrayBuffer = await f.arrayBuffer()
      const ctx = new AudioContext()
      if (ctxRef.current) ctxRef.current.close()
      ctxRef.current = ctx
      const ab = await ctx.decodeAudioData(arrayBuffer)
      setAudioBuffer(ab)
      setDuration(ab.duration)
    } catch (err) {
      alert('Could not decode audio file. Try MP3, WAV, or M4A.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function stopPlayback() {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch {}
      sourceRef.current = null
    }
    cancelAnimationFrame(animRef.current)
    setPlaying(false)
  }

  function playRegion(start, end) {
    if (!audioBuffer || !ctxRef.current) return
    stopPlayback()

    const ctx = ctxRef.current
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    const offset = start
    const dur = end - start

    startedAtRef.current = ctx.currentTime
    offsetRef.current = offset

    source.start(0, offset, dur)
    sourceRef.current = source
    setPlaying(true)
    setCurrentTime(start)

    source.onended = () => {
      setPlaying(false)
      setCurrentTime(start)
      cancelAnimationFrame(animRef.current)
    }

    function tick() {
      if (!sourceRef.current) return
      const elapsed = ctxRef.current.currentTime - startedAtRef.current
      setCurrentTime(Math.min(offsetRef.current + elapsed, end))
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }

  function handleSeek(type, a, b) {
    if (type === 'start') {
      setSelection(s => ({ ...s, start: a }))
    } else if (type === 'end') {
      setSelection(s => ({ ...s, end: a }))
    } else {
      setSelection({ start: a, end: b ?? a })
    }
  }

  function saveClip() {
    if (!selection || !label.trim()) return
    const clip = {
      id: Date.now(),
      label: label.trim(),
      type: clipType,
      start: selection.start,
      end: selection.end,
      duration: selection.end - selection.start,
    }
    setClips(prev => [...prev, clip])
    setLabel('')
    setSelection(null)
  }

  function clipFilename(clip) {
    return clip.type === 'rule' ? `${clip.label}_rule.wav` : `${clip.label}.wav`
  }

  async function exportClip(clip) {
    if (!file) return
    setExporting(clip.id)
    try {
      const wav = await extractClip(file, clip.start, clip.end)
      downloadBlob(wav, clipFilename(clip))
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(null)
    }
  }

  async function exportAll() {
    if (!file || clips.length === 0) return
    for (const clip of clips) {
      setExporting(clip.id)
      try {
        const wav = await extractClip(file, clip.start, clip.end)
        downloadBlob(wav, clipFilename(clip))
        await new Promise(r => setTimeout(r, 300)) // stagger downloads
      } catch (err) {
        console.error('Failed to export', clip.label, err)
      }
    }
    setExporting(null)
  }

  function deleteClip(id) {
    setClips(prev => prev.filter(c => c.id !== id))
  }

  const selectionDuration = selection ? selection.end - selection.start : 0

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-red-500/20 text-red-400 text-xs uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl font-bold">Audio Trim Tool</h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload a long recording, select regions, label and export individual phonogram clips.
          </p>
        </div>

        {/* Upload */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-slate-300">
            Audio File
          </label>
          <label className="flex items-center gap-3 border-2 border-dashed border-slate-600 rounded-xl p-5 cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-500 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-300">
                {file ? file.name : 'Choose audio file'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">MP3, WAV, M4A, OGG supported</p>
            </div>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
        </div>

        {loading && (
          <div className="text-center py-8 text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-slate-600 border-t-brand-500 rounded-full animate-spin mb-2" />
            <p className="text-sm">Decoding audio...</p>
          </div>
        )}

        {/* Waveform */}
        {audioBuffer && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Drag to select a region</span>
                <span>{fmt(duration)}</span>
              </div>
              <WaveformCanvas
                audioBuffer={audioBuffer}
                selection={selection}
                onSeek={handleSeek}
                currentTime={currentTime}
                duration={duration}
              />
            </div>

            {/* Playback controls */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => {
                  if (playing) { stopPlayback(); return }
                  const start = selection?.start ?? 0
                  const end = selection?.end ?? duration
                  playRegion(start, end)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors"
              >
                {playing ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    {selection ? 'Play Selection' : 'Play All'}
                  </>
                )}
              </button>

              {selection && (
                <div className="flex-1 flex items-center gap-2 text-xs text-slate-400 px-3 py-2 bg-slate-800 rounded-lg">
                  <span className="text-indigo-400">▸ {fmt(selection.start)}</span>
                  <span>→</span>
                  <span className="text-violet-400">⏹ {fmt(selection.end)}</span>
                  <span className="text-slate-500">({fmt(selectionDuration)})</span>
                </div>
              )}
            </div>

            {/* Save clip form */}
            {selection && (
              <div className="mb-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h2 className="text-sm font-semibold mb-3 text-slate-300">Save This Clip</h2>

                {/* Sound / Rule toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setClipType('sound')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      clipType === 'sound'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sound
                  </button>
                  <button
                    onClick={() => setClipType('rule')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      clipType === 'rule'
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Rule
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveClip()}
                    placeholder="Phonogram label (e.g. sh, ch, igh)"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={saveClip}
                    disabled={!label.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Will export as{' '}
                  <code className="text-slate-400">
                    {clipType === 'rule'
                      ? `${label.trim() || 'label'}_rule.wav`
                      : `${label.trim() || 'label'}.wav`}
                  </code>{' '}
                  · {fmt(selectionDuration)} long
                </p>
              </div>
            )}
          </>
        )}

        {/* Saved clips list */}
        {clips.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-slate-200">{clips.length} Saved Clips</h2>
              <button
                onClick={exportAll}
                disabled={!file || exporting !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
                  <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
                </svg>
                Export All
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {clips.map(clip => (
                <div key={clip.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  {/* Label */}
                  <div className="w-12 h-10 rounded-lg bg-brand-900/50 border border-brand-700/50 flex items-center justify-center font-bold font-mono text-brand-300 text-sm flex-shrink-0">
                    {clip.label}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">{clipFilename(clip)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        clip.type === 'rule'
                          ? 'bg-violet-900/60 text-violet-300'
                          : 'bg-brand-900/60 text-brand-300'
                      }`}>
                        {clip.type === 'rule' ? 'rule' : 'sound'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {fmt(clip.start)} → {fmt(clip.end)} · {fmt(clip.duration)}
                    </p>
                  </div>

                  {/* Preview */}
                  <button
                    onClick={() => {
                      if (file && audioBuffer) playRegion(clip.start, clip.end)
                    }}
                    disabled={!file}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
                    title="Preview"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </button>

                  {/* Export */}
                  <button
                    onClick={() => exportClip(clip)}
                    disabled={!file || exporting !== null}
                    className="p-2 rounded-lg hover:bg-green-900/50 text-slate-400 hover:text-green-400 transition-colors disabled:opacity-30"
                    title="Export WAV"
                  >
                    {exporting === clip.id ? (
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                      </svg>
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteClip(clip.id)}
                    className="p-2 rounded-lg hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Note about uploading */}
            <div className="mt-5 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-1">Next steps after exporting:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy the exported <code>.wav</code> files into <code>public/audio/</code> in the project</li>
                <li>Optionally convert to MP3 to save space: <code>ffmpeg -i sh.wav -b:a 128k sh.mp3</code></li>
                <li>Sound clips: <code>sh.wav</code> · Rule clips: <code>sh_rule.wav</code></li>
                <li>Verify each file matches its phonogram ID in <code>src/data/phonograms.js</code></li>
                <li>Run <code>npm run build</code> to include them in the service worker cache</li>
              </ol>
            </div>
          </div>
        )}

        {!file && !loading && (
          <div className="text-center py-12 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-3 opacity-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <p>Upload an audio file to begin</p>
          </div>
        )}
      </div>
    </div>
  )
}
