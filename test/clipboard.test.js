import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clipboardProcessor } from '../src/utils/clipboard.js';
import { logger } from '../src/utils/logger.js';

describe('clipboard utility', () => {
  let originalMode;

  beforeEach(() => {
    originalMode = logger.getMode();
    logger.setMode('quiet');
  });

  afterEach(() => {
    logger.setMode(originalMode);
  });

  it('uses powershell on win32 for png', async () => {
    const calls = [];
    const execAsync = async (...args) => {
      calls.push(args);
      return { stdout: '', stderr: '' };
    };

    const result = await clipboardProcessor.copyImageToClipboard('C:\\temp\\out.png', 'png', {
      execAsync,
      platform: 'win32',
    });

    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'powershell.exe');
    assert.deepEqual(calls[0][1].slice(0, 3), ['-NoProfile', '-NonInteractive', '-Command']);
    assert.match(calls[0][1][3], /Clipboard/);
  });

  it('skips exec on win32 for webp', async () => {
    let called = false;
    const execAsync = async () => {
      called = true;
      return { stdout: '', stderr: '' };
    };

    const result = await clipboardProcessor.copyImageToClipboard('C:\\temp\\out.webp', 'webp', {
      execAsync,
      platform: 'win32',
    });

    assert.equal(result, false);
    assert.equal(called, false);
  });

  it('uses osascript on darwin for png', async () => {
    const calls = [];
    const execAsync = async (...args) => {
      calls.push(args);
      return { stdout: '', stderr: '' };
    };

    const result = await clipboardProcessor.copyImageToClipboard('/tmp/out.png', 'png', {
      execAsync,
      platform: 'darwin',
    });

    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '/usr/bin/osascript');
    assert.deepEqual(calls[0][1].slice(0, 1), ['-e']);
    assert.match(calls[0][1][1], /NSPasteboard/);
  });

  it('uses osascript on darwin for webp', async () => {
    const calls = [];
    const execAsync = async (...args) => {
      calls.push(args);
      return { stdout: '', stderr: '' };
    };

    const result = await clipboardProcessor.copyImageToClipboard('/tmp/out.webp', 'webp', {
      execAsync,
      platform: 'darwin',
    });

    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '/usr/bin/osascript');
  });

  it('returns false on unsupported platform without exec', async () => {
    let called = false;
    const execAsync = async () => {
      called = true;
      return { stdout: '', stderr: '' };
    };

    const result = await clipboardProcessor.copyImageToClipboard('/tmp/out.png', 'png', {
      execAsync,
      platform: 'linux',
    });

    assert.equal(result, false);
    assert.equal(called, false);
  });

  it('returns false when exec throws', async () => {
    const execAsync = async () => {
      throw new Error('boom');
    };

    const result = await clipboardProcessor.copyImageToClipboard('/tmp/out.png', 'png', {
      execAsync,
      platform: 'darwin',
    });

    assert.equal(result, false);
  });
});
