import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { colorProcessor } from '../../src/utils/color.js';

describe('color', () => {
  describe('hexToRgb()', () => {
    it('converts #RRGGBB correctly', () => {
      assert.deepEqual(colorProcessor.hexToRgb('#ff8800'), { r: 255, g: 136, b: 0 });
      assert.deepEqual(colorProcessor.hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
      assert.deepEqual(colorProcessor.hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 });
    });

    it('expands #RGB shorthand', () => {
      assert.deepEqual(colorProcessor.hexToRgb('#f80'), { r: 255, g: 136, b: 0 });
      assert.deepEqual(colorProcessor.hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
    });
  });

  describe('resolve()', () => {
    it('returns user-provided bgColor unchanged', () => {
      const { bgColor } = colorProcessor.resolve('#336699', null);
      assert.equal(bgColor, '#336699');
    });

    it('returns user-provided textColor unchanged', () => {
      const { textColor } = colorProcessor.resolve('#336699', '#ffffff');
      assert.equal(textColor, '#ffffff');
    });

    it('generates a random bgColor (hex string) when not provided', () => {
      const { bgColor } = colorProcessor.resolve(null, null);
      assert.match(bgColor, /^#[0-9a-f]{6}$/i);
    });

    it('selects dark text for light background', () => {
      // #ffffff is very light
      const { textColor } = colorProcessor.resolve('#ffffff', null);
      assert.equal(textColor, '#1a1a1a');
    });

    it('selects light text for dark background', () => {
      // #111111 is very dark
      const { textColor } = colorProcessor.resolve('#111111', null);
      assert.equal(textColor, '#f0f0f0');
    });
  });
});
