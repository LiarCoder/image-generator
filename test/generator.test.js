import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayName, buildOverlayLines, getToleranceBytes } from '../src/core/generator.js';

describe('generator helpers', () => {
  describe('buildDisplayName()', () => {
    it('uses custom name with format extension', () => {
      assert.equal(buildDisplayName('shot', 2, 'MB', 'png'), 'shot.png');
    });

    it('falls back to size+unit label when name is null', () => {
      assert.equal(buildDisplayName(null, 2, 'MB', 'jpg'), '2MB.jpg');
    });
  });

  describe('buildOverlayLines()', () => {
    it('includes display name, size label, and dimensions', () => {
      const lines = buildOverlayLines('out.png', 500, 'KB', 800, 600);
      assert.equal(lines.line1, 'out.png');
      assert.equal(lines.line2, '500KB');
      assert.equal(lines.line3, '800 × 600');
    });
  });

  describe('getToleranceBytes()', () => {
    it('uses lossless tolerance for png', () => {
      assert.equal(getToleranceBytes('png', 1_000_000), 1024);
    });

    it('uses at least 5120 bytes for small lossy targets', () => {
      assert.equal(getToleranceBytes('jpg', 100_000), 5120);
    });

    it('uses 1% of target when that exceeds 5120 for lossy formats', () => {
      const target = 2 * 1024 * 1024;
      assert.equal(getToleranceBytes('webp', target), target * 0.01);
    });
  });
});
