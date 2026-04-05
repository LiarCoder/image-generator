# imgen

[English](./README.md) | 简体中文

一个可以生成**精确目标文件大小**的命令行工具。

支持的格式：**PNG · JPG · WEBP · BMP · GIF**

每张图片都会填充随机柔和的背景色、自动对比度的文字叠加层（显示文件名、目标大小和像素尺寸），以及（针对有损格式）一层微妙的噪点，使 JPEG/WEBP 编码器能够通过质量参数二分搜索精确命中目标字节数。

---

## 环境要求

- Node.js **≥ 18**

## 安装

```bash
# 克隆仓库并安装依赖
git clone <repo-url>
cd img-generator
npm install

# 将命令添加到全局
npm link
```

## 使用方法

```
imgen -s <size> [options]
```

### 选项

| 选项                 | 简写           | 说明                                     | 默认值           |
| -------------------- | -------------- | ---------------------------------------- | ---------------- |
| `-s <number>`        | `--size`       | 目标文件大小 **（必填）**                | —                |
| `-u <unit>`          | `--unit`       | 单位：`KB` 或 `MB`                       | `MB`             |
| `-f <type>`          | `--format`     | 输出格式：`png` `jpg` `webp` `bmp` `gif` | `png`            |
| `-n <name>`          | `--name`       | 输出文件名（不含扩展名）                 | 自动生成         |
| `-o <dir>`           | `--output`     | 输出目录                                 | 当前目录         |
| `-d <WxH>`           | `--dimensions` | 像素尺寸，如 `1920x1080`                 | 自动计算         |
| `--bg-color <hex>`   |                | 背景颜色，如 `#336699`                   | 随机柔和色       |
| `--text-color <hex>` |                | 文字颜色，如 `#FFFFFF`                   | 自动 WCAG 对比度 |
| `--verbose`          |                | 显示详细进度信息                         | —                |
| `--quiet`            |                | 安静模式，仅输出文件路径                 | —                |
| `-v`                 | `--version`    | 显示版本号                               | —                |
| `-h`                 | `--help`       | 显示帮助信息                             | —                |

`--verbose` 和 `--quiet` 不能同时使用。

### 约束条件

- 最大目标大小：**50 MB**
- 最小图像尺寸：任意一边不小于 **100 px**
- 当 `-d` 指定的尺寸与目标大小冲突时，**以大小为准**，尺寸仅作为参考起点
- 文件名中不允许出现 `\ / : * ? " < > |` 字符

---

## 示例

### 基本用法

```bash
# 5 MB PNG（自动计算尺寸）
imgen -s 5

# 500 KB JPEG
imgen -s 500 -u KB -f jpg

# 2 MB WEBP，自定义文件名和输出目录
imgen -s 2 -f webp -n banner -o ./output
```

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

# 运行所有测试
npm test

# 运行单个测试文件
node --test test/adjuster.test.js

# 本地运行（无需全局安装）
node bin/imgen.js -s 1 -f png

# 使用详细输出进行调试
node bin/imgen.js -s 2 -f jpg --verbose
```

### 项目结构

```
bin/
  imgen.js          入口文件（shebang 包装器）
src/
  cli.js            参数解析与验证（commander）
  generator.js      主流程编排
  sizer.js          根据目标字节数自动计算像素尺寸
  color.js          随机柔和 HSL 颜色 + WCAG 对比度文字
  renderer.js       基于 sharp 的渲染，含 SVG 文字叠加
  adjuster.js       精确大小调整（填充 / 质量二分搜索）
  output.js         文件写入 + 冲突处理
  logger.js         三种输出模式（普通 / 详细 / 安静）
  constants.js      共享常量
test/
  cli.test.js
  sizer.test.js
  color.test.js
  adjuster.test.js
```

---

## 许可证

MIT
