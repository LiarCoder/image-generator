import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join, resolve } from "path";
import { select } from "@inquirer/prompts";
import * as logger from "./logger.js";
import { EXIT_CODES } from "./constants.js";

/**
 * Build the default filename from size + unit + timestamp.
 *
 * @param {number} size
 * @param {string} unit
 * @param {string} format
 * @returns {string}  e.g. "10MB-2025-08-01-01-14-38.png"
 */
function buildDefaultName(size, unit, format) {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("-");
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
function nextAvailablePath(dir, base, ext) {
  let counter = 1;
  let candidate;
  do {
    candidate = join(dir, `${base}-${counter}.${ext}`);
    counter++;
  } while (existsSync(candidate));
  return candidate;
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
export async function save(buffer, options) {
  const { format, size, unit, name, outputDir } = options;

  // 1. Resolve output directory
  const absDir = resolve(outputDir);
  if (!existsSync(absDir)) {
    try {
      mkdirSync(absDir, { recursive: true });
    } catch {
      logger.error(
        `Failed to create output directory "${absDir}"`,
        EXIT_CODES.FILE_ERROR,
      );
    }
  }

  // 2. Determine base filename (without extension)
  const baseName =
    name ?? buildDefaultName(size, unit, format).replace(`.${format}`, "");
  const initialPath = join(absDir, `${baseName}.${format}`);

  // 3. Handle collision
  let targetPath = initialPath;
  if (existsSync(initialPath)) {
    const isQuiet = logger.getMode() === "quiet";

    if (isQuiet) {
      // In quiet mode: silently append sequence number
      targetPath = nextAvailablePath(absDir, baseName, format);
    } else {
      // Interactive prompt
      const choice = await select({
        message: `File "${baseName}.${format}" already exists. Choose an action:`,
        choices: [
          {
            name: `Append suffix (e.g. ${baseName}-1.${format})`,
            value: "append",
          },
          { name: "Overwrite existing file", value: "overwrite" },
          { name: "Cancel", value: "cancel" },
        ],
        default: "append",
      });

      if (choice === "cancel") {
        logger.error("Operation cancelled", EXIT_CODES.SUCCESS);
      } else if (choice === "append") {
        targetPath = nextAvailablePath(absDir, baseName, format);
      }
      // 'overwrite' keeps targetPath = initialPath
    }
  }

  // 4. Write file
  try {
    await writeFile(targetPath, buffer);
  } catch (err) {
    logger.error(`Failed to write file: ${err.message}`, EXIT_CODES.FILE_ERROR);
  }

  return resolve(targetPath);
}
