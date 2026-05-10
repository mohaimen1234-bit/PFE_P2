const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const arKeysToAdd = {
  manageYourMaintenance: "إدارة تدخلات الصيانة وتتبع تقدمها.",
  rescheduleMaintenance: "إعادة جدولة الصيانة",
  adjustingTimelinesFor: "تعديل الجداول الزمنية لـ",
  createExecutionTask: "إنشاء مهمة تنفيذ",
  executionTaskDesc: "حدد مهمة جديدة أو مهمة فرعية للصيانة.",
};

const enKeysToAdd = {
  manageYourMaintenance: "Manage your maintenance interventions and track their progress.",
  rescheduleMaintenance: "Reschedule Maintenance",
  adjustingTimelinesFor: "Adjusting timelines for",
  createExecutionTask: "Create Execution Task",
  executionTaskDesc: "Define a new task or sub-task for maintenance.",
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
console.log('Successfully updated i18n with full Task page keys');
