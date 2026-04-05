import {
  BYTES_PER_PIXEL,
  DEFAULT_ASPECT_RATIO,
  MIN_DIMENSION,
  DIMENSIONS_RE,
} from '../constants/index.js';

/** When `format` is absent from BYTES_PER_PIXEL, match PNG estimate (1.5 bpp). */
const UNKNOWN_FORMAT_BPP = 1.5;

/**
 * Estimate width/height from pixel budget at default aspect ratio.
 *
 * @param {number} totalPixels
 * @returns {{ width: number, height: number }}
 */
function dimensionsForPixelBudget(totalPixels) {
  // Solve: width = height * ratio, width * height = totalPixels → height² * ratio = totalPixels
  const height = Math.round(Math.sqrt(totalPixels / DEFAULT_ASPECT_RATIO));
  const width = Math.round(height * DEFAULT_ASPECT_RATIO);
  return { width, height };
}

/**
 * Enforce minimum dimensions so the text overlay stays readable.
 *
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number }}
 */
function clampToMinDimensions(width, height) {
  return {
    width: Math.max(width, Math.round(MIN_DIMENSION * DEFAULT_ASPECT_RATIO)),
    height: Math.max(height, MIN_DIMENSION),
  };
}

/**
 * Automatically calculate image dimensions from a target byte size and format.
 *
 * @param {number} targetBytes
 * @param {string} format  - one of jpg | png | gif | bmp | webp
 * @returns {{ width: number, height: number }}
 */
export function calculate(targetBytes, format) {
  const bpp = BYTES_PER_PIXEL[format] ?? UNKNOWN_FORMAT_BPP;
  const totalPixels = targetBytes / bpp;
  const { width, height } = dimensionsForPixelBudget(totalPixels);
  return clampToMinDimensions(width, height);
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
