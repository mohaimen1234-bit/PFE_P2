const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const en = {};
const fr = {};
const ar = {};

// We'll skip the header and footer
// We'll look for lines like: key: 'value',
// We'll assume they come in groups of 3 (EN, FR, AR)
// If they come in groups of 1 or 2, we'll try to guess.

let currentKey = null;
let keyOccurrences = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(\w+):\s+'(.*)',?$/);
    if (match) {
        const key = match[1];
        const val = match[2];
        
        if (key !== currentKey) {
            // Process previous key group
            if (currentKey) {
                if (keyOccurrences.length === 3) {
                    en[currentKey] = keyOccurrences[0];
                    fr[currentKey] = keyOccurrences[1];
                    ar[currentKey] = keyOccurrences[2];
                } else if (keyOccurrences.length === 1) {
                    // Just one? Assume EN and leave others empty or same
                    en[currentKey] = keyOccurrences[0];
                } else {
                    // 2 or more? This is tricky.
                    // But let's assume if it's 2, it's EN, FR.
                    en[currentKey] = keyOccurrences[0];
                    if (keyOccurrences[1]) fr[currentKey] = keyOccurrences[1];
                }
            }
            currentKey = key;
            keyOccurrences = [val];
        } else {
            keyOccurrences.push(val);
        }
    }
}
// Final key
if (currentKey) {
    en[currentKey] = keyOccurrences[0];
    if (keyOccurrences[1]) fr[currentKey] = keyOccurrences[1];
    if (keyOccurrences[2]) ar[currentKey] = keyOccurrences[2];
}

function buildBlock(obj) {
    const keys = Object.keys(obj).sort();
    return keys.map(k => `    ${k}: '${obj[k].replace(/'/g, "\\'")}',`).join('\n');
}

const newContent = `"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type Language = "en" | "fr" | "ar"

const translations = {
    en: {
${buildBlock(en)}
    },
    fr: {
${buildBlock(fr)}
    },
    ar: {
${buildBlock(ar)}
    },
}

export const I18nContext = createContext<{
  t: (key: string, params?: Record<string, string | number>) => string
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}>({
  t: (k) => k,
  language: "en",
  setLanguage: () => {},
  isRTL: false,
})

export const useI18n = () => useContext(I18nContext)

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("cmms_lang") as Language
    if (saved && ["en", "fr", "ar"].includes(saved)) {
      setLanguage(saved)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cmms_lang", language)
      document.documentElement.setAttribute("lang", language)
      document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr")
    }
  }, [language, mounted])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translation = (translations[language] as any)[key] || (translations["en"] as any)[key] || key
      if (!params) return translation
      
      let result = translation
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(\`{\${k}}\`, String(v))
      })
      return result
    },
    [language]
  )

  const isRTL = language === "ar"

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, isRTL }}>
      {children}
    </I18nContext.Provider>
  )
}
`;

fs.writeFileSync(path, newContent);
console.log('Rescued i18n file');
