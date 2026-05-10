const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
let content = fs.readFileSync(path, 'utf8');

// We'll insert new keys into each language block.
// To keep it simple and safe, we'll parse the object (manually) or use a helper.
// Since it's a huge file, I'll use a safer regex approach for each block.

const enNewKeys = {
    technical: 'Technical',
    it: 'IT',
    priorityChangeMissing: 'Priority change, missing parts, etc.',
    sterilizeUnitEx: 'e.g. Sterilize surgical unit components',
    woHash: 'WO #',
    equipmentHash: 'Equipment #',
    notAvailableShort: 'N/A',
    creationMode: 'Creation Mode',
    customTask: 'Custom Task',
    useTemplate: 'Use Template',
    createExecutionTask: 'Create Execution Task',
    executionTaskDesc: 'Add a specific manual task to this work order.',
    selectTemplate: 'Select Template',
    generatedChecklist: 'Generated Checklist',
    startDate: 'Start Date',
    failedToLoadPredictive: 'Failed to load predictive analysis',
    failedToCreatePredictive: 'Failed to create predictive work order',
    refreshAnalysis: 'Refresh Analysis',
    equipmentMonitored: 'Equipment Monitored',
    highRisk: 'High Risk',
    criticalRisk: 'Critical Risk',
    interventionsNeeded: 'Interventions Needed',
    searchEquipmentPlaceholder: 'Search equipment...',
    allRiskLevels: 'All Risk Levels',
    allCriticalities: 'All Criticalities',
    noEquipmentData: 'No Equipment Data',
    equipmentMustBeReg: 'Equipment must be registered in the system for AI analysis.',
    noMatches: 'No matches found.',
    interventionState: 'Intervention State',
    pofScore: 'PoF Score',
    finalRiskScore: 'Final Risk Score',
    admin_role: 'Administrator',
    maintenance_manager_role: 'Maintenance Manager',
    technician_role: 'Technician',
    finance_manager_role: 'Finance Manager',
    department_manager_role: 'Department Manager',
};

const frNewKeys = {
    technical: 'Technique',
    it: 'TI',
    priorityChangeMissing: 'Changement de priorité, pièces manquantes, etc.',
    sterilizeUnitEx: 'ex. Stériliser les composants de l\'unité chirurgicale',
    woHash: 'BT #',
    equipmentHash: 'Équipement #',
    notAvailableShort: 'N/A',
    creationMode: 'Mode de création',
    customTask: 'Tâche personnalisée',
    useTemplate: 'Utiliser un modèle',
    createExecutionTask: 'Créer une tâche d\'exécution',
    executionTaskDesc: 'Ajouter une tâche manuelle spécifique à cet ordre de travail.',
    selectTemplate: 'Sélectionner un modèle',
    generatedChecklist: 'Liste de contrôle générée',
    startDate: 'Date de début',
    failedToLoadPredictive: 'Échec du chargement de l\'analyse prédictive',
    failedToCreatePredictive: 'Échec de la création de l\'ordre de travail prédictif',
    refreshAnalysis: 'Actualiser l\'analyse',
    equipmentMonitored: 'Équipements surveillés',
    highRisk: 'Risque élevé',
    criticalRisk: 'Risque critique',
    interventionsNeeded: 'Interventions nécessaires',
    searchEquipmentPlaceholder: 'Rechercher un équipement...',
    allRiskLevels: 'Tous les niveaux de risque',
    allCriticalities: 'Toutes les criticités',
    noEquipmentData: 'Aucune donnée d\'équipement',
    equipmentMustBeReg: 'L\'équipement doit être enregistré dans le système pour l\'analyse par IA.',
    noMatches: 'Aucun résultat trouvé.',
    interventionState: 'État de l\'intervention',
    pofScore: 'Score PoF',
    finalRiskScore: 'Score de risque final',
    admin_role: 'Administrateur',
    maintenance_manager_role: 'Gestionnaire de maintenance',
    technician_role: 'Technicien',
    finance_manager_role: 'Gestionnaire financier',
    department_manager_role: 'Gestionnaire de département',
};

const arNewKeys = {
    technical: 'تقني',
    it: 'تقنية المعلومات',
    priorityChangeMissing: 'تغيير الأولوية، قطع مفقودة، إلخ.',
    sterilizeUnitEx: 'مثال: تعقيم مكونات الوحدة الجراحية',
    woHash: 'أمر عمل #',
    equipmentHash: 'معدة #',
    notAvailableShort: 'غ/م',
    creationMode: 'وضع الإنشاء',
    customTask: 'مهمة مخصصة',
    useTemplate: 'استخدام نموذج',
    createExecutionTask: 'إنشاء مهمة تنفيذ',
    executionTaskDesc: 'إضافة مهمة يدوية محددة لأمر العمل هذا.',
    selectTemplate: 'اختر النموذج',
    generatedChecklist: 'قائمة التحقق الناتجة',
    startDate: 'تاريخ البدء',
    failedToLoadPredictive: 'فشل تحميل التحليل التنبؤي',
    failedToCreatePredictive: 'فشل إنشاء أمر العمل التنبؤي',
    refreshAnalysis: 'تحديث التحليل',
    equipmentMonitored: 'المعدات المراقبة',
    highRisk: 'خطر عالٍ',
    criticalRisk: 'خطر حرج',
    interventionsNeeded: 'التدخلات المطلوبة',
    searchEquipmentPlaceholder: 'البحث عن المعدات...',
    allRiskLevels: 'جميع مستويات المخاطر',
    allCriticalities: 'جميع درجات الأهمية',
    noEquipmentData: 'لا توجد بيانات للمعدات',
    equipmentMustBeReg: 'يجب تسجيل المعدات في النظام لتحليل الذكاء الاصطناعي.',
    noMatches: 'لا توجد نتائج مطابقة.',
    interventionState: 'حالة التدخل',
    pofScore: 'درجة PoF',
    finalRiskScore: 'درجة المخاطر النهائية',
    admin_role: 'مدير النظام',
    maintenance_manager_role: 'مدير الصيانة',
    technician_role: 'فني',
    finance_manager_role: 'المدير المالي',
    department_manager_role: 'مدير القسم',
    settings: 'الضبط', // Changed from الإعدادات
};

function addKeys(blockContent, newKeys) {
    let lines = blockContent.split('\n');
    Object.keys(newKeys).forEach(k => {
        const line = `    ${k}: '${newKeys[k].replace(/'/g, "\\'")}',`;
        // Check if key already exists
        const index = lines.findIndex(l => l.trim().startsWith(k + ':'));
        if (index !== -1) {
            lines[index] = line;
        } else {
            lines.push(line);
        }
    });
    // Sort keys alphabetically (optional but cleaner)
    const header = lines[0]; // the block start line
    const footer = lines[lines.length-1];
    // Actually, lines passed here are the keys themselves.
    lines.sort();
    return lines.join('\n');
}

// Split the file into lang blocks
const enMatch = content.match(/(en: \{)([\s\S]*?)(^    \},)/m);
const frMatch = content.match(/(fr: \{)([\s\S]*?)(^    \},)/m);
const arMatch = content.match(/(ar: \{)([\s\S]*?)(^    \},)/m);

if (enMatch && frMatch && arMatch) {
    const enFixed = addKeys(enMatch[2], enNewKeys);
    const frFixed = addKeys(frMatch[2], frNewKeys);
    const arFixed = addKeys(arMatch[2], arNewKeys);
    
    content = content.replace(enMatch[2], enFixed);
    content = content.replace(frMatch[2], frFixed);
    content = content.replace(arMatch[2], arFixed);
    
    fs.writeFileSync(path, content);
    console.log('Successfully updated i18n keys');
} else {
    console.error('Could not find all language blocks');
}
