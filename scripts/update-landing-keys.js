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
    aiPoweredMaintenance: { en: "AI-Powered Hospital Maintenance", fr: "Maintenance hospitalière assistée par IA", ar: "صيانة المستشفيات المدعومة بالذكاء الاصطناعي" },
    hospitals: { en: "Hospitals", fr: "Hôpitaux", ar: "مستشفيات" },
    equipmentManaged: { en: "Equipment Managed", fr: "Équipements gérés", ar: "معدة تدار" },
    uptime: { en: "Uptime", fr: "Temps de disponibilité", ar: "وقت التشغيل" },
    downtimeReduction: { en: "Downtime Reduction", fr: "Réduction des temps d'arrêt", ar: "تقليل وقت التوقف" },
    hospitalGradeMaintenance: { en: "Everything you need for hospital-grade maintenance management", fr: "Tout ce dont vous avez besoin pour une gestion de maintenance de niveau hospitalier", ar: "كل ما تحتاجه لإدارة صيانة المستشفيات بمستوى احترافي" },
    trackMetrics: { en: "Track the metrics that matter most for hospital maintenance excellence", fr: "Suivez les indicateurs qui comptent le plus pour l'excellence de la maintenance hospitalière", ar: "تتبع المقاييس الأكثر أهمية لتميز صيانة المستشفيات" },
    trustedByLeading: { en: "Trusted by leading healthcare institutions worldwide", fr: "Approuvé par les plus grandes institutions de santé dans le monde", ar: "موثوق به من قبل المؤسسات الصحية الرائدة في جميع أنحاء العالم" },
    readyToTransform: { en: "Ready to transform your hospital maintenance?", fr: "Prêt à transformer votre maintenance hospitalière ?", ar: "جاهز لتحويل صيانة المستشفى الخاص بك؟" },
    joinHospitals: { en: "Join 500+ hospitals using MedCare GMAO to reduce downtime, cut costs, and improve patient safety.", fr: "Rejoignez plus de 500 hôpitaux utilisant MedCare GMAO pour réduire les temps d'arrêt, diminuer les coûts et améliorer la sécurité des patients.", ar: "انضم إلى أكثر من 500 مستشفى تستخدم MedCare GMAO لتقليل وقت التوقف عن العمل وخفض التكاليف وتحسين سلامة المرضى." },
    leadingCmms: { en: "The leading hospital CMMS platform for equipment management, maintenance workflows, and AI-powered predictive maintenance.", fr: "La plateforme CMMS hospitalière leader pour la gestion des équipements, les flux de maintenance et la maintenance prédictive par IA.", ar: "منصة CMMS الرائدة للمستشفيات لإدارة المعدات وتدفقات الصيانة والصيانة التنبؤية بالذكاء الاصطناعي." },
    soc2Certified: { en: "SOC 2 Type II Certified", fr: "Certifié SOC 2 Type II", ar: "معتمد من SOC 2 Type II" },
    hipaaCompliant: { en: "HIPAA Compliant", fr: "Conforme HIPAA", ar: "متوافق مع HIPAA" }
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
  console.log('Updated lib/i18n.tsx with landing page keys');
}

updateI18n();
