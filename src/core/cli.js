import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  SUPPORTED_FORMATS,
  SUPPORTED_UNITS,
  DEFAULT_FORMAT,
  DEFAULT_UNIT,
  MAX_FILE_SIZE_BYTES,
  EXIT_CODES,
  HEX_COLOR_RE,
  DIMENSIONS_RE,
  ILLEGAL_FILENAME_RE,
} from '../constants/index.js';
import * as logger from '../utils/logger.js';
import { generate } from './generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

function die(message) {
  logger.error(message, EXIT_CODES.PARAM_ERROR);
}

export function run() {
  const program = new Command();

  program
    .name('imgen')
    .description('Generate images with a precise target file size')
    .version(pkg.version, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help')
    .option('-s, --size <number>', 'Target file size (positive number)')
    .option('-f, --format <type>', `Image format: ${SUPPORTED_FORMATS.join(' | ')}`, DEFAULT_FORMAT)
    .option('-u, --unit <unit>', `Size unit: KB | MB`, DEFAULT_UNIT)
    .option(
      '-n, --name <string>',
      'Filename without extension (default: ${size}${unit}-${YYYY-MM-DD-HH-mm-ss}.${format})',
    )
    .option('-o, --output <dir>', 'Output directory (default: current directory)', process.cwd())
    .option(
      '-d, --dimensions <WxH>',
      'Explicit pixel dimensions, e.g. 1920x1080. (default: auto-calculated if not provided)',
    )
    .option(
      '--bg-color <color>',
      'Background color as hex, e.g. #336699. (default: random muted color)',
    )
    .option(
      '--text-color <color>',
      'Text color as hex, e.g. #FFFFFF. (default: auto WCAG contrast)',
    )
    .option('--verbose', 'Verbose output', false)
    .option('--quiet', 'Quiet mode; print only the output file path', false);

  program.parse(process.argv);
  const opts = program.opts();

  // ── No arguments: show help ──────────────────────────────────────────────
  if (!opts.size) {
    program.help();
  }

  // ── Mutually exclusive flags ─────────────────────────────────────────────
  if (opts.verbose && opts.quiet) {
    die('`--verbose` and `--quiet` cannot be used at the same time');
  }

  // ── Set log mode early so subsequent errors respect it ───────────────────
  if (opts.verbose) logger.setMode('verbose');
  else if (opts.quiet) logger.setMode('quiet');

  // ── -f / --format ────────────────────────────────────────────────────────
  const format = opts.format.toLowerCase();
  if (!SUPPORTED_FORMATS.includes(format)) {
    die(`Unsupported format "${opts.format}". Supported: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  // ── -s / --size ──────────────────────────────────────────────────────────
  const sizeNum = Number(opts.size);
  if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
    die(`\`--size\` must be a positive number; but got: ${opts.size}`);
  }

  // ── -u / --unit ──────────────────────────────────────────────────────────
  const unit = opts.unit.toUpperCase();
  if (!SUPPORTED_UNITS.includes(unit)) {
    die(`Unsupported \`--unit\` "${opts.unit}". Supported: ${SUPPORTED_UNITS.join(', ')}`);
  }

  const targetBytes = sizeNum * (unit === 'MB' ? 1048576 : 1024);
  if (targetBytes > MAX_FILE_SIZE_BYTES) {
    const limit = MAX_FILE_SIZE_BYTES / 1048576;
    die(`Target size ${sizeNum}${unit} exceeds the maximum limit of ${limit}MB`);
  }

  // ── -n / --name ──────────────────────────────────────────────────────────
  if (opts.name && ILLEGAL_FILENAME_RE.test(opts.name)) {
    die(`Filename "${opts.name}" contains illegal characters. Avoid: \\ / : * ? " < > |`);
  }

  // ── -d / --dimensions ────────────────────────────────────────────────────
  let dimensions = null;
  if (opts.dimensions) {
    const m = opts.dimensions.match(DIMENSIONS_RE);
    if (!m) {
      die(`Invalid \`--dimensions\` "${opts.dimensions}". Expected: WIDTHxHEIGHT (e.g. 1920x1080)`);
    }
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w <= 0 || h <= 0) {
      die(`--dimensions width and height must be positive integers; but got: ${opts.dimensions}`);
    }
    dimensions = { width: w, height: h };
  }

  // ── --bg-color / --text-color ────────────────────────────────────────────
  if (opts.bgColor && !HEX_COLOR_RE.test(opts.bgColor)) {
    die(`Invalid \`--bg-color\` "${opts.bgColor}". Use hex (e.g. #336699 or #f00)`);
  }
  if (opts.textColor && !HEX_COLOR_RE.test(opts.textColor)) {
    die(`Invalid \`--text-color\` "${opts.textColor}". Use hex (e.g. #FFFFFF or #fff)`);
  }

  // ── Dispatch ─────────────────────────────────────────────────────────────
  generate({
    format,
    size: sizeNum,
    unit,
    targetBytes,
    name: opts.name ?? null,
    outputDir: opts.output,
    dimensions,
    bgColor: opts.bgColor ?? null,
    textColor: opts.textColor ?? null,
  }).catch((err) => {
    logger.error(err.message, EXIT_CODES.GENERATION_ERROR);
  });
}
