import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { render, buildNoiseLayer } from '../src/core/renderer.js';

const BG = '#4a607a';
const TEXT = '#f0f0f0';
const LINES = { line1: 'test.png', line2: '1MB', line3: '400 × 300' };

describe('renderer', () => {
  describe('buildNoiseLayer()', () => {
    it('returns a Buffer', async () => {
      const buf = await buildNoiseLayer(200, 150);
      assert.ok(Buffer.isBuffer(buf));
    });

    it('produces a valid PNG with the requested dimensions', async () => {
      const buf = await buildNoiseLayer(200, 150);
      const meta = await sharp(buf).metadata();
      assert.equal(meta.width, 200);
      assert.equal(meta.height, 150);
      assert.equal(meta.format, 'png');
    });

    it('two calls produce different noise (random content)', async () => {
      const a = await buildNoiseLayer(100, 100);
      const b = await buildNoiseLayer(100, 100);
      // Buffers should differ (randomness); probability of collision is negligible
      assert.notDeepEqual(a, b);
    });
  });

  describe('render()', () => {
    it('returns a Buffer for PNG format', async () => {
      const buf = await render(400, 300, BG, TEXT, LINES, 'png');
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 0);
    });

    it('output has correct dimensions (PNG)', async () => {
      const buf = await render(400, 300, BG, TEXT, LINES, 'png');
      const meta = await sharp(buf).metadata();
      assert.equal(meta.width, 400);
      assert.equal(meta.height, 300);
    });

    it('output is valid JPEG for jpg format', async () => {
      const buf = await render(400, 300, BG, TEXT, LINES, 'jpg', 80);
      const meta = await sharp(buf).metadata();
      assert.equal(meta.format, 'jpeg');
    });

    it('output is valid WEBP for webp format', async () => {
      const buf = await render(400, 300, BG, TEXT, LINES, 'webp', 80);
      const meta = await sharp(buf).metadata();
      assert.equal(meta.format, 'webp');
    });

    it('output starts with BMP magic bytes for bmp format', async () => {
      const buf = await render(100, 100, BG, TEXT, LINES, 'bmp');
      // BMP signature: 0x42 0x4D ('BM')
      assert.equal(buf[0], 0x42);
      assert.equal(buf[1], 0x4d);
    });

    it('output starts with GIF magic bytes for gif format', async () => {
      const buf = await render(100, 100, BG, TEXT, LINES, 'gif');
      // GIF signature: 'GIF8'
      assert.equal(buf.slice(0, 4).toString('ascii'), 'GIF8');
    });

    it('higher quality produces larger jpg output', async () => {
      const lo = await render(400, 300, BG, TEXT, LINES, 'jpg', 10);
      const hi = await render(400, 300, BG, TEXT, LINES, 'jpg', 90);
      assert.ok(hi.length > lo.length, 'high quality should produce larger file');
    });

    it('pre-supplied noiseBuffer is reused (same output for same quality)', async () => {
      const noise = await buildNoiseLayer(400, 300);
      const a = await render(400, 300, BG, TEXT, LINES, 'jpg', 80, noise);
      const b = await render(400, 300, BG, TEXT, LINES, 'jpg', 80, noise);
      assert.deepEqual(a, b, 'same noise + same quality should yield identical output');
    });
  });
});
