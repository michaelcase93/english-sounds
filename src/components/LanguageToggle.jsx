import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()
  return (
    <button
      onClick={toggleLanguage}
      aria-label="Toggle language"
      className="flex items-center gap-1 text-slate-400 active:text-slate-600 transition-colors"
    >
      {/* Globe icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 010 18M12 3a14.5 14.5 0 000 18" />
      </svg>
      <span className="text-xs font-bold">{lang === 'en' ? 'ES' : 'EN'}</span>
    </button>
  )
}
