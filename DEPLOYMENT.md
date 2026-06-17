# 呼吸节奏 RQrunning - Cloudflare Pages 部署指南

## 部署前准备

- [x] 项目文件结构完整
- [x] index.html 作为入口文件
- [x] 静态资源路径正确（相对路径）
- [x] favicon 和 OG 图片已准备
- [x] Git 仓库已初始化（https://github.com/pengyky/RQrunning）

## Cloudflare Pages 部署步骤

### 方式 1：连接 Git 仓库（推荐）

1. **推送到 GitHub**
   ```bash
   git remote add origin https://github.com/pengyky/RQrunning.git
   git branch -M main
   git push -u origin main
   ```

2. **在 Cloudflare 创建项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 `Workers & Pages` → `Create application` → `Pages`
   - 选择 `Connect to Git`
   - 授权并选择 `RQrunning` 仓库

3. **配置构建设置**
   - **项目名称**: `rqrunning` 或 `breathing-rhythm`
   - **Framework preset**: `None`
   - **Build command**: 留空
   - **Build output directory**: `.`（当前目录）
   - **Root directory**: `/`

4. **环境变量**（可选）
   - 本项目无需环境变量

5. **部署**
   - 点击 `Save and Deploy`
   - 等待部署完成（通常 < 1 分钟）

### 方式 2：手动上传

1. 在 Cloudflare Pages 中选择 `Upload assets`
2. 将项目文件夹打包为 ZIP（排除 .git、node_modules）
3. 上传并等待部署

## 部署后配置

### 自定义域名

1. 在 Cloudflare Pages 项目设置中
2. `Custom domains` → `Set up a custom domain`
3. 推荐域名：`rqrunning.com` 或 `breathing-rhythm.com`
4. 按提示添加 CNAME 记录

### 安全头配置（可选）

在项目根目录创建 `_headers` 文件：

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'
```

## 测试清单

部署后在以下场景测试：

- [ ] 首页加载正常
- [ ] 心率区间计算功能正常
- [ ] 配速预测功能正常
- [ ] 详细课表（4个折叠模块）正常显示
- [ ] 移动端响应式显示正常（表格卡片式布局）
- [ ] URL 分享参数正常（带参数刷新页面能恢复状态）
- [ ] 复制分享链接功能正常
- [ ] 本地参数保存功能正常
- [ ] favicon 和 OG 图片正常显示
- [ ] 输入验证正常（心率冲突自动调整，配速范围检查）
- [ ] 重置按钮确认提示正常

## 性能优化建议

- [ ] 启用 Cloudflare 自动最小化（HTML/CSS/JS）
- [ ] 启用 Brotli 压缩
- [ ] 配置缓存策略（`assets/` 静态资源长缓存）
- [ ] 考虑使用 Cloudflare CDN 加速
- [ ] 添加 Service Worker 支持离线访问

## 常见问题

### Q: 部署后页面空白？
**A**: 检查浏览器控制台，可能是静态资源路径问题。确保所有路径使用相对路径（`./assets/`）。

### Q: 样式或 JS 未加载？
**A**: 检查 `index.html` 中的 `<script>` 标签路径是否正确。本项目使用 Tailwind CDN + 内联样式。

### Q: URL 参数分享失效？
**A**: Cloudflare Pages 默认支持 SPA 路由，无需额外配置。确保 `app.js` 中的 `loadFromURL()` 函数正常执行。

### Q: 如何回滚到旧版本？
**A**: 在 Cloudflare Pages 项目中，进入 `Deployments` 页面，选择旧的部署记录，点击 `Rollback`。

## 监控与分析

- 在 Cloudflare Analytics 中查看访问统计
- 配置 Google Analytics（可选，需修改 HTML）
- 监控 Core Web Vitals 性能指标

## 项目特点

- ✅ 零构建步骤（运行时使用 Tailwind CDN 与 Google Fonts）
- ✅ 纯静态页面
- ✅ 响应式设计（移动端优化）
- ✅ 输入验证和边界检查
- ✅ URL 参数分享
- ✅ 深色模式（运动科技风）

## 备注

- Cloudflare Pages 免费版限制：500 次构建/月，无限流量
- 支持自动部署：推送到 main 分支自动触发部署
- 支持预览部署：PR 或其他分支可创建预览环境
- 项目大小：约 90KB（未压缩）
