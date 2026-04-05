import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OutputWriter } from '../src/core/output.js';

const { buildDefaultName, nextAvailablePath } = OutputWriter;

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'temp', 'output-test-tmp');

// ── Lifecycle ─────────────────────────────────────────────────────────────────

before(() => mkdirSync(TMP, { recursive: true }));
after(() => rmSync(TMP, { recursive: true, force: true }));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('output', () => {
  describe('buildDefaultName()', () => {
    it('produces the correct pattern: <size><unit>-YYYY-MM-DD-HH-mm-ss.<format>', () => {
      const name = buildDefaultName(5, 'MB', 'png');
      assert.match(name, /^5MB-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.png$/);
    });

    it('includes the size and unit in the name', () => {
      assert.ok(buildDefaultName(500, 'KB', 'jpg').startsWith('500KB-'));
    });

    it('appends the correct extension', () => {
      assert.ok(buildDefaultName(1, 'MB', 'webp').endsWith('.webp'));
      assert.ok(buildDefaultName(1, 'MB', 'gif').endsWith('.gif'));
      assert.ok(buildDefaultName(1, 'MB', 'bmp').endsWith('.bmp'));
    });

    it('uses current date (year matches)', () => {
      const name = buildDefaultName(1, 'MB', 'png');
      const year = new Date().getFullYear().toString();
      assert.ok(name.includes(year));
    });
  });

  describe('nextAvailablePath()', () => {
    it('returns <base>-1.<ext> when directory is empty', () => {
      const result = nextAvailablePath(TMP, 'demo', 'png');
      assert.equal(result, join(TMP, 'demo-1.png'));
    });

    it('skips existing files and increments counter', () => {
      writeFileSync(join(TMP, 'img-1.png'), '');
      writeFileSync(join(TMP, 'img-2.png'), '');
      const result = nextAvailablePath(TMP, 'img', 'png');
      assert.equal(result, join(TMP, 'img-3.png'));
    });

    it('is independent per extension (jpg counter does not affect png)', () => {
      writeFileSync(join(TMP, 'file-1.jpg'), '');
      const result = nextAvailablePath(TMP, 'file', 'png');
      // no file-1.png exists yet → should return -1
      assert.equal(result, join(TMP, 'file-1.png'));
    });
  });
});
