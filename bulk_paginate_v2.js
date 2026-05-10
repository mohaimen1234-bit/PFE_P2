const fs = require('fs');
const path = require('path');

const tasks = [
  {
    file: 'app/(dashboard)/tasks/page.tsx',
    importMatch: /import \{ useI18n \} from "@\/lib\/i18n"/,
    importRepl: 'import { useI18n } from "@/lib/i18n"\nimport { usePagination } from "@/lib/hooks/use-pagination"',
    stateMatch: /const filteredTasks = useMemo\(\(\) => \{/,
    stateRepl: 'const { paginatedItems: paginatedTasks, PaginationControls } = usePagination(filteredTasks, 10);\n\n  const filteredTasks = useMemo(() => {',
    hookInclusion: true, // Need to handle stateRepl carefully because of useMemo
    renderMatch: /tasks=\{filteredTasks\}/,
    renderRepl: 'tasks={paginatedTasks}',
    footerMatch: /<\/div>\s*<\/div>\s*\{.*Reschedule Dialog.*\}/, // This is too complex, let's use a simpler one
    footerMatch2: /<TaskExecutionHub[^>]*\/>\s*<\/div>/,
    footerRepl2: '<TaskExecutionHub $&\n           <PaginationControls />\n        </div>'
  },
  {
    file: 'app/(dashboard)/ai/predictive/page.tsx',
    importMatch: /import \{ useI18n \} from "@\/lib\/i18n"/,
    importRepl: 'import { useI18n } from "@/lib/i18n"\nimport { usePagination } from "@/lib/hooks/use-pagination"',
    stateMatch: /const \[predictions, setPredictions\] = useState<any\[\]>\(\[\]\)/,
    stateRepl: 'const [predictions, setPredictions] = useState<any[]>([])\n  const { paginatedItems: paginatedPredictions, PaginationControls } = usePagination(filteredPredictions, 10);',
    mapMatch: /filteredPredictions\.map/,
    mapRepl: 'paginatedPredictions.map',
    footerMatch: /<\/div>\s*<\/CardContent>/,
    footerRepl: '</div>\n            <PaginationControls />\n          </CardContent>'
  },
  {
    file: 'app/(dashboard)/ai/prioritization/page.tsx',
    importMatch: /import \{ useI18n \} from "@\/lib\/i18n"/,
    importRepl: 'import { useI18n } from "@/lib/i18n"\nimport { usePagination } from "@/lib/hooks/use-pagination"',
    stateMatch: /const \[suggestions, setSuggestions\] = useState<any\[\]>\(\[\]\)/,
    stateRepl: 'const [suggestions, setSuggestions] = useState<any[]>([])\n  const { paginatedItems: paginatedSuggestions, PaginationControls } = usePagination(filteredSuggestions, 10);',
    mapMatch: /filteredSuggestions\.map/,
    mapRepl: 'paginatedSuggestions.map',
    footerMatch: /<\/div>\s*<\/CardContent>/,
    footerRepl: '</div>\n            <PaginationControls />\n          </CardContent>'
  },
  {
    file: 'app/(dashboard)/ai/failure-analysis/page.tsx',
    importMatch: /import \{ useI18n \} from "@\/lib\/i18n"/,
    importRepl: 'import { useI18n } from "@/lib/i18n"\nimport { usePagination } from "@/lib/hooks/use-pagination"',
    stateMatch: /const \[reports, setReports\] = useState<FailureAnalysisReportSummary\[\]>\(\[\]\)/,
    stateRepl: 'const [reports, setReports] = useState<FailureAnalysisReportSummary[]>([])\n  const { paginatedItems: paginatedReports, PaginationControls } = usePagination(reports, 10);',
    mapMatch: /reports\.map/,
    mapRepl: 'paginatedReports.map',
    footerMatch: /<\/div>\s*<\/CardContent>/,
    footerRepl: '</div>\n            <PaginationControls />\n          </CardContent>'
  }
];

tasks.forEach(t => {
  let c = fs.readFileSync(t.file, 'utf8');
  
  // Add import
  if (!c.includes('usePagination')) {
    c = c.replace(t.importMatch, t.importRepl);
    
    // Add hook call
    if (t.file === 'app/(dashboard)/tasks/page.tsx') {
        // Special case for tasks page because of useMemo
        const memoEndIndex = c.indexOf('}, [tasks, search, filter])');
        const insertIndex = c.indexOf('\n', memoEndIndex) + 1;
        c = c.slice(0, insertIndex) + '\n  const { paginatedItems: paginatedTasks, PaginationControls } = usePagination(filteredTasks, 10);\n' + c.slice(insertIndex);
    } else {
        c = c.replace(t.stateMatch, t.stateRepl);
    }
    
    // Replace map
    if (t.mapMatch) {
        c = c.replace(t.mapMatch, t.mapRepl);
    }
    
    // Replace render prop for tasks
    if (t.renderMatch) {
        c = c.replace(t.renderMatch, t.renderRepl);
    }
    
    // Add PaginationControls
    if (t.file === 'app/(dashboard)/tasks/page.tsx') {
        c = c.replace(/<TaskExecutionHub/, '$&'); // Just a check
        c = c.replace(/<\/div>\s*<\/div>\s*{\/\* Reschedule Dialog \*\/}/, '</div>\n           <PaginationControls />\n        </div>\n\n      {/* Reschedule Dialog */}');
    } else {
        c = c.replace(t.footerMatch, t.footerRepl);
    }
    
    fs.writeFileSync(t.file, c, 'utf8');
    console.log('Updated ' + t.file);
  }
});
