# Mac App Store 上架指南

## 一、准备工作

### 1. Apple Developer 账号准备
- 确保有有效的 Apple Developer Program 会员资格（$99/年）
- 登录 [Apple Developer](https://developer.apple.com)

### 2. 创建 App ID
1. 访问 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. 点击 "+" 创建新的 App ID
3. 选择 "App IDs" → "App"
4. 填写信息：
   - Description: `CoCo`
   - Bundle ID: `com.coco.app` (必须与 package.json 中的 appId 一致)
5. 勾选需要的 Capabilities（根据应用功能）
6. 点击 "Continue" 并 "Register"

### 3. 创建 Mac App Store 证书
1. 在 Keychain Access 中：
   - 打开 "钥匙串访问" → "证书助理" → "从证书颁发机构请求证书"
   - 填写邮箱地址，选择 "存储到磁盘"
   - 保存 CertificateSigningRequest.certSigningRequest 文件

2. 在 Apple Developer 网站：
   - 访问 [Certificates](https://developer.apple.com/account/resources/certificates/list)
   - 点击 "+" 创建新证书
   - 选择 "Mac App Distribution"
   - 上传刚才创建的 CSR 文件
   - 下载证书并双击安装到钥匙串

3. 创建 Mac Installer Distribution 证书（用于打包 pkg）：
   - 重复上述步骤，但选择 "Mac Installer Distribution"

### 4. 创建 Provisioning Profile
1. 访问 [Profiles](https://developer.apple.com/account/resources/profiles/list)
2. 点击 "+" 创建新的 Profile
3. 选择 "Mac App Store"
4. 选择刚才创建的 App ID (`com.coco.app`)
5. 选择 Mac App Distribution 证书
6. 命名为 `CoCo_MAS_Profile`
7. 下载并保存为 `./electron/build/embedded.provisionprofile`

### 5. 在 App Store Connect 创建应用
1. 访问 [App Store Connect](https://appstoreconnect.apple.com)
2. 点击 "我的 App" → "+" → "新建 App"
3. 填写信息：
   - 平台: macOS
   - 名称: CoCo
   - 主要语言: 简体中文
   - Bundle ID: 选择 `com.coco.app`
   - SKU: `coco-video-editor`（唯一标识符）
4. 点击 "创建"

## 二、构建 Mac App Store 版本

### 1. 检查环境
```bash
cd ./electron

# 检查证书
security find-identity -v -p codesigning

# 应该看到类似：
# 1) XXXXXXXXXX "3rd Party Mac Developer Application: Your Name (TEAM_ID)"
# 2) XXXXXXXXXX "3rd Party Mac Developer Installer: Your Name (TEAM_ID)"
```

### 2. 设置环境变量（可选，如果有多个证书）
```bash
export CSC_NAME="3rd Party Mac Developer Application: Your Name (TEAM_ID)"
export CSC_INSTALLER_NAME="3rd Party Mac Developer Installer: Your Name (TEAM_ID)"
```

### 3. 构建应用
```bash
npm run dist:mas
```

构建完成后，会在 `dist-electron` 目录生成：
- `CoCo-1.0.0.pkg` - 用于上传到 App Store Connect 的安装包

## 三、上传到 App Store Connect

### 方法 1: 使用 Transporter（推荐）
1. 从 Mac App Store 下载 [Transporter](https://apps.apple.com/app/transporter/id1450874784)
2. 打开 Transporter
3. 登录 Apple ID
4. 拖拽 `CoCo-1.0.0.pkg` 到 Transporter 窗口
5. 点击 "交付"
6. 等待上传完成

### 方法 2: 使用命令行
```bash
# 验证 pkg
xcrun altool --validate-app \
  -f dist-electron/CoCo-1.0.0.pkg \
  -t macos \
  -u "your-apple-id@example.com" \
  -p "@keychain:AC_PASSWORD"

# 上传 pkg
xcrun altool --upload-app \
  -f dist-electron/CoCo-1.0.0.pkg \
  -t macos \
  -u "your-apple-id@example.com" \
  -p "@keychain:AC_PASSWORD"
```

注意：需要先创建 App-Specific Password：
1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. 登录后进入 "安全" → "App 专用密码"
3. 生成新密码并保存到钥匙串：
```bash
xcrun altool --store-password-in-keychain-item "AC_PASSWORD" \
  -u "your-apple-id@example.com" \
  -p "xxxx-xxxx-xxxx-xxxx"
```

## 四、在 App Store Connect 提交审核

### 1. 等待处理
上传后，等待 5-30 分钟，构建版本会出现在 App Store Connect 中。

### 2. 填写应用信息
1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择 CoCo 应用
3. 填写必要信息：

**App 信息**
- 名称: CoCo
- 副标题: AI 视频编辑器
- 类别: 照片与视频
- 内容版权: © 2026 Your Company

**定价与销售范围**
- 价格: 选择价格等级或免费
- 销售范围: 选择国家/地区

**App 隐私**
- 填写隐私政策 URL
- 回答数据收集问题

**准备提交**
- 屏幕截图（至少 3 张）：
  - 1280x800 或 1440x900 或 2880x1800
- App 预览视频（可选）
- 描述: 详细介绍应用功能
- 关键词: 用逗号分隔
- 技术支持 URL
- 营销 URL（可选）

### 3. 选择构建版本
1. 在 "准备提交" 页面
2. 点击 "构建版本" 旁的 "+"
3. 选择刚上传的版本
4. 回答出口合规问题

### 4. 提交审核
1. 检查所有信息
2. 点击 "提交以供审核"
3. 等待审核（通常 1-7 天）

## 五、常见问题

### 1. 签名失败
```
Error: Code signing failed
```
解决：
- 检查证书是否正确安装
- 确认 Provisioning Profile 路径正确
- 运行 `security find-identity -v -p codesigning` 查看可用证书

### 2. Entitlements 错误
```
Error: The executable requests the com.apple.security.xxx entitlement
```
解决：
- 检查 `build/entitlements.mas.plist` 中的权限
- 确保 App ID 中启用了相应的 Capabilities

### 3. 沙盒限制
Mac App Store 应用必须在沙盒中运行，某些功能可能受限：
- 不能访问用户未授权的文件
- 不能执行任意代码
- 网络访问需要声明

如果应用需要更多权限，考虑：
- 使用 `com.apple.security.files.user-selected.read-write` 让用户选择文件
- 使用 `com.apple.security.temporary-exception.xxx` 临时例外（需要审核批准）

### 4. Python 后端问题
应用包含 Python 后端 (`resources/coco-backend`)，需要注意：
- 确保所有二进制文件都已签名
- Python 解释器可能需要特殊处理
- 考虑使用 PyInstaller 打包为单一可执行文件

### 5. 审核被拒
常见原因：
- 应用崩溃或功能不完整
- 违反 App Store 审核指南
- 隐私政策不完整
- 缺少必要的使用说明

## 六、更新版本

1. 修改 `package.json` 中的 `version`
2. 重新构建: `npm run dist:mas`
3. 上传新的 pkg 文件
4. 在 App Store Connect 创建新版本
5. 填写 "此版本的新功能"
6. 提交审核

## 七、有用的命令

```bash
# 查看应用签名信息
codesign -dv --verbose=4 dist-electron/mas/CoCo.app

# 验证应用签名
codesign --verify --deep --strict --verbose=2 dist-electron/mas/CoCo.app

# 查看 entitlements
codesign -d --entitlements - dist-electron/mas/CoCo.app

# 检查 pkg 内容
pkgutil --payload-files dist-electron/CoCo-1.0.0.pkg
```

## 八、参考资料

- [Electron Mac App Store 指南](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)
- [Apple App Store 审核指南](https://developer.apple.com/app-store/review/guidelines/)
- [electron-builder MAS 配置](https://www.electron.build/configuration/mas)
