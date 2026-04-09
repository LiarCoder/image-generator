# imgen

[![npm](https://img.shields.io/npm/v/%40liarcoder%2Fimage-generator.svg)](https://www.npmjs.com/package/@liarcoder/image-generator)

[English](./docs/README-en_us.md) | 简体中文 | [更新日志](./CHANGELOG.md)

## 背景

有时工作中需要测试图片上传功能，需要生成大量不同大小的图片。这时只能从本地磁盘上随缘看能不能找到合适的图片，非常不方便。因此，我开发了这个工具，可以生成指定大小的图片。可以保存到本地，还可以复制到剪切板，方便快捷。

## 功能简介

> 详细参数说明请参考 [选项](#选项)

一个可以生成**指定文件大小**的命令行工具。

1. 支持指定生成图片的格式：
   - PNG
   - JPG
   - WEBP
   - BMP
   - GIF
2. 支持指定生成图片的文件大小
3. 支持指定生成图片的文件名
4. 支持指定生成图片的输出目录
5. 支持指定生成图片的像素尺寸
6. 支持指定生成图片的复制到剪切板
   1. 支持 Windows / macOS
   2. Windows 下 `webp` 输出会告警并跳过复制（文件仍正常保存）
7. 支持指定生成图片的背景色 & 文字颜色
   1. 每张图片都会填充随机柔和的背景色、自动对比度的文字叠加层（显示文件名、目标大小和像素尺寸），以及（针对有损格式）一层微妙的噪点，使 JPEG/WEBP 编码器能够通过质量参数二分搜索精确命中目标字节数。

---

## 环境要求

- Node.js **≥ 18**

## 安装

### 从 npm 安装（推荐）

```bash
npm i @liarcoder/image-generator
```

若要在任意目录直接使用 `imgen` 命令，请全局安装：

```bash
npm i -g @liarcoder/image-generator
```

也可以直接使用 `npx` 运行（最方便，不会安装到本地，即用即走）：

```bash
# 生成一个 1MB 的 PNG 图片并复制到剪切板，但不保存到磁盘
npx @liarcoder/image-generator -s 1 -c --no-save
```

### 从源码安装

```bash
# 克隆仓库并安装依赖
git clone https://github.com/LiarCoder/image-generator.git
cd image-generator
npm install

# 将命令添加到全局
npm link
```

## 示例

### 基本用法

```bash
# 5 MB PNG（自动计算尺寸）
imgen -s 5

# 生成一个 1MB 的 PNG 图片并复制到剪切板，但不保存到磁盘
imgen -s 1 -c --no-save

# 500 KB JPEG
imgen -s 500 -u KB -f jpg

# 2 MB WEBP，自定义文件名和输出目录
imgen -s 2 -f webp -n banner -o ./output
```

## 参数说明

```
imgen -s <size> [options]
```

### 选项

| 选项                          | 简写                | 说明                                                      | 默认值           |
| ----------------------------- | ------------------- | --------------------------------------------------------- | ---------------- |
| `--size <number>`             | `-s <number>`       | 目标文件大小 **（必填）**                                 | —                |
| `--copy-to-clipboard`         | `-c`                | 生成后复制图片到系统剪切板（Windows/macOS）               | false            |
| `--no-save`                   |                     | 不保存图片到磁盘（必须与 `--copy-to-clipboard` 一起使用） | false            |
| `--unit <unit>`               | `-u <unit>`         | 单位：`KB` 或 `MB`                                        | `MB`             |
| `--format <type>`             | `-f <type>`         | 输出格式：`png` `jpg` `webp` `bmp` `gif`                  | `png`            |
| `--name <name>`               | `-n <name>`         | 输出文件名（不含扩展名）                                  | 自动生成         |
| `--output <dir>`              | `-o <dir>`          | 输出目录                                                  | 当前目录         |
| `--dimensions <widthxheight>` | `-d <widthxheight>` | 像素尺寸，如 `1920x1080`                                  | 自动计算         |
| `--bg-color <hex>`            |                     | 背景颜色，如 `#336699`                                    | 随机柔和色       |
| `--text-color <hex>`          |                     | 文字颜色，如 `#FFFFFF`                                    | 自动 WCAG 对比度 |
| `--verbose`                   |                     | 显示详细进度信息                                          | false            |
| `--quiet`                     |                     | 安静模式，仅输出文件路径（不能与 `--verbose` 一起使用）   | false            |
| `-v`                          | `--version`         | 显示版本号                                                | —                |
| `-h`                          | `--help`            | 显示帮助信息                                              | —                |

### 关于生成大尺寸图片

- 最大目标大小：**500 MB**
  - 增加此限制是为了防止生成过大的文件，影响系统性能和磁盘空间占用。
  - 生成较大尺寸图片时，可能会导致生成时间较长（大约 30 次迭代）。
  - 生成较大尺寸图片时，效果可能不如预期。
  - 生成较大尺寸图片时，可能提示超过像素限制而报错退出。
  - 生成较大尺寸图片时，个人推荐 png 格式，耗时适中，效果相对稳定。

生成大尺寸图片的测试结果（仅供参考）：

| 格式 | 像素尺寸    | 文件大小上限                    | 生成时间               |
| ---- | ----------- | ------------------------------- | ---------------------- |
| png  | 18893x14170 | 383.00MB（`-s 383`）            | 6.9s                   |
| jpg  | 18623x13968 | 203.70MB（`-s 204`）            | 208.9s                 |
| bmp  | 14807x11105 | 500.00MB（`-s 500`）            | 7.6s                   |
| gif  | 18869x14152 | 191.75MB（`-s 191`，偏差 0.4%） | 12.8s                  |
| webp | —           | `-s 134`                        | 生成时间过长（未完成） |

### 其他约束条件

- 最小图像尺寸：任意一边不小于 **100 px**
- 当 `-d` 指定的尺寸与目标大小冲突时，**以大小为准**，尺寸仅作为参考起点
- 文件名中不允许出现 `\ / : * ? " < > |` 字符
- `--copy-to-clipboard` 仅支持 **Windows / macOS**，其他系统会提示并跳过复制
- Windows 下 `webp` 生成后不会复制到剪切板（会提示并跳过）

---

### 自定义尺寸和颜色

```bash
# 1920×1080 PNG，深蓝色背景 + 白色文字
imgen -s 2 -f png -d 1920x1080 --bg-color "#1a2b3c" --text-color "#ffffff"

# 精确 1 MB 的 BMP
imgen -s 1 -f bmp
```

### 脚本 / 管道

```bash
# 安静模式只返回文件路径，适合在脚本中使用
OUTPUT=$(imgen -s 1 -f png --quiet)
echo "已生成: $OUTPUT"
```

### 详细输出

```bash
imgen -s 3 -f jpg --verbose
```

### 复制到剪切板

```bash
# 生成后自动复制到剪切板
imgen -s 1 -f png -c

# Windows 下 WEBP 会跳过复制，但仍正常保存文件
imgen -s 1 -f webp -c
```

### 示例输出预览

<details open>
<summary>展开查看示例图片</summary>

| 示例           | 命令                                                                         | 生成图片                                        |
| -------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| PNG — 5 MB     | `imgen -s 5 -f png`                                                          | ![PNG 5MB](assets/example-png-5mb.png)          |
| JPG — 500 KB   | `imgen -s 500 -u KB -f jpg`                                                  | ![JPG 500KB](assets/example-jpg-500kb.jpg)      |
| WEBP — 2 MB    | `imgen -s 2 -f webp`                                                         | ![WEBP 2MB](assets/example-webp-2mb.webp)       |
| BMP — 1 MB     | `imgen -s 1 -f bmp`                                                          | ![BMP 1MB](assets/example-bmp-1mb.bmp)          |
| 自定义颜色 PNG | `imgen -s 1 -f png -d 1920x1080 --bg-color "#1a2b3c" --text-color "#ffffff"` | ![自定义颜色](assets/example-custom-colors.png) |

</details>

---

## 文件命名

未提供 `-n` 时，文件名自动生成，格式为：

```
<size><unit>-<YYYY-MM-DD-HH-mm-ss>.<format>
```

例如：`5MB-2026-04-05-14-30-00.png`

### 同名文件冲突

- **普通模式**：弹出交互式提示，可选择追加序号（`file-1.png`）、覆盖或取消。
- **安静模式**：自动追加序号，不弹出提示。

---

## 精度保证

| 格式 | 容差                              |
| ---- | --------------------------------- |
| PNG  | 精确（±0 字节，通过 tEXt 块填充） |
| GIF  | ±1 KB（通过注释扩展块填充）       |
| BMP  | 精确（追加零字节）                |
| JPG  | ±1% 或 ±5 KB，取较大者            |
| WEBP | ±1% 或 ±5 KB，取较大者            |

如果尺寸约束导致无法精确达到目标大小，`imgen` 会发出警告并保存最接近的结果。

---

## 开发

```bash
# 安装依赖
npm install

# 运行代码检查
npm run lint

# 自动修复可修复的 lint 问题
npm run lint:fix

# 执行格式化
npm run format

# 仅检查格式（不改文件）
npm run format:check

# 运行所有测试
npm test

# 运行单个测试文件
node --test test/adjuster.test.js

# 本地运行（无需全局安装）
node bin/imgen.js -s 1 -f png

# 使用详细输出进行调试
node bin/imgen.js -s 2 -f jpg --verbose
```

首次克隆后如果本地没有启用 Git hooks，可执行一次：

```bash
npm run prepare
```

提交时会自动通过 `husky + lint-staged` 对暂存的改动文件执行检查与格式化。

### 项目结构

```
bin/
  └──imgen.js          入口文件（shebang 包装器）
src/
  ├──core/
  │  ├──cli.js          参数解析与验证（commander）
  │  ├──generator.js    主流程编排
  │  ├──sizer.js        根据目标字节数自动计算像素尺寸
  │  ├──renderer.js     基于 sharp 的渲染，含 SVG 文字叠加
  │  ├──adjuster.js     精确大小调整（填充 / 质量二分搜索）
  │  └──output.js       文件写入 + 冲突处理
  ├──utils/
  │  ├──color.js        随机柔和 HSL 颜色 + WCAG 对比度文字
  │  ├──logger.js       三种输出模式（普通 / 详细 / 安静）
  │  └──clipboard.js    剪切板复制能力（Windows / macOS）
  └──constants/
     └──index.js        共享常量
scripts/
  ├──run-node-tests.mjs 运行 Node.js 测试
  └──extract-changelog.mjs 提取更新日志
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

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。英文版见 [docs/CHANGELOG-en_us.md](./docs/CHANGELOG-en_us.md)。

---

## 许可证

MIT
