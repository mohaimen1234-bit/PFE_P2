const fs = require('fs');

const file = 'lib/i18n.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionsEN = `
    PREVENTIVE: 'Preventive',
    CORRECTIVE: 'Corrective',
    REGULATORY: 'Regulatory',
    PREDICTIVE: 'Predictive',`;

const additionsFR = `
    PREVENTIVE: 'Préventive',
    CORRECTIVE: 'Corrective',
    REGULATORY: 'Réglementaire',
    PREDICTIVE: 'Prédictive',`;

const additionsAR = `
    PREVENTIVE: 'وقائي',
    CORRECTIVE: 'تصحيحي',
    REGULATORY: 'تنظيمي',
    PREDICTIVE: 'تنبؤي',`;

content = content.replace(/(  en: \{)/, "$1\n" + additionsEN);
content = content.replace(/(  fr: \{)/, "$1\n" + additionsFR);
content = content.replace(/(  ar: \{)/, "$1\n" + additionsAR);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully injected maintenance types translations!');
