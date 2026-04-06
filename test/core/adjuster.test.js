import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SizeAdjuster } from '../../src/core/adjuster.js';
import { ImageRenderer } from '../../src/core/renderer.js';
import { ImageSizer } from '../../src/core/sizer.js';

const { adjust } = SizeAdjuster;
const { render } = ImageRenderer;
const { calculate } = ImageSizer;

const BG = '#4a607a';
const TEXT = '#f0f0f0';

/**
 * Helper: use sizer to get proper initial dims, render base, then adjust.
 */
async function makeAdjusted(format, targetBytes) {
  const { width, height } = calculate(targetBytes, format);
  const lines = {
    line1: `test.${format}`,
    line2: `${Math.round(targetBytes / 1024)}KB`,
    line3: `${width} \u00d7 ${height}`,
  };
  const base = await render(width, height, BG, TEXT, lines, format);
  return adjust(base, targetBytes, format, width, height, BG, TEXT, lines);
}

describe('adjuster', () => {
  describe('PNG (lossless)', () => {
    it('pads up to exact target when base is too small', async () => {
      const target = 500 * 1024; // 500 KB
      const { buffer } = await makeAdjusted('png', target);
      assert.equal(buffer.length, target);
    });

    it('keeps size within \u00b11 KB for 1 MB target', async () => {
      const target = 1 * 1024 * 1024; // 1 MB
      const { buffer } = await makeAdjusted('png', target);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe('BMP (no compression)', () => {
    it('reaches target within \u00b11 KB via padding', async () => {
      const target = 300 * 1024;
      const { buffer } = await makeAdjusted('bmp', target);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `BMP diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe('JPG (lossy)', () => {
    it('stays within \u00b11% of 2 MB target', async () => {
      const target = 2 * 1024 * 1024; // 2 MB
      const { buffer } = await makeAdjusted('jpg', target);
      const diff = Math.abs(buffer.length - target);
      const pct = diff / target;
      assert.ok(
        pct <= 0.01 || diff <= 5120,
        `JPG diff=${diff} (${(pct * 100).toFixed(2)}%) exceeds tolerance`,
      );
    });
  });

  describe('WEBP (lossy)', () => {
    it('stays within \u00b11% of 300 KB target', async () => {
      const target = 300 * 1024; // 300 KB
      const { buffer } = await makeAdjusted('webp', target);
      const diff = Math.abs(buffer.length - target);
      const pct = diff / target;
      assert.ok(
        pct <= 0.01 || diff <= 5120,
        `WEBP diff=${diff} (${(pct * 100).toFixed(2)}%) exceeds tolerance`,
      );
    });
  });

  describe('GIF (lossless)', () => {
    it('stays within \u00b11 KB of 200 KB target', async () => {
      const target = 200 * 1024;
      const { buffer } = await makeAdjusted('gif', target);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `GIF diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe('PNG shrink path (base larger than target)', () => {
    it('shrinks and stays within \u00b11 KB when base exceeds target', async () => {
      const { ImageRenderer: Renderer } = await import('../../src/core/renderer.js');
      const { SizeAdjuster: Adjuster } = await import('../../src/core/adjuster.js');
      const renderFn = Renderer.render.bind(Renderer);
      const adjustFn = Adjuster.adjust.bind(Adjuster);

      // Render at a sizeable canvas, then pad the buffer to guarantee it exceeds
      // the target — this reliably exercises the shrinkAndRender code path.
      const w = 800,
        h = 600;
      const target = 100 * 1024; // 100 KB
      const lines = {
        line1: 'test.png',
        line2: '100KB',
        line3: `${w} \u00d7 ${h}`,
      };
      const base = await renderFn(w, h, BG, TEXT, lines, 'png');
      // Ensure the base is larger than target regardless of PNG compression ratio
      const bigBase =
        base.length > target
          ? base
          : Buffer.concat([base, Buffer.alloc(target - base.length + 1024, 0x41)]);
      assert.ok(bigBase.length > target, 'pre-condition: base must be larger than target');

      const { buffer } = await adjustFn(bigBase, target, 'png', w, h, BG, TEXT, lines);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `shrink diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe('tiny target (near minimum dimensions)', () => {
    it('PNG: handles very small target without crashing', async () => {
      const target = 15 * 1024; // 15 KB — forces 100x100-ish canvas
      const { buffer, width, height } = await makeAdjusted('png', target);
      assert.ok(buffer.length > 0, 'should produce a non-empty buffer');
      assert.ok(width >= 100, `width ${width} < minimum 100`);
      assert.ok(height >= 100, `height ${height} < minimum 100`);
      // Best-effort tolerance for tiny images: ±5 KB
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 5 * 1024, `tiny PNG diff=${diff} is too large`);
    });

    it('JPG: handles very small target without crashing', async () => {
      const target = 20 * 1024; // 20 KB
      const { buffer, width, height } = await makeAdjusted('jpg', target);
      assert.ok(buffer.length > 0);
      assert.ok(width >= 100);
      assert.ok(height >= 100);
    });
  });
});
