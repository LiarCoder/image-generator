# 问题：本机缺少 `gh` CLI（`gh` not recognized）

## 现象

- 需要通过命令行编辑 Release latest 标记时，终端报：
  - `The term 'gh' is not recognized ...`

## 原始报错（会话记录）

```text
The term 'gh' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
```

## 根因

- GitHub CLI 未安装或不在 PATH。

## 影响

- 无法通过命令行执行 `gh release edit/view/create` 等操作。

## 解决建议

- 安装 GitHub CLI 并登录后再执行：
  - `gh auth login`
  - `gh release ...`

## 备注

- 这不影响仓库内 GitHub Actions 的 Release 自动化执行。
