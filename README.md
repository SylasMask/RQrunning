# RQrunning

🏃 科学跑步训练强度计算器 - 融合心率区间、呼吸商 RQ 与配速课表设计

## 功能特性

- **心率区间计算** - 基于储备心率法，可视化展示训练强度、呼吸商RQ和供能系统
- **配速课表设计** - 基于10km PB配速，生成间歇训练和比赛成绩预测
- **智能联动** - 心率与配速对照，一站式训练方案
- **运动科技风** - 荧光绿主色，深色模式，适合跑步场景

## 项目名称含义

**RQ** = Respiratory Quotient（呼吸商）+ **running**（跑步）

呼吸商是本工具的核心科学概念，反映身体在不同训练强度下的供能来源（脂肪 vs 糖原）。

## 项目结构

```
rqrunning/
├── index.html              # 主页面
├── assets/
│   └── app.js              # 核心逻辑
├── favicon.svg             # 网站图标
├── og-image.png            # 社交分享预览图
└── README.md               # 项目说明
```

## 技术栈

- 纯静态页面（HTML + Tailwind CSS + JavaScript）
- 零依赖构建
- 响应式设计
- 支持 URL 分享

## 部署

适合部署到 Cloudflare Pages、Netlify、Vercel 等静态托管平台。

## 设计者

Charles Peng
