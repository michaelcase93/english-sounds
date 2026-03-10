import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function HamburgerMenu({ rulesMode, onToggleRules }) {
  const [open, setOpen] = useState(false)
  const { lang, toggleLanguage, t } = useLanguage()

  return (
    <div className="relative">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 text-slate-500 active:text-slate-800 transition-colors"
        aria-label="Menu"
      >
        <span className="block w-5 h-0.5 bg-current rounded-full" />
        <span className="block w-5 h-0.5 bg-current rounded-full" />
        <span className="block w-5 h-0.5 bg-current rounded-full" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown panel */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 min-w-48 overflow-hidden">

            {/* Language row */}
            <button
              onClick={() => { toggleLanguage(); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5 text-slate-400 flex-shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 010 18M12 3a14.5 14.5 0 000 18" />
              </svg>
              <span className="text-sm font-medium text-slate-700 flex-1">{t('language_label')}</span>
              <span className="text-xs font-bold text-brand-500">{lang === 'en' ? 'ES' : 'EN'}</span>
            </button>

            {/* Rules row — only on Sounds page */}
            {onToggleRules !== undefined && (
              <>
                <div className="h-px bg-slate-100 mx-4" />
                <button
                  onClick={onToggleRules}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                    className="w-5 h-5 text-slate-400 flex-shrink-0">
                    <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700 flex-1">{t('rules_toggle')}</span>
                  <div className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${rulesMode ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${rulesMode ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </button>
              </>
            )}

            {/* Feedback row */}
            <div className="h-px bg-slate-100 mx-4" />
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdLe1blRccBfcvEZOGFyztia1CzGGe-4oO-904fGDaN_NUJLQ/viewform"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5 text-slate-400 flex-shrink-0">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">{t('feedback_label')}</span>
            </a>

          </div>
        </>
      )}
    </div>
  )
}
