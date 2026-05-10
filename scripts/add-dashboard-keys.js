const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    customizeLookFeel: 'Customize the look and feel of the application',
    loadingAudit: 'Loading audit...',
    somePhotosFailedToUpload: 'Some photos failed to upload.',
    reportAnIncidentDesc: 'Report an incident or equipment malfunction',
    photosSelected: '{count} photo(s) selected',
    markedOutOfService: 'Marked out of service',
    restoredToService: 'Restored to service',
    documentAdded: 'Document added',
    uploadError: 'Upload error',
    equipmentQrCode: 'Equipment QR Code',
    alertThresholdsLabel: 'Alert Thresholds:',
    thresholdN: 'Threshold {n}',
    equipmentCount: '{count} equipment(s)'
  },
  fr: {
    customizeLookFeel: 'Personnalisez l\'apparence de l\'application',
    loadingAudit: 'Chargement de l\'audit...',
    somePhotosFailedToUpload: 'Certaines photos n\'ont pas pu être importées.',
    reportAnIncidentDesc: 'Signalez un incident ou une panne d\'équipement',
    photosSelected: '{count} photo(s) sélectionnée(s)',
    markedOutOfService: 'Marqué hors service',
    restoredToService: 'Remis en service',
    documentAdded: 'Document ajouté',
    uploadError: 'Erreur d\'envoi',
    equipmentQrCode: 'Code QR de l\'équipement',
    alertThresholdsLabel: 'Seuils d\'alerte:',
    thresholdN: 'Seuil {n}',
    equipmentCount: '{count} équipement(s)'
  },
  ar: {
    customizeLookFeel: 'تخصيص مظهر وشعور التطبيق',
    loadingAudit: 'جاري تحميل التدقيق...',
    somePhotosFailedToUpload: 'فشل تحميل بعض الصور.',
    reportAnIncidentDesc: 'الإبلاغ عن حادث أو خلل في المعدات',
    photosSelected: 'تم اختيار {count} صورة',
    markedOutOfService: 'تم وضع علامة خارج الخدمة',
    restoredToService: 'تمت إعادته إلى الخدمة',
    documentAdded: 'تم إضافة المستند',
    uploadError: 'خطأ في التحميل',
    equipmentQrCode: 'رمز QR للمعدة',
    alertThresholdsLabel: 'عتبات التنبيه:',
    thresholdN: 'العتبة {n}',
    equipmentCount: '{count} معدة'
  }
}

function getLangBlockBounds(content, lang) {
  const blockStart = content.indexOf(`  ${lang}: {`)
  if (blockStart === -1) return null
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
  return new RegExp(`\\b${key}:`).test(blockContent)
}

for (const [lang, keys] of Object.entries(newKeysByLang)) {
  const bounds = getLangBlockBounds(content, lang)
  if (!bounds) continue
  const keysToInject = Object.entries(keys).filter(([k]) => !keyExistsInBlock(content, bounds.start, bounds.end, k))
  if (keysToInject.length === 0) continue
  const insertAfterIdx = content.indexOf('{', bounds.start) + 1
  const newEntries = keysToInject.map(([k, v]) => `\n    ${k}: ${JSON.stringify(v)},`).join('')
  content = content.slice(0, insertAfterIdx) + newEntries + content.slice(insertAfterIdx)
}

fs.writeFileSync(i18nPath, content, 'utf8')
console.log('Done.')
