const f = require('fs').readFileSync('lib/i18n.tsx','utf8');
const lines = f.split('\n');
lines.forEach((l,i) => {
  if (l.includes('unknownPart:') || l.includes('unconfirmed:') || l.includes('unassigned:')) {
    console.log(i+1, l.trim());
  }
});
