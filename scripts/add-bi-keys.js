const fs = require('fs')
const path = require('path')

const i18nPath = path.join(__dirname, '..', 'lib', 'i18n.tsx')
let content = fs.readFileSync(i18nPath, 'utf8')

const newKeysByLang = {
  en: {
    loadingBiomedicalProfile: 'Loading Biomedical Profile...',
    biomedicalEngineering: 'Biomedical Engineering',
    healthAndCompliance: 'Health and compliance of critical medical devices.',
    criticalEquipment: 'Critical Equipment',
    devicesMonitored: 'Devices monitored',
    complianceRate: 'Compliance Rate',
    regulatoryStandards: 'Regulatory standards',
    avgMttr: 'Avg MTTR',
    meanTimeToRepair: 'Mean time to repair',
    safetyIncidents: 'Safety Incidents',
    thisQuarter: 'This quarter',
    equipmentHealthStat: 'Equipment Health Status',
    realTimeHealthIndic: 'Real-time health indicators for critical biomedical devices',
    complianceSafetyAle: 'Compliance & Safety Alerts',
    activeAlertsRequiri: 'Active alerts requiring attention',
    calibrationDue: 'Calibration Due',
    inspectionOverdue: 'Inspection Overdue',
    serviceReminder: 'Service Reminder',
    overdue: 'Overdue',
    noDataForSelected: 'No data for selected filters',
    loadingExecutiveDash: 'Loading Executive Dashboard...',
    loadingFinancialReports: 'Loading Financial Reports...',
    loadingMaintenanceDash: 'Loading Maintenance Dashboard...',
    budgetUtilizationROI: 'Budget utilization and return on investment.',
    ytdBudget: 'YTD Budget',
    maintenanceSpend: 'Maintenance Spend',
    equipmentRoi: 'Equipment ROI',
    costAvoidance: 'Cost Avoidance',
    costDistribution: 'Cost Distribution',
    ytdSpendingBreakdown: 'YTD maintenance spending breakdown',
    deptBudgetVsActual: 'Department Budget vs Actual',
    budgetVarianceByDept: 'Budget variance by department',
    detailedBudgetSummary: 'Detailed Budget Summary',
    deptBreakdownSavings: 'Department breakdown with savings analysis',
    parts: 'Parts',
    labor: 'Labor',
    other: 'Other',
    mtbfDesc: 'Mean Time Between Failures',
    mttrDesc: 'Mean Time To Repair',
    equipmentAvailRate: 'Equipment availability rate',
    correctivePreventive: 'Corrective/Preventive',
    correctiveRatio: 'Corrective ratio',
    filteredAvgFromWOs: 'Filtered avg from WOs',
    avgCostPerAsset: 'Avg cost per asset',
    avgCostPerDept: 'Avg cost per department',
    cumulativePercent: 'Cumulative %',
    amount: 'Amount',
    totalCostTable: 'Total Cost',
    percentOfTotal: '% of Total',
    operationalEfficiency: 'Operational Efficiency',
    maintenancePerformance: 'Maintenance Performance',
    workOrderEfficiency: 'Work Order Efficiency',
    technicianProductivity: 'Technician Productivity'
  },
  fr: {
    loadingBiomedicalProfile: 'Chargement du profil biomédical...',
    biomedicalEngineering: 'Génie Biomédical',
    healthAndCompliance: 'Santé et conformité des dispositifs médicaux critiques.',
    criticalEquipment: 'Équipement Critique',
    devicesMonitored: 'Appareils surveillés',
    complianceRate: 'Taux de Conformité',
    regulatoryStandards: 'Normes réglementaires',
    avgMttr: 'MTTR Moyen',
    meanTimeToRepair: 'Temps moyen de réparation',
    safetyIncidents: 'Incidents de Sécurité',
    thisQuarter: 'Ce trimestre',
    equipmentHealthStat: 'État de Santé des Équipements',
    realTimeHealthIndic: 'Indicateurs de santé en temps réel pour les dispositifs biomédicaux critiques',
    complianceSafetyAle: 'Alertes de Conformité et Sécurité',
    activeAlertsRequiri: 'Alertes actives nécessitant une attention',
    calibrationDue: 'Calibrage dû',
    inspectionOverdue: 'Inspection en retard',
    serviceReminder: 'Rappel de service',
    overdue: 'En retard',
    noDataForSelected: 'Aucune donnée pour les filtres sélectionnés',
    loadingExecutiveDash: 'Chargement du tableau de bord exécutif...',
    loadingFinancialReports: 'Chargement des rapports financiers...',
    loadingMaintenanceDash: 'Chargement du tableau de bord de maintenance...',
    budgetUtilizationROI: 'Utilisation du budget et retour sur investissement.',
    ytdBudget: 'Budget cumulé',
    maintenanceSpend: 'Dépenses de maintenance',
    equipmentRoi: 'ROI de l\'équipement',
    costAvoidance: 'Coûts évités',
    costDistribution: 'Répartition des Coûts',
    ytdSpendingBreakdown: 'Répartition des dépenses de maintenance cumulées',
    deptBudgetVsActual: 'Budget du département vs Réel',
    budgetVarianceByDept: 'Écart budgétaire par département',
    detailedBudgetSummary: 'Résumé détaillé du budget',
    deptBreakdownSavings: 'Répartition par département avec analyse des économies',
    parts: 'Pièces',
    labor: 'Main d\'œuvre',
    other: 'Autre',
    mtbfDesc: 'Temps moyen entre pannes',
    mttrDesc: 'Temps moyen de réparation',
    equipmentAvailRate: 'Taux de disponibilité des équipements',
    correctivePreventive: 'Correctif/Préventif',
    correctiveRatio: 'Ratio correctif',
    filteredAvgFromWOs: 'Moyenne filtrée des bons de travail',
    avgCostPerAsset: 'Coût moyen par actif',
    avgCostPerDept: 'Coût moyen par département',
    cumulativePercent: '% Cumulé',
    amount: 'Montant',
    totalCostTable: 'Coût Total',
    percentOfTotal: '% du Total',
    operationalEfficiency: 'Efficacité Opérationnelle',
    maintenancePerformance: 'Performance de Maintenance',
    workOrderEfficiency: 'Efficacité des Bons de Travail',
    technicianProductivity: 'Productivité des Techniciens'
  },
  ar: {
    loadingBiomedicalProfile: 'جاري تحميل الملف الشخصي الطبي الحيوي...',
    biomedicalEngineering: 'الهندسة الطبية الحيوية',
    healthAndCompliance: 'صحة وامتثال الأجهزة الطبية الحرجة.',
    criticalEquipment: 'المعدات الحرجة',
    devicesMonitored: 'الأجهزة المراقبة',
    complianceRate: 'معدل الامتثال',
    regulatoryStandards: 'المعايير التنظيمية',
    avgMttr: 'متوسط وقت الإصلاح',
    meanTimeToRepair: 'متوسط الوقت للإصلاح',
    safetyIncidents: 'حوادث السلامة',
    thisQuarter: 'هذا الربع',
    equipmentHealthStat: 'حالة صحة المعدات',
    realTimeHealthIndic: 'مؤشرات الصحة في الوقت الفعلي للأجهزة الطبية الحيوية الحرجة',
    complianceSafetyAle: 'تنبيهات الامتثال والسلامة',
    activeAlertsRequiri: 'تنبيهات نشطة تتطلب الاهتمام',
    calibrationDue: 'موعد المعايرة',
    inspectionOverdue: 'الفحص متأخر',
    serviceReminder: 'تذكير بالخدمة',
    overdue: 'متأخر',
    noDataForSelected: 'لا توجد بيانات للفلاتر المختارة',
    loadingExecutiveDash: 'جاري تحميل لوحة القيادة التنفيذية...',
    loadingFinancialReports: 'جاري تحميل التقارير المالية...',
    loadingMaintenanceDash: 'جاري تحميل لوحة قيادة الصيانة...',
    budgetUtilizationROI: 'استغلال الميزانية والعائد على الاستثمار.',
    ytdBudget: 'الميزانية منذ بداية العام',
    maintenanceSpend: 'إنفاق الصيانة',
    equipmentRoi: 'العائد على استثمار المعدات',
    costAvoidance: 'تجنب التكاليف',
    costDistribution: 'توزيع التكاليف',
    ytdSpendingBreakdown: 'توزيع إنفاق الصيانة منذ بداية العام',
    deptBudgetVsActual: 'ميزانية القسم مقابل الفعلي',
    budgetVarianceByDept: 'تباين الميزانية حسب القسم',
    detailedBudgetSummary: 'ملخص الميزانية المفصل',
    deptBreakdownSavings: 'توزيع الأقسام مع تحليل المدخرات',
    parts: 'قطع غيار',
    labor: 'عمالة',
    other: 'أخرى',
    mtbfDesc: 'متوسط الوقت بين الأعطال',
    mttrDesc: 'متوسط الوقت للإصلاح',
    equipmentAvailRate: 'معدل توفر المعدات',
    correctivePreventive: 'تصحيحي/وقائي',
    correctiveRatio: 'نسبة التصحيحي',
    filteredAvgFromWOs: 'المتوسط المفلتر من أوامر العمل',
    avgCostPerAsset: 'متوسط التكلفة لكل أصل',
    avgCostPerDept: 'متوسط التكلفة لكل قسم',
    cumulativePercent: 'النسبة التراكمية',
    amount: 'المبلغ',
    totalCostTable: 'التكلفة الإجمالية',
    percentOfTotal: 'نسبة من الإجمالي',
    operationalEfficiency: 'الكفاءة التشغيلية',
    maintenancePerformance: 'أداء الصيانة',
    workOrderEfficiency: 'كفاءة أوامر العمل',
    technicianProductivity: 'إنتاجية الفنيين'
  }
}

function getLangBlockBounds(content, lang) {
  const blockStart = content.indexOf(`  ${lang}: {`)
  if (blockStart === -1) return null
  let depth = 0
  let i = blockStart
  while (i < content.length) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) return { start: blockStart, end: i }
    }
    i++
  }
  return null
}

function keyExistsInBlock(content, blockStart, blockEnd, key) {
  const blockContent = content.slice(blockStart, blockEnd)
  return new RegExp(`\\b${key}:`).test(blockContent)
}

let injectedTotal = 0

for (const [lang, keys] of Object.entries(newKeysByLang)) {
  const bounds = getLangBlockBounds(content, lang)
  if (!bounds) continue
  const keysToInject = Object.entries(keys).filter(([k]) => !keyExistsInBlock(content, bounds.start, bounds.end, k))
  if (keysToInject.length === 0) continue
  const insertAfterIdx = content.indexOf('{', bounds.start) + 1
  const newEntries = keysToInject.map(([k, v]) => `\n    ${k}: ${JSON.stringify(v)},`).join('')
  content = content.slice(0, insertAfterIdx) + newEntries + content.slice(insertAfterIdx)
  injectedTotal += keysToInject.length
  console.log(`[${lang}] Injected ${keysToInject.length} keys`)
}

fs.writeFileSync(i18nPath, content, 'utf8')
console.log(`\nDone. Total keys injected: ${injectedTotal}`)
