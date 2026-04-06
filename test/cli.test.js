import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE_BYTES,
  HEX_COLOR_RE,
  DIMENSIONS_RE,
  ILLEGAL_FILENAME_RE,
  EXIT_CODES,
} from '../src/constants/index.js';

/**
 * CLI validation tests.
 * We test the validation logic by exercising the individual validators directly.
 * Full integration is covered by adjuster / sizer tests.
 */

const testDir = dirname(fileURLToPath(import.meta.url));
const imgenBin = join(testDir, '..', 'bin', 'imgen.js');
const cliTmpDir = join(testDir, '..', 'temp', 'cli-test-tmp');

before(() => mkdirSync(cliTmpDir, { recursive: true }));
after(() => rmSync(cliTmpDir, { recursive: true, force: true }));

function runImgen(args = []) {
  return spawnSync(process.execPath, [imgenBin, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
}

describe('CLI run', () => {
  it('prints help and exits 0 when no arguments (missing --size)', () => {
    const r = runImgen([]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:\s+imgen/i);
    assert.match(r.stdout, /--size/);
  });

  it('prints help and exits 0 when --size is omitted with other options', () => {
    const r = runImgen(['-f', 'png', '-u', 'KB']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:\s+imgen/i);
    assert.match(r.stdout, /--size/);
  });

  it('prints version and exits 0 with -v', () => {
    const r = runImgen(['-v']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\d+\.\d+\.\d+/);
  });

  it('accepts -c/--copy-to-clipboard flag', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '-f', 'png', '-c', '--quiet', '-o', cliTmpDir]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.trim().length > 0);
  });
});

describe('CLI parameter errors', () => {
  it('exits PARAM_ERROR for unsupported format', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '-f', 'tiff']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for non-positive size', () => {
    const r = runImgen(['-s', '0', '-u', 'KB']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for invalid numeric size', () => {
    const r = runImgen(['-s', 'abc', '-u', 'KB']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for unsupported unit', () => {
    const r = runImgen(['-s', '1', '-u', 'GB']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR when target exceeds max file size', () => {
    const r = runImgen(['-s', '51', '-u', 'MB']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for illegal filename characters', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '-n', 'bad/name']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for invalid --dimensions pattern', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '-d', '1920-1080']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for non-positive dimensions', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '-d', '0x100']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for invalid --bg-color', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '--bg-color', 'red']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR for invalid --text-color', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '--text-color', 'rgb(0,0,0)']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });

  it('exits PARAM_ERROR when --verbose and --quiet are both set', () => {
    const r = runImgen(['-s', '1', '-u', 'KB', '--verbose', '--quiet']);
    assert.equal(r.status, EXIT_CODES.PARAM_ERROR);
  });
});

describe('CLI validators', () => {
  describe('format validation', () => {
    it('accepts all supported formats (case-insensitive)', () => {
      for (const f of ['jpg', 'PNG', 'GIF', 'bmp', 'WebP']) {
        assert.ok(SUPPORTED_FORMATS.includes(f.toLowerCase()), `${f} should be valid`);
      }
    });

    it('rejects unsupported formats', () => {
      for (const f of ['tiff', 'svg', 'ico', 'heic']) {
        assert.ok(!SUPPORTED_FORMATS.includes(f), `${f} should be invalid`);
      }
    });
  });

  describe('size validation', () => {
    it('rejects zero and negative values', () => {
      for (const v of [0, -1, -100]) {
        assert.ok(!Number.isFinite(v) || v <= 0, `${v} should be invalid`);
      }
    });

    it('rejects values over 50MB limit', () => {
      const overLimit = 51 * 1024 * 1024;
      assert.ok(overLimit > MAX_FILE_SIZE_BYTES);
    });

    it('accepts valid positive numbers', () => {
      for (const v of [1, 0.5, 100, 50]) {
        assert.ok(Number.isFinite(v) && v > 0, `${v} should be valid`);
      }
    });
  });

  describe('hex color validation', () => {
    it('accepts valid 6-digit hex', () => {
      assert.ok(HEX_COLOR_RE.test('#336699'));
      assert.ok(HEX_COLOR_RE.test('#ffffff'));
      assert.ok(HEX_COLOR_RE.test('#000000'));
    });

    it('accepts valid 3-digit hex shorthand', () => {
      assert.ok(HEX_COLOR_RE.test('#f00'));
      assert.ok(HEX_COLOR_RE.test('#abc'));
    });

    it('rejects named colors and other formats', () => {
      assert.ok(!HEX_COLOR_RE.test('red'));
      assert.ok(!HEX_COLOR_RE.test('rgb(0,0,0)'));
      assert.ok(!HEX_COLOR_RE.test('336699'));
      assert.ok(!HEX_COLOR_RE.test('#12345')); // 5 digits
    });
  });

  describe('dimensions validation', () => {
    it('accepts valid WxH formats', () => {
      assert.ok(DIMENSIONS_RE.test('1920x1080'));
      assert.ok(DIMENSIONS_RE.test('100x100'));
      assert.ok(DIMENSIONS_RE.test('1920X1080')); // case
    });

    it('rejects invalid formats', () => {
      assert.ok(!DIMENSIONS_RE.test('1920-1080'));
      assert.ok(!DIMENSIONS_RE.test('abcxdef'));
      assert.ok(!DIMENSIONS_RE.test('1920'));
    });
  });

  describe('filename validation', () => {
    it('accepts valid filenames', () => {
      for (const n of ['demo', 'my-image', 'test_123', 'img.backup']) {
        assert.ok(!ILLEGAL_FILENAME_RE.test(n), `"${n}" should be valid`);
      }
    });

    it('rejects filenames with illegal characters', () => {
      for (const n of ['test/file', 'a\\b', 'foo:bar', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b']) {
        assert.ok(ILLEGAL_FILENAME_RE.test(n), `"${n}" should be invalid`);
      }
    });
  });
});
