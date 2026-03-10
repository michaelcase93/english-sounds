import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdLe1blRccBfcvEZOGFyztia1CzGGe-4oO-904fGDaN_NUJLQ/viewform?embedded=true'

export default function FeedbackTab() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    const d = localStorage.getItem('feedback_banner_dismissed')
    if (!d) return false
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return Date.now() - parseInt(d, 10) < thirtyDays
  })

  if (dismissed) return null

  function dismiss(e) {
    e.preventDefault()
    e.stopPropagation()
    localStorage.setItem('feedback_banner_dismissed', Date.now().toString())
    setDismissed(true)
  }

  return (
    <>
      {/* Side tab */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
        <button
          onClick={dismiss}
          aria-label="Dismiss feedback tab"
          className="w-6 bg-slate-600 hover:bg-slate-500 text-white text-xs flex items-center justify-center py-1 rounded-tl-lg transition-colors"
        >
          ×
        </button>
        <button
          onClick={() => setOpen(true)}
          className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold tracking-wide px-2 py-3 rounded-bl-lg transition-colors"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('feedback_label')}
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
            style={{ height: '85dvh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">{t('feedback_label')}</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Iframe */}
            <iframe
              src={FORM_URL}
              title="Feedback"
              className="w-full h-full border-0"
              style={{ height: 'calc(85dvh - 49px)' }}
            >
              Loading…
            </iframe>
          </div>
        </div>
      )}
    </>
  )
}
