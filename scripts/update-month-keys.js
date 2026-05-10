const fs = require('fs');
const path = require('path');

function updateI18n() {
  const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf8');

  const startMatch = content.match(/const translations = {/);
  const startIdx = startMatch.index + 'const translations = '.length;
  
  let endIdx = content.indexOf('\n}\n\ntype TranslationKey');
  if (endIdx === -1) endIdx = content.lastIndexOf('}\n}');

  const translationsText = content.substring(startIdx, endIdx);
  const translations = eval(`(${translationsText})`);

  const months = {
    jan: { en: "Jan", fr: "Jan", ar: "جانفي" },
    feb: { en: "Feb", fr: "Fév", ar: "فيفري" },
    mar: { en: "Mar", fr: "Mar", ar: "مارس" },
    apr: { en: "Apr", fr: "Avr", ar: "أفريل" },
    may: { en: "May", fr: "Mai", ar: "ماي" },
    jun: { en: "Jun", fr: "Juin", ar: "جوان" },
    jul: { en: "Jul", fr: "Juil", ar: "جويلية" },
    aug: { en: "Aug", fr: "Août", ar: "أوت" },
    sep: { en: "Sep", fr: "Sep", ar: "سبتمبر" },
    oct: { en: "Oct", fr: "Oct", ar: "أكتوبر" },
    nov: { en: "Nov", fr: "Nov", ar: "نوفمبر" },
    dec: { en: "Dec", fr: "Déc", ar: "ديسمبر" }
  };

  Object.keys(months).forEach(key => {
    translations.en[key] = months[key].en;
    translations.fr[key] = months[key].fr;
    translations.ar[key] = months[key].ar;
  });

  const languages = ['en', 'fr', 'ar'];
  const allKeys = Array.from(new Set(Object.values(translations).flatMap(o => Object.keys(o)))).sort();

  const outputLines = ['{'];
  languages.forEach(lang => {
    outputLines.push(`  ${lang}: {`);
    allKeys.forEach(key => {
      let val = (translations[lang][key] || translations['en'][key] || '').replace(/'/g, "\\'");
      outputLines.push(`    ${key}: '${val}',`);
    });
    outputLines.push('  },');
  });
  outputLines.push('}');

  const newContent = content.substring(0, startIdx) + outputLines.join('\n') + content.substring(endIdx);
  fs.writeFileSync(i18nPath, newContent);
  console.log('Updated lib/i18n.tsx with month keys');
}

updateI18n();
