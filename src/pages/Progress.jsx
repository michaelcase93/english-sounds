import { useState } from 'react'
import { useProgress } from '../hooks/useProgress'
import { PHONOGRAMS } from '../data/phonograms'
import { isMastered } from '../utils/storage'
import { useLanguage } from '../contexts/LanguageContext'

export default function Progress() {
  const { progress, stats, reset } = useProgress()
  const { t } = useLanguage()
  const [confirmReset, setConfirmReset] = useState(false)

  const mastered   = PHONOGRAMS.filter(p => progress[p.id] && isMastered(progress[p.id]))
  const practicing = PHONOGRAMS.filter(p => progress[p.id] && !isMastered(progress[p.id]) && progress[p.id].attempts > 0)
  const notStarted = PHONOGRAMS.filter(p => !progress[p.id] || progress[p.id].attempts === 0)

  const totalAttempts = Object.values(progress).reduce((sum, e) => sum + (e.attempts || 0), 0)
  const totalCorrect  = Object.values(progress).reduce((sum, e) => sum + (e.correct || 0), 0)
  const overallPct    = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  return (
    <div className="page-scroll">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('progress_title')}</h1>
      </div>

      {/* Overview cards */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        <StatCard value={stats.mastered}   label={t('stat_mastered')}  color="green" />
        <StatCard value={stats.practicing} label={t('learning_label')} color="amber" />
        <StatCard value={stats.notStarted} label={t('not_yet_label')}  color="slate" />
      </div>

      {/* Overall accuracy */}
      {totalAttempts > 0 && (
        <div className="mx-4 mb-6 bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">{t('overall_accuracy')}</span>
            <span className="text-sm font-bold text-brand-600">{overallPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {t('correct_of', totalCorrect, totalAttempts)}
          </p>
        </div>
      )}

      {/* Mastered list */}
      {mastered.length > 0 && (
        <Section title={t('section_mastered')} emoji="✓" color="text-green-600">
          <div className="flex flex-wrap gap-2">
            {mastered.map(p => (
              <PhonogramPip key={p.id} phonogram={p} entry={progress[p.id]} color="green" />
            ))}
          </div>
        </Section>
      )}

      {/* Practicing list */}
      {practicing.length > 0 && (
        <Section title={t('section_learning')} emoji="⟳" color="text-amber-600">
          <div className="flex flex-col gap-2">
            {practicing
              .sort((a, b) => {
                const ea = progress[a.id], eb = progress[b.id]
                const accA = ea.correct / ea.attempts
                const accB = eb.correct / eb.attempts
                return accA - accB
              })
              .map(p => (
                <PracticingRow key={p.id} phonogram={p} entry={progress[p.id]} />
              ))}
          </div>
        </Section>
      )}

      {/* Not started */}
      {notStarted.length > 0 && (
        <Section title={t('section_not_started')} emoji="○" color="text-slate-400">
          <div className="flex flex-wrap gap-2">
            {notStarted.map(p => (
              <PhonogramPip key={p.id} phonogram={p} color="slate" />
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {totalAttempts === 0 && (
        <div className="text-center py-12 px-6">
          <div className="text-5xl mb-3">📖</div>
          <p className="font-semibold text-slate-700">{t('empty_state')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('empty_state_sub')}</p>
        </div>
      )}

      {/* Reset */}
      {totalAttempts > 0 && (
        <div className="px-4 mt-4 mb-4">
          {confirmReset ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                {t('reset_confirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { reset(); setConfirmReset(false) }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  {t('reset_yes')}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold active:scale-95 transition-transform"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-400 text-sm font-medium active:scale-95 transition-transform"
            >
              {t('reset_all')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-100',
  }
  return (
    <div className={`rounded-2xl border p-4 text-center ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs mt-1 font-medium opacity-80">{label}</div>
    </div>
  )
}

function Section({ title, emoji, color, children }) {
  return (
    <div className="px-4 mb-6">
      <h2 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${color}`}>
        <span>{emoji}</span>
        <span className="uppercase tracking-wide">{title}</span>
      </h2>
      {children}
    </div>
  )
}

function PhonogramPip({ phonogram, color }) {
  const colors = {
    green: 'bg-green-100 text-green-700 border-green-200',
    slate: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border font-bold font-mono text-sm ${colors[color]}`}>
      {phonogram.symbol}
    </div>
  )
}

function PracticingRow({ phonogram, entry }) {
  const pct = Math.round((entry.correct / entry.attempts) * 100)
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center font-bold font-mono text-amber-700 flex-shrink-0">
        {phonogram.symbol}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{entry.correct}/{entry.attempts} correct</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
