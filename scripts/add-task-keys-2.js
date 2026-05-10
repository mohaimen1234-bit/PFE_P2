const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const arKeysToAdd = {
  executionTask: "مهمة التنفيذ",
  statusProgress: "الحالة / التقدم",
  deadline: "الموعد النهائي",
  viewDetails: "عرض التفاصيل",
  showing: "عرض",
  to: "إلى",
  of: "من",
  results: "نتائج",
  derivedTask: "مهمة مشتقة",
  technician: "فني",
  dueDate: "تاريخ الاستحقاق",
  noDate: "بدون تاريخ",
};

const enKeysToAdd = {
  executionTask: "Execution Task",
  statusProgress: "Status / Progress",
  deadline: "Deadline",
  viewDetails: "View Details",
  showing: "Showing",
  to: "to",
  of: "of",
  results: "results",
  derivedTask: "Derived Task",
  technician: "Technician",
  dueDate: "Due Date",
  noDate: "No Date",
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
console.log('Successfully updated i18n with missing Task table keys');
