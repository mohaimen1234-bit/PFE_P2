const fs = require('fs');

const filesToUpdateLimit = [
  'app/(dashboard)/inventory/page.tsx',
  'app/(dashboard)/equipment/page.tsx',
  'app/(dashboard)/claims/page.tsx'
];

filesToUpdateLimit.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/itemsPerPage = 25/g, 'itemsPerPage = 10');
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Updated limits to 10 for inventory, equipment, claims');
