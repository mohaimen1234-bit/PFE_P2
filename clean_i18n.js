const fs = require('fs');

const file = 'lib/i18n.tsx';
let content = fs.readFileSync(file, 'utf8');

function cleanDuplicates(objStr) {
    const lines = objStr.split('\n');
    const seen = new Set();
    const result = [];
    // Process from bottom to top to keep the latest added keys (which are at the top usually if injected at the start of the object)
    // Actually, usually keys at the bottom override keys at the top in JS objects, but in a literal, it's an error.
    // I'll keep the FIRST occurrence from the TOP.
    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (match) {
            const key = match[1];
            if (seen.has(key)) {
                console.log('Removing duplicate key: ' + key);
                continue;
            }
            seen.add(key);
        }
        result.push(line);
    }
    return result.join('\n');
}

// Split by the main keys
const enMatch = content.match(/  en: \{([\s\S]*?)\n  \},/);
const frMatch = content.match(/  fr: \{([\s\S]*?)\n  \},/);
const arMatch = content.match(/  ar: \{([\s\S]*?)\n  \},/);

if (enMatch) {
    content = content.replace(enMatch[1], cleanDuplicates(enMatch[1]));
}
if (frMatch) {
    content = content.replace(frMatch[1], cleanDuplicates(frMatch[1]));
}
if (arMatch) {
    content = content.replace(arMatch[1], cleanDuplicates(arMatch[1]));
}

fs.writeFileSync(file, content, 'utf8');
console.log('Cleaned up duplicate keys in i18n.tsx');
