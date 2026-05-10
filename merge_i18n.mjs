import fs from 'fs';
import path from 'path';

const keys = JSON.parse(fs.readFileSync('generated_keys.json', 'utf-8'));
let i18n = fs.readFileSync('lib/i18n.tsx', 'utf-8');

function injectKeys(langCode, newKeys) {
  const matchStr = `  ${langCode}: {`;
  const idx = i18n.indexOf(matchStr);
  if (idx !== -1) {
    const insertIdx = idx + matchStr.length;
    let injection = "\n";
    for (const [key, val] of Object.entries(newKeys)) {
      // Escape quotes
      const safeVal = val.replace(/"/g, '\\"');
      injection += `    ${key}: "${safeVal}",\n`;
    }
    i18n = i18n.slice(0, insertIdx) + injection + i18n.slice(insertIdx);
  }
}

injectKeys('en', keys.en);
injectKeys('fr', keys.fr);
injectKeys('ar', keys.ar);

fs.writeFileSync('lib/i18n.tsx', i18n, 'utf-8');
console.log('Keys injected successfully.');
