# CI/CD 知识沉淀索引

> 范围：从“合并到 `main` 后自动触发 npm 发布”这个目标开始，到后续发布、Release、Tag 相关问题的排障与落地。
>
> 规则：每个问题单独文档，不混写。

## 方案与问题清单

1. [主线方案：main 合并后自动发布 npm](./01-main-merge-auto-publish-plan.md)
2. [问题：`npm publish` 报 `EOTP](./02-npm-eotp.md)`
3. [方案升级：切换 Trusted Publishing (OIDC)](./03-trusted-publishing-oidc.md)
4. [问题：CI 中 `node --test` 报 `Cannot find module .../test](./04-node-test-cannot-find-module-test.md)`
5. [问题：Husky 提示 `husky.sh` 将在 v10 失效](./05-husky-deprecated-husky-sh.md)
6. [问题：OIDC 发布报 `ENEEDAUTH](./06-oidc-eneedauth.md)`
7. [方案重构：Release 独立为 tag 驱动工作流](./07-release-by-tag-workflow.md)
8. [问题：旧 tag 下缺少 `extract-changelog.mjs` 导致 Release 失败](./08-release-missing-extractor.md)
9. [问题：Release 列表顺序与语义化版本不一致](./09-release-order-vs-latest.md)
10. [问题：`v2.0.0` tag 指向错误提交的修正](./10-retag-v2-0-0.md)
11. [问题：`git commit` 报 `unknown option 'trailer'`](./11-git-commit-unknown-trailer.md)
12. [问题：本机缺少 `gh` CLI](./12-gh-cli-not-found.md)
