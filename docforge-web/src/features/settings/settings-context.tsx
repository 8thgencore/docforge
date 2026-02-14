import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react'

import { env } from '@/shared/config/env'
import type { Language } from '@/shared/i18n/messages'
import { storageKeys } from '@/shared/config/storage'

interface SettingsContextValue {
  baseUrl: string
  apiKey: string
  language: Language
  setBaseUrl: (value: string) => void
  setApiKey: (value: string) => void
  setLanguage: (value: Language) => void
}

const readStorage = (key: string, fallback = '') => {
  if (typeof window === 'undefined') {
    return fallback
  }
  return window.localStorage.getItem(key) ?? fallback
}

const isLanguage = (value: string): value is Language => value === 'ru' || value === 'en'

const SettingsContext = createContext<SettingsContextValue | null>(null)

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [baseUrl, setBaseUrlState] = useState(() =>
    readStorage(storageKeys.baseUrl, env.defaultApiBaseUrl),
  )
  const [apiKey, setApiKeyState] = useState(() => readStorage(storageKeys.apiKey))
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = readStorage(storageKeys.language, 'ru')
    return isLanguage(saved) ? saved : 'ru'
  })

  const setBaseUrl = (value: string) => {
    const next = value.trim()
    setBaseUrlState(next)
    window.localStorage.setItem(storageKeys.baseUrl, next)
  }

  const setApiKey = (value: string) => {
    const next = value.trim()
    setApiKeyState(next)
    window.localStorage.setItem(storageKeys.apiKey, next)
  }

  const setLanguage = (value: Language) => {
    setLanguageState(value)
    window.localStorage.setItem(storageKeys.language, value)
  }

  const value = useMemo(
    () => ({
      baseUrl,
      apiKey,
      language,
      setBaseUrl,
      setApiKey,
      setLanguage,
    }),
    [apiKey, baseUrl, language],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
