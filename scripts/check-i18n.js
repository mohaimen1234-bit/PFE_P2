const fs = require('fs');
const path = require('path');

function checkI18n() {
  const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf8');

  // Extract the translations object using regex
  // This is a bit fragile but should work for this specific file structure
  const startMatch = content.match(/const translations = {/);
  if (!startMatch) {
    console.error('Could not find translations object in lib/i18n.tsx');
    process.exit(1);
  }

  const startIdx = startMatch.index + 'const translations = '.length;
  
  // Simple brace counting to find the end of the object
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

  if (endIdx === -1) {
    console.error('Could not find end of translations object');
    process.exit(1);
  }

  const translationsText = content.substring(startIdx, endIdx);
  
  // We can't easily JSON.parse it because it's JS, not JSON (might have trailing commas, etc.)
  // But we can eval it in a sandbox or just use a helper function.
  // Given the environment, let's just use eval but carefully.
  let translations;
  try {
    translations = eval(`(${translationsText})`);
  } catch (e) {
    console.error('Failed to parse translations object:', e.message);
    process.exit(1);
  }

  const languages = Object.keys(translations);
  const baseLang = 'en';
  const otherLangs = languages.filter(l => l !== baseLang);

  const baseKeys = getAllKeys(translations[baseLang]);
  let hasMissing = false;

  otherLangs.forEach(lang => {
    const currentKeys = getAllKeys(translations[lang]);
    const missing = baseKeys.filter(k => !currentKeys.includes(k));
    const extra = currentKeys.filter(k => !baseKeys.includes(k));

    if (missing.length > 0) {
      console.error(`\n[${lang}] Missing keys compared to [${baseLang}]:`);
      missing.forEach(k => console.error(`  - ${k}`));
      hasMissing = true;
    }

    if (extra.length > 0) {
      console.warn(`\n[${lang}] Extra keys not in [${baseLang}]:`);
      extra.forEach(k => console.warn(`  - ${k}`));
    }
  });

  if (hasMissing) {
    console.error('\nI18n check FAILED: Some languages are missing keys.');
    process.exit(1);
  } else {
    console.log('\nI18n check PASSED: All languages have identical key structures.');
    process.exit(0);
  }
}

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }
  return keys;
}

checkI18n();
