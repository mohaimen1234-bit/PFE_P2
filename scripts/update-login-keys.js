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

  const newKeys = {
    loginSubtitle: { 
      en: "Centralize your equipment, optimize maintenance, and leverage AI for predictive operations.", 
      fr: "Centralisez vos équipements, optimisez la maintenance et exploitez l'IA pour des opérations prédictives.", 
      ar: "قم بمركزية معداتك، وتحسين الصيانة، واستخدام الذكاء الاصطناعي للعمليات التنبؤية." 
    }
  };

  Object.keys(newKeys).forEach(key => {
    translations.en[key] = newKeys[key].en;
    translations.fr[key] = newKeys[key].fr;
    translations.ar[key] = newKeys[key].ar;
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
  console.log('Updated lib/i18n.tsx with login keys');
}

updateI18n();
