/**
 * Precisely adjust image buffer size to match a target byte count.
 *
 * Strategies:
 *  - Lossless formats (PNG / GIF): pad with a metadata chunk if too small;
 *    scale down dimensions if too large.
 *  - No-compression formats (BMP): exact pixel count is computable, so we
 *    resize directly to the nearest valid size.
 *  - Lossy formats (JPG / WEBP): binary-search over quality parameter;
 *    if quality headroom is exhausted, scale up image dimensions.
 */

import { ImageRenderer } from './renderer.js';
import { TOLERANCE, BINARY_SEARCH_MAX_ITERATIONS, MIN_DIMENSION } from '../constants/index.js';
import { logger } from '../utils/logger.js';

export class SizeAdjuster {
  static #LOSSY = new Set(['jpg', 'webp']);
  static #MAX_SHRINK_ATTEMPTS = 10;

  static #CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c;
    }
    return t;
  })();

  static #withDimensions(lines, width, height) {
    return { ...lines, line3: `${width} × ${height}` };
  }

  static #crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = SizeAdjuster.#CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Shared binary search over JPEG/WEBP quality.
   * Returns the buffer closest to targetBytes found within BINARY_SEARCH_MAX_ITERATIONS.
   *
   * @param {number} targetBytes
   * @param {string} format
   * @param {number} width
   * @param {number} height
   * @param {string} bgColor
   * @param {string} textColor
   * @param {object} lines
   * @param {Buffer} noise
   * @param {string} logLabel  - prefix for debug messages
   * @returns {Promise<{ bestBuffer: Buffer, bestDiff: number }>}
   */
  static async #binarySearchQuality(
    targetBytes,
    format,
    width,
    height,
    bgColor,
    textColor,
    lines,
    noise,
    logLabel,
  ) {
    let low = 1,
      high = 100;
    let bestBuffer = null;
    let bestDiff = Infinity;

    for (let i = 0; i < BINARY_SEARCH_MAX_ITERATIONS; i++) {
      const mid = Math.floor((low + high) / 2);
      const buf = await ImageRenderer.render(
        width,
        height,
        bgColor,
        textColor,
        lines,
        format,
        mid,
        noise,
      );
      const diff = Math.abs(buf.length - targetBytes);

      logger.debug(
        `${logLabel} [${i + 1}/${BINARY_SEARCH_MAX_ITERATIONS}] quality=${mid} size=${buf.length} diff=${diff}`,
      );

      if (diff < bestDiff) {
        bestDiff = diff;
        bestBuffer = buf;
      }

      if (buf.length < targetBytes) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }

      if (low > high) {
        break;
      }
    }

    return { bestBuffer, bestDiff };
  }

  /**
   * @param {Buffer} baseBuffer   - initial rendered image buffer
   * @param {number} targetBytes
   * @param {string} format
   * @param {number} width
   * @param {number} height
   * @param {string} bgColor
   * @param {string} textColor
   * @param {{ line1:string, line2:string, line3?:string }} lines
   * @returns {Promise<{ buffer: Buffer, width: number, height: number }>}
   */
  static async adjust(baseBuffer, targetBytes, format, width, height, bgColor, textColor, lines) {
    if (SizeAdjuster.#LOSSY.has(format)) {
      return SizeAdjuster.#adjustLossy(
        targetBytes,
        format,
        width,
        height,
        bgColor,
        textColor,
        lines,
      );
    }
    return SizeAdjuster.#adjustLossless(
      baseBuffer,
      targetBytes,
      format,
      width,
      height,
      bgColor,
      textColor,
      lines,
    );
  }

  static async #adjustLossy(targetBytes, format, width, height, bgColor, textColor, lines) {
    // Generate noise once — reused for every quality probe so results are deterministic
    const noise = await ImageRenderer.buildNoiseLayer(width, height);
    const { bestBuffer, bestDiff } = await SizeAdjuster.#binarySearchQuality(
      targetBytes,
      format,
      width,
      height,
      bgColor,
      textColor,
      lines,
      noise,
      'Quality tuning',
    );

    const tolerance = Math.max(targetBytes * TOLERANCE.lossy.percentage, TOLERANCE.lossy.absolute);

    if (bestDiff <= tolerance) {
      return { buffer: bestBuffer, width, height };
    }

    // Binary search exhausted but still outside tolerance — resize canvas so the quality
    // axis can reach the target, then do a single-pass binary search on the new size.
    const maxBuf = await ImageRenderer.render(
      width,
      height,
      bgColor,
      textColor,
      lines,
      format,
      100,
      noise,
    );
    const minBuf = await ImageRenderer.render(
      width,
      height,
      bgColor,
      textColor,
      lines,
      format,
      1,
      noise,
    );

    let scaleFactor;
    if (targetBytes > maxBuf.length) {
      scaleFactor = Math.sqrt((targetBytes * 1.15) / maxBuf.length);
    } else if (targetBytes < minBuf.length) {
      scaleFactor = Math.sqrt(targetBytes / (minBuf.length * 1.15));
    } else {
      // Target is reachable but integer quality is too coarse — scale so q=100 ≈ target
      scaleFactor = Math.sqrt(targetBytes / maxBuf.length);
    }

    const newWidth = Math.max(MIN_DIMENSION, Math.round(width * scaleFactor));
    const newHeight = Math.max(MIN_DIMENSION, Math.round(height * scaleFactor));
    logger.debug(
      `Resizing canvas to ${newWidth}×${newHeight} (scale=${scaleFactor.toFixed(3)}), retrying`,
    );

    const newNoise = await ImageRenderer.buildNoiseLayer(newWidth, newHeight);
    const updatedLines = SizeAdjuster.#withDimensions(lines, newWidth, newHeight);
    const { bestBuffer: finalBuffer } = await SizeAdjuster.#binarySearchQuality(
      targetBytes,
      format,
      newWidth,
      newHeight,
      bgColor,
      textColor,
      updatedLines,
      newNoise,
      'Quality tuning (after resize)',
    );

    return { buffer: finalBuffer, width: newWidth, height: newHeight };
  }

  static async #adjustLossless(
    baseBuffer,
    targetBytes,
    format,
    width,
    height,
    bgColor,
    textColor,
    lines,
  ) {
    const currentSize = baseBuffer.length;
    const tolerance = TOLERANCE.lossless;

    if (Math.abs(currentSize - targetBytes) <= tolerance) {
      return { buffer: baseBuffer, width, height };
    }

    if (currentSize < targetBytes) {
      const padded = SizeAdjuster.#padBuffer(baseBuffer, targetBytes, format);
      return { buffer: padded, width, height };
    }

    return SizeAdjuster.#shrinkAndRender(
      targetBytes,
      format,
      width,
      height,
      bgColor,
      textColor,
      lines,
    );
  }

  static #padBuffer(buf, targetBytes, format) {
    const needed = targetBytes - buf.length;
    if (needed <= 0) {
      return buf;
    }

    if (format === 'png') {
      return SizeAdjuster.#padPng(buf, needed);
    }
    if (format === 'gif') {
      return SizeAdjuster.#padGif(buf, needed);
    }

    // bmp and any other lossless formats: append zero bytes (BMP readers ignore trailing data)
    return Buffer.concat([buf, Buffer.alloc(needed, 0)]);
  }

  /**
   * Inject a PNG tEXt chunk filled with padding data to reach the target size.
   * A tEXt chunk: length(4) + type(4) + data + CRC(4) = 12 + dataLength
   */
  static #padPng(buf, neededBytes) {
    if (neededBytes < 12) {
      // Too small for a valid chunk — just append raw bytes
      return Buffer.concat([buf, Buffer.alloc(neededBytes, 0)]);
    }

    const dataLength = neededBytes - 12;
    const chunk = Buffer.alloc(neededBytes, 0);

    chunk.writeUInt32BE(dataLength, 0);
    chunk.write('tEXt', 4, 'ascii');
    chunk.write('Comment\0', 8, 'ascii'); // keyword + null separator

    const crc = SizeAdjuster.#crc32(chunk.slice(4, 8 + dataLength));
    chunk.writeUInt32BE(crc, 8 + dataLength);

    // Insert just before the PNG IEND chunk (last 12 bytes)
    const iendPos = buf.length - 12;
    return Buffer.concat([buf.slice(0, iendPos), chunk, buf.slice(iendPos)]);
  }

  /**
   * Append a GIF comment extension block as padding.
   */
  static #padGif(buf, neededBytes) {
    // GIF comment extension: 0x21 0xFE, then sub-blocks (max 255 bytes each), then 0x00
    const blocks = [];
    let remaining = neededBytes - 3; // -3 for header(2) + terminator(1)

    if (remaining <= 0) {
      return Buffer.concat([buf.slice(0, buf.length - 1), Buffer.from([0x21, 0xfe, 0x00, 0x3b])]);
    }

    while (remaining > 0) {
      const blockSize = Math.min(255, remaining);
      blocks.push(Buffer.from([blockSize]));
      blocks.push(Buffer.alloc(blockSize, 0x20)); // space chars
      remaining -= blockSize;
    }

    const extension = Buffer.concat([Buffer.from([0x21, 0xfe]), ...blocks, Buffer.from([0x00])]);

    // Insert before GIF trailer (0x3B)
    return Buffer.concat([buf.slice(0, buf.length - 1), extension, Buffer.from([0x3b])]);
  }

  static async #shrinkAndRender(targetBytes, format, width, height, bgColor, textColor, lines) {
    let w = width;
    let h = height;
    let lastBuffer = null;
    const tolerance = TOLERANCE.lossless;

    for (let i = 0; i < SizeAdjuster.#MAX_SHRINK_ATTEMPTS; i++) {
      const current = lastBuffer?.length ?? w * h * 3;
      const scale = Math.sqrt(targetBytes / current) * 0.97; // 3% safety margin
      w = Math.max(MIN_DIMENSION, Math.round(w * scale));
      h = Math.max(MIN_DIMENSION, Math.round(h * scale));

      const updatedLines = SizeAdjuster.#withDimensions(lines, w, h);
      const buf = await ImageRenderer.render(w, h, bgColor, textColor, updatedLines, format);
      logger.debug(`Shrunk canvas to ${w}×${h}, size=${buf.length}, target=${targetBytes}`);

      if (Math.abs(buf.length - targetBytes) <= tolerance) {
        return { buffer: buf, width: w, height: h };
      }

      if (buf.length <= targetBytes) {
        const padded = SizeAdjuster.#padBuffer(buf, targetBytes, format);
        return { buffer: padded, width: w, height: h };
      }

      lastBuffer = buf;
    }

    return { buffer: lastBuffer, width: w, height: h };
  }
}
