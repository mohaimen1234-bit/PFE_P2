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
    ganttView: { en: "Gantt View", fr: "Vue de Gantt", ar: "عرض Gantt" },
    visualizeTimelineAn: { en: "Visualize timeline and duration of work orders.", fr: "Visualisez le calendrier et la durée des ordres de travail.", ar: "تصور الجدول الزمني ومدة أوامر العمل." },
    weekly: { en: "Weekly", fr: "Hebdomadaire", ar: "أسبوعي" },
    monthly: { en: "Monthly", fr: "Mensuel", ar: "شهري" },
    workOrderDetails: { en: "Work Order details", fr: "Détails de l'ordre de travail", ar: "تفاصيل أمر العمل" },
    noWorkOrdersSchedul: { en: "No work orders scheduled for this period.", fr: "Aucun ordre de travail prévu pour cette période.", ar: "لا توجد أوامر عمل مجدولة لهذه الفترة." },
    scheduledWos: { en: "SCHEDULED WOs", fr: "OT PLANIFIÉS", ar: "أوامر عمل مجدولة" },
    backlog: { en: "Backlog", fr: "Arriéré", ar: "المهام المتراكمة" },
    assigned: { en: "Assigned", fr: "Assigné", ar: "معين" },
    scheduled: { en: "Scheduled", fr: "Planifié", ar: "مجدول" },
    inProgress: { en: "In Progress", fr: "En cours", ar: "قيد التنفيذ" },
    onHold: { en: "On Hold", fr: "En attente", ar: "قيد الانتظار" },
    done: { en: "Done", fr: "Fait", ar: "مكتمل" },
    compact: { en: "Compact", fr: "Compact", ar: "مدمج" },
    standard: { en: "Standard", fr: "Standard", ar: "قياسي" },
    wide: { en: "Wide", fr: "Large", ar: "عريض" },
    scrollForMoreColu: { en: "Scroll for more columns", fr: "Défiler pour plus de colonnes", ar: "التمرير لمزيد من الأعمدة" },
    slideForMore: { en: "Slide for More", fr: "Glisser pour plus", ar: "اسحب للمزيد" },
    assignTechnician: { en: "Assign Technician", fr: "Assigner un technicien", ar: "تعيين فني" },
    selectATechnician: { en: "Select a technician...", fr: "Sélectionner un technicien...", ar: "اختر فنياً..." },
    noTechniciansFound: { en: "No technicians found in department", fr: "Aucun technicien trouvé dans le département", ar: "لم يتم العثور على فنيين في القسم" },
    noTechniciansAvail: { en: "No technicians available. Please check user roles.", fr: "Aucun technicien disponible. Veuillez vérifier les rôles.", ar: "لا يوجد فنيون متاحون. يرجى التحقق من الأدوار." },
    scheduleInterventi: { en: "Schedule Intervention", fr: "Planifier l'intervention", ar: "جدولة التدخل" },
    setThePlannedDates: { en: "Set the planned dates and estimated duration for this work.", fr: "Définissez les dates prévues et la durée estimée.", ar: "حدد المواعيد المخططة والمدة المقدرة." },
    pauseWork: { en: "Pause Work (On Hold)", fr: "Mettre en pause (En attente)", ar: "إيقاف العمل مؤقتاً" },
    pleaseProvideAReas: { en: "Please provide a reason for putting this work order on hold.", fr: "Veuillez fournir une raison pour la mise en attente.", ar: "يرجى تقديم سبب لوضع أمر العمل هذا قيد الانتظار." },
    reasonForPause: { en: "Reason for Pause", fr: "Raison de la pause", ar: "سبب التوقف" },
    putOnHold: { en: "Put on Hold", fr: "Mettre en attente", ar: "وضع قيد الانتظار" },
    assigning: { en: "Assigning...", fr: "Assignation...", ar: "جاري التعيين..." },
    confirmAssignment: { en: "Confirm Assignment", fr: "Confirmer l'assignation", ar: "تأكيد التعيين" },
    scheduling: { en: "Scheduling...", fr: "Planification...", ar: "جاري الجدولة..." },
    saveSchedule: { en: "Save Schedule", fr: "Enregistrer la planification", ar: "حفظ الجدول" },
    pausing: { en: "Pausing...", fr: "Mise en pause...", ar: "جاري الإيقاف..." }
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
  console.log('Updated lib/i18n.tsx with Gantt and Kanban planning keys');
}

updateI18n();
