const fs = require('fs');
const path = require('path');

function recover() {
  const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf8');

  const startMatch = content.match(/const translations = {/);
  const startIdx = startMatch.index + 'const translations = '.length;
  
  // Find end of translations block
  let endIdx = content.indexOf('\n}\n\ntype TranslationKey');
  if (endIdx === -1) endIdx = content.lastIndexOf('}\n}'); // Fallback

  const lines = content.substring(startIdx, endIdx).split('\n');
  const reconstructed = { en: {}, fr: {}, ar: {} };
  let currentLang = '';

  lines.forEach(line => {
    const langMatch = line.match(/^\s*(\w+):\s*{/);
    if (langMatch) {
      currentLang = langMatch[1];
      return;
    }
    
    // Match key: 'value',
    // We use a regex that greedy-matches until the last ',
    const keyValueMatch = line.match(/^\s*(\w+):\s*'(.*)',\s*$/);
    if (keyValueMatch && currentLang) {
      const key = keyValueMatch[1];
      let val = keyValueMatch[2];
      // Unescape if it was somehow escaped, but here it's likely NOT escaped and broken
      // We don't need to do anything, keyValueMatch[2] will contain the whole thing including inner quotes
      reconstructed[currentLang][key] = val;
    }
  });

  // Now write it back CLEANLY
  const languages = ['en', 'fr', 'ar'];
  const allKeys = Array.from(new Set(Object.values(reconstructed).flatMap(o => Object.keys(o)))).sort();

  const outputLines = ['{'];
  languages.forEach(lang => {
    outputLines.push(`  ${lang}: {`);
    allKeys.forEach(key => {
      let val = reconstructed[lang][key] || reconstructed['en'][key] || '';
      // Escape single quotes correctly
      val = val.replace(/\\'/g, "'").replace(/'/g, "\\'");
      outputLines.push(`    ${key}: '${val}',`);
    });
    outputLines.push('  },');
  });
  outputLines.push('}');

  const newContent = content.substring(0, startIdx) + outputLines.join('\n') + content.substring(endIdx);
  fs.writeFileSync(i18nPath, newContent);
  console.log('Recovered and consolidated lib/i18n.tsx');
}

recover();
