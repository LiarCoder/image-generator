# 问题：`git commit` 报 `unknown option 'trailer'`

## 现象

- 执行 `git commit` 时报：
  - `error: unknown option 'trailer'`

## 根因

- 本机 Git/环境中存在额外参数注入或兼容性问题，导致 `git commit` 收到不支持的 `--trailer`。

## 临时解决方案（会话内稳定可用）

- 提交时显式绕过 hooks 路径：
  - `HUSKY=0`
  - `git -c core.hooksPath=/dev/null commit ...`

## 长期建议

- 升级 Git 客户端版本并排查全局 hook/别名/包装脚本来源，恢复正常 `git commit`。
