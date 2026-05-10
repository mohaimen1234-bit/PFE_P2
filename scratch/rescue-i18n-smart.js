const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const en = {};
const fr = {};
const ar = {};

let currentKey = null;
let keyOccurrences = [];

// Helper to detect language
function detectLang(s) {
    if (/[\u0600-\u06FF]/.test(s)) return 'ar';
    // French specific accents
    if (/[éàèùâêîôûëïüç]/.test(s.toLowerCase())) return 'fr';
    // Common French words
    const frWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'est', 'sur', 'dans', 'pour', 'avec', 'par', 'plus', 'moins'];
    const words = s.toLowerCase().split(/\s+/);
    if (words.some(w => frWords.includes(w))) return 'fr';
    
    // Default to EN for now, will refine
    return 'en';
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(\w+):\s+'(.*)',?$/);
    if (match) {
        const key = match[1];
        const val = match[2];
        
        if (key !== currentKey) {
            if (currentKey) {
                processKeyGroup(currentKey, keyOccurrences);
            }
            currentKey = key;
            keyOccurrences = [val];
        } else {
            keyOccurrences.push(val);
        }
    }
}
if (currentKey) processKeyGroup(currentKey, keyOccurrences);

function processKeyGroup(key, vals) {
    // If we have 3, try to assign by detection
    if (vals.length === 3) {
        let assigned = { en: null, fr: null, ar: null };
        vals.forEach(v => {
            const lang = detectLang(v);
            if (!assigned[lang]) assigned[lang] = v;
            else {
                // Conflict or multiple same-lang (e.g. identical strings)
                // If it's identical, just fill the missing ones
            }
        });
        // Fill gaps
        if (!assigned.ar) assigned.ar = vals.find(v => detectLang(v) === 'ar') || vals[2];
        if (!assigned.fr) assigned.fr = vals.find(v => detectLang(v) === 'fr') || (detectLang(vals[1]) === 'en' ? vals[0] : vals[1]);
        if (!assigned.en) assigned.en = vals.find(v => detectLang(v) === 'en') || vals[0];
        
        en[key] = assigned.en;
        fr[key] = assigned.fr;
        ar[key] = assigned.ar;
    } else {
        // Fallback for 1 or 2 values
        en[key] = vals[0];
        fr[key] = vals[1] || vals[0];
        ar[key] = vals[2] || vals[0];
    }
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
console.log('Intelligently rescued i18n file');
