const fs = require('fs');
const path = require('path');

function consolidate() {
  const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf8');

  const startMatch = content.match(/const translations = {/);
  const startIdx = startMatch.index + 'const translations = '.length;
  
  let braceCount = 0;
  let endIdx = -1;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  const translationsText = content.substring(startIdx, endIdx);
  // We need to handle the fact that it might have single quotes now
  let translations;
  try {
    // If it's already mangled, we might need a more robust way to parse it
    // But since it's "mostly" valid JS, eval should work if we didn't break too much
    translations = eval(`(${translationsText})`);
  } catch (e) {
    console.error('Failed to parse (might be mangled):', e.message);
    // Attempt to recover if possible? No, better to restore from git if I could.
    // But I'll try to use a regex to extract from the ORIGINAL file if I can.
    process.exit(1);
  }

  const baseLang = 'en';
  const languages = ['en', 'fr', 'ar'];
  
  // Get all unique keys from ALL languages to be sure
  const allKeysSet = new Set();
  languages.forEach(lang => {
    if (translations[lang]) {
      Object.keys(translations[lang]).forEach(k => allKeysSet.add(k));
    }
  });
  const allKeys = Array.from(allKeysSet).sort();

  const consolidated = {};
  languages.forEach(lang => {
    consolidated[lang] = {};
    allKeys.forEach(key => {
      // Priority: current lang > base lang > empty string
      consolidated[lang][key] = translations[lang][key] || translations[baseLang][key] || '';
    });
  });

  // Write it back as a clean JS object
  const lines = ['{'];
  languages.forEach(lang => {
    lines.push(`  ${lang}: {`);
    allKeys.forEach(key => {
      const val = consolidated[lang][key].replace(/'/g, "\\'"); // escape single quotes
      lines.push(`    ${key}: '${val}',`);
    });
    lines.push('  },');
  });
  lines.push('}');

  const newTranslationsText = lines.join('\n');
  const newContent = content.substring(0, startIdx) + newTranslationsText + content.substring(endIdx);
  fs.writeFileSync(i18nPath, newContent);
  console.log('Consolidated lib/i18n.tsx cleanly');
}

consolidate();
