// Check for common syntax problems in i18n.tsx
const fs = require('fs');
const content = fs.readFileSync('lib/i18n.tsx', 'utf8');
const lines = content.split('\n');

let issues = 0;

lines.forEach((line, i) => {
  const lineNum = i + 1;
  
  // Check for unclosed strings (odd number of unescaped quotes)
  const stripped = line.replace(/\\'/g, '').replace(/\\"/g, '');
  const singleQuotes = (stripped.match(/'/g) || []).length;
  
  // Translation lines should have exactly 2 single quotes OR be part of multi-line
  if (line.match(/^\s+\w+:\s+'.+',\s*$/) && singleQuotes !== 2 && singleQuotes !== 4) {
    console.log(`L${lineNum} odd quotes (${singleQuotes}): ${line.trim()}`);
    issues++;
  }
  
  // Check for mixed Arabic and non-Arabic in same value in EN block
  if (lineNum >= 8 && lineNum <= 1299) {
    const m = line.match(/^\s+\w+:\s+'(.+)',\s*$/);
    if (m && /[\u0600-\u06FF]/.test(m[1])) {
      console.log(`L${lineNum} EN has Arabic: ${line.trim()}`);
      issues++;
    }
  }
  
  // Check for broken lines (key without value)
  if (line.match(/^\s+\w+:\s*$/) && !line.includes('//')) {
    console.log(`L${lineNum} incomplete key: ${line.trim()}`);
    issues++;
  }
});

if (issues === 0) {
  console.log('✅ No syntax issues found in i18n.tsx');
} else {
  console.log(`\n⚠️  Found ${issues} potential issue(s)`);
}
console.log(`Total lines: ${lines.length}`);
