const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
const content = fs.readFileSync(path, 'utf8');

// We'll fix the most common keys that got mangled.
const fixes = {
    aIAssistant: ['AI - Assistant', 'IA - Assistant', 'ذكاء اصطناعي - مساعد'],
    aIFailureAnalysis: ['AI - Failure Analysis', 'IA - Analyse de panne', 'ذكاء اصطناعي - تحليل الأعطال'],
    aIPrioritization: ['AI - Prioritization', 'IA - Priorisation', 'ذكاء اصطناعي - الأولويات'],
    accept: ['Accept', 'Accepter', 'قبول'],
    acceptanceRate: ['Acceptance Rate', 'Taux d\'Acceptation', 'معدل القبول'],
    accepted: ['Accepted', 'Accepté', 'مقبول'],
    account: ['Account', 'Compte', 'الحساب'],
    action: ['Action', 'Action', 'إجراء'],
    actions: ['Actions', 'Actions', 'الإجراءات'],
    active: ['Active', 'Actif', 'نشط'],
    activity: ['Activity', 'Activité', 'النشاط'],
    add: ['Add', 'Ajouter', 'إضافة'],
    admin: ['Administration', 'Administration', 'الإدارة'],
    cancel: ['Cancel', 'Annuler', 'إلغاء'],
    save: ['Save', 'Enregistrer', 'حفظ'],
    delete: ['Delete', 'Supprimer', 'حذف'],
    edit: ['Edit', 'Modifier', 'تعديل'],
    view: ['View', 'Voir', 'عرض'],
    search: ['Search', 'Rechercher', 'بحث'],
    settings: ['Settings', 'Paramètres', 'الضبط'],
    dashboard: ['Dashboard', 'Tableau de bord', 'لوحة التحكم'],
    equipment: ['Equipment', 'Équipement', 'المعدات'],
    workOrders: ['Work Orders', 'Ordres de travail', 'أوامر العمل'],
    tasks: ['Tasks', 'Tâches', 'المهام'],
    inventory: ['Inventory', 'Inventaire', 'المخزون'],
    users: ['Users', 'Utilisateurs', 'المستخدمين'],
    roles: ['Roles', 'Rôles', 'الأدوار'],
    reports: ['Reports', 'Rapports', 'التقارير'],
    analytics: ['Analytics', 'Analyses', 'التحليلات'],
    loading: ['Loading...', 'Chargement...', 'جاري التحميل...'],
    none: ['None', 'Aucun', 'لا يوجد'],
    status: ['Status', 'Statut', 'الحالة'],
    priority: ['Priority', 'Priorité', 'الأولوية'],
    low: ['Low', 'Basse', 'منخفضة'],
    medium: ['Medium', 'Moyenne', 'متوسطة'],
    high: ['High', 'Haute', 'عالية'],
    critical: ['Critical', 'Critique', 'حرجة'],
    operational: ['Operational', 'Opérationnel', 'عملياتي'],
    underRepair: ['Under Repair', 'En réparation', 'تحت الإصلاح'],
    archived: ['Archived', 'Archivé', 'مؤرشف'],
    biomedical: ['Biomedical', 'Biomédical', 'طب حيوي'],
    technical: ['Technical', 'Technique', 'تقني'],
    it: ['IT', 'TI', 'تقنية المعلومات'],
};

let lines = content.split('\n');
const enStart = lines.findIndex(l => l.includes('en: {'));
const frStart = lines.findIndex(l => l.includes('fr: {'));
const arStart = lines.findIndex(l => l.includes('ar: {'));

Object.keys(fixes).forEach(key => {
    const [enVal, frVal, arVal] = fixes[key];
    
    // Fix EN
    for (let i = enStart + 1; i < frStart; i++) {
        if (lines[i].trim().startsWith(key + ':')) {
            lines[i] = `    ${key}: '${enVal.replace(/'/g, "\\'")}',`;
            break;
        }
    }
    // Fix FR
    for (let i = frStart + 1; i < arStart; i++) {
        if (lines[i].trim().startsWith(key + ':')) {
            lines[i] = `    ${key}: '${frVal.replace(/'/g, "\\'")}',`;
            break;
        }
    }
    // Fix AR
    for (let i = arStart + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith(key + ':')) {
            lines[i] = `    ${key}: '${arVal.replace(/'/g, "\\'")}',`;
            break;
        }
        if (lines[i].trim().startsWith('},')) break;
    }
});

fs.writeFileSync(path, lines.join('\n'));
console.log('Applied core fixes to i18n file');
