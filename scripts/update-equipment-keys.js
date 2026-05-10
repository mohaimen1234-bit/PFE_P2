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
    equipmentDetailsDesc: { en: "Detailed information about this equipment.", fr: "Informations détaillées sur cet équipement.", ar: "معلومات مفصلة عن هذه المعدة." },
    manageDocumentsDesc: { en: "Manage equipment related documents.", fr: "Gérer les documents liés à l'équipement.", ar: "إدارة المستندات المتعلقة بالمعدة." },
    noThresholds: { en: "No thresholds configured.", fr: "Aucun seuil configuré.", ar: "لم يتم تكوين أي عتبات." },
    labelEGOilChange: { en: "Label e.g. Oil Change", fr: "Libellé ex. Vidange", ar: "التسمية مثلاً: تغيير الزيت" },
    searchEquipment: { en: "Search equipment...", fr: "Rechercher un équipement...", ar: "بحث عن المعدات..." },
    noEquipmentFound: { en: "No equipment found.", fr: "Aucun équipement trouvé.", ar: "لم يتم العثور على معدات." },
    page: { en: "Page", fr: "Page", ar: "صفحة" },
    of: { en: "of", fr: "sur", ar: "من" },
    eGVentilator: { en: "e.g. Ventilator V1", fr: "ex. Ventilateur V1", ar: "مثلاً: جهاز تنفس V1" },
    eGRoom12: { en: "e.g. Room 12", fr: "ex. Salle 12", ar: "مثلاً: غرفة 12" },
    eGMagnetom: { en: "e.g. Magnetom", fr: "ex. Magnetom", ar: "مثلاً: Magnetom" },
    eGSiemens: { en: "e.g. Siemens", fr: "ex. Siemens", ar: "مثلاً: سيمنز" },
    eGHours: { en: "e.g. Hours", fr: "ex. Heures", ar: "مثلاً: ساعات" },
    dataLoadedFromBackend: { en: "Data loaded from the backend.", fr: "Données chargées depuis le backend.", ar: "تم تحميل البيانات من النظام الخلفي." },
    downloadUploadOrDelete: { en: "Download, upload or delete documents.", fr: "Télécharger, téléverser ou supprimer des documents.", ar: "تنزيل أو رفع أو حذف المستندات." }
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
  console.log('Updated lib/i18n.tsx with equipment management keys');
}

updateI18n();
