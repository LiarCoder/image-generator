import { resolve as resolveColors } from "./color.js";
import { calculate, parseDimensions } from "./sizer.js";
import { render } from "./renderer.js";
import { adjust } from "./adjuster.js";
import { save } from "./output.js";
import * as logger from "./logger.js";
import { EXIT_CODES } from "./constants.js";

/**
 * Main generation flow.
 *
 * @param {{
 *   format: string,
 *   size: number,
 *   unit: string,
 *   targetBytes: number,
 *   name: string|null,
 *   outputDir: string,
 *   dimensions: {width:number,height:number}|null,
 *   bgColor: string|null,
 *   textColor: string|null,
 * }} options
 */
export async function generate(options) {
  const {
    format,
    size,
    unit,
    targetBytes,
    dimensions: dimOpt,
    bgColor,
    textColor,
  } = options;
  const startTime = Date.now();

  logger.start("正在计算最佳尺寸...");

  // 1. Resolve pixel dimensions
  let { width, height } = dimOpt ?? calculate(targetBytes, format);
  logger.debug(`初始尺寸：${width} × ${height}`);

  // 2. Resolve color scheme
  const { bgColor: bg, textColor: text } = resolveColors(bgColor, textColor);
  logger.debug(`背景色：${bg}，文字色：${text}`);

  // 3. Determine display name for overlay (filename without ext, or size label)
  const displayName = options.name
    ? `${options.name}.${format}`
    : `${size}${unit}.${format}`;

  const lines = {
    line1: displayName,
    line2: `${size}${unit}`,
    line3: `${width} \u00d7 ${height}`,
  };

  logger.updateSpinner("正在渲染图片内容...");

  // 4. Render the base image
  let baseBuffer = await render(width, height, bg, text, lines, format);
  logger.debug(
    `基础图片大小：${baseBuffer.length} bytes，目标：${targetBytes} bytes`,
  );

  // 5. Adjust to target size
  logger.updateSpinner("正在精确调整文件体积...");
  const {
    buffer: finalBuffer,
    width: finalWidth,
    height: finalHeight,
  } = await adjust(
    baseBuffer,
    targetBytes,
    format,
    width,
    height,
    bg,
    text,
    lines,
  );

  // 6. Warn if we couldn't hit the target precisely
  const diff = Math.abs(finalBuffer.length - targetBytes);
  const pct = diff / targetBytes;
  const isLossy = format === "jpg" || format === "webp";
  const toleranceBytes = isLossy ? Math.max(targetBytes * 0.01, 5120) : 1024;

  if (diff > toleranceBytes) {
    const actualMb = (finalBuffer.length / 1048576).toFixed(2);
    const pctStr = (pct * 100).toFixed(1);
    logger.warn(
      `无法精确匹配目标体积 ${size}${unit}，实际体积 ${actualMb}MB（误差 ${pctStr}%）`,
    );
  }

  // 7. Save to disk
  logger.updateSpinner("正在写入文件...");
  const filePath = await save(finalBuffer, options);

  // 8. Done
  logger.success(filePath, finalBuffer.length, finalWidth, finalHeight);
}
