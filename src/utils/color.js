/**
 * color.js — background / text color utilities
 *
 * Default scheme: random muted (pastel) background + auto-contrast text.
 * Users may override via --bg-color and --text-color (hex strings).
 */

/**
 * Convert a CSS hex color string to { r, g, b } (0-255).
 * Accepts both #RGB and #RRGGBB forms.
 *
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const int = parseInt(h, 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
}

/**
 * Convert HSL (h: 0-360, s: 0-100, l: 0-100) to a #RRGGBB hex string.
 */
function hslToHex(h, s, l) {
  const sl = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * sl;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;

  let r;
  let g;
  let b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Relative luminance per WCAG 2.1 (sRGB).
 */
function relativeLuminance({ r, g, b }) {
  const linearize = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Generate a random muted/pastel hex color.
 */
function randomMutedColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 31) + 20; // 20-50
  const l = Math.floor(Math.random() * 31) + 30; // 30-60
  return hslToHex(h, s, l);
}

/**
 * Pick a readable text color (near-black or near-white) based on bg luminance.
 *
 * @param {string} bgHex
 * @returns {string} hex string
 */
function autoTextColor(bgHex) {
  const lum = relativeLuminance(hexToRgb(bgHex));
  return lum > 0.35 ? '#1a1a1a' : '#f0f0f0';
}

/**
 * Resolve the final { bgColor, textColor } pair.
 * User-supplied values are preferred over the defaults.
 *
 * @param {string|null} bgColorOpt
 * @param {string|null} textColorOpt
 * @returns {{ bgColor: string, textColor: string }}
 */
export function resolve(bgColorOpt, textColorOpt) {
  const bgColor = bgColorOpt ?? randomMutedColor();
  const textColor = textColorOpt ?? autoTextColor(bgColor);
  return { bgColor, textColor };
}
