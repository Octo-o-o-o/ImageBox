import fs from 'fs';
import { execSync } from 'child_process';

const file = fs.readFileSync('lib/i18n/index.ts','utf8');
// Extract the English block between "en: {" and the next language key start (e.g., "zh:")
const m = file.match(/\ben:\s*\{([\s\S]*?)\n\s*zh:\s*\{/);
if (!m) {
  console.error('Failed to locate en block');
  process.exit(1);
}
const enBlock = m[1];
// Find all keys like 'foo.bar': '...'
const keyRegex = /'([^']+)'\s*:/g;
const keys = new Set();
let match;
while ((match = keyRegex.exec(enBlock))) {
  keys.add(match[1]);
}

const unused = [];
for (const key of keys) {
  // Known dynamic patterns used at runtime (do not mark as unused)
  if (key.startsWith('errors.')) {
    continue;
  }
  try {
    // Search for literal key in code (ts/js/tsx/jsx), excluding the i18n source file
    // Use fixed string (-F) to avoid regex issues with special chars in keys
    const cmd = `rg -n -F --hidden --no-heading --color never -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '!node_modules/**' -g '!dist-electron/**' -g '!.next/**' -g '!dev.db' -g '!*.map' -g '!*.png' -g '!*.jpg' -g '!*.jpeg' -g '!*.svg' -g '!*.webp' -g '!*.db' -g '!*.yml' -g '!*.yaml' -g '!*.lock' -g '!*.md' -g '!*.json' -g '!*.sqlite' -g '!lib/i18n/index.ts' -- "${key}"`;
    const out = execSync(cmd, { stdio: ['ignore','pipe','pipe'] }).toString().trim();
    if (!out) {
      unused.push(key);
    }
  } catch (e) {
    // rg exits with 1 when not found; treat as unused
    unused.push(key);
  }
}

// Group by top-level namespace (before first dot)
const groups = {};
for (const key of unused) {
  const top = key.split('.')[0];
  groups[top] = groups[top] || [];
  groups[top].push(key);
}

// Print a concise report
const sortedTop = Object.keys(groups).sort();
for (const top of sortedTop) {
  console.log(`# ${top} (${groups[top].length})`);
  for (const k of groups[top].slice(0, 60)) {
    console.log(k);
  }
  if (groups[top].length > 60) console.log(`... +${groups[top].length - 60} more`);
  console.log('');
}

console.error(`Total unused keys: ${unused.length}`);
