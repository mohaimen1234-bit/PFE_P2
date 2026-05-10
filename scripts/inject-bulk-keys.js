const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = {
  loadingPlanDetails: { en: "Loading plan details...", fr: "Chargement des détails du plan...", ar: "جاري تحميل تفاصيل الخطة..." },
  planNotFound: { en: "Plan not found", fr: "Plan non trouvé", ar: "الخطة غير موجودة" },
  regulatoryTraceabilityDesc: { en: "Regulatory traceability requires a mandatory reason for any date modification.", fr: "La traçabilité réglementaire exige un motif obligatoire pour toute modification de date.", ar: "تتطلب التتبع التنظيمي سبباً إلزامياً لأي تعديل في التاريخ." },
  reasonForPostponement: { en: "Reason for Postponement", fr: "Motif du report", ar: "سبب التأجيل" },
  reschedulePlaceholder: { en: "e.g. Spare parts delay, Provider unavailability...", fr: "ex: Retard de pièces, indisponibilité du prestataire...", ar: "مثلاً تأخير في قطع الغيار، عدم توفر المورد..." },
  updateDueDate: { en: "Update Due Date", fr: "Mettre à jour l'échéance", ar: "تحديث تاريخ الاستحقاق" },
  wait: { en: "Wait...", fr: "Attendre...", ar: "انتظر..." },
  everyRecurrence: { en: "Every {value} {unit}", fr: "Tous les {value} {unit}", ar: "كل {value} {unit}" },
  yes: { en: "YES", fr: "OUI", ar: "نعم" },
  no: { en: "NO", fr: "NON", ar: "لا" },
  lastPostponementReason: { en: "Last Postponement Reason", fr: "Dernier motif de report", ar: "سبب التأجيل الأخير" },
  noWorkOrdersGeneratedYet: { en: "No work orders have been generated for this plan yet.", fr: "Aucun bon de travail n'a encore été généré pour ce plan.", ar: "لم يتم إنشاء أوامر عمل لهذه الخطة بعد." },
  planStatus: { en: "Plan Status", fr: "Statut du plan", ar: "حالة الخطة" },
  progressToNextDue: { en: "Progress to Next Due", fr: "Progression vers l'échéance", ar: "التقدم نحو الاستحقاق القادم" },
  woGeneratedSuccessfully: { en: "Work Order generated successfully", fr: "Bon de travail généré avec succès", ar: "تم إنشاء أمر العمل بنجاح" },
  loadingAnalyticsEngine: { en: "Loading Analytics Engine...", fr: "Chargement du moteur d'analyse...", ar: "جاري تحميل محرك التحليلات..." },
  last12Months: { en: "Last 12 Months", fr: "12 derniers mois", ar: "آخر 12 شهراً" },
  exportPdf: { en: "Export PDF", fr: "Exporter en PDF", ar: "تصدير PDF" },
  totalSpend: { en: "Total Spend", fr: "Dépenses totales", ar: "إجمالي الإنفاق" },
  meanTimeBetweenFailures: { en: "Mean Time Between Failures", fr: "Temps moyen entre pannes", ar: "متوسط الوقت بين الأعطال" },
  lowStockAlerts: { en: "Low Stock Alerts", fr: "Alertes stock faible", ar: "تنبيهات نقص المخزون" },
  urgentRestocksNeeded: { en: "Urgent Restocks Needed", fr: "Réapprovisionnements urgents requis", ar: "مطلوب إعادة تخزين عاجلة" },
  maintenanceSpendByType: { en: "Maintenance Spend by Equipment Type", fr: "Dépenses de maintenance par type d'équipement", ar: "إنفاق الصيانة حسب نوع المعدات" },
  financialDistDesc: { en: "Financial distribution across surgical, imaging, and general equipment.", fr: "Distribution financière entre les équipements chirurgicaux, d'imagerie et généraux.", ar: "التوزيع المالي عبر المعدات الجراحية والتصويرية والعامة." },
  operationalHealthCheck: { en: "Operational Health Check", fr: "Bilan de santé opérationnel", ar: "فحص الصحة التشغيلية" },
  statusDistDesc: { en: "Status distribution of rolling work orders.", fr: "Distribution par statut des bons de travail en cours.", ar: "توزيع حالة أوامر العمل الجارية." },
  totalWo: { en: "Total WO", fr: "Total BT", ar: "إجمالي أوامر العمل" },
  reliabilityCompliance: { en: "Reliability & Compliance", fr: "Fiabilité et Conformité", ar: "الموثوقية والامتثال" },
  benchmarkingDesc: { en: "Benchmarking equipment health across the hospital network.", fr: "Analyse comparative de la santé des équipements sur le réseau hospitalier.", ar: "قياس صحة المعدات عبر شبكة المستشفى." },
  systemAvailability: { en: "System Availability", fr: "Disponibilité du système", ar: "توفر النظام" },
  optimalPerformance: { en: "Optimal performance", fr: "Performance optimale", ar: "الأداء الأمثل" },
  pmCompliance: { en: "PM Compliance", fr: "Conformité MP", ar: "الامتثال للصيانة الوقائية" },
  plannedVsActual: { en: "Planned vs Actual", fr: "Prévu vs Réel", ar: "المخطط مقابل الفعلي" },
  reactiveWorkPressure: { en: "Reactive work pressure", fr: "Pression du travail curatif", ar: "ضغط العمل التصحيحي" },
  safetyCheckRate: { en: "Safety Check Rate", fr: "Taux de contrôle de sécurité", ar: "معدل فحص السلامة" },
  medicalComplianceLocked: { en: "Medical compliance locked", fr: "Conformité médicale verrouillée", ar: "الامتثال الطبي مؤمن" },
  efficiencyInsights: { en: "Efficiency Insights", fr: "Aperçus de l'efficacité", ar: "رؤى الكفاءة" },
  aiObservationsDesc: { en: "Automated AI observations on current trends.", fr: "Observations IA automatisées sur les tendances actuelles.", ar: "ملاحظات الذكاء الاصطناعي الآلية حول الاتجاهات الحالية." },
  repairEfficiencyImproving: { en: "Repair efficiency is improving", fr: "L'efficacité des réparations s'améliore", ar: "كفاءة الإصلاح في تحسن" },
  mttrDecreasedDesc: { en: "MTTR has decreased by 15% overall compared to last quarter.", fr: "Le MTTR a diminué de 15% globalement par rapport au trimestre dernier.", ar: "انخفض MTTR بنسبة 15٪ بشكل عام مقارنة بالربع الأخير." },
  stockoutsImaging: { en: "Stockouts in Imaging", fr: "Ruptures de stock en Imagerie", ar: "نقص المخزون في التصوير" },
  xraySpikeDesc: { en: "Recent spike in X-Ray corrective work orders is draining spare part reserves.", fr: "L'augmentation récente des bons de travail correctifs pour les rayons X épuise les réserves de pièces.", ar: "الارتفاع الأخير في أوامر العمل التصحيحية للأشعة السينية يستنزف احتياطيات قطع الغيار." },
  calibrationAlertsDesc: { en: "Centralized calibration alerts achieved 100% notification rate.", fr: "Les alertes de calibration centralisées ont atteint un taux de notification de 100%.", ar: "حققت تنبيهات المعايرة المركزية معدل إخطار بنسبة 100٪." },
  invalidWorkOrderID: { en: "Invalid Work Order ID", fr: "ID du bon de travail non valide", ar: "معرف أمر العمل غير صالح" },
  failedToLoadWODetails: { en: "Failed to load work order details.", fr: "Échec du chargement des détails du bon de travail.", ar: "فشل تحميل تفاصيل أمر العمل." },
  loadingWorkOrder: { en: "Loading work order...", fr: "Chargement du bon de travail...", ar: "جاري تحميل أمر العمل..." },
  selectPrimaryTechnician: { en: "Select Primary Technician", fr: "Sélectionner le technicien principal", ar: "اختر الفني الرئيسي" },
  techScoreTasks: { en: "Score: {score} ({count} tasks)", fr: "Score: {score} ({count} tâches)", ar: "النتيجة: {score} ({count} مهام)" },
  pleaseSelectAnEquipment: { en: "Please select an equipment", fr: "Veuillez sélectionner un équipement", ar: "يرجى اختيار معدة" },
  pleaseFillOrRemoveEmptySteps: { en: "Please fill or remove empty steps", fr: "Veuillez remplir ou supprimer les étapes vides", ar: "يرجى ملء أو إزالة الخطوات الفارغة" },
  regulatoryPlanCreatedSuccess: { en: "Regulatory plan created successfully", fr: "Plan réglementaire créé avec succès", ar: "تم إنشاء الخطة التنظيمية بنجاح" },
  failedToCreatePlan: { en: "Failed to create plan", fr: "Échec de la création du plan", ar: "فشل إنشاء الخطة" },
  definedStepsDesc: { en: "Defined steps will be copied to generated work orders.", fr: "Les étapes définies seront copiées dans les bons de travail générés.", ar: "سيتم نسخ الخطوات المحددة إلى أوامر العمل المنشأة." },
  monthly: { en: "Monthly", fr: "Mensuel", ar: "شهرياً" },
  quarterly: { en: "Quarterly", fr: "Trimestriel", ar: "فصلياً" },
  semiAnnual: { en: "Semi-Annual", fr: "Semestriel", ar: "نصف سنوي" },
  annual: { en: "Annual", fr: "Annuel", ar: "سنوي" },
  executionHistory: { en: "Execution History", fr: "Historique d'Exécution", ar: "سجل التنفيذ" },
  businessIntelligence: { en: "Business Intelligence", fr: "Intelligence d'Affaires", ar: "ذكاء الأعمال" },
  planTitle: { en: "Plan Title", fr: "Titre du plan", ar: "عنوان الخطة" },
  descriptionObjective: { en: "Description / Objective", fr: "Description / Objectif", ar: "الوصف / الهدف" },
  everyValue: { en: "Every (Value)", fr: "Chaque (Valeur)", ar: "كل (قيمة)" },
  estDurationHrs: { en: "Est. Duration (hrs)", fr: "Durée est. (hrs)", ar: "المدة المقدرة (ساعة)" },
  savePlan: { en: "Save Plan", fr: "Enregistrer le plan", ar: "حفظ الخطة" }
};

for (const lang of ['en', 'fr', 'ar']) {
  const startMarker = `${lang}: {`;
  const insertIndex = content.indexOf(startMarker) + startMarker.length;
  
  let newEntries = "";
  for (const [key, vals] of Object.entries(newKeys)) {
    if (!content.includes(`${key}:`)) {
      newEntries += `\n    ${key}: "${vals[lang].replace(/"/g, '\\"')}",`;
    }
  }
  
  content = content.slice(0, insertIndex) + newEntries + content.slice(insertIndex);
}

fs.writeFileSync(i18nPath, content);
console.log('Successfully injected dashboard keys');
