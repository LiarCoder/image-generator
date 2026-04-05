import chalk from 'chalk';
import ora from 'ora';

let mode = 'normal'; // 'normal' | 'verbose' | 'quiet'
let spinner = null;
let startTime = null;

export function setMode(m) {
  mode = m;
}

export function getMode() {
  return mode;
}

// ─── Spinner control ────────────────────────────────────────────────────────

export function start(text) {
  if (mode === 'quiet') return;
  startTime = Date.now();
  spinner = ora({ text, color: 'cyan' }).start();
}

export function updateSpinner(text) {
  if (mode === 'quiet' || !spinner) return;
  spinner.text = text;
}

export function stopSpinner() {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

// ─── Output helpers ──────────────────────────────────────────────────────────

export function success(filePath, bytes, width, height) {
  if (mode === 'quiet') {
    process.stdout.write(filePath + '\n');
    return;
  }

  stopSpinner();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
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

export function error(message, exitCode = 1) {
  stopSpinner();
  if (mode !== 'quiet') {
    console.error(chalk.red(`❌ Error: ${message}`));
  }
  process.exit(exitCode);
}

export function warn(message) {
  if (mode === 'quiet') return;
  stopSpinner();
  console.warn(chalk.yellow(`⚠️  Warning: ${message}`));
  // restart spinner if it was running
}

export function debug(message) {
  if (mode !== 'verbose') return;
  console.log(chalk.gray(`   [debug] ${message}`));
}
