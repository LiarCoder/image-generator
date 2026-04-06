# 问题：Husky 提示 `husky.sh` 将在 v10 失效

## 现象

- `git push` 前出现提示：
  - `Please remove ... . "$(dirname -- "$0")/_/husky.sh"`

## 原始报错（用户提供）

```text
husky - DEPRECATED

Please remove the following two lines from .husky/pre-push:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

They WILL FAIL in v10.0.0
```

## 根因

- `pre-commit` / `pre-push` 仍保留旧模板引导行，Husky 新版本仅建议保留业务命令。

## 解决方案

- 将 `.husky/pre-commit` 精简为：
  - `npx lint-staged`
- 将 `.husky/pre-push` 精简为：
  - `npm run test`

## 结论

- 去掉旧引导后，警告消失，行为与 Husky 9/10 方向兼容。
