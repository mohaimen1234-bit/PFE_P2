const fs = require('fs');
const path = require('path');

const targets = [
  {
    file: 'app/(dashboard)/work-orders/page.tsx',
    type: 'replace',
    find: /const itemsPerPage = 25/g,
    replace: 'const itemsPerPage = 10'
  },
  {
    file: 'app/(dashboard)/admin/users/page.tsx',
    array: 'items'
  },
  {
    file: 'app/(dashboard)/admin/audit-logs/page.tsx',
    array: 'filtered'
  },
  {
    file: 'app/(dashboard)/admin/reference-data/page.tsx',
    array: 'items'
  },
  {
    file: 'app/(dashboard)/admin/roles/page.tsx',
    array: 'roles'
  },
  {
    file: 'app/(dashboard)/equipment/page.tsx',
    array: 'filteredEquipment',
    customMap: true // it uses a custom component? let's check it.
  },
  {
    file: 'app/(dashboard)/inventory/page.tsx',
    array: 'filteredParts', // guessing, need to check
  }
];

// Let me first find the maps in these files to be sure.
