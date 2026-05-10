const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    youCannotDeactivateYourOwn: 'You cannot deactivate your own account.',
    youCannotDeleteYourOwn: 'You cannot delete your own account.',
    minAgoVal: '{val} min ago',
    hAgoVal: '{val}h ago',
    dAgoVal: '{val}d ago',
    searchUsers: 'Search users...',
    recentUserActivities: 'Recent User Activities',
    userManagementAuditTrail: 'User management audit trail'
  },
  fr: {
    youCannotDeactivateYourOwn: 'Vous ne pouvez pas désactiver votre propre compte.',
    youCannotDeleteYourOwn: 'Vous ne pouvez pas supprimer votre propre compte.',
    minAgoVal: 'il y a {val} min',
    hAgoVal: 'il y a {val} h',
    dAgoVal: 'il y a {val} j',
    searchUsers: 'Rechercher des utilisateurs...',
    recentUserActivities: 'Activités récentes des utilisateurs',
    userManagementAuditTrail: 'Journal d' + "'" + 'audit de gestion des utilisateurs'
  },
  ar: {
    youCannotDeactivateYourOwn: 'لا يمكنك إلغاء تنشيط حسابك الخاص.',
    youCannotDeleteYourOwn: 'لا يمكنك حذف حسابك الخاص.',
    minAgoVal: 'منذ {val} دقيقة',
    hAgoVal: 'منذ {val} ساعة',
    dAgoVal: 'منذ {val} يوم',
    searchUsers: 'بحث عن مستخدمين...',
    recentUserActivities: 'أنشطة المستخدمين الأخيرة',
    userManagementAuditTrail: 'سجل تدقيق إدارة المستخدمين'
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

let injectedTotal = 0

for (const [lang, keys] of Object.entries(newKeysByLang)) {
  const bounds = getLangBlockBounds(content, lang)
  if (!bounds) {
    console.error(`Could not find ${lang} block`)
    continue
  }
  const keysToInject = Object.entries(keys).filter(([k]) => !keyExistsInBlock(content, bounds.start, bounds.end, k))
  if (keysToInject.length === 0) continue
  const insertAfterIdx = content.indexOf('{', bounds.start) + 1
  const newEntries = keysToInject.map(([k, v]) => `\n    ${k}: ${JSON.stringify(v)},`).join('')
  content = content.slice(0, insertAfterIdx) + newEntries + content.slice(insertAfterIdx)
  injectedTotal += keysToInject.length
  console.log(`[${lang}] Injected ${keysToInject.length} keys`)
}

fs.writeFileSync(i18nPath, content, 'utf8')
console.log(`\nDone. Total keys injected: ${injectedTotal}`)
