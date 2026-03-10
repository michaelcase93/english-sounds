import { createContext, useContext, useState } from 'react'
import { getStoredLanguage, setStoredLanguage, createT } from '../utils/i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getStoredLanguage)

  function toggleLanguage() {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
    setStoredLanguage(next)
  }

  const t = createT(lang)

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
