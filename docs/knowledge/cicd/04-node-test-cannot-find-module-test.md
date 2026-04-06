# 问题：CI 中 `node --test` 报 `Cannot find module .../test`

## 现象

- CI 运行测试时报错：
  - `Error: Cannot find module '/home/runner/.../test'`

## 原始报错（用户提供）

```text
> @liarcoder/image-generator@2.0.1 test
> node --test -- ./test/

Error: Cannot find module '/home/runner/work/image-generator/image-generator/test'
...
✖ test
  'test failed'
Error: Process completed with exit code 1.
```

## 根因

- 直接用目录参数触发 `node --test` 在部分 CI/npm 组合下存在兼容问题，目录被当成入口模块解析。

## 解决方案

- 新增 `scripts/run-node-tests.mjs`：
  - 递归收集 `test/**/*.test.js`
  - 通过 `spawnSync(process.execPath, ['--test', ...files])` 执行
- `package.json` 改为：
  - `"test": "node scripts/run-node-tests.mjs"`

## 补充收益

- 自动支持 `test` 子目录下测试文件，无需手工维护测试列表。

## 参考文档

- [Merge pull request #9 from LiarCoder/dev · LiarCoder/image-generator@cd00de1](https://github.com/LiarCoder/image-generator/actions/runs/24018208172/job/70041660878)
- [Merge pull request #10 from LiarCoder/dev · LiarCoder/image-generator@1a0036f](https://github.com/LiarCoder/image-generator/actions/runs/24018423679/job/70042238863)
