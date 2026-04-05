import { resolve as resolveColors } from '../utils/color.js';
import { calculate } from './sizer.js';
import { render } from './renderer.js';
import { adjust } from './adjuster.js';
import { save } from './output.js';
import { logger } from '../utils/logger.js';

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
  const { format, size, unit, targetBytes, dimensions: dimOpt, bgColor, textColor } = options;
  logger.start('Computing optimal dimensions...');

  // 1. Resolve pixel dimensions
  let { width, height } = dimOpt ?? calculate(targetBytes, format);
  logger.debug(`Initial dimensions: ${width} × ${height}`);

  // 2. Resolve color scheme
  const { bgColor: bg, textColor: text } = resolveColors(bgColor, textColor);
  logger.debug(`Background: ${bg}, text: ${text}`);

  // 3. Determine display name for overlay (filename without ext, or size label)
  const displayName = options.name ? `${options.name}.${format}` : `${size}${unit}.${format}`;

  const lines = {
    line1: displayName,
    line2: `${size}${unit}`,
    line3: `${width} × ${height}`,
  };

  logger.updateSpinner('Rendering image...');

  // 4. Render the base image
  let baseBuffer = await render(width, height, bg, text, lines, format);
  logger.debug(`Base image size: ${baseBuffer.length} bytes, target: ${targetBytes} bytes`);

  // 5. Adjust to target size
  logger.updateSpinner('Tuning file size...');
  const {
    buffer: finalBuffer,
    width: finalWidth,
    height: finalHeight,
  } = await adjust(baseBuffer, targetBytes, format, width, height, bg, text, lines);

  // 6. Warn if we couldn't hit the target precisely
  const diff = Math.abs(finalBuffer.length - targetBytes);
  const pct = diff / targetBytes;
  const isLossy = format === 'jpg' || format === 'webp';
  const toleranceBytes = isLossy ? Math.max(targetBytes * 0.01, 5120) : 1024;

  if (diff > toleranceBytes) {
    const actualMb = (finalBuffer.length / 1048576).toFixed(2);
    const pctStr = (pct * 100).toFixed(1);
    logger.warn(
      `Could not match target size ${size}${unit} exactly; actual size ${actualMb}MB (${pctStr}% off)`,
    );
  }

  // 7. Save to disk
  logger.updateSpinner('Writing file...');
  const filePath = await save(finalBuffer, options);

  // 8. Done
  logger.success(filePath, finalBuffer.length, finalWidth, finalHeight);
}
