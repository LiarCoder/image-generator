# 问题：`npm publish` 报 `EOTP`

## 现象

- CI 发布时出现：
  - `npm ERR! code EOTP`
  - 提示需要一次性验证码（OTP）

## 原始报错（用户提供）

```text
npm notice Publishing to https://registry.npmjs.org/ with tag latest and public access
npm error code EOTP
npm error This operation requires a one-time password from your authenticator.
npm error You can provide a one-time password by passing --otp=<code> to the command you ran.
npm error If you already provided a one-time password then it is likely that you either typoed
npm error it, or it timed out. Please try again.
```

## 根因

- 使用了会触发 2FA 交互的 token 类型，CI 无法输入 OTP。

## 解决方案

- 使用 npm 的 CI 友好凭据（当时采用 automation/token 方向）避免 OTP 交互。
- 随后进一步升级为 Trusted Publishing（OIDC），彻底去掉长效 token 依赖。

## 预防建议

- 若日志出现 `EOTP`，优先检查认证方式是否适配 CI（不要依赖人工 OTP）。

## 参考文档

- npm Trusted Publishing: [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers)
- [Merge pull request #8 from LiarCoder/dev · LiarCoder/image-generator@44cc831]([https://github.com/LiarCoder/image-generator/actions/runs/24010928370/job/70022317682](https://github.com/LiarCoder/image-generator/actions/runs/24010928370/job/70022317682))

