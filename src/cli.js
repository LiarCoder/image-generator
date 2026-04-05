import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import {
  SUPPORTED_FORMATS,
  SUPPORTED_UNITS,
  DEFAULT_FORMAT,
  DEFAULT_UNIT,
  MAX_FILE_SIZE_BYTES,
  EXIT_CODES,
} from "./constants.js";
import * as logger from "./logger.js";
import { generate } from "./generator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8"),
);

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const DIMENSIONS_RE = /^(\d+)x(\d+)$/i;
// Windows and POSIX illegal filename characters
const ILLEGAL_FILENAME_RE = /[\\/:*?"<>|]/;

function die(message) {
  logger.error(message, EXIT_CODES.PARAM_ERROR);
}

export function run() {
  const program = new Command();

  program
    .name("imgen")
    .description("Generate images with a precise target file size")
    .version(pkg.version, "-v, --version", "显示版本号")
    .helpOption("-h, --help", "显示帮助信息")
    .option(
      "-f, --format <type>",
      `图片格式：${SUPPORTED_FORMATS.join(" | ")}`,
      DEFAULT_FORMAT,
    )
    .requiredOption("-s, --size <number>", "目标文件体积（正数）")
    .option("-u, --unit <unit>", `体积单位：KB | MB`, DEFAULT_UNIT)
    .option("-n, --name <string>", "文件名（不含扩展名）")
    .option("-o, --output <dir>", "输出目录（默认：当前目录）", process.cwd())
    .option("-d, --dimensions <WxH>", "手动指定像素尺寸，如 1920x1080")
    .option("--bg-color <color>", "背景颜色 hex 值，如 #336699")
    .option("--text-color <color>", "文字颜色 hex 值，如 #FFFFFF")
    .option("--verbose", "详细输出模式")
    .option("--quiet", "安静模式，仅输出文件路径");

  program.parse(process.argv);
  const opts = program.opts();

  // ── Mutually exclusive flags ─────────────────────────────────────────────
  if (opts.verbose && opts.quiet) {
    die("--verbose 和 --quiet 不能同时使用");
  }

  // ── Set log mode early so subsequent errors respect it ───────────────────
  if (opts.verbose) logger.setMode("verbose");
  else if (opts.quiet) logger.setMode("quiet");

  // ── -f / --format ────────────────────────────────────────────────────────
  const format = opts.format.toLowerCase();
  if (!SUPPORTED_FORMATS.includes(format)) {
    die(
      `不支持的格式 "${opts.format}"。支持的格式：${SUPPORTED_FORMATS.join(", ")}`,
    );
  }

  // ── -s / --size ──────────────────────────────────────────────────────────
  const sizeNum = Number(opts.size);
  if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
    die(`--size 必须为正数，当前值：${opts.size}`);
  }

  // ── -u / --unit ──────────────────────────────────────────────────────────
  const unit = opts.unit.toUpperCase();
  if (!SUPPORTED_UNITS.includes(unit)) {
    die(
      `不支持的单位 "${opts.unit}"。支持的单位：${SUPPORTED_UNITS.join(", ")}`,
    );
  }

  const targetBytes = sizeNum * (unit === "MB" ? 1048576 : 1024);
  if (targetBytes > MAX_FILE_SIZE_BYTES) {
    const limit = MAX_FILE_SIZE_BYTES / 1048576;
    die(`目标体积 ${sizeNum}${unit} 超过最大限制 ${limit}MB`);
  }

  // ── -n / --name ──────────────────────────────────────────────────────────
  if (opts.name && ILLEGAL_FILENAME_RE.test(opts.name)) {
    die(`文件名 "${opts.name}" 包含非法字符，请避免使用：\\ / : * ? " < > |`);
  }

  // ── -d / --dimensions ────────────────────────────────────────────────────
  let dimensions = null;
  if (opts.dimensions) {
    const m = opts.dimensions.match(DIMENSIONS_RE);
    if (!m) {
      die(
        `--dimensions 格式错误 "${opts.dimensions}"，正确格式：宽x高（如 1920x1080）`,
      );
    }
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w <= 0 || h <= 0) {
      die(`--dimensions 宽高必须为正整数，当前值：${opts.dimensions}`);
    }
    dimensions = { width: w, height: h };
  }

  // ── --bg-color / --text-color ────────────────────────────────────────────
  if (opts.bgColor && !HEX_COLOR_RE.test(opts.bgColor)) {
    die(
      `--bg-color 格式错误 "${opts.bgColor}"，请使用 hex 格式（如 #336699 或 #f00）`,
    );
  }
  if (opts.textColor && !HEX_COLOR_RE.test(opts.textColor)) {
    die(
      `--text-color 格式错误 "${opts.textColor}"，请使用 hex 格式（如 #FFFFFF 或 #fff）`,
    );
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
