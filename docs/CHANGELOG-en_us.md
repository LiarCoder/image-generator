# Changelog

English | [简体中文](../CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-04-09

### Added

- **Increased built-in image size limit to 500MB**
  - Previous limit was 50MB, now increased to 500MB
  - Due to the increased size limit, the maximum iterations for the binary search have also been increased to 30 (previously 20)
- **Added `--no-save` parameter**
  - Added `--no-save` parameter: do not save the image to disk (must be used with `-c, --copy-to-clipboard`)

## [2.0.2] - 2026-04-06

### Added

- **Optional clipboard copy support**
  - Added `-c, --copy-to-clipboard`: after writing the image file, the CLI attempts to copy it to the system clipboard
  - Supported platforms: Windows / macOS; unsupported platforms warn and skip clipboard copy (generation still succeeds)
  - On Windows, `webp` output warns and skips clipboard copy (file is still saved)
  - Added `test/clipboard.test.js` and extended CLI coverage for the `-c` flag

## [2.0.1] - 2026-04-06

### Refactored

- **ES6 class architecture** — `sizer`, `renderer`, `output`, `generator`, and `adjuster` are
  fully rewritten as ES6 classes with a single named class export per file. Internal
  implementation details are encapsulated as `static #` private fields/methods; the public
  API is unchanged.
- **adjuster** — extracted `#binarySearchQuality` to merge two near-identical binary-search
  loops; consolidated redundant fallback branches in `#padBuffer`.
- **renderer** — removed a pointless intermediate variable (`const color = textColor`); split
  SVG overlay construction and composite-input building into dedicated private methods; added
  inline comments to the BMP write path.
- **sizer** — split `calculate` internals into `#dimensionsForPixelBudget` and
  `#clampToMinDimensions`; replaced the `?? 1.5` fallback with a named constant
  `UNKNOWN_FORMAT_BPP`.
- **generator** — `LOSSY_FORMATS` and `BYTES_PER_MB` moved to private static fields; warning
  log simplified by inlining the `pct` expression.
- **Directory structure** — source reorganised into three layers: `src/core` (pipeline),
  `src/utils` (utilities), `src/constants` (shared constants).
- **Logger** — refactored to a singleton class; all call sites import `{ logger }`.
- **ColorProcessor** — refactored to a singleton class; all call sites import `{ colorProcessor }`.

### Added

- **Git hooks**
  - `pre-commit`: runs `lint-staged` — auto eslint --fix + prettier on staged files.
  - `pre-push`: runs `npm run test` — push is blocked until the full test suite passes.
- **ESLint + Prettier** — introduced `eslint.config.js` and `.prettierrc`; integrated
  `eslint-config-prettier`; enabled `curly: all` to require braces on all control-flow
  statements.
- **Expanded test coverage**
  - New `test/generator.test.js` covering `buildDisplayName`, `buildOverlayLines`, and
    `getToleranceBytes`.
  - `renderer` tests extended with invalid-format rejection for `applyFormat` and BMP header /
    file-size assertions for `rawToBmp`.
  - `cli` tests extended with parameter-error exit-code cases and a `-v` version-output case.
  - `output` tests now import the real implementation instead of duplicating logic.

### Fixed

- Implicit single-statement `if` bodies (missing braces) detected by the `curly` ESLint rule
  and auto-fixed across `adjuster`, `cli`, `sizer`, and `logger`.

---

## [2.0.0] - 2025 (initial v2 release)

### Breaking Changes

- Complete rewrite of the core pipeline (v1 → v2). The original implementation is archived in
  the `archive/v1.0.0` branch.

### Added

- Support for five output formats: `jpg`, `png`, `gif`, `bmp`, `webp`.
- Precise file-size control:
  - Lossy formats (JPG / WEBP): binary search over the quality parameter, aided by a
    low-amplitude noise layer.
  - Lossless formats (PNG / GIF): tEXt / comment-extension block padding.
  - BMP: exact pixel-count calculation.
- Auto-calculated dimensions at 4:3 aspect ratio, or explicit `--dimensions`.
- Random muted background color; auto WCAG-contrast text color; manual overrides via
  `--bg-color` / `--text-color`.
- Interactive collision handling (append sequence number / overwrite / cancel).
- `--verbose` / `--quiet` log modes.
- `--name` / `--output` for custom filename and output directory.
- `KB` and `MB` size units.

---

## [1.0.0] — archived

Original release. Archived in the `archive/v1.0.0` branch; no longer maintained.
