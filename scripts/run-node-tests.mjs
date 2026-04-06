// Runs all **/*.test.js under test/ via `node --test` (avoids npm/CI mishandling of directory args).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function collectTestFiles(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectTestFiles(p));
    } else if (ent.isFile() && ent.name.endsWith('.test.js')) {
      out.push(p);
    }
  }
  return out;
}

const root = dirname(fileURLToPath(import.meta.url));
const testDir = join(root, '..', 'test');
const files = collectTestFiles(testDir).sort();

if (files.length === 0) {
  console.error('No **/*.test.js files found under test/.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  windowsHide: true,
});

process.exit(result.status ?? 1);
