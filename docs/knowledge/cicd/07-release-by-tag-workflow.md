# 方案重构：Release 独立为 tag 驱动工作流

## 需求变化

- 不再要求“npm publish 成功后立即创建 Release”。
- 改为“推送 `v*` tag 时创建 Release”。

## 实施

- 新增：`.github/workflows/release.yml`
  - 触发：`push.tags: v*`
  - 兜底：`workflow_dispatch` 手动指定 tag
- `publish-npm.yml` 与 Release 解耦，仅负责 npm 发布。

## 防重策略

- 先 `gh release view <tag>` 检查：
  - 若已有 Release，直接跳过
  - 若无，再创建

## 收益

- 发布职责分离，流程更清晰。
- 支持补历史 tag 的 Release，而不影响 npm 发布流程。

## 参考文档

- GitHub 官方： [Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
