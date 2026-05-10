/**
 * Fix FR Arabic contamination and AR missing translations in-place.
 */
const fs = require('fs');
const content = fs.readFileSync('lib/i18n.tsx', 'utf8');
let lines = content.split('\n');

// ── FR fixes (Arabic values → correct French) ──────────────────────────────
const frFixes = {
  at_risk: "En Danger",
  criticalityMultiplier: "Multiplicateur de Criticité",
  currentStage: "Étape Actuelle",
  failureHistoryRisk: "Risque d'Historique de Pannes",
  failures: "Pannes",
  generalUsage: "Utilisation Générale",
  language: "Langue",
  manage: "Gérer",
  meter: "Compteur",
  meterThresholdRisk: "Risque de Seuil Compteur",
  page: "Page",
  predictiveMaintenanceDesc: "Enregistrement des risques et recommandations d'intervention par IA",
  predictiveOutcomeCredit: "Crédit de Résultat Prédictif",
  recommendedAction: "Action Recommandée",
  referenceDataManage: "Gestion des Données de Référence",
  risk: "Risque",
  riskBreakdown: "Analyse des Risques",
  riskFactors: "Facteurs de Risque",
  score: "Score",
  settings: "Paramètres",
  severity: "Sévérité",
  state: "État",
  suggestedSeverity: "Sévérité Suggérée",
};

// ── AR fixes (English-only → Arabic) ─────────────────────────────────────
const arFixes = {
  blockingFactor: "عامل التعطيل",
  calibrationAlertsDesc: "حققت تنبيهات المعايرة المركزية معدل إشعار 100%.",
  no: "لا",
  updateDueDate: "تحديث تاريخ الاستحقاق",
  urgentRestocksNeeded: "إعادة تموين عاجلة مطلوبة",
  wait: "انتظر...",
  woActive: "أمر عمل نشط",
  woGeneratedSuccessfully: "تم إنشاء أمر العمل بنجاح",
  xraySpikeDesc: "الارتفاع الأخير في أوامر العمل التصحيحية للأشعة السينية يستنفد احتياطي قطع الغيار.",
  yes: "نعم",
};

// Find block boundaries
let frStart = -1, frEnd = -1, arStart = -1, arEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'fr: {' && frStart === -1) frStart = i;
  if (frStart > 0 && lines[i].trim() === 'ar: {' && frEnd === -1) { frEnd = i; arStart = i; }
  if (arStart > 0 && lines[i].trim() === '},' && i > arStart + 5 && arEnd === -1) arEnd = i;
}
console.log(`FR: ${frStart}–${frEnd}, AR: ${arStart}–${arEnd}`);

// Apply FR fixes
let frFixed = 0;
for (let i = frStart + 1; i < frEnd; i++) {
  const m = lines[i].match(/^(\s+)(\w+):\s+'(.+)',?(\s*)$/);
  if (m && frFixes[m[2]]) {
    lines[i] = `${m[1]}${m[2]}: '${frFixes[m[2]]}',`;
    frFixed++;
  }
}
console.log(`FR: fixed ${frFixed} contaminated keys`);

// Apply AR fixes
let arFixed = 0;
for (let i = arStart + 1; i < arEnd; i++) {
  const m = lines[i].match(/^(\s+)(\w+):\s+'(.+)',?(\s*)$/);
  if (m && arFixes[m[2]]) {
    lines[i] = `${m[1]}${m[2]}: '${arFixes[m[2]]}',`;
    arFixed++;
  }
}
console.log(`AR: fixed ${arFixed} untranslated keys`);

fs.writeFileSync('lib/i18n.tsx', lines.join('\n'));
console.log('Done!');
