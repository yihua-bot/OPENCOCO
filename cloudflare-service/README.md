# Cloudflare + Resend 部署指南

## 🎯 方案优势

### 成本对比
| 服务 | Railway | Cloudflare |
|------|---------|------------|
| 计算 | $5/月 | **免费** |
| 数据库 | 包含 | **免费** |
| 请求数 | 无限 | 100,000/天（够用）|
| 邮件服务 | 需额外付费 | Resend 3,000/月免费 |
| **总成本** | $5-10/月 | **$0/月** |

### 功能特性
- ✅ 邮箱验证码登录（无需密码）
- ✅ 登录即注册（零门槛）
- ✅ 会员状态管理
- ✅ 全球 CDN 加速
- ✅ 自动扩展（无需担心流量）

## 📦 部署步骤

### 第一步：注册 Cloudflare（5分钟）

1. 访问 https://dash.cloudflare.com
2. 注册账号（免费）
3. 进入 Workers & Pages

### 第二步：注册 Resend（5分钟）

1. 访问 https://resend.com
2. 注册账号
3. 获取 API Key
4. 验证发件域名（可选，或使用 Resend 提供的测试域名）

### 第三步：创建 D1 数据库（2分钟）

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create coco_users

# 记录返回的 database_id，填入 wrangler.toml
```

### 第四步：创建 KV 命名空间（2分钟）

```bash
# 创建 KV
wrangler kv:namespace create "KV"

# 记录返回的 id，填入 wrangler.toml
```

### 第五步：配置环境变量（2分钟）

```bash
# 设置 Resend API Key
wrangler secret put RESEND_API_KEY
# 输入你的 Resend API Key

# 设置 JWT Secret
wrangler secret put JWT_SECRET
# 输入一个随机字符串，例如：your-super-secret-key-change-this
```

### 第六步：初始化数据库（1分钟）

```bash
cd cloudflare-service

# 执行数据库迁移
wrangler d1 execute coco_users --file=./schema.sql
```

### 第七步：部署（1分钟）

```bash
# 安装依赖
npm install

# 本地测试
npm run dev

# 部署到 Cloudflare
npm run deploy
```

部署成功后会得到一个 URL，例如：
```
https://coco-auth.your-subdomain.workers.dev
```

## 🔧 配置前端

通过前端环境变量配置认证服务地址：

```bash
cd frontend
cp .env.example .env.local

# 编辑 .env.local
NEXT_PUBLIC_CLOUD_AUTH_URL=https://coco-auth.your-subdomain.workers.dev
```

## 📧 邮箱登录流程

### 用户体验

```
1. 用户输入邮箱
   ↓
2. 点击"发送验证码"
   ↓
3. 收到邮件（6位数字验证码）
   ↓
4. 输入验证码
   ↓
5. 自动登录/注册
   ↓
6. 获得 JWT Token
```

### 前端实现示例

```typescript
// 1. 发送验证码
async function sendCode(email: string) {
  const response = await fetch(`${CLOUD_AUTH_URL}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// 2. 验证码登录
async function verifyCode(email: string, code: string) {
  const response = await fetch(`${CLOUD_AUTH_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  const data = await response.json();

  // 保存 token
  localStorage.setItem('coco_token', data.access_token);

  return data;
}
```

## 🎨 登录界面设计

```
┌─────────────────────────────────────┐
│                                     │
│         CoCo 登录                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📧 your@email.com           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   发送验证码                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │         │
│  └───┴───┴───┴───┴───┴───┘         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   登录                       │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## 🔐 安全性

1. **验证码有效期**：5分钟
2. **一次性使用**：验证后立即删除
3. **JWT Token**：30天有效期
4. **HTTPS**：Cloudflare 自动提供
5. **速率限制**：可选添加（防止滥用）

## 📊 监控和分析

### Cloudflare Dashboard
- 请求数统计
- 错误率监控
- 响应时间
- 地理分布

### Resend Dashboard
- 邮件发送成功率
- 打开率（可选）
- 退信统计

## 🚀 后续优化

### 1. 自定义域名
```bash
# 在 Cloudflare 添加自定义域名
wrangler publish --routes "auth.yourdomain.com/*"
```

### 2. 速率限制
```typescript
// 防止验证码滥用
const rateLimitKey = `rate:${email}`;
const count = await c.env.KV.get(rateLimitKey);
if (count && parseInt(count) > 5) {
  return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
}
await c.env.KV.put(rateLimitKey, (parseInt(count || '0') + 1).toString(), {
  expirationTtl: 3600 // 1小时
});
```

### 3. 邮件模板优化
- 添加品牌 Logo
- 多语言支持
- 响应式设计

### 4. 数据分析
```typescript
// 记录登录事件
await c.env.DB.prepare(
  'INSERT INTO login_logs (email, ip, user_agent, created_at) VALUES (?, ?, ?, ?)'
).bind(email, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'), new Date().toISOString()).run();
```

## 💡 常见问题

### Q: Resend 免费版够用吗？
A: 3,000 邮件/月，平均每天 100 个新用户登录，完全够用。

### Q: Cloudflare Workers 免费版够用吗？
A: 100,000 请求/天，即使每个用户每天验证 3 次，也能支持 30,000+ 用户。

### Q: 如何升级到付费版？
A:
- Cloudflare Workers: $5/月，1000万请求
- Resend: $20/月，50,000 邮件

### Q: 数据库容量够吗？
A: D1 免费版 5GB，存储百万级用户数据没问题。

### Q: 如何备份数据？
```bash
# 导出数据库
wrangler d1 export coco_users --output=backup.sql
```

## 📝 完整文件清单

```
cloudflare-service/
├── wrangler.toml          # Cloudflare 配置
├── package.json           # 依赖配置
├── schema.sql             # 数据库表结构
├── src/
│   └── index.ts          # 主程序
└── README.md             # 本文档
```

## 🎉 总结

**成本：$0/月**
**性能：全球 CDN**
**可靠性：Cloudflare 保障**
**易用性：邮箱验证码登录**

完美的免费方案！
