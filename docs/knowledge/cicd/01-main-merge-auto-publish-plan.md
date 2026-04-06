# 主线方案：main 合并后自动发布 npm

## 目标

- 合并到 `main` 后自动执行校验并发布 npm。

## 实施

- 工作流：`.github/workflows/publish-npm.yml`
- 触发：`push` 到 `main`
- 步骤：`npm ci` → `lint` → `test` → 检查版本是否已存在 → `npm publish`

## 关键约束

- 仅当 `package.json` 的版本未发布时才执行发布，避免重复发版失败。
- 作用域包设置 `publishConfig.access = "public"`。

## 结论

- 这是稳定基线；后续所有问题都围绕“认证、测试脚本、Release 触发策略”展开。
