import chalk from 'chalk';
import ora from 'ora';

/**
 * Logger utility for CLI output.
 *
 * Modes:
 * - normal: spinner + human-readable logs
 * - verbose: normal mode plus debug logs
 * - quiet: only print essential output
 */
class Logger {
  /**
   * Initialize logger runtime state.
   */
  constructor() {
    this.mode = 'normal';
    this.spinner = null;
    this.startTime = null;
  }

  /**
   * Set output mode.
   *
   * @param {'normal'|'verbose'|'quiet'} mode
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * Get current output mode.
   *
   * @returns {'normal'|'verbose'|'quiet'}
   */
  getMode() {
    return this.mode;
  }

  // ─── Spinner control ────────────────────────────────────────────────────────

  /**
   * Start spinner with initial text.
   *
   * @param {string} text
   * @returns {void}
   */
  start(text) {
    if (this.mode === 'quiet') return;
    this.startTime = Date.now();
    this.spinner = ora({ text, color: 'cyan' }).start();
  }

  /**
   * Update spinner text when spinner is active.
   *
   * @param {string} text
   * @returns {void}
   */
  updateSpinner(text) {
    if (this.mode === 'quiet' || !this.spinner) return;
    this.spinner.text = text;
  }

  /**
   * Stop and clear spinner instance.
   *
   * @returns {void}
   */
  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  // ─── Output helpers ──────────────────────────────────────────────────────────

  /**
   * Print success summary, or only file path in quiet mode.
   *
   * @param {string} filePath
   * @param {number} bytes
   * @param {number} width
   * @param {number} height
   * @returns {void}
   */
  success(filePath, bytes, width, height) {
    if (this.mode === 'quiet') {
      process.stdout.write(filePath + '\n');
      return;
    }

    this.stopSpinner();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const mb = (bytes / 1048576).toFixed(2);
    const kb = (bytes / 1024).toFixed(1);
    const sizeDisplay =
      bytes >= 1048576
        ? `${mb} MB (${bytes.toLocaleString()} bytes)`
        : `${kb} KB (${bytes.toLocaleString()} bytes)`;

    console.log(chalk.green('✅ Image generated successfully.'));
    console.log(`   ${chalk.bold('File:       ')}${filePath.split(/[\\/]/).pop()}`);
    console.log(`   ${chalk.bold('Size:       ')}${sizeDisplay}`);
    console.log(`   ${chalk.bold('Dimensions:')} ${width} × ${height}`);
    console.log(`   ${chalk.bold('Path:       ')}${filePath}`);
    console.log(`   ${chalk.bold('Elapsed:    ')}${elapsed}s`);
  }

  /**
   * Print error message and terminate process.
   *
   * @param {string} message
   * @param {number} [exitCode=1]
   * @returns {never}
   */
  error(message, exitCode = 1) {
    this.stopSpinner();
    if (this.mode !== 'quiet') {
      console.error(chalk.red(`❌ Error: ${message}`));
    }
    process.exit(exitCode);
  }

  /**
   * Print warning message.
   *
   * @param {string} message
   * @returns {void}
   */
  warn(message) {
    if (this.mode === 'quiet') return;
    this.stopSpinner();
    console.warn(chalk.yellow(`⚠️  Warning: ${message}`));
    // restart spinner if it was running
  }

  /**
   * Print debug message in verbose mode only.
   *
   * @param {string} message
   * @returns {void}
   */
  debug(message) {
    if (this.mode !== 'verbose') return;
    console.log(chalk.gray(`   [debug] ${message}`));
  }
}

export const logger = new Logger();
