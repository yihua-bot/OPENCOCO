/**
 * Cloudflare Workers + D1 + Resend
 * 完全免费的认证服务
 *
 * 免费额度：
 * - Cloudflare Workers: 100,000 请求/天
 * - D1 数据库: 5GB 存储，500万次读取/天
 * - Resend: 3,000 邮件/月（免费版）
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_FALLBACK_FROM_EMAIL?: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 生成 6 位验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(input: string): string {
  return String(input || "").trim().toLowerCase();
}

function getJwtSecret(secret: string | undefined): string {
  return String(secret || '').trim() || 'coco-cloud-auth-fallback-secret-20260318';
}

// 生成 JWT Token
async function createToken(email: string, secret: string): Promise<string> {
  const jwtSecret = getJwtSecret(secret);
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    {
      email,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
    },
    jwtSecret,
    'HS256'
  );
}

// 验证 JWT Token
async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const payload = await verify(token, getJwtSecret(secret), 'HS256');
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

// 发送验证码邮件
type EmailSendResult = {
  ok: boolean;
  error?: string;
};

async function sendWithResend(email: string, code: string, apiKey: string, from: string): Promise<EmailSendResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'CoCo Login Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>CoCo Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #f97316; padding: 20px; background: #fef3c7; border-radius: 8px; text-align: center;">
            ${code}
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 5 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">If this wasn't you, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (response.ok) return { ok: true };

  const detail = await response.text().catch(() => "");
  return {
    ok: false,
    error: `status=${response.status}; from=${from}; detail=${detail.slice(0, 180)}`,
  };
}

async function sendVerificationEmail(
  email: string,
  code: string,
  apiKey: string,
  primaryFrom: string,
  fallbackFrom: string
): Promise<EmailSendResult> {
  try {
    // 本地开发模式：如果使用占位符 API Key，直接打印验证码到控制台
    if (!apiKey || apiKey.includes('your_resend_api_key_here') || apiKey.startsWith('re_123456789')) {
      console.log(`\n========================================`);
      console.log(`📧 Verification code email (local debug mode)`);
      console.log(`Recipient: ${email}`);
      console.log(`Code: ${code}`);
      console.log(`Expires in: 5 minutes`);
      console.log(`========================================\n`);
      return { ok: true };
    }

    const firstAttempt = await sendWithResend(email, code, apiKey, primaryFrom);
    if (firstAttempt.ok) return firstAttempt;

    // Fallback sender helps when the custom domain sender is not verified yet.
    if (fallbackFrom && fallbackFrom !== primaryFrom) {
      const secondAttempt = await sendWithResend(email, code, apiKey, fallbackFrom);
      if (secondAttempt.ok) return secondAttempt;
      return {
        ok: false,
        error: `${firstAttempt.error}; fallback=${secondAttempt.error}`,
      };
    }

    return firstAttempt;
  } catch (error) {
    console.error('Failed to send email:', error);
    return { ok: false, error: String(error) };
  }
}

// 1. 发送验证码
app.post('/api/auth/send-code', async (c) => {
  const payload = await c.req.json();
  const email = normalizeEmail(payload?.email);

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Invalid email' }, 400);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分钟

  // 保存验证码到数据库
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)'
  ).bind(email, code, expiresAt).run();

  // 发送邮件
  const sent = await sendVerificationEmail(
    email,
    code,
    c.env.RESEND_API_KEY,
    c.env.RESEND_FROM_EMAIL || 'CoCo <noreply@example.com>',
    c.env.RESEND_FALLBACK_FROM_EMAIL || 'CoCo <onboarding@resend.dev>'
  );

  if (!sent.ok) {
    console.error('Verification code email failed:', sent.error);
    return c.json({ error: 'Failed to send email' }, 500);
  }

  return c.json({
    success: true,
    message: 'Verification code sent to your email',
    expiresIn: 300 // 秒
  });
});

// 2. 验证码登录（登录即注册）
app.post('/api/auth/verify-code', async (c) => {
  try {
    const payload = await c.req.json();
    const email = normalizeEmail(payload?.email);
    const code = String(payload?.code || '').trim();

    // 查询验证码
    const result = await c.env.DB.prepare(
      'SELECT code, expires_at FROM verification_codes WHERE email = ?'
    ).bind(email).first();

    if (!result) {
      return c.json({ error: 'Invalid code' }, 400);
    }

    // 检查验证码是否正确
    if (result.code !== code) {
      return c.json({ error: 'Invalid code' }, 400);
    }

    // 检查是否过期
    if (new Date(result.expires_at as string) < new Date()) {
      return c.json({ error: 'Code expired' }, 400);
    }

    // 删除已使用的验证码
    await c.env.DB.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

    // 查找或创建用户
    let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      const userId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, is_member, member_expires_at) VALUES (?, ?, ?, 0, NULL)'
      ).bind(userId, email, email.split('@')[0]).run();
      user = {
        id: userId,
        email,
        name: email.split('@')[0],
        is_member: 0,
        member_expires_at: null,
      };
    }

    const token = await createToken(email, c.env.JWT_SECRET);

    return c.json({
      success: true,
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_member: user.is_member === 1,
        member_expires_at: user.member_expires_at,
      },
    });
  } catch (error) {
    console.error('verify-code failed', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// 3. 验证会员状态
app.post('/api/auth/verify', async (c) => {
  const { token } = await c.req.json();

  const email = await verifyToken(token, c.env.JWT_SECRET);
  if (!email) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const now = new Date();
  let isMember = user.is_member === 1;

  // 检查会员是否过期
  if (isMember && user.member_expires_at) {
    const expiresAt = new Date(user.member_expires_at as string);
    if (expiresAt < now) {
      isMember = false;
      // 更新数据库
      await c.env.DB.prepare('UPDATE users SET is_member = 0 WHERE email = ?').bind(email).run();
    }
  }

  const daysRemaining = user.member_expires_at
    ? Math.max(0, Math.floor((new Date(user.member_expires_at as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return c.json({
    is_member: isMember,
    expires_at: user.member_expires_at,
    days_remaining: daysRemaining,
  });
});

// 4. 激活会员
app.post('/api/membership/activate', async (c) => {
  const { token } = await c.req.json();

  const email = await verifyToken(token, c.env.JWT_SECRET);
  if (!email) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const now = new Date();
  let expiresAt: Date;

  // 如果已经是会员且未过期，续费
  if (user.is_member === 1 && user.member_expires_at) {
    const currentExpires = new Date(user.member_expires_at as string);
    if (currentExpires > now) {
      expiresAt = new Date(currentExpires.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  } else {
    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  await c.env.DB.prepare(
    'UPDATE users SET is_member = 1, member_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?'
  ).bind(expiresAt.toISOString(), email).run();

  const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return c.json({
    is_member: true,
    expires_at: expiresAt.toISOString(),
    days_remaining: daysRemaining,
    message: 'Membership activated for 30 days',
  });
});

// 5. 获取配置
app.get('/api/config', (c) => {
  return c.json({
    require_membership: false,  // 改为 true 启用强制会员
    trial_days: 7,
    features: {
      export_without_watermark: 'member_only',
      long_video: 'free',
      max_projects: {
        free: 10,
        member: 999,
      },
    },
    pricing: {
      monthly: 19.9,
      currency: 'CNY',
    },
  });
});

// 6. 支付回调（占位符）
app.post('/api/payment/webhook', async (c) => {
  // TODO: 验证微信/支付宝签名
  const data = await c.req.json();

  // TODO: 根据订单信息激活会员

  return c.json({ ok: true });
});

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'coco-auth-cloudflare' });
});

export default app;
