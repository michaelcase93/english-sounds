import { useState, useCallback } from 'react'
import { PHONOGRAMS, GROUPS } from '../data/phonograms'
import PhonogramButton from '../components/PhonogramButton'
import { getRulesMode, setRulesMode } from '../utils/storage'
import { useLanguage } from '../contexts/LanguageContext'
import HamburgerMenu from '../components/HamburgerMenu'

// Responsive card grid: cards grow from ~60px on mobile to ~110px on desktop
const GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(58px, 10vw, 110px), 1fr))',
}

export default function Browse() {
  const [activeTab, setActiveTab] = useState('all')
  const [rulesMode, setRulesModeState] = useState(getRulesMode)
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('hint_sounds_dismissed'))
  const { t } = useLanguage()

  const dismissHint = useCallback(() => {
    setShowHint(false)
    localStorage.setItem('hint_sounds_dismissed', '1')
  }, [])

  const TABS = [
    { id: 'all', label: t('tab_all') },
    ...GROUPS.map(g => ({ id: g.id, label: t(g.id) })),
  ]

  function toggleRulesMode() {
    const next = !rulesMode
    setRulesModeState(next)
    setRulesMode(next)
  }

  const visibleGroups = activeTab === 'all'
    ? GROUPS
    : GROUPS.filter(g => g.id === activeTab)

  return (
    <div className="flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Page title ── */}
      <div className="flex-shrink-0 px-4 pt-12 pb-2 bg-white flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('page_sounds_title')}</h1>
        <HamburgerMenu rulesMode={rulesMode} onToggleRules={toggleRulesMode} />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 flex overflow-x-auto border-b border-slate-200 bg-white px-2 scrollbar-none" style={{ touchAction: 'pan-x' }}>
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

      {/* ── First-visit hint ── */}
      {showHint && (
        <div className="flex-shrink-0 flex items-center justify-between gap-2 mx-4 mt-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-sm text-slate-500">👆 {t('hint_sounds')}</span>
          <button onClick={dismissHint} className="text-slate-300 hover:text-slate-500 text-lg leading-none">✕</button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom) + env(safe-area-inset-top))' }}>

        {visibleGroups.map((group, i) => {
          const phonograms = PHONOGRAMS.filter(p => p.group === group.id)
          return (
            <div key={group.id} className={i > 0 ? 'mt-7' : ''}>
              {activeTab === 'all' && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                  {t(group.id)}
                </p>
              )}
              <div className="grid gap-2.5" style={GRID_STYLE}>
                {phonograms.map(p => (
                  <PhonogramButton key={p.id} phonogram={p} rulesMode={rulesMode} onTap={showHint ? dismissHint : undefined} />
                ))}
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
