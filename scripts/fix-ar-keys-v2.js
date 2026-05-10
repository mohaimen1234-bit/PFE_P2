const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

// First, restore the broken lines caused by the previous bad regex
content = content.replace(/language: 'العمر'/g, "language: 'اللغة'");
content = content.replace(/manage: 'العمر'/g, "manage: 'إدارة'");
content = content.replace(/page: 'العمر'/g, "page: 'صفحة'");

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

// Find the Arabic object start and end
const arStart = content.indexOf('ar: {');
const arEnd = content.lastIndexOf('},', content.length - 2); // Assuming it's the last object or similar
// Actually, let's find the 'ar: {' and the matching closing '}'
let depth = 0;
let arObjectStart = -1;
let arObjectEnd = -1;

for (let i = arStart; i < content.length; i++) {
  if (content[i] === '{') {
    if (depth === 0) arObjectStart = i;
    depth++;
  } else if (content[i] === '}') {
    depth--;
    if (depth === 0) {
      arObjectEnd = i;
      break;
    }
  }
}

let arContent = content.slice(arObjectStart, arObjectEnd);

for (const [key, value] of Object.entries(arKeysToFix)) {
  const regex = new RegExp(`\\b${key}:\\s*['"].*?['"]`, 'g');
  if (arContent.includes(`${key}:`)) {
    arContent = arContent.replace(regex, `${key}: '${value}'`);
  } else {
    arContent = `\n    ${key}: '${value}',` + arContent;
  }
}

content = content.slice(0, arObjectStart) + arContent + content.slice(arObjectEnd);

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Successfully updated i18n with corrected Arabic keys and fixed regression');
