# 方案升级：切换 Trusted Publishing (OIDC)

## 目标

- 不再使用仓库内长期 `NPM_TOKEN`，改为 OIDC 短期凭证发布。

## 配置要点

- `publish-npm.yml` 需要：
  - `permissions.id-token: write`
  - `actions/setup-node` 指向 npm registry
- npm 包设置中绑定 Trusted Publisher：
  - 仓库
  - 工作流文件名（必须与实际一致）

## 效果

- 降低凭据泄露风险。
- 与 npm 官方推荐方向一致。

## 常见误区

- 只改了 workflow，未在 npm 侧绑定 Trusted Publisher，仍会认证失败。

## 参考文档

- npm 官方： [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)
