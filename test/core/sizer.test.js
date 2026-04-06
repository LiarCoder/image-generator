import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ImageSizer } from '../../src/core/sizer.js';

const { calculate, parseDimensions } = ImageSizer;

describe('sizer', () => {
  describe('calculate()', () => {
    it('returns dimensions with 4:3 aspect ratio (approximately)', () => {
      const { width, height } = calculate(5 * 1024 * 1024, 'png');
      const ratio = width / height;
      assert.ok(ratio >= 1.2 && ratio <= 1.5, `expected ~4:3, got ${ratio.toFixed(2)}`);
    });

    it('enforces minimum dimension (100px)', () => {
      // Very small target — should still be at least MIN_DIMENSION
      const { width, height } = calculate(100, 'png');
      assert.ok(width >= 100, `width ${width} < 100`);
      assert.ok(height >= 100, `height ${height} < 100`);
    });

    it('scales correctly for BMP (no compression, bpp=3)', () => {
      const targetBytes = 300 * 1024; // 300 KB
      const { width, height } = calculate(targetBytes, 'bmp');
      // rough check: width*height*3 should be in the same ballpark
      const approxBytes = width * height * 3;
      const ratio = approxBytes / targetBytes;
      assert.ok(ratio >= 0.5 && ratio <= 3, `pixel byte estimate ratio=${ratio.toFixed(2)}`);
    });

    it('returns larger dimensions for larger target (same format)', () => {
      const small = calculate(100 * 1024, 'png');
      const large = calculate(10 * 1024 * 1024, 'png');
      assert.ok(large.width > small.width);
      assert.ok(large.height > small.height);
    });
  });

  describe('parseDimensions()', () => {
    it('parses "1920x1080" correctly', () => {
      const result = parseDimensions('1920x1080');
      assert.deepEqual(result, { width: 1920, height: 1080 });
    });

    it('is case-insensitive (1920X1080)', () => {
      const result = parseDimensions('1920X1080');
      assert.deepEqual(result, { width: 1920, height: 1080 });
    });

    it('throws for invalid format', () => {
      assert.throws(() => parseDimensions('abc'), /Invalid dimensions/);
      assert.throws(() => parseDimensions('1920-1080'), /Invalid dimensions/);
    });
  });
});
