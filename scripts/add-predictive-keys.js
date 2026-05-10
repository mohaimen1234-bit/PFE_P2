const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const arKeysToAdd = {
  imminent_failure: "عطل وشيك",
  high_failure_risk: "خطر تعطل عالٍ",
  degraded_performance: "أداء متدهور",
  early_wear: "تآكل مبكر",
  normal_operation: "تشغيل طبيعي",
  wo_open: "أمر عمل مفتوح",
  awaiting_validation: "بانتظار التحقق",
  ready_to_schedule: "جاهز للجدولة",
  no_action_needed: "لا يلزم اتخاذ إجراء",
  riskFactors: "عوامل الخطر",
  finalRiskScore: "درجة الخطر النهائية",
  suggestedSeverity: "الخطورة المقترحة",
  riskBreakdown: "تفصيل المخاطر",
  ageRisk: "خطر العمر",
  failureHistoryRisk: "خطر تاريخ الأعطال",
  meterThresholdRisk: "خطر تجاوز العداد",
  predictiveOutcomeCredit: "خصم التنبؤ",
  pofScore: "درجة POF",
  criticalityMultiplier: "مضاعف الأهمية",
  recommendedAction: "الإجراء الموصى به",
  predictiveMaintenanceDesc: "تحليل الصيانة التنبؤية القائم على الذكاء الاصطناعي لمعدات المستشفى.",
  suggestedPriority: "الأولوية المقترحة",
  suggestedWorkOrderType: "نوع أمر العمل المقترح",
  predictiveWorkOrderCreated: "تم إنشاء أمر عمل تنبؤي",
  analyzingRiskProfiles: "جاري تحليل ملفات تعريف مخاطر المعدات...",
  refreshAnalysis: "تحديث التحليل",
  equipmentMonitored: "المعدات المراقبة",
  highRisk: "خطر عالٍ",
  criticalRisk: "خطر حرج",
  interventionsNeeded: "التدخلات المطلوبة",
  avgRiskScore: "متوسط درجة الخطر",
  noEquipmentData: "لا توجد بيانات للمعدات",
  equipmentMustBeReg: "يجب تسجيل المعدات قبل تشغيل التحليل التنبؤي.",
  noMatches: "لا توجد معدات تطابق الفلاتر.",
  viewEquipment: "عرض المعدة",
  createPredictiveWO: "إنشاء أمر عمل تنبؤي",
  riskFactorDetails: "تفاصيل عوامل الخطر",
  score: "الدرجة",
  state: "الحالة",
  failures: "الأعطال",
  meter: "العداد",
};

const enKeysToAdd = {
  imminent_failure: "Imminent Failure",
  high_failure_risk: "High Failure Risk",
  degraded_performance: "Degraded Performance",
  early_wear: "Early Wear",
  normal_operation: "Normal Operation",
  wo_open: "WO Open",
  awaiting_validation: "Awaiting Validation",
  ready_to_schedule: "Ready to Schedule",
  no_action_needed: "No Action Needed",
  riskFactors: "Risk Factors",
  finalRiskScore: "Final Risk Score",
  suggestedSeverity: "Suggested Severity",
  riskBreakdown: "Risk Breakdown",
  ageRisk: "Age Risk",
  failureHistoryRisk: "Failure History Risk",
  meterThresholdRisk: "Meter Threshold Risk",
  predictiveOutcomeCredit: "Predictive Outcome Credit",
  pofScore: "POF Score",
  criticalityMultiplier: "Criticality Multiplier",
  recommendedAction: "Recommended Action",
  predictiveMaintenanceDesc: "AI-powered predictive maintenance analysis for hospital equipment.",
  suggestedPriority: "Suggested Priority",
  suggestedWorkOrderType: "Suggested Work Order Type",
  predictiveWorkOrderCreated: "Predictive Work Order Created",
  analyzingRiskProfiles: "Analyzing equipment risk profiles...",
  refreshAnalysis: "Refresh Analysis",
  equipmentMonitored: "Equipment Monitored",
  highRisk: "High Risk",
  criticalRisk: "Critical Risk",
  interventionsNeeded: "Interventions Needed",
  avgRiskScore: "Avg Risk Score",
  noEquipmentData: "No Equipment Data",
  equipmentMustBeReg: "Equipment must be registered before predictive analysis can run.",
  noMatches: "No equipment matches your filters.",
  viewEquipment: "View Equipment",
  createPredictiveWO: "Create Predictive WO",
  riskFactorDetails: "Risk Factor Details",
  score: "Score",
  state: "State",
  failures: "Failures",
  meter: "Meter",
};

// Add English keys
let enIndex = content.indexOf('en: {') + 5;
let enEntries = "";
for (const [k, v] of Object.entries(enKeysToAdd)) {
  if (!content.includes(`${k}:`)) {
    enEntries += `\n    ${k}: "${v}",`;
  }
}
content = content.slice(0, enIndex) + enEntries + content.slice(enIndex);

// Add Arabic keys
let arIndex = content.indexOf('ar: {') + 5;
let arEntries = "";
for (const [k, v] of Object.entries(arKeysToAdd)) {
  if (!content.includes(`${k}:`)) {
    arEntries += `\n    ${k}: "${v}",`;
  }
}
content = content.slice(0, arIndex) + arEntries + content.slice(arIndex);

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Successfully updated i18n with AI Predictive keys');
