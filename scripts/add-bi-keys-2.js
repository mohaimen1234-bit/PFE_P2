const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    woTrendsDesc: 'Completed, planned and emergency WOs over time',
    woTypeDistDesc: 'Corrective, preventive, predictive',
    monthlyCostTrendDesc: 'Monthly maintenance spend trend',
    currentStatusDist: 'Current status distribution',
    derivedFromWoCosts: 'Derived from work order actual costs',
    latestMaintenanceActi: 'Latest maintenance activities',
    noWorkOrdersMatch: 'No work orders match the selected filters.',
    operationalUptime: 'Operational uptime',
    filteredWOs: 'Filtered WOs',
    fromFilteredWOs: 'From filtered work orders',
    sumOfWoCosts: 'Sum of WO actual costs'
  },
  fr: {
    woTrendsDesc: 'Bons de travail terminés, planifiés et d\'urgence au fil du temps',
    woTypeDistDesc: 'Correctif, préventif, prédictif',
    monthlyCostTrendDesc: 'Tendance mensuelle des dépenses de maintenance',
    currentStatusDist: 'Répartition du statut actuel',
    derivedFromWoCosts: 'Dérivé des coûts réels des bons de travail',
    latestMaintenanceActi: 'Dernières activités de maintenance',
    noWorkOrdersMatch: 'Aucun bon de travail ne correspond aux filtres sélectionnés.',
    operationalUptime: 'Temps de fonctionnement opérationnel',
    filteredWOs: 'Bons de travail filtrés',
    fromFilteredWOs: 'À partir des bons de travail filtrés',
    sumOfWoCosts: 'Somme des coûts réels des bons de travail'
  },
  ar: {
    woTrendsDesc: 'أوامر العمل المكتملة والمخططة والطارئة بمرور الوقت',
    woTypeDistDesc: 'تصحيحي، وقائي، تنبؤي',
    monthlyCostTrendDesc: 'اتجاه إنفاق الصيانة الشهري',
    currentStatusDist: 'توزيع الحالة الحالية',
    derivedFromWoCosts: 'مشتق من التكاليف الفعلية لأوامر العمل',
    latestMaintenanceActi: 'أحدث أنشطة الصيانة',
    noWorkOrdersMatch: 'لا توجد أوامر عمل تطابق الفلاتر المختارة.',
    operationalUptime: 'وقت التشغيل التشغيلي',
    filteredWOs: 'أوامر العمل المفلترة',
    fromFilteredWOs: 'من أوامر العمل المفلترة',
    sumOfWoCosts: 'مجموع التكاليف الفعلية لأوامر العمل'
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
