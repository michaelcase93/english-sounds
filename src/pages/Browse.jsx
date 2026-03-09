import { useState } from 'react'
import { PHONOGRAMS, GROUPS } from '../data/phonograms'
import PhonogramButton from '../components/PhonogramButton'
import { getRulesMode, setRulesMode } from '../utils/storage'

const TABS = [
  { id: 'all', label: 'All Sounds' },
  ...GROUPS.map(g => ({ id: g.id, label: g.label })),
]

// Responsive card grid: cards grow from ~60px on mobile to ~110px on desktop
const GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(58px, 10vw, 110px), 1fr))',
}

export default function Browse() {
  const [activeTab, setActiveTab] = useState('all')
  const [rulesMode, setRulesModeState] = useState(getRulesMode)

  function toggleRulesMode() {
    const next = !rulesMode
    setRulesModeState(next)
    setRulesMode(next)
  }

  const visibleGroups = activeTab === 'all'
    ? GROUPS
    : GROUPS.filter(g => g.id === activeTab)

  return (
    <div className="flex flex-col bg-white min-h-screen">

      {/* ── Page title + rules toggle ── */}
      <div className="flex-shrink-0 px-4 pt-12 pb-2 bg-white flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Phonogram Sounds</h1>
        <button
          onClick={toggleRulesMode}
          className="flex items-center gap-2 text-sm font-medium text-slate-600"
          aria-pressed={rulesMode}
        >
          <span className={rulesMode ? 'text-slate-800' : 'text-slate-400'}>Rules</span>
          <div className={`relative w-10 h-6 rounded-full transition-colors ${rulesMode ? 'bg-brand-500' : 'bg-slate-200'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${rulesMode ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* ── Tab bar (scrollable so all 4 fit on small screens) ── */}
      <div className="flex-shrink-0 flex overflow-x-auto border-b border-slate-200 bg-white px-2 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-shrink-0 px-3 py-3 text-sm font-semibold tracking-tight transition-colors
              border-b-2 -mb-px whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {/* overflow-y-scroll keeps scrollbar gutter stable so card size never changes between tabs */}
      <div className="overflow-y-auto px-4 py-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

        {visibleGroups.map((group, i) => {
          const phonograms = PHONOGRAMS.filter(p => p.group === group.id)
          return (
            <div key={group.id} className={i > 0 ? 'mt-7' : ''}>
              {activeTab === 'all' && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                  {group.label}
                </p>
              )}
              <div className="grid gap-2.5" style={GRID_STYLE}>
                {phonograms.map(p => (
                  <PhonogramButton key={p.id} phonogram={p} rulesMode={rulesMode} />
                ))}
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
