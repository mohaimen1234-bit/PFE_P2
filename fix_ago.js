const fs = require('fs');
let content = fs.readFileSync('lib/i18n.tsx', 'utf8');

content = content.replace(/dAgoVal:\s*'D Ago Val',/g, "dAgoVal: '{val}d ago',");
content = content.replace(/hAgoVal:\s*'H Ago Val',/g, "hAgoVal: '{val}h ago',");
content = content.replace(/minAgoVal:\s*'Min Ago Val',/g, "minAgoVal: '{val} min ago',");

content = content.replace(/dAgoVal:\s*'D Il y a Val',/g, "dAgoVal: 'il y a {val} j',");
content = content.replace(/hAgoVal:\s*'H Il y a Val',/g, "hAgoVal: 'il y a {val} h',");
content = content.replace(/minAgoVal:\s*'Il y a min Val',/g, "minAgoVal: 'il y a {val} min',");

fs.writeFileSync('lib/i18n.tsx', content, 'utf8');
console.log('Fixed Ago strings');
