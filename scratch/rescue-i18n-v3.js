const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const keyMap = {};

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(\w+):\s+'(.*)',?$/);
    if (match) {
        const key = match[1];
        const val = match[2];
        if (!keyMap[key]) keyMap[key] = new Set();
        keyMap[key].add(val);
    }
}

const en = {};
const fr = {};
const ar = {};

function getScore(s, lang) {
    s = s.toLowerCase();
    if (lang === 'ar') {
        return /[\u0600-\u06FF]/.test(s) ? 100 : 0;
    }
    if (lang === 'fr') {
        let score = 0;
        if (/[éàèùâêîôûëïüç]/.test(s)) score += 50;
        const frWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'est', 'sur', 'dans', 'pour', 'avec', 'par', 'plus', 'moins', 'annuler', 'paramètres', 'gestion', 'système', 'déconnexion', 'connexion', 'utilisateur', 'équipement', 'intervention', 'ordre', 'travail'];
        const words = s.split(/\s+/);
        words.forEach(w => { if (frWords.includes(w)) score += 20; });
        return score;
    }
    if (lang === 'en') {
        let score = 10; // base score for EN
        const enWords = ['the', 'and', 'is', 'on', 'in', 'for', 'with', 'by', 'more', 'less', 'cancel', 'settings', 'management', 'system', 'logout', 'login', 'user', 'equipment', 'intervention', 'order', 'work', 'dashboard'];
        const words = s.split(/\s+/);
        words.forEach(w => { if (enWords.includes(w)) score += 20; });
        // Penalty for non-EN chars
        if (/[\u0600-\u06FF]/.test(s)) score -= 100;
        if (/[éàèùâêîôûëïüç]/.test(s)) score -= 30;
        return score;
    }
    return 0;
}

Object.keys(keyMap).forEach(key => {
    const vals = Array.from(keyMap[key]);
    
    // Pick the best for each lang
    let bestEn = vals[0], maxEn = -1000;
    let bestFr = vals[0], maxFr = -1000;
    let bestAr = vals[0], maxAr = -1000;
    
    vals.forEach(v => {
        const sEn = getScore(v, 'en');
        if (sEn > maxEn) { maxEn = sEn; bestEn = v; }
        
        const sFr = getScore(v, 'fr');
        if (sFr > maxFr) { maxFr = sFr; bestFr = v; }
        
        const sAr = getScore(v, 'ar');
        if (sAr > maxAr) { maxAr = sAr; bestAr = v; }
    });
    
    en[key] = bestEn;
    fr[key] = bestFr;
    ar[key] = bestAr;
    
    // If we only had 1 or 2 values, some might be the same. That's fine.
});

// Manual overrides for critical keys
en.cancel = 'Cancel'; fr.cancel = 'Annuler'; ar.cancel = 'إلغاء';
en.settings = 'Settings'; fr.settings = 'Paramètres'; ar.settings = 'الضبط';
en.biomedical = 'Biomedical'; fr.biomedical = 'Biomédical'; ar.biomedical = 'طب حيوي';

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
console.log('Very intelligently rescued i18n file');
