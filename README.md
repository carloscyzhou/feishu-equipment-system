# 飞书器材出入库管理系统

基于飞书免登录能力的器材出入库管理 Web 应用，支持器材管理、批量出入库/分配/交接、操作日志追踪与 Excel 导出。

仓库地址：
`https://github.com/carloscyzhou/feishu-equipment-system.git`

## 功能概览
- 飞书免登录：在飞书客户端内自动识别用户身份。
- 设备管理：分类、型号、设备实例管理。
- 设备流转：支持出库、分配、交接、入库。
- 操作日志：支持筛选、分页、时区展示、Excel 导出。
- 容器化部署：支持 Docker Compose 与纯 Docker 快速部署。

## 技术栈
- 前端：React + TypeScript + Vite + Tailwind CSS
- 后端：FastAPI + SQLAlchemy (async)
- 数据库：SQLite
- 认证：飞书 JSAPI
- 部署：Docker / Docker Compose

## 目录结构
```text
.
├── main.py
├── database.py
├── config.py
├── feishu_auth.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── CHANGELOG-2026-03-08.md
```

## 本地开发启动

### 1. 克隆代码
```bash
git clone https://github.com/carloscyzhou/feishu-equipment-system.git
cd feishu-equipment-system
```

### 2. 后端启动
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 配置飞书参数（也可写入 .env）
export FEISHU_APP_ID=your_app_id
export FEISHU_APP_SECRET=your_app_secret

python main.py
```

后端默认监听 `0.0.0.0:8001`。

### 3. 前端启动
```bash
cd frontend
npm install
npm run dev
```

前端默认监听 `0.0.0.0:8000`，并通过 Vite 代理 `/api` 到后端。

## Docker Compose 快速部署（推荐）

### 1. 准备与修改配置
项目内已提供 `docker-compose.yml`，默认使用以下镜像：
- `carloszhou/feishu-equipment-mgmt-backend:latest`
- `carloszhou/feishu-equipment-mgmt-frontend:latest`

部署前请编辑 `docker-compose.yml` 中 `backend.environment`：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

### 2. 拉取并启动
```bash
docker compose pull
docker compose up -d
```

### 3. 查看状态与日志
```bash
docker compose ps
docker compose logs -f
```

### 4. 升级到最新版本
```bash
docker compose pull
docker compose up -d --force-recreate
```

### 5. 停止与清理
```bash
docker compose down
```

## Docker 快速部署（不使用 Compose）

### 1. 创建网络与数据库文件
```bash
docker network create feishu-equipment-net
touch equipment.db
```

### 2. 启动后端容器
```bash
docker run -d \
  --name feishu-equipment-backend \
  --network feishu-equipment-net \
  -e PORT=8001 \
  -e FEISHU_APP_ID=your_app_id \
  -e FEISHU_APP_SECRET=your_app_secret \
  -v "$(pwd)/equipment.db:/app/equipment.db" \
  carloszhou/feishu-equipment-mgmt-backend:latest
```

### 3. 启动前端容器
```bash
docker run -d \
  --name feishu-equipment-frontend \
  --network feishu-equipment-net \
  -p 80:80 \
  -e API_UPSTREAM=http://feishu-equipment-backend:8001 \
  carloszhou/feishu-equipment-mgmt-frontend:latest
```

### 4. 升级容器
```bash
docker pull carloszhou/feishu-equipment-mgmt-backend:latest
docker pull carloszhou/feishu-equipment-mgmt-frontend:latest

docker rm -f feishu-equipment-frontend feishu-equipment-backend
# 按上面的 docker run 命令重新启动
```

## 飞书应用配置要点
- 登录飞书开放平台创建企业自建应用。
- 开启网页应用能力，配置可访问域名（建议 HTTPS）。
- 添加最小权限：`contact:user.base`。
- 访问失败时优先检查：域名白名单、协议（HTTP/HTTPS）、端口。

## 常用维护命令
```bash
# 查看后端日志
docker logs -f feishu-equipment-backend

# 查看前端日志
docker logs -f feishu-equipment-frontend

# 本地数据库备份
cp equipment.db "equipment-$(date +%Y%m%d-%H%M%S).db"
```

## 更新日志
- [CHANGELOG-2026-03-08.md](./CHANGELOG-2026-03-08.md)

## 前端说明
- 详见 [frontend/README.md](./frontend/README.md)
