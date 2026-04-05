# Image Generator

一个 Node.js 命令行工具，用于生成指定文件大小的图片文件。

[English](./README.md) | 简体中文

## 功能特性

- 🎨 **支持多种格式**：支持 JPG、JPEG、PNG 格式
- 📏 **精确控制文件大小**：通过智能迭代算法调整，生成接近目标大小的图片
- 🖼️ **自动显示信息**：生成的图片中央会自动显示文件大小和图片尺寸信息
- 📁 **灵活的输出选项**：支持自定义文件名和输出目录
- ✅ **完善的参数验证**：提供友好的错误提示和参数验证
- 🧪 **完整的测试覆盖**：包含单元测试和集成测试

## 安装

### 全局安装

```bash
npm install -g image-generator
```

安装后，可以在任何地方使用 `image-gen` 命令。

### 本地安装

```bash
npm install image-generator
```

然后通过 `npx image-gen` 或 `npm start` 使用。

### 从源码安装

```bash
git clone <仓库地址>
cd image-generator
npm install
npm link  # 可选：创建全局链接
```

## 使用方法

### 基本用法

```bash
image-gen -s <大小>
```

### 完整命令格式

```bash
image-gen -s <大小> [选项]
```

### 参数说明

| 参数 | 简写 | 必需 | 说明 | 默认值 |
|------|------|------|------|--------|
| `--size` | `-s` | ✅ | 图片体积大小（MB），必须大于 0，最大支持 25MB | - |
| `--format` | `-f` | ❌ | 图片格式，支持: jpg、jpeg、png | jpg |
| `--name` | `-n` | ❌ | 自定义文件名（不包含扩展名），如未指定则自动生成 | 自动生成 |
| `--output` | `-o` | ❌ | 输出目录路径 | 当前目录 |

### 使用示例

```bash
# 生成 10MB 的 JPG 图片
image-gen -s 10

# 生成 5MB 的 PNG 图片
image-gen -s 5 -f png

# 生成 20MB 图片，指定文件名
image-gen -s 20 -n my-image

# 生成 15MB JPEG 图片到指定目录
image-gen -s 15 -f jpeg -o ./output

# 完整参数示例：生成 1.5MB 的 PNG 图片
image-gen -s 1.5 -f png -n test -o ./img

# 查看帮助信息
image-gen --help

# 查看版本信息
image-gen --version
```

## 注意事项

- 体积单位为 MB，支持小数（如 `1.5`）
- 文件名不需要包含扩展名，工具会自动添加
- 如果文件已存在，会自动添加数字后缀（如 `test-1.jpg`）
- 生成的图片中央会显示体积和尺寸信息（格式：`{大小}MB {宽} × {高}`）
- 工具使用迭代算法调整图片尺寸，以达到目标文件大小（误差范围约 5%）
- 最大支持生成 25MB 的图片文件

## 技术栈

- **Node.js**：运行环境（要求 >= 14.0.0）
- **Jimp**：纯 JavaScript 图片处理库
- **Commander.js**：命令行参数解析
- **Jest**：测试框架

## 项目结构

```
image-generator/
├── bin/              # 可执行文件目录
├── src/              # 源代码目录
│   ├── cli.js        # CLI 参数解析和验证
│   ├── imageGenerator.js  # 图片生成核心逻辑
│   ├── fileUtils.js  # 文件操作工具
│   └── utils.js      # 通用工具函数
├── __test__/         # 测试文件目录
└── package.json      # 项目配置
```

## 开发

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

### 运行项目

```bash
npm start
```

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

## 作者

liaw

## 贡献

欢迎提交 Issue 和 Pull Request！
