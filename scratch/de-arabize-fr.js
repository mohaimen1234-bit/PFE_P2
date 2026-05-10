const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
const content = fs.readFileSync(path, 'utf8');

function camelToHuman(s) {
    return s.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

let lines = content.split('\n');
const frStart = lines.findIndex(l => l.includes('fr: {'));
const arStart = lines.findIndex(l => l.includes('ar: {'));

for (let i = frStart + 1; i < arStart; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(\w+):\s+'(.*)',?$/);
    if (match) {
        const key = match[1];
        const val = match[2];
        if (/[\u0600-\u06FF]/.test(val)) {
            // It's Arabic! Let's replace it with a humanized version of the key (best we can do for now).
            const human = camelToHuman(key);
            lines[i] = `    ${key}: '${human.replace(/'/g, "\\'")}',`;
        }
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('De-Arabized FR block');
