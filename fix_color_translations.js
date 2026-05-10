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
    resetToDefaultSuccess: 'Reset to default successfully',`;

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
    resetToDefaultSuccess: 'Réinitialisé aux valeurs par défaut avec succès',`;

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
    resetToDefaultSuccess: 'تمت إعادة التعيين إلى الافتراضي بنجاح',`;

content = content.replace(/(    en: \{)/, "$1" + additionsEN);
content = content.replace(/(    fr: \{)/, "$1" + additionsFR);
content = content.replace(/(    ar: \{)/, "$1" + additionsAR);

fs.writeFileSync(file, content, 'utf8');
console.log('Translations actually added this time!');
