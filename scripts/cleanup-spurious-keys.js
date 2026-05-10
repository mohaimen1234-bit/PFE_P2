const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

// Remove spurious allStatus_filter key
const before = content.length
content = content.replace(/\n    allStatus_filter: "All Status",/, '')
if (content.length < before) {
  console.log('Removed allStatus_filter key')
} else {
  console.log('allStatus_filter key not found (already removed)')
}

fs.writeFileSync(i18nPath, content, 'utf8')
console.log('Done.')
