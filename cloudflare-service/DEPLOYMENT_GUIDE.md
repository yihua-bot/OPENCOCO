# CoCo 认证服务 - Cloudflare Workers 部署指南

## 示例部署说明

本文档中的 URL、资源 ID 和命令输出都应视为示例值。请在部署你自己的公开实例时替换为你的实际配置。

## 📦 已部署内容

### 1. Cloudflare Worker
- **服务名**: coco-auth
- **运行时**: Hono + TypeScript
- **功能**: 邮箱验证码登录、JWT 认证、会员管理

### 2. D1 数据库
- **数据库名**: coco_users
- **ID**: `replace-with-your-d1-database-id`
- **表结构**:
  - `users`: 用户信息
  - `verification_codes`: 验证码缓存

### 3. KV 存储
- **命名空间**: KV
- **ID**: `replace-with-your-kv-namespace-id`
- **用途**: 验证码临时存储

### 4. 环境变量
- ✅ `RESEND_API_KEY`: 邮件服务密钥
- ✅ `JWT_SECRET`: JWT 签名密钥
- ✅ `ENVIRONMENT`: production

## 🚀 API 端点

### 基础 URL
```
https://coco-auth.your-subdomain.workers.dev
```

### 端点列表

#### 1. 健康检查
```bash
GET /health

# 响应
{
  "status": "ok",
  "service": "coco-auth-cloudflare"
}
```

#### 2. 发送验证码
```bash
POST /api/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}

# 响应
{
  "success": true,
  "message": "验证码已发送到您的邮箱",
  "expiresIn": 300
}
```

#### 3. 验证码登录
```bash
POST /api/auth/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}

# 响应
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "user",
    "is_member": false,
    "member_expires_at": null
  }
}
```

#### 4. 验证 Token
```bash
POST /api/auth/verify
Content-Type: application/json

{
  "token": "your-jwt-token"
}

# 响应
{
  "is_member": false,
  "expires_at": null,
  "days_remaining": null
}
```

#### 5. 激活会员
```bash
POST /api/membership/activate
Content-Type: application/json

{
  "token": "your-jwt-token"
}

# 响应
{
  "is_member": true,
  "expires_at": "2026-04-15T12:00:00.000Z",
  "days_remaining": 30,
  "message": "Membership activated for 30 days"
}
```

#### 6. 获取配置
```bash
GET /api/config

# 响应
{
  "require_membership": false,
  "trial_days": 7,
  "features": {
    "export_without_watermark": "member_only",
    "long_video": "free",
    "max_projects": {
      "free": 10,
      "member": 999
    }
  },
  "pricing": {
    "monthly": 19.9,
    "currency": "CNY"
  }
}
```

## 🔧 管理和维护

### 查看实时日志
```bash
cd ./cloudflare-service
wrangler tail coco-auth
```

### 查看部署历史
```bash
wrangler deployments list
```

### 重新部署
```bash
# 修改代码后
wrangler deploy
```

### 更新密钥
```bash
# 更新 Resend API Key
wrangler secret put RESEND_API_KEY

# 更新 JWT Secret
wrangler secret put JWT_SECRET
```

### 查询数据库
```bash
# 查看用户
wrangler d1 execute coco_users --command "SELECT * FROM users LIMIT 10"

# 查看验证码
wrangler d1 execute coco_users --command "SELECT * FROM verification_codes"
```

### 清空测试数据
```bash
# 清空用户表
wrangler d1 execute coco_users --command "DELETE FROM users"

# 清空验证码表
wrangler d1 execute coco_users --command "DELETE FROM verification_codes"
```

## 📱 前端集成

### 1. 更新环境变量

编辑 `frontend/.env.local`:

```env
# 使用生产环境
NEXT_PUBLIC_CLOUD_AUTH_URL=https://coco-auth.your-subdomain.workers.dev

# 或继续使用本地开发
NEXT_PUBLIC_CLOUD_AUTH_URL=http://localhost:8787
```

### 2. 重启前端服务

```bash
cd ./frontend
npm run dev
```

### 3. 测试登录流程

1. 访问 http://localhost:3000/login
2. 输入邮箱地址
3. 点击"发送验证码"
4. 检查邮箱（或 Worker 日志）获取验证码
5. 输入验证码登录
6. 自动跳转到 dashboard

## 🌐 网络访问问题

如果从本地无法访问 Worker，可以：

### 方法 1: 使用 Cloudflare Dashboard
1. 访问 https://dash.cloudflare.com
2. 进入 Workers & Pages → coco-auth
3. 使用 Quick Edit 功能测试
4. 查看实时日志和请求统计

### 方法 2: 使用在线工具
- https://reqbin.com/
- https://httpie.io/app
- https://hoppscotch.io/

### 方法 3: 使用手机网络
切换到手机热点或使用手机浏览器直接访问

### 方法 4: 使用 VPN
如果是地区限制，尝试使用 VPN

## 📊 监控和告警

### Cloudflare Dashboard
- 请求数量和成功率
- 响应时间
- 错误日志
- CPU 使用率

### 设置告警
1. 进入 Workers & Pages → coco-auth
2. 点击 Settings → Alerts
3. 配置错误率告警
4. 配置响应时间告警

## 💰 费用说明

### 免费额度（每天）
- **Workers**: 100,000 请求
- **D1**: 500 万次读取，10 万次写入
- **KV**: 10 万次读取，1,000 次写入

### Resend 免费额度
- **邮件**: 3,000 封/月

### 预估使用量
- 100 用户/天登录 = 200 请求（发送验证码 + 验证）
- 远低于免费额度，完全免费使用

## 🔐 安全建议

### 1. 更新 JWT Secret
生产环境使用强密钥：
```bash
# 生成随机密钥
openssl rand -base64 32

# 更新到 Cloudflare
wrangler secret put JWT_SECRET
```

### 2. 配置 CORS
如果需要限制来源，修改 `src/index.ts`:
```typescript
app.use('/*', cors({
  origin: 'https://yourdomain.com',  // 改为你的域名
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

### 3. 添加速率限制
防止验证码滥发：
```typescript
// 使用 KV 存储请求计数
// 限制每个 IP 每小时最多 10 次请求
```

### 4. 验证邮箱域名
防止垃圾邮箱：
```typescript
const blockedDomains = ['tempmail.com', 'guerrillamail.com'];
if (blockedDomains.some(d => email.endsWith(d))) {
  return c.json({ error: 'Email domain not allowed' }, 400);
}
```

## 🎯 下一步

### 短期
- [ ] 验证生产环境可访问性
- [ ] 配置真实 Resend API Key
- [ ] 前端切换到生产 URL
- [ ] 完整测试登录流程

### 中期
- [ ] 添加速率限制
- [ ] 配置自定义域名
- [ ] 设置监控告警
- [ ] 添加邮件模板

### 长期
- [ ] 集成支付系统（微信/支付宝）
- [ ] 添加用户管理后台
- [ ] 实现会员自动续费
- [ ] 添加数据分析

## 📚 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Resend API 文档](https://resend.com/docs)

## 🆘 故障排查

### Worker 无响应
```bash
# 查看日志
wrangler tail coco-auth

# 检查部署状态
wrangler deployments list

# 重新部署
wrangler deploy
```

### 数据库错误
```bash
# 检查表结构
wrangler d1 execute coco_users --command "SELECT name FROM sqlite_master WHERE type='table'"

# 重新初始化
wrangler d1 execute coco_users --file=./schema.sql
```

### 邮件发送失败
```bash
# 检查 API Key
wrangler secret list

# 更新 API Key
wrangler secret put RESEND_API_KEY

# 查看日志确认错误
wrangler tail coco-auth
```

## 📞 支持

遇到问题？
1. 查看 Cloudflare Dashboard 日志
2. 运行 `wrangler tail` 查看实时日志
3. 检查 Resend Dashboard 邮件发送状态
4. 参考 `TEST_RESULTS.md` 本地测试流程
