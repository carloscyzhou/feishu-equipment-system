# 前端说明（React + Vite）

本目录是器材管理系统前端，负责页面渲染、设备流转交互、日志筛选与导出等功能。

## 环境要求
- Node.js 18+
- npm 9+

## 安装依赖
```bash
npm install
```

## 本地开发

### 启动开发服务
```bash
npm run dev
```

默认监听：`http://localhost:8000`

### 与后端联调
`vite.config.ts` 中开发代理会将 `/api` 转发到后端：
- 默认目标：`http://192.168.0.101:8001`
- 可通过环境变量覆盖：

```bash
VITE_API_HOST=127.0.0.1 VITE_API_PORT=8001 npm run dev
```

## 构建与预览

### 构建生产包
```bash
npm run build
```

构建产物输出到 `dist/`。

### 本地预览生产包
```bash
npm run preview
```

## 代码检查
```bash
npm run lint
```

## Docker 部署

前端使用多阶段构建：
- 第 1 阶段：`node:20-alpine` 构建 Vite 静态资源
- 第 2 阶段：`nginx:1.27-alpine` 托管静态资源并反代 `/api`

### 构建镜像
在仓库根目录执行：
```bash
docker build -f frontend/Dockerfile -t feishu-equipment-frontend:local frontend
```

### 运行容器
```bash
docker run -d \
  --name feishu-equipment-frontend \
  -p 80:80 \
  -e API_UPSTREAM=http://host.docker.internal:8001 \
  feishu-equipment-frontend:local
```

`API_UPSTREAM` 用于指定前端容器转发到后端的地址。

## 关键目录
```text
frontend/
├── src/
│   ├── components/   # 通用组件
│   ├── hooks/        # 业务 hooks（认证、日志、设备等）
│   ├── pages/        # 页面组件
│   ├── utils/        # 时间/时区等工具
│   └── api.ts        # 前端 API 封装
├── Dockerfile
├── vite.config.ts
└── package.json
```

## 常见问题
- 页面能打开但接口报错：先确认后端地址和 `VITE_API_HOST/VITE_API_PORT` 是否正确。
- 飞书授权失败：通常是域名/协议不匹配，优先检查飞书开放平台域名白名单与 HTTPS 配置。
- 容器部署后接口 502：检查 `API_UPSTREAM` 是否指向可达的后端地址。
