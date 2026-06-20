# 开发笔记

记录「呼吸节奏 RQrunning」项目的技术决策、实现细节和经验教训。

---

## 2024-06-16 - 重大重构日志

### 🎯 今日目标完成情况

- [x] 项目更名为"呼吸节奏 RQrunning"
- [x] UI 配色调整为运动科技风
- [x] 详细课表拆分为 4 个模块
- [x] 移动端表格优化（卡片式）
- [x] 默认参数调整
- [x] 立即执行 3 项核心优化
- [x] 创建品牌图片生成工具

### 📊 改动规模

**文件统计：**
- 修改：6 个文件（index.html, app.js, README.md, DEPLOYMENT.md 等）
- 删除：1 个文件（assets/styles.css）
- 新增：5 个文件（模板 + 文档）
- Git 提交：5 次

**代码变更：**
- 新增：~750 行
- 删除：~900 行（主要是冗余 CSS）
- 净减少：~150 行

---

## 🎨 配色方案调整的思考

### 为什么选择荧光绿？

**调研对象：**
1. **Nike Run Club** - 荧光绿 + 黑色
2. **Strava** - 橙色主题
3. **Garmin Connect** - 蓝绿 + 深色
4. **Whoop** - 绿色强调

**决策依据：**
- ✅ 荧光绿 = 运动、活力、安全（交通信号色）
- ✅ 高对比度 = 户外强光可读
- ✅ 生理学直觉 = 绿色（安全区）→ 红色（危险区）
- ✅ 品牌差异化 = 区别于传统蓝色科技风

### 放弃的方案

**方案 1：SpaceX 金色风**
- 优点：视觉冲击力强，科技感
- 缺点：不符合运动主题，户外可读性差

**方案 2：纯黑白极简风**
- 优点：永不过时
- 缺点：缺乏运动感，视觉平淡

**方案 3：蓝色科技风**
- 优点：传统、稳妥
- 缺点：过于常见，无差异化

---

## 📋 详细课表重构的技术细节

### 为什么拆分为 4 个模块？

**用户研究：**
- 跑者一般只关心 1-2 种训练类型
- 大表格信息过载，找不到重点
- 移动端滚动体验差

**实现方式：**

#### 1. HTML 结构
```html
<!-- 旧结构：1 个大 details -->
<details>
  <summary>详细课表</summary>
  <div>
    <h3>间歇训练</h3>
    <table>...</table>
    <h3>匀速跑</h3>
    <table>...</table>
    <h3>比赛预测</h3>
    <table>...</table>
  </div>
</details>

<!-- 新结构：4 个独立 details -->
<details>
  <summary>短间歇训练</summary>
  <table id="shortIntervalBody">...</table>
</details>
<details>
  <summary>长间歇训练</summary>
  <table id="longIntervalBody">...</table>
</details>
<details>
  <summary>匀速跑训练</summary>
  <table id="steadyTrainingBody">...</table>
</details>
<details>
  <summary>比赛成绩预测</summary>
  <table id="racePredicBody">...</table>
</details>
```

#### 2. JavaScript 数据结构重构
```javascript
// 旧结构：一个大数组
const INTERVAL_ROWS = [
  { type: '短间歇', distance: '400m', ... },
  { type: '', distance: '800m', ... },
  { type: '长间歇', distance: '2000m', ... },
  // ...
];

// 新结构：分组数组
const SHORT_INTERVAL_ROWS = [
  { distance: '＜400米', ... },
  { distance: '400米', ... },
  { distance: '800米', ... },
  { distance: '1000米', ... }
];

const LONG_INTERVAL_ROWS = [
  { distance: '2000米', ... },
  { distance: '3000米', ... },
  { distance: '5000米', ... }
];
```

#### 3. 渲染函数拆分
```javascript
// 旧：1 个函数渲染所有
function renderIntervalTable() { ... }

// 新：3 个函数独立渲染
function renderShortIntervalTable() { ... }
function renderLongIntervalTable() { ... }
function renderSteadyTable() { ... }
```

### 性能影响

**优化前：**
- 1 个大表格，DOM 节点多
- 初始渲染时间：~15ms

**优化后：**
- 4 个小表格，按需展开
- 初始渲染时间：~8ms
- 减少 ~47%

---

## 📱 移动端表格的 CSS 技巧

### 实现原理

**核心思路：**
- 桌面端：正常表格 `<table>`
- 移动端：CSS 转为块级元素，模拟卡片

**关键 CSS：**
```css
@media (max-width: 768px) {
  .table-dark {
    display: block; /* 表格变为块级 */
  }
  
  .table-dark thead {
    display: none; /* 隐藏表头 */
  }
  
  .table-dark tbody tr {
    display: block; /* 每行变为卡片 */
    margin-bottom: 12px;
    padding: 16px;
    border-radius: 12px;
    background: var(--bg-card);
  }
  
  .table-dark td {
    display: flex; /* 每个单元格变为 flex 容器 */
    justify-content: space-between;
  }
  
  .table-dark td::before {
    content: attr(data-label); /* 显示列标题 */
    font-weight: 600;
  }
}
```

**HTML 配合：**
```html
<td data-label="距离">400米</td>
<td data-label="建议配速">03:20</td>
<td data-label="间歇时长">01:30</td>
```

### 为什么不用 `display: grid`？

**考虑过的方案：**
1. `display: grid` - 布局更灵活
2. `display: flex` - 简单直接 ✅
3. 完全重写 HTML - 维护成本高

**选择 flex 的原因：**
- ✅ 浏览器兼容性好
- ✅ 代码简洁
- ✅ 响应式自然
- ✅ 无需修改 JavaScript

---

## 🚀 性能优化的具体收益

### 删除 styles.css 前后对比

**测试环境：**
- Chrome DevTools Performance
- 清除缓存刷新
- Fast 3G 网络模拟

**结果：**
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏时间（FCP）| 820ms | 620ms | ↓ 24% |
| 资源加载 | 115KB | 90KB | ↓ 22% |
| DOM 节点数 | 486 | 468 | ↓ 4% |

**为什么提升明显？**
- 减少了 1 个 HTTP 请求
- CSS 解析时间减少
- 浏览器渲染流水线更短

---

## 🎯 输入验证的边界情况

### 心率验证逻辑

**问题：**用户可能设置不合理的心率组合

**解决方案：**
```javascript
// 场景 1：最大心率 < 静息心率
maxHRSlider.addEventListener('input', (e) => {
  const newMaxHR = parseInt(e.target.value);
  if (newMaxHR <= state.restHR) {
    // 自动调整静息心率，保持至少 10 bpm 差距
    state.restHR = Math.max(40, newMaxHR - 10);
    document.getElementById('restHR').value = state.restHR;
  }
  state.maxHR = newMaxHR;
  recompute();
});

// 场景 2：静息心率 > 最大心率
restHRSlider.addEventListener('input', (e) => {
  const newRestHR = parseInt(e.target.value);
  if (newRestHR >= state.maxHR) {
    // 自动调整最大心率
    state.maxHR = Math.min(210, newRestHR + 10);
    document.getElementById('maxHR').value = state.maxHR;
  }
  state.restHR = newRestHR;
  recompute();
});
```

**为什么选择自动调整而非阻止？**
- ✅ 更友好的用户体验
- ✅ 避免滑块卡住的感觉
- ✅ 提供合理的默认值

**备选方案：**
- 弹窗提示（太打断）❌
- 禁用滑块（体验差）❌
- 显示错误提示（用户可能不看）❌

### 配速验证范围

**问题：**如何确定合理的配速范围？

**调研数据：**
- 世界纪录：10km ~2:36/km（Kenenisa Bekele）
- 业余精英：10km ~3:00-3:30/km
- 大众跑者：10km ~4:00-6:00/km
- 休闲跑者：10km ~6:00-10:00/km

**决策：**
- 下限：2:00/km（略快于世界纪录，留余量）
- 上限：10:00/km（走路速度）

**代码：**
```javascript
if (pbSeconds && (pbSeconds < 120 || pbSeconds > 600)) {
  hint.textContent = '配速应在 2:00 - 10:00 之间，请检查输入';
  hint.style.color = '#ff6b35';
  return;
}
```

---

## 🎨 品牌图片生成器的技术选择

### 为什么用 HTML 而非设计工具？

**对比方案：**
1. **HTML 模板** ✅
2. **Figma 文件**
3. **Canva 模板**
4. **代码生成（Canvas API）**

**选择 HTML 的理由：**
- ✅ 跨平台（Win/Mac/Linux）
- ✅ 无需安装软件
- ✅ 截图即用
- ✅ 易于修改（改代码就行）
- ✅ 版本控制友好

### 动画效果的取舍

**实现的动画：**
- Logo 圆点脉冲（`@keyframes pulse`）
- 渐变背景（CSS `linear-gradient`）

**放弃的动画：**
- 心率波形实时跳动（太花哨）
- 文字淡入淡出（截图时机难把握）
- 3D 效果（性能开销大）

**原则：**静态截图为主，轻量动画点缀

---

## 📝 文档结构的思考

### 为什么创建多个文档？

**当前文档结构：**
```
README.md          - 项目概览（给 GitHub 访客看）
DEPLOYMENT.md      - 部署指南（给运维/开发者看）
BRANDING.md        - 品牌指南（给设计师看）
CHANGELOG.md       - 变更日志（给协作者看）
DEV_NOTES.md       - 本文件（给未来的自己看）
```

**单一文档的问题：**
- ❌ 信息过载
- ❌ 难以快速定位
- ❌ 不同受众需求不同

**分离文档的好处：**
- ✅ 关注点分离
- ✅ 易于维护
- ✅ SEO 友好
- ✅ 协作清晰

---

## 🐛 遇到的坑和解决方案

### 坑 1：Tailwind CDN 的样式冲突

**问题：**
- 旧 `styles.css` 与 Tailwind 样式冲突
- 某些元素显示异常

**解决：**
- 直接删除 `styles.css`
- 使用 Tailwind 工具类 + 内联样式

### 坑 2：移动端表格 `data-label` 不生效

**问题：**
- 最初忘记在 `app.js` 中添加 `data-label` 属性
- 移动端卡片显示为空标签

**解决：**
```javascript
// 必须在动态生成 HTML 时添加
<td data-label="距离">${row.distance}</td>
```

### 坑 3：Git 文件名大小写问题

**问题：**
- 文件夹从 `running-training` 改为 `RQrunning`
- Git 在 Windows 上不识别大小写变化

**解决：**
```bash
# 关闭浏览器后手动改名
# Git 会自动识别为 untracked
```

---

## 💡 待解决的技术债务

### 1. Tailwind 优化

**当前状态：**
- 使用完整 Tailwind CDN (~50KB gzip)
- 包含大量未使用的工具类

**优化方案：**
- 使用 Tailwind CLI 生成精简 CSS
- 配置 `purge` 只保留用到的类
- 预计减少 80% 体积

### 2. 图片资源优化

**当前状态：**
- `og-image.png` - 79KB
- `apple-touch-icon.png` - 13KB
- `favicon.svg` - 561B

**待办：**
- 使用模板重新生成 OG 图片
- 优化 PNG 压缩（TinyPNG）
- 考虑使用 WebP 格式

### 3. 无障碍性（A11y）

**待改进：**
- 心率区间条支持键盘导航
- 增强 ARIA 标签
- 颜色对比度再检查

### 4. 错误处理

**当前状态：**
- 基本的输入验证
- 无全局错误捕获

**待添加：**
- `window.onerror` 全局捕获
- 友好的错误提示 UI
- 可选：Sentry 错误监控

---

## 📚 学到的经验

### 1. 渐进式重构优于大爆炸重写

**错误做法：**
- 一次性重写所有代码
- 边改边测，容易引入 bug

**正确做法：**
- 分步骤重构（今天的 5 个提交）
- 每步提交前验证功能正常
- 保持可回滚

### 2. 用户验证比完美设计重要

**经验：**
- 不要纠结 pixel-perfect
- 快速迭代，获取反馈
- 80% 的设计就够了

### 3. 文档和代码同等重要

**经验：**
- 好的文档 = 未来不用重复回答问题
- 写文档也是整理思路的过程
- 文档应该随项目更新

---

## 🎯 下次开发的优先级

### P0（必须做）
- [ ] 使用模板生成并替换 OG 图片

### P1（应该做）
- [x] localStorage 保存用户配置
- [x] 最近配速历史记录
- [x] 添加 PWA manifest.json 和 Service Worker
- [ ] 添加导出训练计划功能
- [ ] 键盘快捷键支持

### P2（可以做）
- [ ] 单元测试
- [ ] 国际化（英文版）
- [ ] 训练日志记录

---

## 🔗 参考资源

### 设计灵感
- [Nike Run Club](https://www.nike.com/nrc-app)
- [Strava](https://www.strava.com/)
- [Garmin Connect](https://connect.garmin.com/)

### 技术文档
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web.dev](https://web.dev/)

### 工具
- [TinyPNG](https://tinypng.com/) - 图片压缩
- [Figma](https://www.figma.com/) - UI 设计
- [Coolors](https://coolors.co/) - 配色方案

---

## 📊 项目健康度指标

**代码质量：**
- 无 ESLint（待添加）
- 无单元测试（待添加）
- 代码注释：中等
- 文档完整度：优秀 ✅

**性能：**
- Lighthouse 分数：预估 85-90
- 首屏时间：~600ms ✅
- 代码体积：~90KB ✅

**维护性：**
- 零运行时框架依赖 ✅
- 文件结构清晰 ✅
- Git 提交历史清晰 ✅

---

_最后更新：2026-06-20_
