const fs = require('fs');

const file = 'lib/i18n.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionsEN = `
    MAINTENANCE_TYPE: 'Maintenance Type',
    NOTIFICATION: 'Notification',
    STATUS: 'Status',
    GLOBAL: 'Global',
    INFO: 'Info',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
    SUCCESS: 'Success',
    WO_CREATED: 'WO Created',`;

const additionsFR = `
    MAINTENANCE_TYPE: 'Type de maintenance',
    NOTIFICATION: 'Notification',
    STATUS: 'Statut',
    GLOBAL: 'Global',
    INFO: 'Info',
    WARNING: 'Avertissement',
    CRITICAL: 'Critique',
    SUCCESS: 'Succès',
    WO_CREATED: 'OT Créé',`;

const additionsAR = `
    MAINTENANCE_TYPE: 'نوع الصيانة',
    NOTIFICATION: 'إشعارات',
    STATUS: 'الحالة',
    GLOBAL: 'عام',
    INFO: 'معلومات',
    WARNING: 'تحذير',
    CRITICAL: 'حرج',
    SUCCESS: 'نجاح',
    WO_CREATED: 'تم إنشاء طلب العمل',`;

content = content.replace(/(    en: \{)/, "$1" + additionsEN);
content = content.replace(/(    fr: \{)/, "$1" + additionsFR);
content = content.replace(/(    ar: \{)/, "$1" + additionsAR);

fs.writeFileSync(file, content, 'utf8');
console.log('Added uppercase keys to translations');
