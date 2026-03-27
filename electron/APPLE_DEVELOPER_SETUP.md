# Apple Developer 证书和配置文件创建指南

## 第一步：创建证书签名请求（CSR）

### 1. 打开钥匙串访问
已为你打开钥匙串访问应用。

### 2. 创建证书请求
1. 在钥匙串访问菜单栏：**钥匙串访问** → **证书助理** → **从证书颁发机构请求证书**
2. 填写信息：
   - **用户电子邮件地址**：填写你的 Apple ID 邮箱
   - **常用名称**：填写你的名字或公司名（例如：Zhang San）
   - **CA 电子邮件地址**：留空
   - **请求是**：选择 **"存储到磁盘"**
3. 点击 **"继续"**
4. 保存位置：桌面
5. 文件名：`CertificateSigningRequest.certSigningRequest`
6. 点击 **"存储"**

✅ 完成后，桌面会有 `CertificateSigningRequest.certSigningRequest` 文件

---

## 第二步：在 Apple Developer 创建 App ID

### 1. 访问 Apple Developer
打开浏览器访问：https://developer.apple.com/account/resources/identifiers/list

### 2. 创建新的 App ID
1. 点击左上角的 **"+"** 按钮
2. 选择 **"App IDs"**
3. 点击 **"Continue"**

### 3. 选择类型
1. 选择 **"App"**
2. 点击 **"Continue"**

### 4. 填写 App ID 信息
- **Description**: `CoCo Video Editor`
- **Bundle ID**: 选择 **"Explicit"**
- **Bundle ID 输入**: `com.coco.app`

### 5. 选择 Capabilities（根据应用需求）
建议勾选：
- ✅ **App Groups** - 用于多进程数据共享
- ✅ **Network Extensions** - 网络功能
- ✅ **User Management** - 用户管理

### 6. 完成
1. 点击 **"Continue"**
2. 检查信息
3. 点击 **"Register"**

---

## 第三步：创建 Mac App Distribution 证书

### 1. 访问证书页面
打开：https://developer.apple.com/account/resources/certificates/list

### 2. 创建新证书
1. 点击左上角的 **"+"** 按钮
2. 在 **"Software"** 部分，选择 **"Mac App Distribution"**
3. 点击 **"Continue"**

### 3. 上传 CSR 文件
1. 点击 **"Choose File"**
2. 选择桌面上的 `CertificateSigningRequest.certSigningRequest`
3. 点击 **"Continue"**

### 4. 下载并安装证书
1. 点击 **"Download"** 下载证书文件（.cer）
2. 找到下载的证书文件，双击安装
3. 证书会自动添加到钥匙串

### 5. 验证安装
打开终端运行：
```bash
security find-identity -v -p codesigning
```

应该看到类似：
```
1) XXXXXXXXXX "3rd Party Mac Developer Application: Your Name (TEAM_ID)"
```

---

## 第四步：创建 Mac Installer Distribution 证书

### 1. 重复创建证书步骤
1. 访问：https://developer.apple.com/account/resources/certificates/list
2. 点击 **"+"**
3. 选择 **"Mac Installer Distribution"**
4. 点击 **"Continue"**

### 2. 上传同一个 CSR 文件
1. 选择桌面上的 `CertificateSigningRequest.certSigningRequest`
2. 点击 **"Continue"**

### 3. 下载并安装
1. 点击 **"Download"**
2. 双击安装证书

### 4. 验证安装
运行：
```bash
security find-identity -v -p codesigning
```

现在应该看到两个证书：
```
1) XXXXXXXXXX "3rd Party Mac Developer Application: Your Name (TEAM_ID)"
2) XXXXXXXXXX "3rd Party Mac Developer Installer: Your Name (TEAM_ID)"
```

---

## 第五步：创建 Provisioning Profile

### 1. 访问 Profiles 页面
打开：https://developer.apple.com/account/resources/profiles/list

### 2. 创建新 Profile
1. 点击左上角的 **"+"** 按钮
2. 在 **"Distribution"** 部分，选择 **"Mac App Store"**
3. 点击 **"Continue"**

### 3. 选择 App ID
1. 从下拉列表选择 **"CoCo Video Editor (com.coco.app)"**
2. 点击 **"Continue"**

### 4. 选择证书
1. 勾选刚才创建的 **"Mac App Distribution"** 证书
2. 点击 **"Continue"**

### 5. 命名 Profile
1. **Provisioning Profile Name**: `CoCo_MAS_Profile`
2. 点击 **"Generate"**

### 6. 下载并保存
1. 点击 **"Download"** 下载 `.provisionprofile` 文件
2. 将文件移动到项目目录：

```bash
mv ~/Downloads/CoCo_MAS_Profile.provisionprofile \
   ./electron/build/embedded.provisionprofile
```

---

## 第六步：验证配置

### 1. 检查证书
```bash
security find-identity -v -p codesigning
```

应该看到：
- ✅ 3rd Party Mac Developer Application
- ✅ 3rd Party Mac Developer Installer

### 2. 检查 Provisioning Profile
```bash
ls -la ./electron/build/embedded.provisionprofile
```

应该存在该文件。

### 3. 测试构建
```bash
cd ./electron
npm run dist:mas
```

如果一切正常，会在 `dist-electron` 目录生成 `CoCo-1.0.0.pkg` 文件。

---

## 常见问题

### Q: 找不到证书？
A: 确保证书安装在 **"登录"** 钥匙串，不是 **"系统"** 钥匙串。

### Q: 证书显示无效？
A: 检查：
1. Apple Developer 账号是否有效（$99/年）
2. 证书是否过期（有效期 1 年）
3. 是否使用正确的 Apple ID

### Q: 构建时提示找不到 Provisioning Profile？
A: 确认文件路径：
```bash
./electron/build/embedded.provisionprofile
```

### Q: 需要重新创建 CSR 吗？
A: 不需要。同一个 CSR 文件可以用于创建多个证书。

---

## 下一步

完成上述步骤后，你就可以：

1. ✅ 构建 Mac App Store 版本：`npm run dist:mas`
2. ✅ 在 App Store Connect 创建应用
3. ✅ 上传 pkg 文件到 App Store Connect
4. ✅ 提交审核

详细的上架流程请参考：`MAS_SUBMISSION_GUIDE.md`
