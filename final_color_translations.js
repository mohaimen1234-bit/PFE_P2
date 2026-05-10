const fs = require('fs');

const file = 'lib/i18n.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionsEN = `
    item: 'Item',
    scope: 'Scope',
    backgroundColor: 'Background Color',
    textColor: 'Text Color',
    contrast: 'Contrast',
    preview: 'Preview',
    active: 'Active',
    actions: 'Actions',
    reset: 'Reset',
    discard: 'Discard',
    saveAndPublish: 'Save & Publish',
    unsavedChanges: 'Unsaved changes',
    resetToDefaultSuccess: 'Reset to default successfully',
    MAINTENANCE_TYPE: 'Maintenance Type',
    NOTIFICATION: 'Notification',
    STATUS: 'Status',
    GLOBAL: 'Global',
    INFO: 'Info',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
    SUCCESS: 'Success',
    WO_CREATED: 'WO Created',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DELAYED: 'Delayed',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
    PENDING_VALIDATION: 'Pending Validation',`;

const additionsFR = `
    item: 'Élément',
    scope: 'Portée',
    backgroundColor: 'Couleur de fond',
    textColor: 'Couleur du texte',
    contrast: 'Contraste',
    preview: 'Aperçu',
    active: 'Actif',
    actions: 'Actions',
    reset: 'Réinitialiser',
    discard: 'Ignorer',
    saveAndPublish: 'Enregistrer et publier',
    unsavedChanges: 'Modifications non enregistrées',
    resetToDefaultSuccess: 'Réinitialisé aux valeurs par défaut avec succès',
    MAINTENANCE_TYPE: 'Type de maintenance',
    NOTIFICATION: 'Notification',
    STATUS: 'Statut',
    GLOBAL: 'Global',
    INFO: 'Info',
    WARNING: 'Avertissement',
    CRITICAL: 'Critique',
    SUCCESS: 'Succès',
    WO_CREATED: 'OT Créé',
    SCHEDULED: 'Planifié',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    DELAYED: 'Retardé',
    CLOSED: 'Fermé',
    CANCELLED: 'Annulé',
    PENDING_VALIDATION: 'En attente de validation',`;

const additionsAR = `
    item: 'العنصر',
    scope: 'النطاق',
    backgroundColor: 'لون الخلفية',
    textColor: 'لون النص',
    contrast: 'التباين',
    preview: 'معاينة',
    active: 'نشط',
    actions: 'إجراءات',
    reset: 'إعادة تعيين',
    discard: 'تجاهل',
    saveAndPublish: 'حفظ ونشر',
    unsavedChanges: 'تغييرات غير محفوظة',
    resetToDefaultSuccess: 'تمت إعادة التعيين إلى الافتراضي بنجاح',
    MAINTENANCE_TYPE: 'نوع الصيانة',
    NOTIFICATION: 'إشعارات',
    STATUS: 'الحالة',
    GLOBAL: 'عام',
    INFO: 'معلومات',
    WARNING: 'تحذير',
    CRITICAL: 'حرج',
    SUCCESS: 'نجاح',
    WO_CREATED: 'تم إنشاء طلب العمل',
    SCHEDULED: 'مجدول',
    IN_PROGRESS: 'قيد التنفيذ',
    COMPLETED: 'مكتمل',
    DELAYED: 'متأخر',
    CLOSED: 'مغلق',
    CANCELLED: 'ملغى',
    PENDING_VALIDATION: 'في انتظار الموافقة',`;

content = content.replace(/(  en: \{)/, "$1\n" + additionsEN);
content = content.replace(/(  fr: \{)/, "$1\n" + additionsFR);
content = content.replace(/(  ar: \{)/, "$1\n" + additionsAR);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully injected all translations into 2-space indented objects!');
