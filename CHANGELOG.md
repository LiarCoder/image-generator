# Changelog

[English](./docs/CHANGELOG-en_us.md) | 简体中文

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.1] - 2026-04-06

### Refactored

- **ES6 class architecture** — `sizer`, `renderer`, `output`, `generator`, `adjuster` 全部重构为 ES6 class（单一具名 class 导出），私有实现细节改为 `static #` 私有字段/方法，对外 API 不变
- **adjuster** — 提取 `#binarySearchQuality` 合并两段重复的质量二分搜索；合并 `padBuffer` 冗余兜底分支
- **renderer** — 去掉无意义中间变量；BMP 写入分支增加注释；SVG 叠加层与合成输入构建拆分为独立私有方法
- **sizer** — `calculate` 内部拆出 `#dimensionsForPixelBudget` 与 `#clampToMinDimensions` 两个私有方法；未知格式 bpp 回退使用命名常量
- **generator** — `LOSSY_FORMATS` / `BYTES_PER_MB` 改为私有静态字段；日志与告警逻辑更清晰
- **目录结构** — 源码按 `src/core`（核心流程）/ `src/utils`（工具）/ `src/constants`（常量）三层组织
- **Logger** — 重构为单例 class，统一 `logger` 导出
- **ColorProcessor** — 重构为单例 class，统一 `colorProcessor` 导出

### Added

- **复制到剪切板（可选）**
  - 新增 `-c, --copy-to-clipboard` 参数：图片写盘后尝试复制到系统剪切板
  - 支持平台：Windows / macOS；不支持平台仅告警并跳过（不影响生成成功）
  - Windows 下 `webp` 输出会告警并跳过复制（文件仍正常保存）
  - 新增 `test/clipboard.test.js`，并补充 CLI 对 `-c` 参数的覆盖
- **Git hooks**
  - `pre-commit`：`lint-staged`（暂存文件自动 eslint --fix + prettier）
  - `pre-push`：`npm run test`（推送前必须通过全量单元测试）
- **ESLint + Prettier** — 引入 `eslint.config.js` 与 `.prettierrc`，集成 `eslint-config-prettier`，启用 `curly: all` 规则强制所有控制语句使用花括号
- **测试覆盖扩充**
  - 新增 `test/generator.test.js`（`buildDisplayName`、`buildOverlayLines`、`getToleranceBytes`）
  - `renderer` 补充 `applyFormat` 非法格式、`rawToBmp` 头信息与文件大小校验
  - `cli` 增加参数错误场景（退出码）与 `-v` 版本输出用例
  - `output` 测试改为直接导入源码实现，去掉重复手写

### Fixed

- 花括号缺失导致的隐式单语句 `if`，由 ESLint `curly` 规则检测并自动修复（`adjuster`、`cli`、`sizer`、`logger`）

---

## [2.0.0] - 2025 (initial v2 release)

### Breaking Changes

- 完全重写核心逻辑（v1 → v2），原实现已归档至 `archive/v1.0.0` 分支

### Added

- 支持 5 种输出格式：`jpg`、`png`、`gif`、`bmp`、`webp`
- 精确文件大小控制
  - 有损格式（JPG / WEBP）：二分搜索质量参数 + 噪声层辅助
  - 无损格式（PNG / GIF）：嵌入 tEXt / 注释块进行填充
  - BMP：直接精确计算尺寸
- 自动计算宽高（4:3 比例）或手动指定 `--dimensions`
- 自动生成背景色；基于 WCAG 对比度自动选择文字颜色；支持手动指定 `--bg-color` / `--text-color`
- 交互式文件碰撞处理（追加序号 / 覆盖 / 取消）
- `--verbose` / `--quiet` 日志模式
- `--name` / `--output` 自定义文件名与输出目录
- 支持 `KB` / `MB` 两种单位

---

## [1.0.0] — archived

原始版本，已归档至 `archive/v1.0.0` 分支，不再维护。
