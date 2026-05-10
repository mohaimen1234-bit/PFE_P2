const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx', 'utf8');

// Find the start and end of translations object
const startMatch = content.match(/const translations = \{/);
if (!startMatch) {
    console.error("Could not find translations object");
    process.exit(1);
}

// Find the objects for en, fr, ar
// This is a bit tricky due to nested structures, but we know the general structure.
const extractObject = (lang) => {
    const start = content.indexOf(`${lang}: {`, startMatch.index);
    if (start === -1) return null;
    
    let balance = 1;
    let end = -1;
    for (let i = start + lang.length + 3; i < content.length; i++) {
        if (content[i] === '{') balance++;
        else if (content[i] === '}') balance--;
        
        if (balance === 0) {
            end = i;
            break;
        }
    }
    
    if (end === -1) return null;
    return { start, end, content: content.substring(start, end + 1) };
};

const enObj = extractObject('en');
const frObj = extractObject('fr');
const arObj = extractObject('ar');

const parseObj = (str) => {
    // Remove lang: { and trailing }
    const lines = str.split('\n').slice(1, -1);
    const map = {};
    lines.forEach(line => {
        const match = line.match(/^\s*([a-zA-Z0-9_]+):\s*['"](.*)['"],?\s*$/);
        if (match) {
            map[match[1]] = match[2];
        }
    });
    return map;
};

const enMap = parseObj(enObj.content);
const frMap = parseObj(frObj.content);
const arMap = parseObj(arObj.content);

// Fix EN map - remove Arabic
const isArabic = (text) => /[\u0600-\u06FF]/.test(text);
Object.keys(enMap).forEach(key => {
    if (isArabic(enMap[key])) {
        console.log(`Fixing Arabic in EN: ${key} = ${enMap[key]}`);
        // Try to find correct EN value from key name or common patterns
        if (key === 'age') enMap[key] = 'Age';
        else if (key === 'ageRisk') enMap[key] = 'Age Risk';
        else if (key === 'criticalityMultiplier') enMap[key] = 'Criticality Multiplier';
        else if (key === 'riskFactors') enMap[key] = 'Risk Factors';
        else if (key === 'recommendedAction') enMap[key] = 'Recommended Action';
        else if (key === 'reasons') enMap[key] = 'Reasons';
        else if (key === 'failures') enMap[key] = 'Failures';
        else if (key === 'meter') enMap[key] = 'Meter';
        else if (key === 'score') enMap[key] = 'Score';
        else if (key === 'risk') enMap[key] = 'Risk';
        else if (key === 'severity') enMap[key] = 'Severity';
        else if (key === 'state') enMap[key] = 'State';
        else if (key === 'at_risk') enMap[key] = 'At Risk';
        else if (key === 'imminent_failure') enMap[key] = 'Imminent Failure';
        else if (key === 'high_failure_risk') enMap[key] = 'High Failure Risk';
        else if (key === 'degraded_performance') enMap[key] = 'Degraded Performance';
        else if (key === 'early_wear') enMap[key] = 'Early Wear';
        else if (key === 'normal_operation') enMap[key] = 'Normal Operation';
        else if (key === 'wo_open') enMap[key] = 'WO Open';
        else if (key === 'awaiting_validation') enMap[key] = 'Awaiting Validation';
        else if (key === 'ready_to_schedule') enMap[key] = 'Ready to Schedule';
        else if (key === 'no_action_needed') enMap[key] = 'No Action Needed';
        else if (key === 'referenceDataManage') enMap[key] = 'Reference Data Management';
        else if (key === 'currentStage') enMap[key] = 'Current Stage';
        else {
            // Convert camelCase to Space Case
            enMap[key] = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        }
    }
});

// Sync keys across all maps
const allKeys = new Set([...Object.keys(enMap), ...Object.keys(frMap), ...Object.keys(arMap)]);

allKeys.forEach(key => {
    if (!enMap[key]) {
        enMap[key] = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
    if (!frMap[key]) {
        frMap[key] = enMap[key]; // Fallback to EN for FR if missing
    }
    if (!arMap[key]) {
        arMap[key] = enMap[key]; // Fallback to EN for AR if missing
    }
});

// Rebuild objects
const rebuild = (lang, map) => {
    const keys = Object.keys(map).sort();
    let res = `  ${lang}: {\n`;
    keys.forEach(key => {
        res += `    ${key}: '${map[key].replace(/'/g, "\\'")}',\n`;
    });
    res += `  },`;
    return res;
};

const newEn = rebuild('en', enMap);
const newFr = rebuild('fr', frMap);
const newAr = rebuild('ar', arMap);

// Replace in original content
// We need to replace from bottom to top to avoid offset issues if we did it by index, 
// but here we have the whole blocks.
// Actually, it's better to just replace the whole translations object.

const newTranslations = `const translations = {\n${newEn}\n${newFr}\n${newAr}\n}`;

// Find the whole translations block
// This is risky if there are other things. 
// Let's just replace the blocks we found.

let newContent = content.substring(0, enObj.start) + newEn + 
                 content.substring(enObj.end + 1, frObj.start) + newFr +
                 content.substring(frObj.end + 1, arObj.start) + newAr +
                 content.substring(arObj.end + 1);

fs.writeFileSync('c:\\Users\\mohai\\OneDrive\\Desktop\\PFE_P1\\lib\\i18n.tsx', newContent);
console.log("Cleanup complete!");
