const fs = require('fs');
const path = require('path');

const dirs = [
  'app/(dashboard)/admin/audit-logs/page.tsx',
  'app/(dashboard)/admin/reference-data/page.tsx',
  'app/(dashboard)/admin/roles/page.tsx',
  'app/(dashboard)/admin/rules-thresholds/page.tsx',
  'app/(dashboard)/admin/users/page.tsx'
];

dirs.forEach(f => {
  const filePath = path.join(__dirname, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace text-left with text-start
    content = content.replace(/\btext-left\b/g, 'text-start');
    
    // Replace text-right with text-end
    content = content.replace(/\btext-right\b/g, 'text-end');
    
    // Replace pr- with pe- only inside classNames
    content = content.replace(/\bpr-(\d+)\b/g, 'pe-$1');
    content = content.replace(/\bpl-(\d+)\b/g, 'ps-$1');
    content = content.replace(/\bmr-(\d+)\b/g, 'me-$1');
    content = content.replace(/\bml-(\d+)\b/g, 'ms-$1');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
