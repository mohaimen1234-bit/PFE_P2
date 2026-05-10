const fs = require('fs');

const tasks = [
  {
    file: 'app/(dashboard)/admin/roles/page.tsx',
    stateMatch: /const \[roles, setRoles\] = useState<RoleResponse\[\]>\(\[\]\)/,
    stateRepl: 'const [roles, setRoles] = useState<RoleResponse[]>([])\n  const { paginatedItems: paginatedRoles, PaginationControls } = usePagination(roles, 10);',
    mapMatch: /\{roles\.map\(\(r\) => \(/,
    mapRepl: '{paginatedRoles.map((r) => (',
  },
  {
    file: 'app/(dashboard)/admin/audit-logs/page.tsx',
    stateMatch: /const \[filtered, setFiltered\] = useState<AuditLog\[\]>\(\[\]\)/,
    stateRepl: 'const [filtered, setFiltered] = useState<AuditLog[]>([])\n  const { paginatedItems: paginatedLogs, PaginationControls } = usePagination(filtered, 10);',
    mapMatch: /\{filtered\.map\(\(log, idx\) => \(/,
    mapRepl: '{paginatedLogs.map((log, idx) => (',
  },
  {
    file: 'app/(dashboard)/admin/reference-data/page.tsx',
    stateMatch: /const \[items, setItems\] = useState<any\[\]>\(\[\]\)/,
    stateRepl: 'const [items, setItems] = useState<any[]>([])\n  const { paginatedItems, PaginationControls } = usePagination(items, 10);',
    mapMatch: /\{items\.map\(\(item\) => \(/,
    mapRepl: '{paginatedItems.map((item) => (',
  }
];

tasks.forEach(t => {
  let c = fs.readFileSync(t.file, 'utf8');
  if(!c.includes('usePagination')) {
    c = c.replace(/import \{ useI18n \} from "@\/lib\/i18n"/, 'import { useI18n } from "@/lib/i18n"\nimport { usePagination } from "@/lib/hooks/use-pagination"');
    c = c.replace(t.stateMatch, t.stateRepl);
    c = c.replace(t.mapMatch, t.mapRepl);
    c = c.replace(/(<\/table>\s*<\/div>)/, '$1\n            <PaginationControls />');
    fs.writeFileSync(t.file, c, 'utf8');
    console.log('Updated ' + t.file);
  }
});
