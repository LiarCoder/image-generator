import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { select } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { EXIT_CODES } from '../constants/index.js';

/**
 * File output: default naming, collision handling, write to disk.
 */
export class OutputWriter {
  /**
   * Build the default filename from size + unit + timestamp.
   *
   * @param {number} size
   * @param {string} unit
   * @param {string} format
   * @returns {string}  e.g. "10MB-2025-08-01-01-14-38.png"
   */
  static buildDefaultName(size, unit, format) {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const ts = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('-');
    return `${size}${unit}-${ts}.${format}`;
  }

  /**
   * Find a non-colliding filename by appending -1, -2, … until free.
   *
   * @param {string} dir
   * @param {string} base  - name without extension
   * @param {string} ext   - extension without dot
   * @returns {string}  full path
   */
  static nextAvailablePath(dir, base, ext) {
    let counter = 1;
    let candidate;
    do {
      candidate = join(dir, `${base}-${counter}.${ext}`);
      counter++;
    } while (existsSync(candidate));
    return candidate;
  }

  /**
   * Ensure output directory exists.
   *
   * @param {string} absDir
   * @returns {void}
   */
  static #ensureOutputDir(absDir) {
    if (existsSync(absDir)) {
      return;
    }

    try {
      mkdirSync(absDir, { recursive: true });
    } catch {
      logger.error(`Failed to create output directory "${absDir}"`, EXIT_CODES.FILE_ERROR);
    }
  }

  /**
   * Ask user how to handle filename collision in interactive mode.
   */
  static async #askCollisionAction(baseName, format) {
    return select({
      message: `File "${baseName}.${format}" already exists. Choose an action:`,
      choices: [
        {
          name: `Append suffix (e.g. ${baseName}-1.${format})`,
          value: 'append',
        },
        { name: 'Overwrite existing file', value: 'overwrite' },
        { name: 'Cancel', value: 'cancel' },
      ],
      default: 'append',
    });
  }

  /**
   * Resolve target file path when initial path collides.
   */
  static async #resolveTargetPath(initialPath, absDir, baseName, format) {
    if (!existsSync(initialPath)) {
      return initialPath;
    }

    if (logger.getMode() === 'quiet') {
      return OutputWriter.nextAvailablePath(absDir, baseName, format);
    }

    const choice = await OutputWriter.#askCollisionAction(baseName, format);
    if (choice === 'cancel') {
      logger.error('Operation cancelled', EXIT_CODES.SUCCESS);
    }
    if (choice === 'append') {
      return OutputWriter.nextAvailablePath(absDir, baseName, format);
    }

    return initialPath;
  }

  /**
   * Save `buffer` to disk, handling filename collisions interactively.
   *
   * @param {Buffer} buffer
   * @param {{
   *   format: string,
   *   size: number,
   *   unit: string,
   *   name: string|null,
   *   outputDir: string,
   * }} options
   * @returns {Promise<string>}  absolute path of the saved file
   */
  static async save(buffer, options) {
    const { format, size, unit, name, outputDir } = options;

    const absDir = resolve(outputDir);
    OutputWriter.#ensureOutputDir(absDir);

    const defaultName = OutputWriter.buildDefaultName(size, unit, format);
    const baseName = name ?? defaultName.slice(0, -`.${format}`.length);
    const initialPath = join(absDir, `${baseName}.${format}`);

    const targetPath = await OutputWriter.#resolveTargetPath(initialPath, absDir, baseName, format);

    try {
      await writeFile(targetPath, buffer);
    } catch (err) {
      logger.error(`Failed to write file: ${err.message}`, EXIT_CODES.FILE_ERROR);
    }

    return resolve(targetPath);
  }
}
