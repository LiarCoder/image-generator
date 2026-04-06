# 问题：OIDC 发布报 `ENEEDAUTH`

## 现象

- CI 发布阶段报：
  - `npm ERR! code ENEEDAUTH`
  - `This command requires you to be logged in`

## 原始报错（用户提供）

```text
npm notice
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
npm error need auth You need to authorize this machine using `npm adduser`
Error: Process completed with exit code 1.
```

## 根因

- npm account 侧未正确配置 Trusted Publishers（仓库、工作流文件名等绑定信息不完整/不匹配），导致 OIDC 信任关系未建立，`npm publish` 回退为传统认证并报 `ENEEDAUTH`。

## 解决方案

- 按 npm 官方文档在包设置中补齐 Trusted Publishers 配置（GitHub Actions）：
  - Organization/User
  - Repository
  - Workflow filename（必须与仓库文件名精确一致）
- 确认工作流具备 OIDC 权限：
  - `permissions.id-token: write`
- 配置完成后，在 GitHub Actions 里 `re-run jobs`，发布流程通过。

## 备注

- 本问题最终并非代码逻辑问题，而是 npm 平台侧 Trusted Publishers 配置问题。

## 参考文档

- npm 官方： [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)
