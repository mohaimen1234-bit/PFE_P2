import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_DIR = path.join(__dirname, 'app');
const I18N_FILE = path.join(__dirname, 'lib', 'i18n.tsx');

// Simple camel case generator
function toCamelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

// 1. Process all tsx files
function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'OENT' || err.code === 'EPERM') {}
    }
  });
  return filelist;
}

const files = walkSync(APP_DIR).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

let generatedTranslations = {
  en: {},
  fr: {},
  ar: {}
};

let modifiedFilesCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // Replace language === 'fr' ? 'X' : 'Y' with t('key')
  // We need to handle both single and double quotes
  const ternaryRegex = /language\s*===\s*['"]fr['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;
  
  content = content.replace(ternaryRegex, (match, frText, enText) => {
    let baseKey = toCamelCase(enText);
    if (!baseKey) baseKey = "dynamicText" + Math.floor(Math.random()*1000);
    // Ensure key is short
    if (baseKey.length > 20) baseKey = baseKey.substring(0, 20);
    
    generatedTranslations.en[baseKey] = enText;
    generatedTranslations.fr[baseKey] = frText;
    generatedTranslations.ar[baseKey] = enText; // Fallback to EN for AR if not provided in ternary
    
    return `t('${baseKey}')`;
  });

  // Handle {language === 'fr' ? "X" : "Y"} wrapped in JSX
  // Often it's already caught by above, but let's check for any remaining.

  // 2. Table Overflow fix
  // Replace <Table> with <div className="w-full overflow-x-auto min-w-0 border-t border-border"><Table className="min-w-[800px]">
  // ONLY if not already wrapped. It's tricky to check if wrapped, so we can just look for <Table> and check previous lines.
  // Actually, better to just replace <Table> with <div className="w-full overflow-x-auto"><Table> and </Table> with </Table></div>
  // Let's do a simple regex for <Table> that isn't inside overflow-x-auto.
  const tableStartRegex = /<Table(?![\w])/g;
  const tableEndRegex = /<\/Table>/g;
  
  if (content.includes('<Table') && !content.includes('overflow-x-auto')) {
      content = content.replace(/<Table(.*?)>/g, '<div className="w-full overflow-x-auto min-w-0"><Table$1 className="min-w-[600px]">');
      content = content.replace(/<\/Table>/g, '</Table></div>');
  }

  // 3. Theme fixes
  // Replace text-white with text-foreground, except in specific buttons maybe? 
  // Wait, text-white in Badges is usually what breaks.
  content = content.replace(/text-white/g, 'text-primary-foreground');
  content = content.replace(/text-black/g, 'text-foreground');
  
  // Specific badge color fixes
  content = content.replace(/bg-orange-500 hover:bg-orange-600 border-none text-primary-foreground/g, 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border-none hover:bg-orange-200 dark:hover:bg-orange-500/30');
  content = content.replace(/bg-amber-500 hover:bg-amber-600 border-none text-primary-foreground/g, 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border-none hover:bg-amber-200 dark:hover:bg-amber-500/30');
  content = content.replace(/bg-blue-500 hover:bg-blue-600 border-none text-primary-foreground/g, 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border-none hover:bg-blue-200 dark:hover:bg-blue-500/30');

  // Ensure flex-wrap on action bars (search & filter rows)
  content = content.replace(/className="flex gap-2"/g, 'className="flex flex-wrap gap-2 min-w-0"');
  content = content.replace(/className="flex flex-col gap-4 md:flex-row md:items-center"/g, 'className="flex flex-col gap-4 md:flex-row md:items-center flex-wrap min-w-0"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    modifiedFilesCount++;
  }
}

console.log(`Modified ${modifiedFilesCount} files.`);
console.log('Generated Translations:', JSON.stringify(generatedTranslations, null, 2));

// Append to i18n.tsx
let i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');
// This is a naive append. Better to manually insert them or use AST.
// We will output them so the AI can manually update i18n.tsx safely.
fs.writeFileSync('generated_keys.json', JSON.stringify(generatedTranslations, null, 2));
