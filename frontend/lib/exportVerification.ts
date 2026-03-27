/**
 * 前端：导出视频前验证会员状态
 */
import { api } from "@/lib/api";

declare global {
  interface Window {
    CLOUD_AUTH_URL?: string;
  }
}

function getCloudConfigUrl(): string | null {
  let base = "";
  if (typeof window !== "undefined" && window.CLOUD_AUTH_URL) {
    base = String(window.CLOUD_AUTH_URL || "");
  } else {
    base = process.env.NEXT_PUBLIC_CLOUD_AUTH_URL || "";
  }

  const cleanedBase = base.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  if (!cleanedBase) return null;
  return `${cleanedBase}/api/config`;
}

/**
 * 导出视频前的会员验证
 * @returns {Promise<{canExport: boolean, needWatermark: boolean, message?: string}>}
 */
export async function verifyExportPermission(): Promise<{
  canExport: boolean;
  needWatermark: boolean;
  message?: string;
}> {
  try {
    const configUrl = getCloudConfigUrl();
    if (!configUrl) {
      return {
        canExport: true,
        needWatermark: true,
        message: "Membership config is not set. Export will include watermark"
      };
    }

    // 1. 获取云端配置
    const config = await fetch(configUrl).then(r => r.json());

    // 2. 检查是否强制要求会员
    if (!config.require_membership) {
      // 未启用强制会员，允许导出但有水印
      return {
        canExport: true,
        needWatermark: true,
        message: "Free plan export will include watermark"
      };
    }

    // 3. 验证会员状态
    const membership = await api.getMembershipStatus();

    if (membership.is_member) {
      // 会员用户，无水印
      return {
        canExport: true,
        needWatermark: false,
        message: `Membership valid until ${membership.expires_at}`
      };
    } else {
      // 非会员用户
      if (config.trial_days > 0) {
        // 有试用期，允许导出但有水印
        return {
          canExport: true,
          needWatermark: true,
          message: "Trial export will include watermark. Subscribe to remove it."
        };
      } else {
        // 无试用期，不允许导出
        return {
          canExport: false,
          needWatermark: true,
          message: "Please subscribe before exporting video"
        };
      }
    }
  } catch (error) {
    // 网络错误，降级为允许导出但有水印
    console.error("Membership verification failed, fallback mode enabled", error);
    return {
      canExport: true,
      needWatermark: true,
      message: "Offline mode: export will include watermark"
    };
  }
}

/**
 * 在导出按钮点击时调用
 */
export async function handleExportWithVerification() {
  const verification = await verifyExportPermission();

  if (!verification.canExport) {
    // 显示订阅提示
    alert(verification.message);
    // 打开会员订阅弹窗
    return false;
  }

  if (verification.needWatermark) {
    // 提示将有水印
    const confirmed = confirm(
      `${verification.message}\n\nContinue exporting?`
    );
    if (!confirmed) return false;
  }

  // 继续导出流程
  return {
    shouldAddWatermark: verification.needWatermark
  };
}
