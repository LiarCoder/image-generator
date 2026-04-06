import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

function escapePowerShellSingleQuoted(path) {
  return path.replace(/'/g, "''");
}

function escapeAppleScriptDoubleQuoted(path) {
  return path.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildWindowsClipboardScript(filePath) {
  const escapedPath = escapePowerShellSingleQuoted(filePath);
  return [
    'Add-Type -AssemblyName System.Drawing',
    'Add-Type -AssemblyName System.Windows.Forms',
    `$img = [System.Drawing.Image]::FromFile('${escapedPath}')`,
    'try { [System.Windows.Forms.Clipboard]::SetImage($img) } finally { $img.Dispose() }',
  ].join('; ');
}

function buildMacClipboardScript(filePath) {
  const escapedPath = escapeAppleScriptDoubleQuoted(filePath);
  return [
    'use framework "AppKit"',
    `set imagePath to "${escapedPath}"`,
    "set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:imagePath",
    'if theImage is missing value then error "Failed to load image from file."',
    "set pb to current application's NSPasteboard's generalPasteboard()",
    "pb's clearContents()",
    "set ok to pb's writeObjects:{theImage}",
    'if ok as boolean is false then error "Failed to write image to clipboard."',
  ].join('\n');
}

/**
 * Copy generated image file into system clipboard.
 *
 * @param {string} filePath
 * @param {string} format
 * @param {{ execAsync?: Function, platform?: NodeJS.Platform }} [deps]
 * @returns {Promise<boolean>}
 */
export async function copyImageToClipboard(filePath, format, deps = {}) {
  const platform = deps.platform ?? process.platform;
  const execAsync = deps.execAsync ?? execFileAsync;
  const normalizedFormat = String(format ?? '').toLowerCase();

  try {
    if (platform === 'win32') {
      if (normalizedFormat === 'webp') {
        logger.warn(
          'Clipboard copy for WEBP is not supported on Windows; file was saved normally.',
        );
        return false;
      }
      const script = buildWindowsClipboardScript(filePath);
      await execAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      return true;
    }

    if (platform === 'darwin') {
      const script = buildMacClipboardScript(filePath);
      await execAsync('/usr/bin/osascript', ['-e', script]);
      return true;
    }

    logger.warn(
      `Clipboard copy is not supported on platform "${platform}"; file was saved normally.`,
    );
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to copy image to clipboard: ${message}`);
    return false;
  }
}
