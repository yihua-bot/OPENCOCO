# Cloudflare Workers 部署状态

## 示例部署状态

本文件保留的是一个示例状态模板。公开仓库中请替换成你自己的部署信息，或只保留通用部署步骤。

Worker 示例：
- **URL**: https://coco-auth.your-subdomain.workers.dev
- **部署时间**: 2026-03-16 06:34:32 UTC
- **版本**: example-deployment-version

### 已配置资源

1. **D1 数据库**
   - 名称: coco_users
   - ID: replace-with-your-d1-database-id
   - 表结构已初始化 ✅

2. **KV 命名空间**
   - ID: replace-with-your-kv-namespace-id
   - 用途: 验证码缓存

3. **环境变量和密钥**
   - RESEND_API_KEY ✅
   - JWT_SECRET ✅
   - ENVIRONMENT = "production" ✅

## ⚠️ 本地网络连接问题

从当前机器无法访问 Cloudflare Workers，可能原因：
- 防火墙或网络策略阻止 *.workers.dev 域名
- ISP 或地区限制
- VPN/代理配置问题

### 验证部署的替代方法

#### 1. 使用 Cloudflare Dashboard
访问 https://dash.cloudflare.com 查看：
- Workers & Pages → coco-auth
- 查看实时日志和请求统计
- 使用内置的 Quick Edit 测试功能

#### 2. 使用手机网络测试
```bash
# 在手机浏览器或使用移动热点
https://coco-auth.your-subdomain.workers.dev/health
```

#### 3. 使用在线工具测试
- https://reqbin.com/
- https://httpie.io/app
- https://hoppscotch.io/

测试端点：
```
GET https://coco-auth.your-subdomain.workers.dev/health
```

预期响应：
```json
{
  "status": "ok",
  "service": "coco-auth-cloudflare"
}
```

#### 4. 从其他服务器测试
如果有 VPS 或其他服务器：
```bash
curl https://coco-auth.your-subdomain.workers.dev/health
```

## 📋 API 端点

### 1. 健康检查
```
GET /health
```

### 2. 发送验证码
```bash
POST /api/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 3. 验证码登录
```bash
POST /api/auth/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

### 4. 验证 Token
```bash
POST /api/auth/verify
Content-Type: application/json

{
  "token": "your-jwt-token"
}
```

### 5. 激活会员
```bash
POST /api/membership/activate
Content-Type: application/json

{
  "token": "your-jwt-token"
}
```

### 6. 获取配置
```
GET /api/config
```

## 🔧 故障排查

### 检查 Worker 日志
```bash
wrangler tail coco-auth
```

### 查看部署历史
```bash
wrangler deployments list
```

### 重新部署
```bash
wrangler deploy
```

## 📱 前端集成

更新前端环境变量：

```env
# .env.local
NEXT_PUBLIC_CLOUD_AUTH_URL=https://coco-auth.your-subdomain.workers.dev
```

或者如果网络问题持续，继续使用本地开发：
```env
NEXT_PUBLIC_CLOUD_AUTH_URL=http://localhost:8787
```

## 🎯 下一步

1. **验证部署**：使用上述替代方法之一验证 Worker 正常工作
2. **配置真实邮件**：在 Cloudflare Dashboard 更新 RESEND_API_KEY 为真实值
3. **前端集成**：更新前端配置指向生产 URL
4. **监控**：在 Cloudflare Dashboard 设置告警和监控

## 💡 提示

- Worker 已部署并运行，只是本地网络无法访问
- 所有配置正确，数据库和 KV 已绑定
- 可以通过 Cloudflare Dashboard 管理和监控
- 如需修改代码，运行 `wrangler deploy` 即可更新
