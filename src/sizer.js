import {
  BYTES_PER_PIXEL,
  DEFAULT_ASPECT_RATIO,
  MIN_DIMENSION,
  DIMENSIONS_RE,
} from './constants.js';

/**
 * Automatically calculate image dimensions from a target byte size and format.
 *
 * @param {number} targetBytes
 * @param {string} format  - one of jpg | png | gif | bmp | webp
 * @returns {{ width: number, height: number }}
 */
export function calculate(targetBytes, format) {
  const bpp = BYTES_PER_PIXEL[format] ?? 1.5;
  const totalPixels = targetBytes / bpp;

  // Solve: width = height * ratio, width * height = totalPixels
  // → height² * ratio = totalPixels
  let height = Math.round(Math.sqrt(totalPixels / DEFAULT_ASPECT_RATIO));
  let width = Math.round(height * DEFAULT_ASPECT_RATIO);

  // Enforce minimum dimensions so the text overlay is always readable
  height = Math.max(height, MIN_DIMENSION);
  width = Math.max(width, Math.round(MIN_DIMENSION * DEFAULT_ASPECT_RATIO));

  return { width, height };
}

/**
 * Parse a "WxH" dimension string.
 *
 * @param {string} dimensionStr  e.g. "1920x1080"
 * @returns {{ width: number, height: number }}
 */
export function parseDimensions(dimensionStr) {
  const m = dimensionStr.match(DIMENSIONS_RE);
  if (!m) throw new Error(`Invalid dimensions string: "${dimensionStr}"`);
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}
