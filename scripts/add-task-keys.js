const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const arKeysToAdd = {
  taskCenter: "مركز المهام",
  toDo: "للقيام به",
  estDuration: "المدة المقدرة",
  blockingFactor: "عامل الحظر",
  technicalNotes: "ملاحظات تقنية",
  durationOverride: "تجاوز المدة",
  commitRecord: "تسجيل البيانات",
  taskInstructions: "تعليمات المهمة",
  proceduralChecklist: "قائمة التحقق الإجرائية",
  executionProof: "إثبات التنفيذ",
  preExecution: "قبل التنفيذ",
  postExecution: "بعد التنفيذ",
  markComplete: "تحديد كمكتمل",
  replanTask: "إعادة جدولة المهمة",
  block: "حظر",
  startTimer: "بدء المؤقت",
  stopTimer: "إيقاف المؤقت",
  fieldObservations: "الملاحظات الميدانية",
  noInstructionsProvided: "لا توجد تعليمات مقدمة.",
  noChecklistDefined: "لا توجد قائمة تحقق محددة لهذا الإجراء.",
  clickToUploadProof: "انقر لتحميل الإثبات",
  uploading: "جاري التحميل...",
  activeTimer: "المؤقت النشط",
  executing: "جاري التنفيذ",
  replanRequest: "طلب إعادة جدولة",
  noInstructions: "لا توجد تعليمات",
  actualHrs: "الساعات الفعلية",
  hrs: "ساعة",
  steps: "خطوات",
  taskNotFound: "المهمة غير موجودة.",
  priorityPriority: "أولوية {priority}",
  replanTaskDesc: "إعادة جدولة هذه المهمة لموعد لاحق.",
  requestReplanDesc: "طلب من المدير إعادة جدولة هذه المهمة.",
  loadingTaskDetails: "جاري تحميل تفاصيل المهمة...",
  taskInstructionsDesc: "تعليمات مفصلة للمهمة.",
  noObstaclesReported: "لم يتم الإبلاغ عن عوائق",
  describeFindings: "صف النتائج أو قطع الغيار المستبدلة...",
};

const enKeysToAdd = {
  taskCenter: "Task Center",
  toDo: "To Do",
  estDuration: "Est. Duration",
  blockingFactor: "Blocking Factor",
  technicalNotes: "Technical Notes",
  durationOverride: "Duration Override",
  commitRecord: "Commit Record",
  taskInstructions: "Task Instructions",
  proceduralChecklist: "Procedural Checklist",
  executionProof: "Execution Proof",
  preExecution: "Pre-Execution",
  postExecution: "Post-Execution",
  markComplete: "Mark Complete",
  replanTask: "Replan Task",
  block: "Block",
  startTimer: "Start Timer",
  stopTimer: "Stop Timer",
  fieldObservations: "Field Observations",
  noInstructionsProvided: "No instructions provided.",
  noChecklistDefined: "No checklist defined for this procedure.",
  clickToUploadProof: "Click to upload proof",
  uploading: "Uploading...",
  activeTimer: "Active Timer",
  executing: "Executing",
  replanRequest: "Request Replan",
  noInstructions: "No instructions",
  actualHrs: "Actual hrs",
  hrs: "HRS",
  steps: "STEPS",
  taskNotFound: "Task not found.",
  priorityPriority: "{priority} Priority",
  replanTaskDesc: "Replan this task for a later date.",
  requestReplanDesc: "Ask manager to replan this task.",
  loadingTaskDetails: "Loading task details...",
  taskInstructionsDesc: "Detailed instructions for this task.",
  noObstaclesReported: "No obstacles reported",
  describeFindings: "Describe findings, part replacements, or adjustments...",
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
console.log('Successfully updated i18n with Task page keys');
