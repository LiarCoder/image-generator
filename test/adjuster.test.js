import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adjust } from "../src/adjuster.js";
import { render } from "../src/renderer.js";
import { calculate } from "../src/sizer.js";

const BG = "#4a607a";
const TEXT = "#f0f0f0";

/**
 * Helper: use sizer to get proper initial dims, render base, then adjust.
 */
async function makeAdjusted(format, targetBytes) {
  const { width, height } = calculate(targetBytes, format);
  const lines = {
    line1: `test.${format}`,
    line2: `${Math.round(targetBytes / 1024)}KB`,
    line3: `${width} \u00d7 ${height}`,
  };
  const base = await render(width, height, BG, TEXT, lines, format);
  return adjust(base, targetBytes, format, width, height, BG, TEXT, lines);
}

describe("adjuster", () => {
  describe("PNG (lossless)", () => {
    it("pads up to exact target when base is too small", async () => {
      const target = 500 * 1024; // 500 KB
      const { buffer } = await makeAdjusted("png", target);
      assert.equal(buffer.length, target);
    });

    it("keeps size within \u00b11 KB for 1 MB target", async () => {
      const target = 1 * 1024 * 1024; // 1 MB
      const { buffer } = await makeAdjusted("png", target);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe("BMP (no compression)", () => {
    it("reaches target within \u00b11 KB via padding", async () => {
      const target = 300 * 1024;
      const { buffer } = await makeAdjusted("bmp", target);
      const diff = Math.abs(buffer.length - target);
      assert.ok(diff <= 1024, `BMP diff=${diff} exceeds \u00b11KB`);
    });
  });

  describe("JPG (lossy)", () => {
    it("stays within \u00b11% of 2 MB target", async () => {
      const target = 2 * 1024 * 1024; // 2 MB
      const { buffer } = await makeAdjusted("jpg", target);
      const diff = Math.abs(buffer.length - target);
      const pct = diff / target;
      assert.ok(
        pct <= 0.01 || diff <= 5120,
        `JPG diff=${diff} (${(pct * 100).toFixed(2)}%) exceeds tolerance`,
      );
    });
  });

  describe("WEBP (lossy)", () => {
    it("stays within \u00b11% of 300 KB target", async () => {
      const target = 300 * 1024; // 300 KB
      const { buffer } = await makeAdjusted("webp", target);
      const diff = Math.abs(buffer.length - target);
      const pct = diff / target;
      assert.ok(
        pct <= 0.01 || diff <= 5120,
        `WEBP diff=${diff} (${(pct * 100).toFixed(2)}%) exceeds tolerance`,
      );
    });
  });
});
