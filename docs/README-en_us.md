# imgen

[![npm](https://img.shields.io/npm/v/%40liarcoder%2Fimage-generator.svg)](https://www.npmjs.com/package/@liarcoder/image-generator)

English | [简体中文](../README.md) | [Changelog](./CHANGELOG-en_us.md)

## Background

When testing image-upload features, you often need many images at specific file sizes. Finding suitable files locally is inconvenient and inconsistent. This tool solves that by generating images with target sizes on demand. It can save files locally and copy images to the clipboard for a faster workflow.

## Features

> For detailed parameter descriptions, please refer to [Options](#options).

A CLI tool that generates images with a **specified file size**.

1. Supported formats:
   - PNG
   - JPG
   - WEBP
   - BMP
   - GIF
2. Supported file size
3. Supported file name
4. Supported output directory
5. Supported pixel dimensions
6. Supported copy to clipboard
   1. Supported Windows / macOS
   2. On Windows, `webp` output will warn and skip copy (file is still saved normally)
7. Supported background color & text color
   1. Each image will be filled with a random muted background color and an auto-contrast text overlay layer (showing the filename, target size, and pixel dimensions), and a subtle noise layer (for lossy formats) that allows the JPEG/WEBP encoder to hit the requested byte count accurately via quality-parameter binary search.

---

## Requirements

- Node.js **≥ 18**

## Installation

### From npm (recommended)

```bash
npm i @liarcoder/image-generator
```

To use the `imgen` command from any directory, install globally:

```bash
npm i -g @liarcoder/image-generator
```

You can also run it directly with `npx`:

```bash
# Generate a 1MB PNG, copy to clipboard, and do not save to disk
npx @liarcoder/image-generator -s 1 -c --no-save
```

### From source

```bash
# Clone and install dependencies
git clone https://github.com/LiarCoder/image-generator.git
cd image-generator
npm install

# Make the command available globally
npm link
```

## Usage

```
imgen -s <size> [options]
```

### Options

| Flag                          | Alias               | Description                                                       | Default            |
| ----------------------------- | ------------------- | ----------------------------------------------------------------- | ------------------ |
| `--size <number>`             | `-s <number>`       | Target file size **(required)**                                   | —                  |
| `--copy-to-clipboard`         | `-c`                | Copy generated image to system clipboard (Windows/macOS)          | false              |
| `--no-save`                   |                     | Do not save to disk (must be used with `--copy-to-clipboard`)     | false              |
| `--unit <unit>`               | `-u <unit>`         | Unit: `KB` or `MB`                                                | `MB`               |
| `--format <type>`             | `-f <type>`         | Output format: `png` `jpg` `webp` `bmp` `gif`                     | `png`              |
| `--name <name>`               | `-n <name>`         | Output filename (no extension)                                    | auto-generated     |
| `--output <dir>`              | `-o <dir>`          | Output directory                                                  | current directory  |
| `--dimensions <widthxheight>` | `-d <widthxheight>` | Pixel dimensions, e.g. `1920x1080`                                | auto-calculated    |
| `--bg-color <hex>`            |                     | Background color, e.g. `#336699`                                  | random muted color |
| `--text-color <hex>`          |                     | Text color, e.g. `#FFFFFF`                                        | auto WCAG contrast |
| `--verbose`                   |                     | Show detailed progress                                            | false              |
| `--quiet`                     |                     | Print only the output file path (cannot be used with `--verbose`) | false              |
| `--version`                   | `-v`                | Show version                                                      | —                  |
| `--help`                      | `-h`                | Show help                                                         | —                  |

### About generating large images

- Maximum target size: **500 MB**
  - This limit prevents generating oversized files that can impact system performance and disk usage.
  - Large-image generation can take longer (around 30 iterations).
  - Visual quality may be less predictable for very large outputs.
  - Generation may fail if pixel limits are exceeded.
  - For large outputs, `png` is generally recommended for a balanced runtime and stable results.

Large-image test results (for reference only):

| Format | Dimensions  | Max generated size            | Elapsed                              |
| ------ | ----------- | ----------------------------- | ------------------------------------ |
| png    | 18893x14170 | 383.00MB (`-s 383`)           | 6.9s                                 |
| jpg    | 18623x13968 | 203.70MB (`-s 204`)           | 208.9s                               |
| bmp    | 14807x11105 | 500.00MB (`-s 500`)           | 7.6s                                 |
| gif    | 18869x14152 | 191.75MB (`-s 191`, 0.4% off) | 12.8s                                |
| webp   | —           | `-s 134`                      | tuning took too long (not completed) |

### Other constraints

- Minimum image dimension: **100 px** on either side
- When `-d` conflicts with the target size, **size takes priority** and dimensions are used only as a starting reference
- Filename characters `\ / : * ? " < > |` are not allowed
- `--copy-to-clipboard` supports **Windows / macOS** only; unsupported platforms warn and skip clipboard copy
- On Windows, `webp` output is not copied to clipboard (warn and skip)

---

## Examples

### Basic usage

```bash
# 5 MB PNG (auto-calculated dimensions)
imgen -s 5

# Generate a 1MB PNG, copy to clipboard, and do not save to disk
imgen -s 1 -c --no-save

# 500 KB JPEG
imgen -s 500 -u KB -f jpg

# 2 MB WEBP with a custom name and output directory
imgen -s 2 -f webp -n banner -o ./output
```

### Custom dimensions and colors

```bash
# 1920×1080 PNG with a dark blue background and white text
imgen -s 2 -f png -d 1920x1080 --bg-color "#1a2b3c" --text-color "#ffffff"

# BMP at exactly 1 MB
imgen -s 1 -f bmp
```

### Scripting / piping

```bash
# Quiet mode returns only the file path — useful in scripts
OUTPUT=$(imgen -s 1 -f png --quiet)
echo "Generated: $OUTPUT"
```

### Verbose output

```bash
imgen -s 3 -f jpg --verbose
```

### Copy to clipboard

```bash
# Generate and copy to clipboard
imgen -s 1 -f png -c

# On Windows, WEBP copy is skipped but file is still saved
imgen -s 1 -f webp -c
```

### Output previews

<details open>
<summary>Click to see example images</summary>

| Example          | Command                                                                      | Output                                                |
| ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| PNG — 5 MB       | `imgen -s 5 -f png`                                                          | ![PNG 5MB](../assets/example-png-5mb.png)             |
| JPG — 500 KB     | `imgen -s 500 -u KB -f jpg`                                                  | ![JPG 500KB](../assets/example-jpg-500kb.jpg)         |
| WEBP — 2 MB      | `imgen -s 2 -f webp`                                                         | ![WEBP 2MB](../assets/example-webp-2mb.webp)          |
| BMP — 1 MB       | `imgen -s 1 -f bmp`                                                          | ![BMP 1MB](../assets/example-bmp-1mb.bmp)             |
| Custom color PNG | `imgen -s 1 -f png -d 1920x1080 --bg-color "#1a2b3c" --text-color "#ffffff"` | ![Custom colors](../assets/example-custom-colors.png) |

</details>

---

## File naming

When `-n` is not provided, the filename is auto-generated as:

```
<size><unit>-<YYYY-MM-DD-HH-mm-ss>.<format>
```

For example: `5MB-2026-04-05-14-30-00.png`

### Same-name conflicts

- **Normal mode**: an interactive prompt asks whether to append a sequence
  number (`file-1.png`), overwrite, or cancel.
- **Quiet mode**: automatically appends a sequence number without prompting.

---

## Precision guarantees

| Format | Tolerance                                   |
| ------ | ------------------------------------------- |
| PNG    | Exact (±0 bytes via tEXt chunk padding)     |
| GIF    | ±1 KB (via comment extension block padding) |
| BMP    | Exact (trailing zero bytes appended)        |
| JPG    | ±1% or ±5 KB, whichever is larger           |
| WEBP   | ±1% or ±5 KB, whichever is larger           |

If a dimension constraint makes the exact target unreachable, `imgen` warns
and saves the closest achievable file.

---

## Development

```bash
# Install dependencies
npm install

# Run lint checks
npm run lint

# Auto-fix lint issues where possible
npm run lint:fix

# Format files
npm run format

# Check formatting without writing changes
npm run format:check

# Run all tests
npm test

# Run a single test file
node --test test/adjuster.test.js

# Run locally without global install
node bin/imgen.js -s 1 -f png

# Run with verbose output for debugging
node bin/imgen.js -s 2 -f jpg --verbose
```

If Git hooks are not enabled locally after the first clone, run once:

```bash
npm run prepare
```

On commit, `husky + lint-staged` now automatically lint and format staged files.

### Project layout

```
bin/
  └──imgen.js          entry point (shebang wrapper)
src/
  ├──core/
  │  ├──cli.js          argument parsing & validation (commander)
  │  ├──generator.js    main orchestration pipeline
  │  ├──sizer.js        auto-calculate pixel dimensions from byte target
  │  ├──renderer.js     sharp-based rendering with SVG text overlay
  │  ├──adjuster.js     precise size adjustment (pad / binary-search quality)
  │  └──output.js       file writing + collision handling
  ├──utils/
  │  ├──color.js        random muted HSL colors + WCAG contrast text
  │  ├──logger.js       three-mode output (normal / verbose / quiet)
  │  └──clipboard.js    clipboard copy support (Windows / macOS)
  └──constants/
     └──index.js        shared constants
scripts/
  ├──run-node-tests.mjs  run Node.js tests
  └──extract-changelog.mjs extract changelog
test/
  ├──core/
  │  ├──cli.test.js
  │  ├──generator.test.js
  │  ├──sizer.test.js
  │  ├──renderer.test.js
  │  ├──adjuster.test.js
  │  └──output.test.js
  └──utils/
     ├──color.test.js
     └──clipboard.test.js
docs/
```

---

## Changelog

See [CHANGELOG-en_us.md](./CHANGELOG-en_us.md) for the full release history.

---

## License

MIT
