# imgen

English | [简体中文](./README-zh_cn.md)

CLI tool that generates images with a **precise target file size**.

Supported formats: **PNG · JPG · WEBP · BMP · GIF**

Each image is filled with a random muted background color, an auto-contrast
text overlay showing the filename, target size, and pixel dimensions, and
(for lossy formats) a subtle noise layer that allows the JPEG/WEBP encoder to
hit the requested byte count accurately via quality-parameter binary search.

---

## Requirements

- Node.js **≥ 18**

## Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd img-generator
npm install

# Make the command available globally
npm link
```

## Usage

```
imgen -s <size> [options]
```

### Options

| Flag                 | Alias          | Description                                   | Default            |
| -------------------- | -------------- | --------------------------------------------- | ------------------ |
| `-s <number>`        | `--size`       | Target file size **(required)**               | —                  |
| `-u <unit>`          | `--unit`       | Unit: `KB` or `MB`                            | `MB`               |
| `-f <type>`          | `--format`     | Output format: `png` `jpg` `webp` `bmp` `gif` | `png`              |
| `-n <name>`          | `--name`       | Output filename (no extension)                | auto-generated     |
| `-o <dir>`           | `--output`     | Output directory                              | current directory  |
| `-d <WxH>`           | `--dimensions` | Pixel dimensions, e.g. `1920x1080`            | auto-calculated    |
| `--bg-color <hex>`   |                | Background color, e.g. `#336699`              | random muted color |
| `--text-color <hex>` |                | Text color, e.g. `#FFFFFF`                    | auto WCAG contrast |
| `--verbose`          |                | Show detailed progress                        | —                  |
| `--quiet`            |                | Print only the output file path               | —                  |
| `-v`                 | `--version`    | Show version                                  | —                  |
| `-h`                 | `--help`       | Show help                                     | —                  |

`--verbose` and `--quiet` are mutually exclusive.

### Constraints

- Maximum target size: **50 MB**
- Minimum image dimension: **100 px** on either side
- When `-d` conflicts with the target size, **size takes priority** and dimensions are used only as a starting reference
- Filename characters `\ / : * ? " < > |` are not allowed

---

## Examples

### Basic usage

```bash
# 5 MB PNG (auto-calculated dimensions)
imgen -s 5

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

# Run all tests
npm test

# Run a single test file
node --test test/adjuster.test.js

# Run locally without global install
node bin/imgen.js -s 1 -f png

# Run with verbose output for debugging
node bin/imgen.js -s 2 -f jpg --verbose
```

### Project layout

```
bin/
  imgen.js          entry point (shebang wrapper)
src/
  cli.js            argument parsing & validation (commander)
  generator.js      main orchestration pipeline
  sizer.js          auto-calculate pixel dimensions from byte target
  color.js          random muted HSL colors + WCAG contrast text
  renderer.js       sharp-based rendering with SVG text overlay
  adjuster.js       precise size adjustment (pad / binary-search quality)
  output.js         file writing + collision handling
  logger.js         three-mode output (normal / verbose / quiet)
  constants.js      shared constants
test/
  cli.test.js
  sizer.test.js
  color.test.js
  adjuster.test.js
```

---

## License

MIT
