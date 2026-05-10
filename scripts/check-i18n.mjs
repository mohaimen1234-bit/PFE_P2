import fs from 'fs';
import path from 'path';

// This script parses lib/i18n.tsx and checks for missing keys across languages
const filePath = path.resolve('lib/i18n.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the translations object using a simple regex (assumes standard structure)
const translationsMatch = content.match(/const translations = \{([\s\S]*?)\n\}/);
if (!translationsMatch) {
  console.error("Could not find translations object in lib/i18n.tsx");
  process.exit(1);
}

// Instead of complex parsing, let's look for the main language blocks
const languages = ['en', 'fr', 'ar'];
const keysByLang = {};

languages.forEach(lang => {
  const langMatch = content.match(new RegExp(`${lang}: \\{([\\s\\S]*?)\\n  \\},`));
  if (langMatch) {
    const langContent = langMatch[1];
    const keys = [...langContent.matchAll(/^\s*(\w+):/gm)].map(m => m[1]);
    keysByLang[lang] = new Set(keys);
  }
});

const allKeys = new Set([...keysByLang.en, ...keysByLang.fr, ...keysByLang.ar]);

console.log(`Checking i18n keys for ${filePath}...`);
console.log(`Total unique keys found: ${allKeys.size}`);

let hasMissing = false;

languages.forEach(lang => {
  const missing = [...allKeys].filter(key => !keysByLang[lang].has(key));
  if (missing.length > 0) {
    console.error(`\n❌ Missing keys in '${lang}':`);
    missing.forEach(key => console.error(`  - ${key}`));
    hasMissing = true;
  } else {
    console.log(`\n✅ '${lang}' has all keys.`);
  }
});

if (hasMissing) {
  process.exit(1);
} else {
  console.log("\n✨ All languages are synchronized!");
  process.exit(0);
}
