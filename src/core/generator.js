import { colorProcessor } from '../utils/color.js';
import { ImageSizer } from './sizer.js';
import { ImageRenderer } from './renderer.js';
import { SizeAdjuster } from './adjuster.js';
import { OutputWriter } from './output.js';
import { logger } from '../utils/logger.js';
import { clipboardProcessor } from '../utils/clipboard.js';
import { tmpdir } from 'os';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * End-to-end image generation orchestration.
 */
export class ImageGenerator {
  static #LOSSY_FORMATS = new Set(['jpg', 'webp']);
  static #BYTES_PER_MB = 1024 * 1024;

  /**
   * Build overlay display name from user input and target format.
   *
   * @param {string|null} name
   * @param {number} size
   * @param {string} unit
   * @param {string} format
   * @returns {string}
   */
  static buildDisplayName(name, size, unit, format) {
    return name ? `${name}.${format}` : `${size}${unit}.${format}`;
  }

  /**
   * Build overlay text lines rendered onto the image.
   *
   * @param {string} displayName
   * @param {number} size
   * @param {string} unit
   * @param {number} width
   * @param {number} height
   * @returns {{ line1: string, line2: string, line3: string }}
   */
  static buildOverlayLines(displayName, size, unit, width, height) {
    return {
      line1: displayName,
      line2: `${size}${unit}`,
      line3: `${width} × ${height}`,
    };
  }

  /**
   * Get maximum acceptable byte difference from target by format.
   *
   * @param {string} format
   * @param {number} targetBytes
   * @returns {number}
   */
  static getToleranceBytes(format, targetBytes) {
    if (ImageGenerator.#LOSSY_FORMATS.has(format)) {
      return Math.max(targetBytes * 0.01, 5120);
    }
    return 1024;
  }

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
   *   copyToClipboard: boolean,
   *   save: boolean,
   * }} options
   */
  static async generate(options) {
    const { format, size, unit, targetBytes, dimensions: dimOpt, bgColor, textColor } = options;
    logger.start('Computing optimal dimensions...');

    const { width, height } = dimOpt ?? ImageSizer.calculate(targetBytes, format);
    logger.debug(`Initial dimensions: ${width} × ${height}`);

    const { bgColor: bg, textColor: text } = colorProcessor.resolve(bgColor, textColor);
    logger.debug(`Background: ${bg}, text: ${text}`);

    const displayName = ImageGenerator.buildDisplayName(options.name ?? null, size, unit, format);
    const lines = ImageGenerator.buildOverlayLines(displayName, size, unit, width, height);

    logger.updateSpinner('Rendering image...');
    const baseBuffer = await ImageRenderer.render(width, height, bg, text, lines, format);
    logger.debug(`Base image size: ${baseBuffer.length} bytes, target: ${targetBytes} bytes`);

    logger.updateSpinner('Tuning file size...');
    const {
      buffer: finalBuffer,
      width: finalWidth,
      height: finalHeight,
    } = await SizeAdjuster.adjust(baseBuffer, targetBytes, format, width, height, bg, text, lines);

    const diff = Math.abs(finalBuffer.length - targetBytes);
    const toleranceBytes = ImageGenerator.getToleranceBytes(format, targetBytes);

    if (diff > toleranceBytes) {
      const actualMb = (finalBuffer.length / ImageGenerator.#BYTES_PER_MB).toFixed(2);
      const pctStr = ((diff / targetBytes) * 100).toFixed(1);
      logger.warn(
        `Could not match target size ${size}${unit} exactly; actual size ${actualMb}MB (${pctStr}% off)`,
      );
    }

    logger.updateSpinner('Writing file...');

    if (options.save !== false) {
      const filePath = await OutputWriter.save(finalBuffer, options);
      logger.success(filePath, finalBuffer.length, finalWidth, finalHeight);

      if (options.copyToClipboard) {
        const copied = await clipboardProcessor.copyImageToClipboard(filePath, format);
        if (copied) {
          logger.info('Image copied to clipboard.');
        }
      }
    } else {
      // --no-save: write to a temp file, copy to clipboard, then remove the temp file
      const tmpPath = join(tmpdir(), `imgen-tmp-${Date.now()}.${format}`);
      await writeFile(tmpPath, finalBuffer);
      try {
        const copied = await clipboardProcessor.copyImageToClipboard(tmpPath, format);
        if (copied) {
          logger.info('Image copied to clipboard (not saved to disk).');
        } else {
          logger.warn(
            'Clipboard copy failed; image was not saved to disk either (no output produced).',
          );
        }
      } finally {
        await unlink(tmpPath);
      }
    }
  }
}
