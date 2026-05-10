import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      if (fullPath.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const files = walkDir('app/(dashboard)');
const missingTFiles = [];
const missingHookFiles = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes("t('") || content.includes('t("')) {
    if (!content.includes('useI18n')) {
      missingHookFiles.push(file);
    } else {
      const hookMatch = content.match(/const\s+\{[^}]*\}\s*=\s*useI18n\(\)/);
      if (hookMatch) {
        if (!hookMatch[0].includes('t') && !hookMatch[0].includes('t,')) {
          missingTFiles.push(file);
        }
      } else {
        missingTFiles.push(file);
      }
    }
  }
}

console.log("Missing useI18n hook entirely:");
console.log(missingHookFiles);
console.log("Missing t from destructuring:");
console.log(missingTFiles);

// Fix them automatically
for (const file of missingHookFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  // insert import { useI18n } from "@/lib/i18n"
  content = content.replace(/(import .*?\n)+/, `$&import { useI18n } from "@/lib/i18n";\n`);
  // insert const { t } = useI18n() inside the component
  content = content.replace(/(export default function \w+\([^)]*\)\s*\{)/, `$1\n  const { t } = useI18n();\n`);
  fs.writeFileSync(file, content, 'utf-8');
}

for (const file of missingTFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  // if const { language } = useI18n() exists
  if (content.includes('{ language } = useI18n()')) {
    content = content.replace('{ language } = useI18n()', '{ t, language } = useI18n()');
  } else if (content.includes('const language = useI18n()')) {
     content = content.replace('const language = useI18n()', 'const { t, language } = useI18n()');
  } else if (content.includes('{ language, changeLanguage } = useI18n()')) {
     content = content.replace('{ language, changeLanguage } = useI18n()', '{ t, language, changeLanguage } = useI18n()');
  }
  fs.writeFileSync(file, content, 'utf-8');
}

console.log("Fixed all automatically!");
