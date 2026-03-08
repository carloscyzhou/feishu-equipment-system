# 飞书器材出入库管理系统

基于飞书免登录能力的器材出入库管理 Web 应用，支持在飞书客户端内自动识别用户身份，实现器材的分类管理、扫码出入库、操作日志追踪等功能。

## ✨ 功能特性

- **🔐 飞书免登录** - 集成飞书 JSAPI，自动识别用户身份
- **📦 器材管理** - 分类管理器材，支持自定义分类和器材信息
- **📱 扫码出入库** - 支持飞书扫码和手动输入条码
- **📝 操作日志** - 完整的出入库记录和操作追踪
- **📊 数据导出** - 支持导出器材清单和操作日志为 Excel
- **🐳 Docker 部署** - 一键部署，支持前后端分离

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        飞书客户端                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   器材管理   │  │   出入库    │  │      操作日志        │  │
│  │   页面      │  │   页面      │  │      页面           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  React 前端  │
                    │  (Vite)     │
                    └──────┬──────┘
                           │ HTTP/API
                    ┌──────▼──────┐
                    │   FastAPI   │
                    │    后端      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   SQLite    │
                    │   数据库    │
                    └─────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS | 现代化前端技术栈 |
| 后端 | FastAPI | Python 高性能异步 Web 框架 |
| 数据库 | SQLite | 轻量级本地数据库 |
| 认证 | 飞书 JSAPI | 免登录 + 扫码能力 |
| 部署 | Docker + Docker Compose | 容器化部署 |

## 📁 项目结构

```
feishu-equipment-mgmt/
├── main.py                 # FastAPI 应用入口
├── database.py            # 数据库模型和操作
├── config.py              # 配置管理
├── feishu_auth.py         # 飞书认证模块
├── check_session.py       # 会话检查工具
├── requirements.txt       # Python 依赖
├── manage.sh              # 管理脚本
├── Dockerfile             # 后端 Dockerfile
├── docker-compose.yml     # Docker Compose 配置
├── .env                   # 环境变量（需自行创建）
├── static/                # 静态资源（备用前端）
│   ├── css/
│   └── js/
└── frontend/              # React 前端
    ├── src/
    │   ├── components/    # 组件
    │   ├── pages/         # 页面
    │   ├── hooks/         # 自定义 Hooks
    │   └── utils/         # 工具函数
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## 🚀 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- Docker（可选）

### 1. 克隆项目

```bash
git clone <repository-url>
cd feishu-equipment-mgmt
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的飞书应用凭证：

```env
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
DATABASE_URL=sqlite+aiosqlite:///./equipment.db
DEBUG=false
HOST=0.0.0.0
```

> 💡 在 [飞书开放平台](https://open.feishu.cn/) 创建应用获取凭证

### 3. 运行方式一：本地开发

**启动后端：**

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动后端
python main.py
# 或使用 manage.sh
./manage.sh start
```

**启动前端（开发模式）：**

```bash
cd frontend
npm install
npm run dev
```

### 4. 运行方式二：Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## ⚙️ 飞书应用配置

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 开启"网页应用"能力
4. 设置首页地址：`http://your-domain`
5. 添加权限：
   - `contact:user.base` - 获取用户基本信息
   - `contact:user.phone` - 获取用户手机号（可选）
6. 发布应用并获取 **App ID** 和 **App Secret**

## 📖 使用指南

### 器材管理

- 创建分类：在器材管理页面添加器材分类
- 添加器材：填写器材名称、规格、存放位置等信息
- 生成条码：系统自动为每件器材生成唯一条码

### 出入库操作

1. 进入"出入库"页面
2. 选择操作类型（入库/出库/借出/归还）
3. 扫描器材条码或手动输入
4. 填写操作人和备注
5. 确认提交

### 操作日志

- 查看所有出入库记录
- 按时间、操作人、器材筛选
- 导出日志为 Excel

## 🔧 管理脚本

```bash
./manage.sh start      # 启动服务
./manage.sh stop       # 停止服务
./manage.sh restart    # 重启服务
./manage.sh status     # 查看状态
./manage.sh logs       # 查看日志
./manage.sh backup     # 备份数据库
```

## 📝 更新日志

详见 [CHANGELOG-2026-03-08.md](./CHANGELOG-2026-03-08.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](./LICENSE)

---

> 🔔 **提示**：本项目需要飞书企业账号才能完整使用免登录功能。个人开发者可以在飞书开放平台创建测试应用进行开发。
