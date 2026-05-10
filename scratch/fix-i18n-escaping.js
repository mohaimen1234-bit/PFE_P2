const fs = require('fs');
const path = 'c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the damage from the previous bad replace
// We replaced 's with \'s incorrectly in many places where ' was the opening quote.
// Example: of: \'sur'
content = content.replace(/:\s+\\'s/g, ": 's");

// 2. Fix double escaped quotes correctly
// Replace \\' with \'
content = content.replace(/\\\\'/g, "\\'");

fs.writeFileSync(path, content);
console.log('Fixed i18n escaping issues');
