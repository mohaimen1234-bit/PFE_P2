const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
const content = fs.readFileSync(i18nPath, 'utf8')

// ── 1. Key parity check ──────────────────────────────────────────────────────
function extractKeys(content, lang) {
  const blockStart = content.indexOf(`  ${lang}: {`)
  if (blockStart === -1) return new Set()

  // Walk to find matching closing brace
  let depth = 0, i = blockStart
  let blockEnd = blockStart
  while (i < content.length) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) { blockEnd = i; break }
    }
    i++
  }

  const block = content.slice(blockStart, blockEnd)
  const keys = new Set()
  const re = /^\s{4}(\w+):/gm
  let m
  while ((m = re.exec(block)) !== null) {
    keys.add(m[1])
  }
  return keys
}

const enKeys = extractKeys(content, 'en')
const frKeys = extractKeys(content, 'fr')
const arKeys = extractKeys(content, 'ar')

const missingInFr = [...enKeys].filter(k => !frKeys.has(k))
const missingInAr = [...enKeys].filter(k => !arKeys.has(k))
const extraInFr   = [...frKeys].filter(k => !enKeys.has(k))
const extraInAr   = [...arKeys].filter(k => !enKeys.has(k))

console.log('══════════════════════════════════════════')
console.log(' i18n PARITY AUDIT REPORT')
console.log('══════════════════════════════════════════')
console.log(`EN keys: ${enKeys.size}`)
console.log(`FR keys: ${frKeys.size}`)
console.log(`AR keys: ${arKeys.size}`)
console.log()

if (missingInFr.length === 0) {
  console.log('✅ FR: all EN keys present')
} else {
  console.log(`❌ FR missing ${missingInFr.length} keys:`)
  missingInFr.slice(0, 30).forEach(k => console.log(`   - ${k}`))
  if (missingInFr.length > 30) console.log(`   ... and ${missingInFr.length - 30} more`)
}
console.log()
if (missingInAr.length === 0) {
  console.log('✅ AR: all EN keys present')
} else {
  console.log(`❌ AR missing ${missingInAr.length} keys:`)
  missingInAr.slice(0, 30).forEach(k => console.log(`   - ${k}`))
  if (missingInAr.length > 30) console.log(`   ... and ${missingInAr.length - 30} more`)
}
console.log()
if (extraInFr.length > 0) console.log(`⚠️  FR has ${extraInFr.length} extra keys: ${extraInFr.join(', ')}`)
if (extraInAr.length > 0) console.log(`⚠️  AR has ${extraInAr.length} extra keys: ${extraInAr.join(', ')}`)

// ── 2. Hardcoded string scan (heuristic) ─────────────────────────────────────
console.log()
console.log('══════════════════════════════════════════')
console.log(' HARDCODED STRING SCAN (dashboard pages)')
console.log('══════════════════════════════════════════')

const dashboardDir = path.join(__dirname, '..', 'app', '(dashboard)')
const suspectPattern = />([A-Z][a-z ]{4,})</g  // JSX text that starts capital, 5+ chars

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkDir(full, files)
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full)
  }
  return files
}

const tsxFiles = walkDir(dashboardDir)
let totalSuspect = 0
const fileResults = []

for (const file of tsxFiles) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  const suspects = []
  lines.forEach((line, idx) => {
    // Skip comments, t() calls, pure variable refs, template literals with expressions
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
    if (line.includes("t('") || line.includes('t("')) return
    
    // Look for JSX text content that looks like human-readable English (not code)
    const re = />([A-Z][a-zA-Z ]{4,})</g
    let m
    while ((m = re.exec(line)) !== null) {
      const text = m[1].trim()
      // Skip if it looks like a code word (no spaces, all caps, or single word technical)
      if (!/\s/.test(text) && text === text.toUpperCase()) continue  // ALL_CAPS
      if (text.startsWith('{') || text.startsWith('<')) continue
      suspects.push({ line: idx + 1, text })
    }
  })
  if (suspects.length > 0) {
    const rel = path.relative(path.join(__dirname, '..'), file)
    fileResults.push({ file: rel, suspects })
    totalSuspect += suspects.length
  }
}

if (totalSuspect === 0) {
  console.log('✅ No obvious hardcoded strings found in dashboard pages!')
} else {
  console.log(`⚠️  Found ${totalSuspect} potential hardcoded strings across ${fileResults.length} files:\n`)
  for (const { file, suspects } of fileResults.slice(0, 8)) {
    console.log(`  📄 ${file} (${suspects.length} suspects)`)
    suspects.slice(0, 3).forEach(s => console.log(`     L${s.line}: "${s.text}"`))
    if (suspects.length > 3) console.log(`     ... and ${suspects.length - 3} more`)
  }
  if (fileResults.length > 8) console.log(`  ... and ${fileResults.length - 8} more files`)
}

console.log()
console.log('══════════════════════════════════════════')
console.log(' SUMMARY')
console.log('══════════════════════════════════════════')
const parityOK = missingInFr.length === 0 && missingInAr.length === 0
console.log(`Parity: ${parityOK ? '✅ PASS' : '❌ FAIL'}`)
console.log(`Hardcoded suspects: ${totalSuspect} in ${fileResults.length} files`)
console.log(`Total EN keys registered: ${enKeys.size}`)
