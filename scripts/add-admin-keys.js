const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    completeSystemActi: 'Complete system activity and change tracking',
    exportLogs: 'Export Logs',
    searchLogs: 'Search logs...',
    allActions: 'All Actions',
    last24Hours: 'Last 24 Hours',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    allTime: 'All Time',
    timestamp: 'Timestamp',
    account: 'Account',
    ipAddress: 'IP Address',
    resource: 'Resource',
    userManagement: 'User Management',
    manageSystemUsersAnd: 'Manage system users and their permissions',
    roleManagement: 'Role Management',
    configureSystemRoles: 'Configure system roles and permissions',
    roleManagementAudit: 'Role Management Audit Trail',
    referenceDataManage: 'Reference Data Management',
    manageDepartmentsCat: 'Manage departments, categories, models, and task templates',
    addItem: 'Add Item',
    updateTemplateDetail: 'Update template details and steps',
    templateCode: 'Template Code',
    templateDescription: 'Template description',
    templateSteps: 'Template Steps',
    descriptionOptional: 'Description (Optional)',
    details: 'Details',
    saving: 'Saving...',
    taskTemplates: 'Task Templates',
    reusableTaskListsFor: 'Reusable task lists for work orders',
    newTemplate: 'New Template',
    steps: 'Steps',
    noRecentActivity: 'No recent activity',
    justNow: 'just now',
    minAgo: 'min ago',
    hAgo: 'h ago',
    dAgo: 'd ago',
    savesViaTheUsersAPI: 'Saves via the Users API endpoint',
    searchViaUsersSearch: 'Search via Users Search endpoint filters',
    deleteUserConfirm: 'This will delete the user (permanent deletion).',
    deleteRoleConfirm: 'Delete role',
    roleEditingIsNotSupp: 'Role editing is not supported.',
    permissionsAreNotExp: 'Permissions are not exposed in this version.',
    noLogs: 'No logs found.',
    noUsers: 'No users found.',
    noRoles: 'No roles found.',
    noDepartments: 'No departments found.',
    noCategories: 'No categories found.',
    noModels: 'No models found.',
    noTemplates: 'No templates found.',
    equipmentCategories: 'Equipment categories',
    equipmentModels: 'Equipment models',
    equipmentCount: 'Equipment Count',
    lastLogin: 'Last Login'
  },
  fr: {
    completeSystemActi: "Suivi complet de l'activité du système et des changements",
    exportLogs: 'Exporter les journaux',
    searchLogs: 'Rechercher des journaux...',
    allActions: 'Toutes les actions',
    last24Hours: 'Dernières 24 heures',
    last7Days: '7 derniers jours',
    last30Days: '30 derniers jours',
    allTime: 'Tout le temps',
    timestamp: 'Horodatage',
    account: 'Compte',
    ipAddress: 'Adresse IP',
    resource: 'Ressource',
    userManagement: 'Gestion des utilisateurs',
    manageSystemUsersAnd: 'Gérer les utilisateurs du système et leurs permissions',
    roleManagement: 'Gestion des rôles',
    configureSystemRoles: 'Configurer les rôles et permissions du système',
    roleManagementAudit: 'Journal d’audit de gestion des rôles',
    referenceDataManage: 'Gestion des données de référence',
    manageDepartmentsCat: 'Gérer les départements, catégories, modèles et modèles de tâches',
    addItem: 'Ajouter un élément',
    updateTemplateDetail: 'Mettre à jour les détails et étapes du modèle',
    templateCode: 'Code du modèle',
    templateDescription: 'Description du modèle',
    templateSteps: 'Étapes du modèle',
    descriptionOptional: 'Description (Optionnel)',
    details: 'Détails',
    saving: 'Enregistrement...',
    taskTemplates: 'Modèles de tâches',
    reusableTaskListsFor: 'Listes de tâches réutilisables pour les bons de travail',
    newTemplate: 'Nouveau modèle',
    steps: 'Étapes',
    noRecentActivity: 'Aucune activité récente',
    justNow: 'à l\'instant',
    minAgo: 'min',
    hAgo: 'h',
    dAgo: 'j',
    savesViaTheUsersAPI: 'S' + "'" + 'enregistre via l' + "'" + 'API Users',
    searchViaUsersSearch: 'Recherche via les filtres de l' + "'" + 'API Users Search',
    deleteUserConfirm: 'Cette action va supprimer l' + "'" + 'utilisateur (permanemment).',
    deleteRoleConfirm: 'Supprimer le rôle',
    roleEditingIsNotSupp: 'L' + "'" + 'édition des rôles n' + "'" + 'est pas supportée.',
    permissionsAreNotExp: 'Les permissions ne sont pas exposées dans cette version.',
    noLogs: 'Aucun journal trouvé.',
    noUsers: 'Aucun utilisateur trouvé.',
    noRoles: 'Aucun rôle trouvé.',
    noDepartments: 'Aucun département trouvé.',
    noCategories: 'Aucune catégorie trouvée.',
    noModels: 'Aucun modèle trouvé.',
    noTemplates: 'Aucun modèle trouvé.',
    equipmentCategories: 'Catégories d' + "'" + 'équipement',
    equipmentModels: 'Modèles d' + "'" + 'équipement',
    equipmentCount: 'Nombre d' + "'" + 'équipements',
    lastLogin: 'Dernière connexion'
  },
  ar: {
    completeSystemActi: 'تتبع نشاط النظام الكامل وتغيير التتبع',
    exportLogs: 'تصدير السجلات',
    searchLogs: 'بحث السجلات...',
    allActions: 'جميع الإجراءات',
    last24Hours: 'آخر 24 ساعة',
    last7Days: 'آخر 7 أيام',
    last30Days: 'آخر 30 يومًا',
    allTime: 'كل الوقت',
    timestamp: 'الطابع الزمني',
    account: 'الحساب',
    ipAddress: 'عنوان IP',
    resource: 'المورد',
    userManagement: 'إدارة المستخدمين',
    manageSystemUsersAnd: 'إدارة مستخدمي النظام وأذوناتهم',
    roleManagement: 'إدارة الأدوار',
    configureSystemRoles: 'تكوين أدوار النظام والأذونات',
    roleManagementAudit: 'سجل تدقيق إدارة الأدوار',
    referenceDataManage: 'إدارة البيانات المرجعية',
    manageDepartmentsCat: 'إدارة الأقسام والفئات والنماذج وقوالب المهام',
    addItem: 'إضافة عنصر',
    updateTemplateDetail: 'تحديث تفاصيل القالب والخطوات',
    templateCode: 'رمز القالب',
    templateDescription: 'وصف القالب',
    templateSteps: 'خطوات القالب',
    descriptionOptional: 'الوصف (اختياري)',
    details: 'التفاصيل',
    saving: 'جاري الحفظ...',
    taskTemplates: 'قوالب المهام',
    reusableTaskListsFor: 'قوائم المهام القابلة لإعادة الاستخدام لأوامر العمل',
    newTemplate: 'قالب جديد',
    steps: 'الخطوات',
    noRecentActivity: 'لا يوجد نشاط حديث',
    justNow: 'الآن',
    minAgo: 'دقيقة',
    hAgo: 'ساعة',
    dAgo: 'يوم',
    savesViaTheUsersAPI: 'يحفظ عبر نقطة نهاية واجهة برمجة تطبيقات المستخدمين',
    searchViaUsersSearch: 'البحث عبر مرشحات نقطة نهاية بحث المستخدمين',
    deleteUserConfirm: 'سيؤدي هذا إلى حذف المستخدم (حذف نهائي).',
    deleteRoleConfirm: 'حذف الدور',
    roleEditingIsNotSupp: 'تعديل الدور غير مدعوم.',
    permissionsAreNotExp: 'الأذونات غير مكشوفة في هذا الإصدار.',
    noLogs: 'لم يتم العثور على سجلات.',
    noUsers: 'لم يتم العثور على مستخدمين.',
    noRoles: 'لم يتم العثور على أدوار.',
    noDepartments: 'لم يتم العثور على أقسام.',
    noCategories: 'لم يتم العثور على فئات.',
    noModels: 'لم يتم العثور على نماذج.',
    noTemplates: 'لم يتم العثور على قوالب.',
    equipmentCategories: 'فئات المعدات',
    equipmentModels: 'نماذج المعدات',
    equipmentCount: 'عدد المعدات',
    lastLogin: 'آخر تسجيل دخول'
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
