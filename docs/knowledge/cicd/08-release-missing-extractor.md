# 问题：旧 tag 下缺少 `extract-changelog.mjs` 导致 Release 失败

## 现象

- 在旧 tag 上创建 Release 时失败：
  - `Cannot find module ... scripts/extract-changelog.mjs`
  - 后续可能出现 `GITHUB_OUTPUT` 分隔符不完整错误

## 原始报错（用户提供）

```text
Run VER="2.0.1"
Error: Cannot find module '/home/runner/work/image-generator/image-generator/scripts/extract-changelog.mjs'
...
Error: Unable to process file command 'output' successfully.
Error: Invalid value. Matching delimiter not found 'CHANGELOG_BODY'
```

## 根因

- 旧 tag 对应提交尚未包含该脚本。
- 脚本失败时，输出块未完整写入，导致 Actions 解析失败。

## 解决方案（最终）

- Release 工作流采用“可选提取”策略：
  1. 当前 tag 有脚本则使用
  2. 无脚本则尝试从默认分支 `git show` 拉取
  3. 若仍失败，降级为仅 `generate_release_notes`
- 仅在成功提取时写入自定义 body；失败时写空 body，保证流程可继续。

## 结论

- 旧 tag 不再因为缺脚本而阻塞 Release 创建。

## 参考文档

- [GitHub Release · LiarCoder/image-generator@6cdb831](https://github.com/LiarCoder/image-generator/actions/runs/24021475760/job/70051708268)
