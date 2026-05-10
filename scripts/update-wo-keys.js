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
    createMaintenanceIntervention: { en: "Create Maintenance Intervention", fr: "Créer une intervention de maintenance", ar: "إنشاء تدخل صيانة" },
    fillDetailsGenerateWO: { en: "Fill in the details below to generate a new maintenance work order.", fr: "Remplissez les détails ci-dessous pour générer un nouvel ordre de travail de maintenance.", ar: "املأ التفاصيل أدناه لإنشاء أمر عمل صيانة جديد." },
    brieflyDescribeTheIs: { en: "Briefly describe the issue...", fr: "Décrivez brièvement le problème...", ar: "صف المشكلة باختصار..." },
    unassigned: { en: "Unassigned", fr: "Non assigné", ar: "غير معين" },
    reviewRequired: { en: "Review Required", fr: "Examen requis", ar: "مراجعة مطلوبة" },
    allStatuses: { en: "All Statuses", fr: "Tous les statuts", ar: "كل الحالات" },
    showArchived: { en: "Show Archived", fr: "Afficher les archives", ar: "عرض المؤرشف" },
    hideArchived: { en: "Hide Archived", fr: "Masquer les archives", ar: "إخفاء المؤرشف" },
    noWorkOrdersFound: { en: "No work orders found.", fr: "Aucun ordre de travail trouvé.", ar: "لم يتم العثور على أوامر عمل." },
    searchWorkOrders: { en: "Search work orders...", fr: "Rechercher des ordres de travail...", ar: "بحث عن أوامر العمل..." }
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
  console.log('Updated lib/i18n.tsx with work order management keys');
}

updateI18n();
