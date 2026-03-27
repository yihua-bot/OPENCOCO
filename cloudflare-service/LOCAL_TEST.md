# 本地测试指南

## 快速开始（无需 Resend API Key）

### 1. 修改代码以支持本地测试

为了在没有 Resend API Key 的情况下测试，我们可以让验证码直接打印到控制台。

编辑 `src/index.ts`，找到 `sendVerificationEmail` 函数，在开头添加：

```typescript
// 本地开发模式：直接打印验证码
if (apiKey === 'local-dev-secret-change-this-in-production') {
  console.log(`\n========================================`);
  console.log(`📧 验证码邮件 (本地测试模式)`);
  console.log(`收件人: ${email}`);
  console.log(`验证码: ${code}`);
  console.log(`========================================\n`);
  return true;
}
```

### 2. 启动本地开发服务器

```bash
cd ./cloudflare-service

# 启动 Wrangler 开发服务器
npm run dev
```

服务将运行在 `http://localhost:8787`

### 3. 测试登录流程

#### 步骤 1: 发送验证码

```bash
curl -X POST http://localhost:8787/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**预期响应：**
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱",
  "expiresIn": 300
}
```

**控制台输出：**
```
========================================
📧 验证码邮件 (本地测试模式)
收件人: test@example.com
验证码: 123456
========================================
```

#### 步骤 2: 验证码登录

使用控制台显示的验证码：

```bash
curl -X POST http://localhost:8787/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

**预期响应：**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "test",
    "is_member": false,
    "member_expires_at": null
  }
}
```

#### 步骤 3: 验证 Token

```bash
curl -X POST http://localhost:8787/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token-here"}'
```

#### 步骤 4: 激活会员

```bash
curl -X POST http://localhost:8787/api/membership/activate \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token-here"}'
```

### 4. 测试前端集成

启动前端开发服务器：

```bash
cd ./frontend
npm run dev
```

访问 `http://localhost:3000/login`

1. 输入邮箱地址
2. 点击"发送验证码"
3. 查看 cloudflare-service 控制台获取验证码
4. 输入验证码
5. 自动登录并跳转到 dashboard

## 使用真实 Resend API Key

### 1. 注册 Resend

1. 访问 https://resend.com
2. 注册账号（免费）
3. 获取 API Key

### 2. 配置 API Key

编辑 `.dev.vars`：

```bash
RESEND_API_KEY=re_your_real_api_key_here
JWT_SECRET=local-dev-secret-change-this-in-production
```

### 3. 配置发件域名

在 `src/index.ts` 中修改：

```typescript
from: 'CoCo <noreply@yourdomain.com>',  // 改为你验证的域名
```

或使用 Resend 提供的测试域名：

```typescript
from: 'CoCo <onboarding@resend.dev>',
```

### 4. 重启服务

```bash
npm run dev
```

现在验证码将真实发送到邮箱！

## 常见问题

### Q: 验证码过期怎么办？
A: 验证码有效期 5 分钟，过期后重新发送即可。

### Q: 数据存储在哪里？
A: 本地开发使用 Wrangler 的本地 D1 数据库，数据存储在 `.wrangler/state/` 目录。

### Q: 如何清空测试数据？
```bash
rm -rf .wrangler/state/
```

### Q: 端口被占用怎么办？
修改 `wrangler.toml` 添加：
```toml
[dev]
port = 8788  # 改为其他端口
```

## 下一步

测试通过后，参考 `README.md` 部署到 Cloudflare Workers。
