// Final audit script - check EN for Arabic values, check parse validity
const f = require('fs').readFileSync('lib/i18n.tsx', 'utf8');
const lines = f.split('\n');

// Find EN block
let enStart = -1, enEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'en: {' && enStart === -1) enStart = i;
  if (enStart > 0 && lines[i].trim() === 'fr: {') { enEnd = i; break; }
}

// Find FR block
let frStart = -1, frEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'fr: {' && frStart === -1) frStart = i;
  if (frStart > 0 && lines[i].trim() === 'ar: {') { frEnd = i; break; }
}

// Find AR block
let arStart = -1, arEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'ar: {' && arStart === -1) arStart = i;
  if (arStart > 0 && lines[i].trim() === '},' && i > arStart + 5) { arEnd = i; break; }
}

console.log('EN block:', enStart+1, '-', enEnd+1, '|', enEnd - enStart, 'keys');
console.log('FR block:', frStart+1, '-', frEnd+1, '|', frEnd - frStart, 'keys');
console.log('AR block:', arStart+1, '-', arEnd+1, '|', arEnd - arStart, 'keys');

// Check EN for Arabic
const isArabic = (s) => /[\u0600-\u06FF]/.test(s);
let enIssues = 0;
for (let i = enStart + 1; i < enEnd; i++) {
  const m = lines[i].match(/^\s+(\w+):\s+'(.+)',?\s*$/);
  if (m && isArabic(m[2])) {
    console.log(`EN Arabic contamination L${i+1}: ${m[1]} = ${m[2]}`);
    enIssues++;
  }
}
if (enIssues === 0) console.log('✅ EN block is clean (no Arabic values)');

// Check FR for Arabic
let frIssues = 0;
for (let i = frStart + 1; i < frEnd; i++) {
  const m = lines[i].match(/^\s+(\w+):\s+'(.+)',?\s*$/);
  if (m && isArabic(m[2])) {
    console.log(`FR Arabic contamination L${i+1}: ${m[1]} = ${m[2]}`);
    frIssues++;
  }
}
if (frIssues === 0) console.log('✅ FR block is clean (no Arabic values)');

// Check AR for English-only values that should be Arabic
let arEnglishOnly = 0;
const shouldBeLocalized = ['blockingFactor','updateDueDate','woGeneratedSuccessfully','wait','xraySpikeDesc',
  'calibrationAlertsDesc','urgentRestocksNeeded','woActive','yes','no'];
for (let i = arStart + 1; i < arEnd; i++) {
  const m = lines[i].match(/^\s+(\w+):\s+'([^']+)',?\s*$/);
  if (m && shouldBeLocalized.includes(m[1]) && !/[\u0600-\u06FF]/.test(m[2])) {
    console.log(`AR missing translation L${i+1}: ${m[1]} = ${m[2]}`);
    arEnglishOnly++;
  }
}
if (arEnglishOnly === 0) console.log('✅ AR spot-check passed');

// Count duplicate keys in each block
const checkDupes = (start, end, lang) => {
  const seen = new Set();
  let dupes = 0;
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(/^\s+(\w+):/);
    if (m) {
      if (seen.has(m[1])) { console.log(`DUPE in ${lang} L${i+1}: ${m[1]}`); dupes++; }
      seen.add(m[1]);
    }
  }
  if (dupes === 0) console.log(`✅ ${lang} has no duplicate keys`);
  return seen.size;
};

const enCount = checkDupes(enStart, enEnd, 'EN');
const frCount = checkDupes(frStart, frEnd, 'FR');
const arCount = checkDupes(arStart, arEnd, 'AR');
console.log(`Key counts — EN: ${enCount}, FR: ${frCount}, AR: ${arCount}`);
