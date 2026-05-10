const fs = require('fs');

const file = 'lib/i18n.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionsEN = `
    showing: 'Showing',
    to: 'to',
    of: 'of',
    entries: 'entries',`;

const additionsFR = `
    showing: 'Affichage de',
    to: 'à',
    of: 'sur',
    entries: 'entrées',`;

const additionsAR = `
    showing: 'عرض',
    to: 'إلى',
    of: 'من أصل',
    entries: 'إدخالات',`;

content = content.replace(/(  en: \{)/, "$1\n" + additionsEN);
content = content.replace(/(  fr: \{)/, "$1\n" + additionsFR);
content = content.replace(/(  ar: \{)/, "$1\n" + additionsAR);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully injected pagination translations!');
