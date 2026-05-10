const fs = require('fs');
const path = require('path');

function updateI18n() {
  const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf8');

  const startMatch = content.match(/const translations = {/);
  const startIdx = startMatch.index + 'const translations = '.length;
  
  let endIdx = content.indexOf('\n}\n\ntype TranslationKey');
  if (endIdx === -1) endIdx = content.lastIndexOf('}\n}');

  const translationsText = content.substring(startIdx, endIdx);
  const translations = eval(`(${translationsText})`);

  const newKeys = {
    executionFailureAlert: { en: "Execution Failure Alert", fr: "Alerte d'échec d'exécution", ar: "تنبيه فشل التنفيذ" },
    managerReviewRequired: { en: "A technician reported a critical task failure. Manager review required.", fr: "Un technicien a signalé l'échec d'une tâche critique. L'examen du gestionnaire est requis.", ar: "أبلغ الفني عن فشل في مهمة حرجة. مراجعة المدير مطلوبة." },
    reviewFailure: { en: "Review Failure", fr: "Examiner l'échec", ar: "مراجعة الفشل" },
    follows: { en: "Follows", fr: "Suit", ar: "يتبع" },
    viewOriginClaim: { en: "View Origin Claim", fr: "Voir la réclamation d'origine", ar: "عرض المطالبة الأصلية" },
    starting: { en: "Starting...", fr: "Démarrage...", ar: "جاري البدء..." },
    startWork: { en: "Start Work", fr: "Commencer le travail", ar: "بدء العمل" },
    markCompleted: { en: "Mark Completed", fr: "Marquer comme terminé", ar: "تحديد كمكتمل" },
    completeIntervention: { en: "Complete Intervention", fr: "Terminer l'intervention", ar: "إكمال التدخل" },
    finalCompletionNotes: { en: "Final completion notes...", fr: "Notes de clôture finales...", ar: "ملاحظات الإكمال النهائية..." },
    confirmCompletion: { en: "Confirm Completion", fr: "Confirmer la clôture", ar: "تأكيد الإكمال" },
    assignTechnicians: { en: "Assign Technicians", fr: "Assigner des techniciens", ar: "تعيين الفنيين" },
    selectPrimaryTechnician: { en: "Select Primary Technician", fr: "Sélectionner le technicien principal", ar: "اختر الفني الرئيسي" },
    confirmAssignment: { en: "Confirm Assignment", fr: "Confirmer l'assignation", ar: "تأكيد التعيين" },
    validateIntervention: { en: "Validate Intervention", fr: "Valider l'intervention", ar: "التحقق من التدخل" },
    predictiveInspectionOutcome: { en: "Predictive Inspection Outcome", fr: "Résultat de l'inspection prédictive", ar: "نتيجة الفحص التنبؤي" },
    selectInspectionResult: { en: "Select inspection result", fr: "Sélectionner le résultat de l'inspection", ar: "اختر نتيجة الفحص" },
    noIssueFound: { en: "No issue found", fr: "Aucun problème trouvé", ar: "لم يتم العثور على مشكلة" },
    issueFoundResolved: { en: "Issue found & resolved", fr: "Problème trouvé et résolu", ar: "تم العثور على مشكلة وحلها" },
    monitoringRequired: { en: "Monitoring required", fr: "Surveillance requise", ar: "المراقبة مطلوبة" },
    unconfirmed: { en: "Unconfirmed", fr: "Non confirmé", ar: "غير مؤكد" },
    outcomeDetails: { en: "Outcome Details", fr: "Détails du résultat", ar: "تفاصيل النتيجة" },
    describeFindings: { en: "Describe findings...", fr: "Décrire les observations...", ar: "صف النتائج..." },
    validationRemarks: { en: "Validation Remarks", fr: "Remarques de validation", ar: "ملاحظات التحقق" },
    validateAndAccept: { en: "Validate & Accept", fr: "Valider et accepter", ar: "التحقق والقبول" },
    archiveAndClose: { en: "Archive & Close", fr: "Archiver et fermer", ar: "أرشفة وإغلاق" },
    createFollowOn: { en: "Create Follow-on WO", fr: "Créer un OT de suivi", ar: "إنشاء أمر عمل تابع" },
    followOnTitle: { en: "Follow-on Title", fr: "Titre du suivi", ar: "عنوان المتابعة" },
    reasonForFollowOn: { en: "Reason for Follow-on", fr: "Raison du suivi", ar: "سبب المتابعة" },
    createWO: { en: "Create WO", fr: "Créer l'OT", ar: "إنشاء أمر العمل" },
    checklistAndTasks: { en: "Checklist & Tasks", fr: "Liste de contrôle et tâches", ar: "قائمة التحقق والمهام" },
    inventoryAndParts: { en: "Inventory & Parts", fr: "Inventaire et pièces", ar: "المخزون والقطع" },
    interventionSummary: { en: "Intervention Summary", fr: "Résumé de l'intervention", ar: "ملخص التدخل" },
    watchers: { en: "Watchers", fr: "Observateurs", ar: "المراقبون" },
    noDescription: { en: "No description provided.", fr: "Aucune description fournie.", ar: "لا يوجد وصف." },
    completionNotes: { en: "Completion Notes", fr: "Notes d'achèvement", ar: "ملاحظات الإكمال" },
    steps: { en: "Steps", fr: "Étapes", ar: "خطوات" },
    schedule: { en: "Schedule", fr: "Planification", ar: "الجدول الزمني" },
    notSet: { en: "Not set", fr: "Non défini", ar: "لم يحدد" },
    notScheduled: { en: "Not scheduled", fr: "Non planifié", ar: "غير جدولة" },
    completedAt: { en: "Completed At", fr: "Terminé le", ar: "اكتمل في" },
    interventionChecklist: { en: "Intervention Checklist", fr: "Liste de contrôle de l'intervention", ar: "قائمة تحقق التدخل" },
    addStep: { en: "Add Step", fr: "Ajouter une étape", ar: "إضافة خطوة" },
    useAddPartButton: { en: "Use the 'Add Part' button to record inventory consumption for this intervention.", fr: "Utilisez le bouton 'Ajouter une pièce' pour enregistrer la consommation de stock.", ar: "استخدم زر 'إضافة قطعة' لتسجيل استهلاك المخزون." },
    unknownPart: { en: "Unknown Part", fr: "Pièce inconnue", ar: "قطعة غير معروفة" },
    unitCost: { en: "Unit Cost", fr: "Coût unitaire", ar: "تكلفة الوحدة" },
    linkedToTask: { en: "Linked to Task", fr: "Lié à la tâche", ar: "مرتبط بالمهمة" },
    originClaimPhotos: { en: "Photos from Originating Claim", fr: "Photos de la réclamation d'origine", ar: "صور من المطالبة الأصلية" },
    interventionTimeline: { en: "Intervention Timeline", fr: "Chronologie de l'intervention", ar: "الخط الزمني للتدخل" },
    woGenerated: { en: "Work Order Generated", fr: "Ordre de travail généré", ar: "تم إنشاء أمر العمل" },
    originatingFrom: { en: "Originating from", fr: "Originaire de", ar: "صادر من" },
    manualEntry: { en: "Manual Entry", fr: "Saisie manuelle", ar: "إديخال يدوي" },
    executionCompleted: { en: "Execution Completed", fr: "Exécution terminée", ar: "اكتمل التنفيذ" },
    recordTaskFailure: { en: "Record Task Failure", fr: "Enregistrer l'échec de la tâche", ar: "تسجيل فشل المهمة" },
    failureDescription: { en: "Failure Description / Notes", fr: "Description de l'échec / Notes", ar: "وصف الفشل / ملاحظات" },
    explainFailure: { en: "Explain why this step failed...", fr: "Expliquez pourquoi cette étape a échoué...", ar: "اشرح لماذا فشلت هذه الخطوة..." },
    criticalBlocker: { en: "Critical Blocker?", fr: "Bloqueur critique ?", ar: "عائق حرج؟" },
    blockerDescription: { en: "This will flag the whole Work Order for manager review.", fr: "Cela signalera tout l'ordre de travail pour examen par le gestionnaire.", ar: "سيؤدي هذا إلى وضع علامة على أمر العمل بالكامل لمراجعة المدير." },
    confirmFailure: { en: "Confirm Failure", fr: "Confirmer l'échec", ar: "تأكيد الفشل" },
    searchInventory: { en: "Search Entire Inventory", fr: "Rechercher dans tout l'inventaire", ar: "البحث في المخزون بالكامل" },
    skuOrName: { en: "SKU or Part Name...", fr: "SKU ou nom de la pièce...", ar: "رقم القطعة أو اسمها..." },
    matches: { en: "Matches", fr: "Correspondances", ar: "التطابقات" },
    selectPart: { en: "Select a part...", fr: "Sélectionner une pièce...", ar: "اختر قطعة..." },
    inStock: { en: "in stock", fr: "en stock", ar: "في المخزون" },
    linkToStep: { en: "Link to Execution Step (Optional)", fr: "Lier à l'étape d'exécution (Optionnel)", ar: "ربط بخطوة التنفيذ (اختياري)" },
    generalUsage: { en: "General Work Order usage", fr: "Utilisation générale de l'ordre de travail", ar: "استخدام عام لأمر العمل" },
    restock: { en: "Restock", fr: "Réapprovisionner", ar: "طلب توريد" },
    linking: { en: "Linking...", fr: "Liaison...", ar: "جاري الربط..." },
    linkPart: { en: "Link Part to WO", fr: "Lier la pièce à l'OT", ar: "ربط القطعة بأمر العمل" },
    insufficientStock: { en: "Insufficient Stock: Request Restock", fr: "Stock insuffisant : demande de réapprovisionnement", ar: "مخزون غير كافٍ: طلب توريد" },
    restockDescription: { en: "The requested part is out of stock. You can submit a restock request to the maintenance manager.", fr: "La pièce demandée est en rupture de stock. Vous pouvez soumettre une demande au gestionnaire.", ar: "القطعة المطلوبة غير متوفرة. يمكنك تقديم طلب توريد لمدير الصيانة." },
    quantityToRequest: { en: "Quantity to Request", fr: "Quantité à demander", ar: "الكمية المطلوبة" },
    submitting: { en: "Submitting...", fr: "Envoi...", ar: "جاري الإرسال..." },
    submitRestock: { en: "Submit Restock Request", fr: "Soumettre la demande", ar: "إرسال طلب التوريد" },
    newExecutionStep: { en: "New Execution Step", fr: "Nouvelle étape d'exécution", ar: "خطوة تنفيذ جديدة" },
    defineStepDescription: { en: "Define a specific task or sub-step for this work order.", fr: "Définissez une tâche spécifique ou une sous-étape.", ar: "حدد مهمة محددة أو خطوة فرعية لأمر العمل هذا." },
    creationMode: { en: "Creation Mode", fr: "Mode de création", ar: "وضع الإنشاء" },
    customTask: { en: "Custom Task", fr: "Tâche personnalisée", ar: "مهمة مخصصة" },
    useTemplate: { en: "Use Template", fr: "Utiliser un modèle", ar: "استخدام نموذج" },
    selectTemplate: { en: "Select Template", fr: "Sélectionner un modèle", ar: "اختر نموذجاً" },
    chooseTemplate: { en: "Choose a template", fr: "Choisir un modèle", ar: "اختر نموذجاً" },
    generatedChecklist: { en: "Generated Checklist", fr: "Liste de contrôle générée", ar: "قائمة التحقق الناتجة" },
    stepTitle: { en: "Step Title", fr: "Titre de l'étape", ar: "عنوان الخطوة" },
    instructionsDescription: { en: "Instructions / Description", fr: "Instructions / Description", ar: "التعليمات / الوصف" },
    parentStep: { en: "Parent Step (Optional)", fr: "Étape parente (Optionnel)", ar: "الخطوة الأب (اختياري)" },
    noParent: { en: "No Parent", fr: "Pas de parent", ar: "لا يوجد أب" },
    selectTechnician: { en: "Select Technician...", fr: "Sélectionner un technicien...", ar: "اختر فنياً..." },
    createStep: { en: "Create Step", fr: "Créer l'étape", ar: "إنشاء خطوة" },
    rescheduleNote: { en: "Setting dates will move this WO to SCHEDULED status if currently CREATED or ASSIGNED.", fr: "La définition des dates passera cet OT au statut PLANIFIÉ.", ar: "سيؤدي تحديد المواعيد إلى نقل أمر العمل هذا إلى حالة مجدولة." },
    saveSchedule: { en: "Save Schedule", fr: "Enregistrer la planification", ar: "حفظ الجدول" },
    saving: { en: "Saving...", fr: "Enregistrement...", ar: "جاري الحفظ..." }
  };

  Object.keys(newKeys).forEach(key => {
    translations.en[key] = newKeys[key].en;
    translations.fr[key] = newKeys[key].fr;
    translations.ar[key] = newKeys[key].ar;
  });

  const languages = ['en', 'fr', 'ar'];
  const allKeys = Array.from(new Set(Object.values(translations).flatMap(o => Object.keys(o)))).sort();

  const outputLines = ['{'];
  languages.forEach(lang => {
    outputLines.push(`  ${lang}: {`);
    allKeys.forEach(key => {
      let val = (translations[lang][key] || translations['en'][key] || '').replace(/'/g, "\\'");
      outputLines.push(`    ${key}: '${val}',`);
    });
    outputLines.push('  },');
  });
  outputLines.push('}');

  const newContent = content.substring(0, startIdx) + outputLines.join('\n') + content.substring(endIdx);
  fs.writeFileSync(i18nPath, newContent);
  console.log('Updated lib/i18n.tsx with comprehensive work order detail keys');
}

updateI18n();
