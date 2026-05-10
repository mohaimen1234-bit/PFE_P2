const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    allStatus: 'All Status',
    nextDue: 'Next Due',
    na: 'N/A',
    system: 'SYSTEM',
    user: 'User',
    loadingBoard: 'Loading board...',
    columnWidth: 'Column Width',
    workOrderAssigned: 'Work Order Assigned',
    techRegisteredSuccess: 'The technician has been successfully registered.',
    workOrderScheduled: 'Work Order Scheduled',
    interventionUpdated: 'The intervention has been updated.',
    plannedEnd: 'Planned End (Optional)',
    deleteDocument: 'Delete Document',
    deleteDocumentConfirm: 'Are you sure you want to delete',
    allStatus_filter: 'All Status',
  },
  fr: {
    allStatus: 'Tous les statuts',
    nextDue: 'Prochaine échéance',
    na: 'N/A',
    system: 'SYSTÈME',
    user: 'Utilisateur',
    loadingBoard: 'Chargement du tableau...',
    columnWidth: 'Largeur de colonne',
    workOrderAssigned: 'Bon de travail assigné',
    techRegisteredSuccess: 'Le technicien a été enregistré avec succès.',
    workOrderScheduled: 'Bon de travail planifié',
    interventionUpdated: "L'intervention a été mise à jour.",
    plannedEnd: 'Fin prévue (optionnel)',
    deleteDocument: 'Supprimer le document',
    deleteDocumentConfirm: 'Voulez-vous supprimer',
  },
  ar: {
    allStatus: 'جميع الحالات',
    nextDue: 'الاستحقاق التالي',
    na: 'غ/م',
    system: 'النظام',
    user: 'مستخدم',
    loadingBoard: 'جاري تحميل اللوحة...',
    columnWidth: 'عرض العمود',
    workOrderAssigned: 'تم تعيين أمر العمل',
    techRegisteredSuccess: 'تم تسجيل الفني بنجاح.',
    workOrderScheduled: 'تم جدولة أمر العمل',
    interventionUpdated: 'تم تحديث التدخل.',
    plannedEnd: 'نهاية مخططة (اختياري)',
    deleteDocument: 'حذف المستند',
    deleteDocumentConfirm: 'هل أنت متأكد من حذف',
  }
}

// Find the start and end index of each language block
function getLangBlockBounds(content, lang) {
  // e.g. "  en: {" or "  fr: {" or "  ar: {"
  const blockStart = content.indexOf(`  ${lang}: {`)
  if (blockStart === -1) return null

  // find the matching closing brace for this block
  let depth = 0
  let i = blockStart
  while (i < content.length) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) return { start: blockStart, end: i }
    }
    i++
  }
  return null
}

function keyExistsInBlock(content, blockStart, blockEnd, key) {
  const blockContent = content.slice(blockStart, blockEnd)
  // Look for "    key:" pattern
  return new RegExp(`\\b${key}:`).test(blockContent)
}

let injectedTotal = 0

for (const [lang, keys] of Object.entries(newKeysByLang)) {
  const bounds = getLangBlockBounds(content, lang)
  if (!bounds) {
    console.error(`Could not find ${lang} block`)
    continue
  }

  const keysToInject = Object.entries(keys).filter(([k]) => !keyExistsInBlock(content, bounds.start, bounds.end, k))

  if (keysToInject.length === 0) {
    console.log(`[${lang}] All keys already present.`)
    continue
  }

  // Insert after the opening brace of the lang block
  const insertAfterIdx = content.indexOf('{', bounds.start) + 1
  const newEntries = keysToInject.map(([k, v]) => `\n    ${k}: ${JSON.stringify(v)},`).join('')
  content = content.slice(0, insertAfterIdx) + newEntries + content.slice(insertAfterIdx)
  injectedTotal += keysToInject.length
  console.log(`[${lang}] Injected ${keysToInject.length} keys: ${keysToInject.map(([k]) => k).join(', ')}`)
}

fs.writeFileSync(i18nPath, content, 'utf8')
console.log(`\nDone. Total keys injected: ${injectedTotal}`)
