const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const arKeysToFix = {
  settings: "الإعدادات",
  severity: "الخطورة",
  state: "الحالة",
  suggestedSeverity: "الخطورة المقترحة",
  risk: "الخطر",
  score: "النقاط",
  age: "العمر",
  failures: "الأعطال",
  meter: "العداد",
  riskFactors: "عوامل الخطر",
  recommendedAction: "الإجراء الموصى به",
  riskBreakdown: "تفصيل المخاطر",
  ageRisk: "مخاطر العمر",
  failureHistoryRisk: "مخاطر سجل الأعطال",
  meterThresholdRisk: "مخاطر تجاوز العداد",
  predictiveOutcomeCredit: "رصيد النتيجة التنبؤية",
  criticalityMultiplier: "مضاعف الأهمية",
  predictiveMaintenanceDesc: "تسجيل المخاطر وتوصيات التدخل باستخدام نماذج الذكاء الاصطناعي",
  imminent_failure: "فشل وشيك",
  high_failure_risk: "خطر فشل عالٍ",
  degraded_performance: "أداء متدهور",
  early_wear: "تآكل مبكر",
  normal_operation: "تشغيل عادي",
  wo_open: "أمر عمل مفتوح",
  awaiting_validation: "في انتظار التحقق",
  ready_to_schedule: "جاهز للجدولة",
  no_action_needed: "لا يلزم اتخاذ إجراء",
  no_action: "لا يوجد إجراء",
  early_warning: "تحذير مبكر",
};

// Update existing or add missing keys in Arabic object
for (const [key, value] of Object.entries(arKeysToFix)) {
  const regex = new RegExp(`${key}:\\s*['"].*?['"]`, 'g');
  if (content.includes(`${key}:`)) {
    // Replace existing
    content = content.replace(regex, `${key}: '${value}'`);
  } else {
    // Add new (insert at start of ar object)
    const arIndex = content.indexOf('ar: {') + 5;
    content = content.slice(0, arIndex) + `\n    ${key}: '${value}',` + content.slice(arIndex);
  }
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Successfully updated i18n with corrected Arabic keys');
