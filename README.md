# 呼吸节奏 RQrunning

🏃 科学跑步训练强度计算器 - 融合心率区间、呼吸商 RQ 与配速课表设计

> **Breathing Rhythm** - 科学训练，从理解呼吸与节奏的联动开始

## 功能特性

- **心率区间计算** - 基于储备心率法，可视化展示训练强度、呼吸商RQ和供能系统
- **配速课表设计** - 基于10km PB配速，生成间歇训练和比赛成绩预测
- **智能联动** - 心率与配速对照，一站式训练方案
- **运动科技风** - 荧光绿主色，深色模式，适合跑步场景
- **参数记忆与分享** - 自动保存本地参数，支持一键复制分享链接

## 项目名称含义

### 中文名：呼吸节奏
跑步的本质是呼吸与节奏的和谐统一。呼吸商（RQ）反映的正是身体在不同节奏（强度）下的能量代谢模式。

### 英文名：RQrunning
**RQ** = Respiratory Quotient（呼吸商）+ **running**（跑步）

呼吸商是本工具的核心科学概念，反映身体在不同训练强度下的供能来源（脂肪 vs 糖原）。

## 项目结构

```
rqrunning/
├── index.html              # 主页面
├── assets/
│   ├── styles.css          # 页面样式
│   └── app.js              # 核心逻辑
├── favicon.svg             # 网站图标
├── og-image.png            # 社交分享预览图
└── README.md               # 项目说明
```

## 技术栈

- 纯静态页面（HTML + 本地 CSS + JavaScript）
- 零构建步骤，本地样式覆盖页面所需工具类，运行时不依赖 Tailwind CDN
- 响应式设计
- 支持 URL 分享与本地参数保存

## 本地预览

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 部署

适合部署到 Cloudflare Pages、Netlify、Vercel 等静态托管平台。

## 设计者

Charles Peng
