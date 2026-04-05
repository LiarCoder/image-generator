import sharp from 'sharp';
import { colorProcessor } from '../utils/color.js';

/** Max random noise value (exclusive) for lossy-format tuning. */
const NOISE_AMPLITUDE = 60;

/** BMP file header + DIB header size in bytes. */
const BMP_HEADER_BYTES = 54;

/** ~72 DPI in pixels per metre (BMP metadata). */
const BMP_DPI_PPM = 2835;

const RGB_CHANNELS = 3;

/**
 * Image rendering: solid background, SVG text overlay, format encoding (incl. BMP wrap).
 */
export class ImageRenderer {
  /**
   * Escape text for safe inclusion in SVG.
   */
  static #escXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build a centered SVG text overlay with two (or three) lines.
   *
   * @param {number} width
   * @param {number} height
   * @param {string} textColor  - hex color string
   * @param {{ line1: string, line2: string, line3?: string }} lines
   * @returns {Buffer}  SVG buffer
   */
  static #buildSvgOverlay(width, height, textColor, lines) {
    const fs1 = Math.max(16, Math.round(height / 8));
    const fs2 = Math.max(16, Math.round(height / 6));
    const fs3 = Math.max(14, Math.round(height / 10));

    const lineGap1 = fs1 * 1.6;
    const lineGap2 = fs2 * 1.5;

    const blockHeight = fs1 + lineGap1 + fs2 + (lines.line3 ? lineGap2 + fs3 : 0);
    const startY = (height - blockHeight) / 2 + fs1;

    const y1 = startY;
    const y2 = y1 + lineGap1;
    const y3 = y2 + lineGap2;
    const cx = width / 2;

    const line3Svg = lines.line3
      ? `<text x="${cx}" y="${y3}" font-size="${fs3}" fill="${textColor}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="normal">${lines.line3}</text>`
      : '';

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="${y1}" font-size="${fs1}" fill="${textColor}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="normal" opacity="0.75">${ImageRenderer.#escXml(lines.line1)}</text>
  <text x="${cx}" y="${y2}" font-size="${fs2}" fill="${textColor}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${ImageRenderer.#escXml(lines.line2)}</text>
  ${line3Svg}
</svg>`;

    return Buffer.from(svg);
  }

  /**
   * Build sharp composite inputs: optional noise under SVG text overlay.
   */
  static #buildCompositeInputs(width, height, textColor, lines, noiseBuffer) {
    const compositeInputs = [
      {
        input: ImageRenderer.#buildSvgOverlay(width, height, textColor, lines),
        top: 0,
        left: 0,
      },
    ];
    if (noiseBuffer) {
      compositeInputs.unshift({ input: noiseBuffer, blend: 'overlay' });
    }
    return compositeInputs;
  }

  /**
   * Render an image with a solid background and centered text overlay.
   *
   * @param {number} width
   * @param {number} height
   * @param {string} bgColor    hex string, e.g. "#4a6080"
   * @param {string} textColor  hex string, e.g. "#f0f0f0"
   * @param {{ line1: string, line2: string, line3?: string }} lines
   * @param {string} format     target image format
   * @param {number} [quality]  quality for lossy formats (1-100)
   * @param {Buffer|null} [noiseBuffer]  pre-generated; reuse across iterations for determinism
   * @returns {Promise<Buffer>}
   */
  static async render(
    width,
    height,
    bgColor,
    textColor,
    lines,
    format,
    quality = 80,
    noiseBuffer = null,
  ) {
    const { r, g, b } = colorProcessor.hexToRgb(bgColor);

    const compositeInputs = ImageRenderer.#buildCompositeInputs(
      width,
      height,
      textColor,
      lines,
      noiseBuffer,
    );

    const pipeline = sharp({
      create: {
        width,
        height,
        channels: RGB_CHANNELS,
        background: { r, g, b },
      },
    }).composite(compositeInputs);

    if (format === 'bmp') {
      const rawBuffer = await ImageRenderer.applyFormat(pipeline, format, quality).toBuffer();
      return ImageRenderer.rawToBmp(rawBuffer, width, height);
    }

    return ImageRenderer.applyFormat(pipeline, format, quality).toBuffer();
  }

  /**
   * Generate a random noise PNG buffer to overlay on lossy images.
   * Generate ONCE per job and pass to render() to keep binary-search deterministic.
   *
   * @param {number} width
   * @param {number} height
   * @returns {Promise<Buffer>}
   */
  static async buildNoiseLayer(width, height) {
    const pixels = width * height * RGB_CHANNELS;
    const data = Buffer.allocUnsafe(pixels);
    for (let i = 0; i < pixels; i++) {
      data[i] = Math.floor(Math.random() * NOISE_AMPLITUDE); // low-amplitude noise (0..59)
    }
    return sharp(data, { raw: { width, height, channels: RGB_CHANNELS } })
      .png()
      .toBuffer();
  }

  /**
   * Apply the target format (and quality for lossy) to a sharp pipeline.
   *
   * @returns {import('sharp').Sharp}
   */
  static applyFormat(pipeline, format, quality = 80) {
    switch (format) {
      case 'jpg':
        return pipeline.jpeg({ quality, mozjpeg: false });
      case 'png':
        return pipeline.png({ compressionLevel: 6 });
      case 'webp':
        return pipeline.webp({ quality });
      case 'gif':
        return pipeline.gif();
      case 'bmp':
        // sharp has no native BMP encoder — encode as raw RGB then build header
        return pipeline.raw();
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Wrap raw RGB pixel data with a minimal BMP file header.
   *
   * @param {Buffer} rawPixels  - raw RGB (3 bytes per pixel, top-to-bottom)
   * @param {number} width
   * @param {number} height
   * @returns {Buffer}
   */
  static rawToBmp(rawPixels, width, height) {
    // BMP rows are padded to multiples of 4 bytes, stored bottom-to-top (BGR)
    const rowSize = Math.floor((width * RGB_CHANNELS + 3) / 4) * 4;
    const pixelDataSize = rowSize * height;
    const fileSize = BMP_HEADER_BYTES + pixelDataSize;

    const buf = Buffer.alloc(fileSize, 0);

    // ── BMP File Header (14 bytes) ──
    buf.write('BM', 0, 'ascii');
    buf.writeUInt32LE(fileSize, 2);
    buf.writeUInt32LE(0, 6); // reserved
    buf.writeUInt32LE(BMP_HEADER_BYTES, 10); // pixel data offset

    // ── DIB Header / BITMAPINFOHEADER (40 bytes) ──
    buf.writeUInt32LE(40, 14); // header size
    buf.writeInt32LE(width, 18);
    buf.writeInt32LE(-height, 22); // negative height → top-down
    buf.writeUInt16LE(1, 26); // color planes
    buf.writeUInt16LE(24, 28); // bits per pixel (24-bit RGB)
    buf.writeUInt32LE(0, 30); // compression (none)
    buf.writeUInt32LE(pixelDataSize, 34);
    buf.writeInt32LE(BMP_DPI_PPM, 38); // X pixels/metre (~72 dpi)
    buf.writeInt32LE(BMP_DPI_PPM, 42); // Y pixels/metre
    buf.writeUInt32LE(0, 46); // colors in table
    buf.writeUInt32LE(0, 50); // important colors

    // ── Pixel data (BGR, top-to-bottom because we used negative height) ──
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * RGB_CHANNELS;
        const dstIdx = BMP_HEADER_BYTES + y * rowSize + x * RGB_CHANNELS;
        buf[dstIdx] = rawPixels[srcIdx + 2]; // B
        buf[dstIdx + 1] = rawPixels[srcIdx + 1]; // G
        buf[dstIdx + 2] = rawPixels[srcIdx]; // R
      }
    }

    return buf;
  }
}
