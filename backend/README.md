# AstroZangli AI 后端

后端使用 Flask 实现，主要提供藏历计算、天文数据计算和 RAG 问答相关 API。

## 目录说明

```text
backend/
├── app.py                  # Flask 应用初始化
├── routes.py               # API 路由
├── config.py               # 配置读取
├── astronomy.py            # 天文计算逻辑
├── rag_processor.py        # RAG 问答逻辑
├── rag_processor_optimized.py
├── run.py                  # 本地启动脚本
├── wsgi.py                 # 部署入口
├── requirements.txt        # Python 依赖
├── env.example             # 环境变量示例
└── Dockerfile              # 容器部署配置
```

## 本地启动

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy env.example .env
python run.py
```

默认服务地址：

```text
http://127.0.0.1:5001
```

## 主要接口

- `GET /api/health`：健康检查
- `POST /api/calculate`：日出、日落、月出、月落等计算
- `POST /api/planets`：水、金、火、木、土星的升起、落下、中天与赤纬
- `POST /api/calendar/date-comprehensive-data`：藏历、农历、五要素、月相和太阳黄道综合数据
- `POST /api/chat`：基于知识库与 DeepSeek 的 AI 问答

综合日历接口当前支持 `1951-01-08` 至 `2051-02-11`。这是内置藏历缺日、重日及闰月数据表的有效边界，范围外会返回明确的 `400` 错误，不会用零值伪装成功结果。

## 环境变量

复制 `env.example` 为 `.env` 后按需修改：

```text
FLASK_CONFIG=development
FLASK_HOST=127.0.0.1
FLASK_PORT=5001
FLASK_DEBUG=True
SECRET_KEY=change-me-to-a-random-secret
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

## 测试

在项目根目录完成 `npm run install:all` 后运行：

```bash
npm run test:backend
```

不要把真实 `.env` 文件提交或打包给他人。
