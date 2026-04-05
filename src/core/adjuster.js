/**
 * adjuster.js — Precisely adjust image buffer size to match a target byte count.
 *
 * Strategies:
 *  - Lossless formats (PNG / GIF): pad with a metadata chunk if too small;
 *    scale down dimensions if too large.
 *  - No-compression formats (BMP): exact pixel count is computable, so we
 *    resize directly to the nearest valid size.
 *  - Lossy formats (JPG / WEBP): binary-search over quality parameter;
 *    if quality headroom is exhausted, scale up image dimensions.
 */

import { render, buildNoiseLayer } from './renderer.js';
import { TOLERANCE, BINARY_SEARCH_MAX_ITERATIONS, MIN_DIMENSION } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const LOSSY = new Set(['jpg', 'webp']);
const MAX_SHRINK_ATTEMPTS = 10;

/**
 * Build display lines with updated dimensions.
 *
 * @param {{ line1:string, line2:string, line3?:string }} lines
 * @param {number} width
 * @param {number} height
 * @returns {{ line1:string, line2:string, line3:string }}
 */
function withDimensions(lines, width, height) {
  return { ...lines, line3: `${width} × ${height}` };
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
export async function adjust(
  baseBuffer,
  targetBytes,
  format,
  width,
  height,
  bgColor,
  textColor,
  lines,
) {
  if (LOSSY.has(format)) {
    return adjustLossy(targetBytes, format, width, height, bgColor, textColor, lines);
  }
  return adjustLossless(baseBuffer, targetBytes, format, width, height, bgColor, textColor, lines);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lossy (JPG / WEBP) — binary search over quality
// ─────────────────────────────────────────────────────────────────────────────

async function adjustLossy(targetBytes, format, width, height, bgColor, textColor, lines) {
  // Generate noise once — reused for every quality probe so results are deterministic
  const noise = await buildNoiseLayer(width, height);

  let low = 1,
    high = 100;
  let bestBuffer = null;
  let bestDiff = Infinity;
  let iterations = 0;

  while (low <= high && iterations < BINARY_SEARCH_MAX_ITERATIONS) {
    const mid = Math.floor((low + high) / 2);
    const buf = await render(width, height, bgColor, textColor, lines, format, mid, noise);
    const diff = Math.abs(buf.length - targetBytes);

    logger.debug(
      `Quality tuning [${iterations + 1}/${BINARY_SEARCH_MAX_ITERATIONS}] quality=${mid} size=${buf.length} diff=${diff}`,
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
    iterations++;
  }

  const tolerance = Math.max(targetBytes * TOLERANCE.lossy.percentage, TOLERANCE.lossy.absolute);

  if (bestDiff <= tolerance) {
    return { buffer: bestBuffer, width, height };
  }

  // Binary search exhausted but still outside tolerance.
  // The quality axis is too coarse (adjacent integer qualities straddle the target),
  // so we resize the canvas to shift the quality curve until the target is reachable.
  //
  // Strategy: probe quality=1 and quality=100 to bracket the canvas range.
  //   - If target > q100 size: canvas is too small  → scale up using q100 as reference
  //   - If target < q1  size: canvas is too large   → scale down using q1 as reference
  //   - Otherwise: straddle case — scale so that the closest candidate hits the target
  const maxBuf = await render(width, height, bgColor, textColor, lines, format, 100, noise);
  const minBuf = await render(width, height, bgColor, textColor, lines, format, 1, noise);

  let scaleFactor;
  if (targetBytes > maxBuf.length) {
    // Need bigger canvas
    scaleFactor = Math.sqrt((targetBytes * 1.15) / maxBuf.length);
  } else if (targetBytes < minBuf.length) {
    // Need smaller canvas
    scaleFactor = Math.sqrt(targetBytes / (minBuf.length * 1.15));
  } else {
    // Target is reachable by quality alone but integer quality is too coarse.
    // Scale canvas so that quality=100 of the new canvas ≈ target,
    // giving fine-grained control around the target.
    scaleFactor = Math.sqrt(targetBytes / maxBuf.length);
  }

  const newWidth = Math.max(MIN_DIMENSION, Math.round(width * scaleFactor));
  const newHeight = Math.max(MIN_DIMENSION, Math.round(height * scaleFactor));
  logger.debug(
    `Resizing canvas to ${newWidth}×${newHeight} (scale=${scaleFactor.toFixed(3)}), retrying`,
  );
  const updatedLines = withDimensions(lines, newWidth, newHeight);
  return adjustLossyFinal(
    targetBytes,
    format,
    newWidth,
    newHeight,
    bgColor,
    textColor,
    updatedLines,
  );
}

/**
 * Single-pass binary search used after the canvas has been enlarged.
 * Generates its own noise layer (new canvas size) and does not recurse further.
 */
async function adjustLossyFinal(targetBytes, format, width, height, bgColor, textColor, lines) {
  const noise = await buildNoiseLayer(width, height);

  let low = 1,
    high = 100;
  let bestBuffer = null;
  let bestDiff = Infinity;

  for (let i = 0; i < BINARY_SEARCH_MAX_ITERATIONS; i++) {
    const mid = Math.floor((low + high) / 2);
    const buf = await render(width, height, bgColor, textColor, lines, format, mid, noise);
    const diff = Math.abs(buf.length - targetBytes);
    logger.debug(
      `Quality tuning (after resize) [${i + 1}] quality=${mid} size=${buf.length} diff=${diff}`,
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

  return { buffer: bestBuffer, width, height };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lossless (PNG / GIF / BMP)
// ─────────────────────────────────────────────────────────────────────────────

async function adjustLossless(
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
    // Need to grow: pad with metadata
    const padded = padBuffer(baseBuffer, targetBytes, format);
    return { buffer: padded, width, height };
  }

  // Need to shrink: scale down dimensions and re-render
  return shrinkAndRender(targetBytes, format, width, height, bgColor, textColor, lines);
}

/**
 * Append padding bytes to reach targetBytes.
 * - PNG: append a harmless tEXt chunk "Comment: <padding>"
 * - GIF: append comment extension blocks
 * - BMP: extend the pixel data area (BMP ignores trailing data)
 *
 * @param {Buffer} buf
 * @param {number} targetBytes
 * @param {string} format
 * @returns {Buffer}
 */
function padBuffer(buf, targetBytes, format) {
  const needed = targetBytes - buf.length;
  if (needed <= 0) {
    return buf;
  }

  if (format === 'png') {
    return padPng(buf, needed);
  }
  if (format === 'gif') {
    return padGif(buf, needed);
  }
  if (format === 'bmp') {
    // Simply append zero bytes after the BMP data; BMP readers ignore trailing data
    const padding = Buffer.alloc(needed, 0);
    return Buffer.concat([buf, padding]);
  }

  // Fallback: raw append
  const padding = Buffer.alloc(needed, 0);
  return Buffer.concat([buf, padding]);
}

/**
 * Inject a PNG tEXt chunk filled with padding data to reach the target size.
 */
function padPng(buf, neededBytes) {
  // A PNG tEXt chunk: length(4) + 'tEXt'(4) + data + CRC(4) = 12 + dataLength
  // We need to fill `neededBytes` total, so dataLength = neededBytes - 12
  if (neededBytes < 12) {
    // Too small for a valid chunk — just append raw bytes
    return Buffer.concat([buf, Buffer.alloc(neededBytes, 0)]);
  }

  const dataLength = neededBytes - 12;
  const chunk = Buffer.alloc(neededBytes, 0);

  // Length (big-endian)
  chunk.writeUInt32BE(dataLength, 0);

  // Chunk type "tEXt"
  chunk.write('tEXt', 4, 'ascii');

  // Data: keyword "Comment\0" + padding zeros
  const keyword = 'Comment\0';
  chunk.write(keyword, 8, 'ascii');
  // Rest is already zeroed

  // CRC-32 over type + data (positions 4..8+dataLength)
  const crc = crc32(chunk.slice(4, 8 + dataLength));
  chunk.writeUInt32BE(crc, 8 + dataLength);

  // Insert just before the PNG IEND chunk (last 12 bytes)
  const iendPos = buf.length - 12;
  return Buffer.concat([buf.slice(0, iendPos), chunk, buf.slice(iendPos)]);
}

/**
 * Append a GIF comment extension block as padding.
 */
function padGif(buf, neededBytes) {
  // GIF comment extension: 0x21 0xFE, then sub-blocks (max 255 bytes each), then 0x00
  // Each sub-block: length(1) + data
  const blocks = [];
  let remaining = neededBytes - 3; // -3 for header(2) + terminator(1)

  if (remaining <= 0) {
    return Buffer.concat([
      buf.slice(0, buf.length - 1), // remove trailing 0x3B (GIF trailer)
      Buffer.from([0x21, 0xfe, 0x00, 0x3b]),
    ]);
  }

  while (remaining > 0) {
    const blockSize = Math.min(255, remaining);
    blocks.push(Buffer.from([blockSize]));
    blocks.push(Buffer.alloc(blockSize, 0x20)); // space chars
    remaining -= blockSize;
  }

  const extension = Buffer.concat([
    Buffer.from([0x21, 0xfe]), // comment extension header
    ...blocks,
    Buffer.from([0x00]), // block terminator
  ]);

  // Insert before GIF trailer (0x3B)
  return Buffer.concat([buf.slice(0, buf.length - 1), extension, Buffer.from([0x3b])]);
}

/**
 * Iteratively shrink image dimensions until the rendered output fits within
 * targetBytes (within tolerance).
 */
async function shrinkAndRender(targetBytes, format, width, height, bgColor, textColor, lines) {
  let w = width;
  let h = height;
  let lastBuffer = null;
  const tolerance = TOLERANCE.lossless;

  for (let i = 0; i < MAX_SHRINK_ATTEMPTS; i++) {
    // Estimate scale factor: current > target, so reduce proportionally
    const current = lastBuffer?.length ?? w * h * 3;
    const scale = Math.sqrt(targetBytes / current) * 0.97; // 3% safety margin
    w = Math.max(MIN_DIMENSION, Math.round(w * scale));
    h = Math.max(MIN_DIMENSION, Math.round(h * scale));

    const updatedLines = withDimensions(lines, w, h);
    const buf = await render(w, h, bgColor, textColor, updatedLines, format);
    logger.debug(`Shrunk canvas to ${w}×${h}, size=${buf.length}, target=${targetBytes}`);

    if (Math.abs(buf.length - targetBytes) <= tolerance) {
      return { buffer: buf, width: w, height: h };
    }

    if (buf.length <= targetBytes) {
      // Now too small — pad it
      const padded = padBuffer(buf, targetBytes, format);
      return { buffer: padded, width: w, height: h };
    }

    lastBuffer = buf;
  }

  // Best effort: return whatever we have
  return { buffer: lastBuffer, width: w, height: h };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRC-32 (needed for PNG chunk integrity)
// ─────────────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
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

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
