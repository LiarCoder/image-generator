export const SUPPORTED_FORMATS = ['jpg', 'png', 'gif', 'bmp', 'webp'];

export const SUPPORTED_UNITS = ['KB', 'MB'];

export const DEFAULT_FORMAT = 'png';
export const DEFAULT_UNIT = 'MB';
export const DEFAULT_ASPECT_RATIO = 4 / 3;

/** 50 MB in bytes */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MIN_DIMENSION = 100;

/** Hex color: #RGB or #RRGGBB */
export const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** WxH pixel dimensions string */
export const DIMENSIONS_RE = /^(\d+)x(\d+)$/i;

/** Windows and POSIX illegal filename characters */
export const ILLEGAL_FILENAME_RE = /[\\/:*?"<>|]/;

export const TOLERANCE = {
  /** ±1 KB for lossless formats: PNG / BMP / GIF */
  lossless: 1024,
  /** for lossy formats: JPG / WEBP — whichever is larger */
  lossy: {
    percentage: 0.01, // 1%
    absolute: 5120, // 5 KB
  },
};

export const BINARY_SEARCH_MAX_ITERATIONS = 20;

/** Estimated compressed bytes-per-pixel for each format (used for initial size estimation) */
export const BYTES_PER_PIXEL = {
  bmp: 3,
  png: 1.5,
  gif: 0.75,
  jpg: 0.8,
  webp: 0.7,
};

export const EXIT_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1,
  FILE_ERROR: 2,
  GENERATION_ERROR: 3,
};
