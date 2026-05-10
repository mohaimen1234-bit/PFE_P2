import fs from 'fs';
import path from 'path';

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function scan() {
  const allFiles = [...getFiles('app'), ...getFiles('components')];
  
  console.log(`Scanning ${allFiles.length} files for hardcoded UI text...`);
  
  const results = [];

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/>([^<{}>]+)</g);
    
    if (matches) {
      const hardcoded = matches
        .map(m => m.slice(1, -1).trim())
        .filter(text => {
          if (!text || text.length < 2) return false;
          if (/^[0-9\s.,$%-]+$/.test(text)) return false;
          if (text.includes('=>') || text.includes('const ') || text.includes('import ')) return false;
          if (text.startsWith('t(')) return false;
          return true;
        });

      if (hardcoded.length > 0) {
        results.push({ file, text: [...new Set(hardcoded)] });
      }
    }
  });

  results.forEach(res => {
    console.log(`\n📄 ${res.file}`);
    res.text.forEach(t => console.log(`  - "${t}"`));
  });

  console.log(`\nScan complete. Found hardcoded text in ${results.length} files.`);
}

scan();
