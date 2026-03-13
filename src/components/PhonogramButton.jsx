import { useState } from 'react'
import { playAudio } from '../utils/audioPlayer'

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = {
  blue:   { base: '#2459B3', active: '#1A4490' }, // group1 consonants
  green:  { base: '#9D224D', active: '#7A1A3C' }, // group1 vowels
  red:    { base: '#41167D', active: '#310F60' }, // group2 common sounds
  purple: { base: '#2F7132', active: '#225225' }, // group3 advanced
  orange: { base: '#B8302A', active: '#8F251F' }, // group4 additional
}

// Phonograms that have a _rule.wav audio file
const RULE_IDS = new Set([
  'ai','au','aw','ay','ci','ck','dge','ear','ed','ee','eigh','er','ew','ey',
  'gn','gu','igh','ir','kn','oa','oe','oi','oo','ow','oy','ph','qu','ti','ui',
  'ur','wor','wr',
])

// Vowels in the alphabet get green; y gets a diagonal split
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const GROUP_COLOR = {
  group1: 'blue',
  group2: 'red',
  group3: 'purple',
  group4: 'orange',
}

function getBackground(phonogram, pressed) {
  const { id, group } = phonogram

  if (id === 'y') {
    // Diagonal split: top-left = consonant blue, bottom-right = vowel green
    const c = pressed ? COLORS.blue.active  : COLORS.blue.base
    const v = pressed ? COLORS.green.active : COLORS.green.base
    return { background: `linear-gradient(135deg, ${c} 50%, ${v} 50%)` }
  }

  if (group === 'group1' && VOWELS.has(id)) {
    const { base, active } = COLORS.green
    return { backgroundColor: pressed ? active : base }
  }

  const colorKey = GROUP_COLOR[group] ?? 'red'
  const { base, active } = COLORS[colorKey]
  return { backgroundColor: pressed ? active : base }
}

// Scale font down for longer symbols
function symStyle(symbol) {
  const len = symbol.length
  if (len <= 1) return { fontSize: '1.75rem', fontWeight: 800 }
  if (len <= 2) return { fontSize: '1.375rem', fontWeight: 800 }
  if (len <= 3) return { fontSize: '1.05rem',  fontWeight: 700 }
  return             { fontSize: '0.85rem',   fontWeight: 700 }
}

export default function PhonogramButton({ phonogram, rulesMode = false, onTap }) {
  const [pressed, setPressed] = useState(false)

  function handleTap() {
    setPressed(true)
    setTimeout(() => setPressed(false), 180)
    navigator.vibrate?.(30)

    const primarySrc = rulesMode ? `/audio/${phonogram.id}_rule.wav` : `/audio/${phonogram.id}.wav`
    const fallbackSrc = `/audio/${phonogram.id}.wav`

    playAudio(primarySrc, { fallbackSrc: rulesMode ? fallbackSrc : undefined })

    onTap?.(phonogram)
  }

  return (
    <button
      onClick={handleTap}
      className="relative flex items-center justify-center rounded-xl text-white select-none"
      style={{
        ...getBackground(phonogram, pressed),
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.12s ease, background-color 0.12s ease',
        aspectRatio: '1 / 1',
        width: '100%',
        boxShadow: pressed
          ? '0 1px 2px rgba(0,0,0,0.3)'
          : '0 3px 0px rgba(0,0,0,0.25)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={`Play phonogram ${phonogram.symbol}`}
    >
      <span style={symStyle(phonogram.symbol)} className="leading-none drop-shadow-sm">
        {phonogram.symbol}
      </span>
      {rulesMode && RULE_IDS.has(phonogram.id) && (
        <span
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '5px',
            fontSize: '0.8rem',
            opacity: 0.85,
            lineHeight: 1,
            pointerEvents: 'none',
            color: 'white',
          }}
        >
          ★
        </span>
      )}
    </button>
  )
}
