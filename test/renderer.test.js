import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ImageRenderer } from '../src/core/renderer.js';

const { render, buildNoiseLayer, applyFormat, rawToBmp } = ImageRenderer;

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

    it('rejects unsupported format', async () => {
      await assert.rejects(() => render(8, 8, BG, TEXT, LINES, 'tiff'), /Unsupported format/);
    });
  });

  describe('applyFormat()', () => {
    it('throws for unsupported format', () => {
      const pipeline = sharp({
        create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
      });
      assert.throws(() => applyFormat(pipeline, 'unknown', 80), /Unsupported format/);
    });
  });

  describe('rawToBmp()', () => {
    it('wraps sharp raw RGB into a BMP with consistent header and size', async () => {
      const w = 7;
      const h = 5;
      const raw = await sharp({
        create: { width: w, height: h, channels: 3, background: { r: 11, g: 22, b: 33 } },
      })
        .raw()
        .toBuffer();
      assert.equal(raw.length, w * h * 3);

      const bmp = rawToBmp(raw, w, h);
      assert.equal(bmp.toString('ascii', 0, 2), 'BM');
      assert.equal(bmp.readUInt32LE(2), bmp.length);
      assert.equal(bmp.readUInt32LE(10), 54);
      assert.equal(bmp.readUInt32LE(18), w);
      assert.equal(Math.abs(bmp.readInt32LE(22)), h);
    });
  });
});
