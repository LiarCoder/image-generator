// Prints the body for one version from root CHANGELOG.md (between ## [x.y.z] and the next ## [).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/extract-changelog.mjs <semver>');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`^## \\[${escaped}\\][^\\n]*\\n`, 'm');
const match = md.match(re);
if (!match) {
  process.exit(0);
}

const start = match.index + match[0].length;
const rest = md.slice(start);
const nextIdx = rest.search(/^## \[/m);
const body = (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).trim();
process.stdout.write(body);
