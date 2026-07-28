# AstroZangli AI

AstroZangli AI 是一个天文历法与藏历知识应用，采用前后端分离结构：

- `frontend/`：Next.js + TypeScript 前端页面与静态资源
- `backend/`：Flask 后端接口，提供日历、天文计算和 RAG 问答服务

## 项目结构

```text
AstroZangli-AI/
├── frontend/              # 前端源码
│   ├── src/               # 页面、组件、服务
│   ├── public/            # 图片、知识库、静态页面资源
│   └── package.json       # 前端依赖
├── backend/               # 后端源码
│   ├── app.py             # Flask 应用入口
│   ├── routes.py          # API 路由
│   ├── astronomy.py       # 天文计算逻辑
│   ├── rag_processor.py   # RAG 问答逻辑
│   ├── requirements.txt   # Python 依赖
│   └── env.example        # 环境变量示例
├── package.json           # 根目录辅助脚本
├── package-lock.json      # 前端依赖锁定文件
└── 运行指南.md             # 本地运行说明
```

## 主要功能

- 藏历、公历相关日期信息展示
- 节日、月相、行星位置等天文历法信息
- 藏历知识库浏览
- 基于 DeepSeek API 的知识问答接口

## 技术栈

- 前端：Next.js、React、TypeScript、Tailwind CSS、Three.js
- 后端：Python、Flask、Flask-Cors、Skyfield、Ephem、Pandas、Jieba

## 注意事项

本项目需要在本地自行创建环境变量文件。提交源码时不要包含 `.env`、`.env.local`、`venv/`、`node_modules/`、`.next/` 等本地配置、依赖和构建产物。

`frontend/public/` 是应用运行所需源码资源，包含 RAG 知识库、主题 HTML 和图片，必须纳入版本控制。完整安装、启动、检查和构建命令见 [运行指南.md](./运行指南.md)。
