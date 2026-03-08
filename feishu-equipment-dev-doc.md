# 飞书器材出入库管理系统 - 开发文档

## 📋 项目概述

基于飞书免登录能力的器材出入库管理Web应用，支持在飞书客户端内自动识别用户身份，实现器材的分类管理、扫码出入库、操作日志追踪等功能。

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        飞书客户端                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   设备管理   │  │   出入库    │  │      操作日志        │  │
│  │   页面      │  │   页面      │  │      页面           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  纯HTML前端  │
                    │  (响应式)    │
                    └──────┬──────┘
                           │ HTTP/API
                    ┌──────▼──────┐
                    │  FastAPI    │
                    │   后端      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   SQLite    │
                    │   数据库    │
                    └─────────────┘
```

---

## 🔧 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 已有 | 已有 |
| 后端 | FastAPI | Python异步Web框架 |
| 数据库 | SQLite | 轻量级本地数据库 |
| 认证 | 飞书JSAPI | 免登录 + 扫码能力 |
| 部署 | Uvicorn | ASGI服务器，端口8000 |

---

## 📁 目录结构

```
equipment-management/
├── main.py                 # FastAPI应用入口
├── requirements.txt        # Python依赖
├── database.py            # 数据库模型和连接
├── config.py              # 配置项(APP_ID/SECRET等)
├── static/                # 静态资源
│   ├── css/
│   │   └── style.css      # 全局样式
│   ├── js/
│   │   ├── feishu.js      # 飞书JSAPI封装
│   │   ├── api.js         # 后端API调用
│   │   └── app.js         # 页面逻辑
│   └── icons/             # 图标资源
├── templates/             # HTML模板
│   ├── index.html         # 主页面(路由容器)
│   ├── devices.html       # 设备管理页面
│   ├── checkout.html      # 出入库页面
│   └── logs.html          # 操作日志页面
└── feishu_auth.py         # 飞书认证模块
```

---

## 🔐 飞书免登录集成

### 1. 应用配置

**已提供凭证：**
- APP_ID: `your_feishu_app_id`
- APP_SECRET: `5nq3ECouyOGgIUeMmL1CAeKbWLlqVP5B`

**需要在飞书开放平台配置：**
1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入应用管理 → 网页应用 → 开启网页应用
3. 设置桌面端首页地址: `http://your-domain:8000`
4. 设置移动端首页地址: `http://your-domain:8000`
5. 添加权限: `contact:user.base` (获取用户基本信息)

### 2. 免登录流程

```
用户访问页面
     │
     ▼
┌─────────────────┐
│ 判断是否在飞书   │◄──── 通过User-Agent检测
│ 客户端内打开    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  是          否
  │           │
  ▼           ▼
┌────────┐  ┌──────────────────┐
│调用JSAPI│  │显示"请使用飞书    │
│获取code │  │客户端打开"提示页  │
└───┬────┘  └──────────────────┘
    │
    ▼
┌─────────────────┐
│ 后端用code换取  │
│ access_token    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 获取用户信息     │
│ (openid/name)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 创建/更新本地    │
│ 用户记录        │
└────────┬────────┘
         │
         ▼
    正常访问功能
```

### 3. 核心代码结构

**前端检测飞书环境:**
```javascript
function isFeishuClient() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('lark') || ua.includes('feishu');
}
```

**前端调用免登录:**
```javascript
// 引入飞书JSAPI
<script src="https://lf-package-cn.feishucdn.com/obj/feishu-static/lark/op/h5-js-sdk-1.5.35.js"></script>

// 获取免登录code
async function getAuthCode() {
    return new Promise((resolve, reject) => {
        window.h5sdk.ready(() => {
            tt.requestAccess({
                appID: 'your_feishu_app_id',
                success: (res) => resolve(res.code),
                fail: (err) => reject(err)
            });
        });
    });
}
```

**后端换取用户信息:**
```python
async def get_user_info(code: str):
    # 1. 获取app_access_token
    token_url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
    token_resp = await httpx.post(token_url, json={
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    })
    app_token = token_resp.json()["app_access_token"]
    
    # 2. 用code换取user_access_token
    user_url = "https://open.feishu.cn/open-apis/authen/v1/access_token"
    user_resp = await httpx.post(user_resp, headers={
        "Authorization": f"Bearer {app_token}"
    }, json={"grant_type": "authorization_code", "code": code})
    
    return user_resp.json()
```

---

## 🗄️ 数据库设计

### 实体关系图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Category      │     │ EquipmentModel  │     │   Equipment     │
│   器材分类       │◄────┤   器材型号       │◄────┤   器材实例      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ name            │     │ category_id(FK) │     │ model_id (FK)   │
│ created_at      │     │ name            │     │ serial_number   │
│ updated_at      │     │ description     │     │ qr_code         │
└─────────────────┘     │ created_at      │     │ status          │
                        │ updated_at      │     │ current_user_id │
                        └─────────────────┘     │ created_at      │
                                                │ updated_at      │
                                                └────────┬────────┘
                                                         │
                                ┌────────────────────────┘
                                │
                         ┌──────▼──────┐
                         │ OperationLog │
                         │   操作日志    │
                         ├─────────────┤
                         │ id (PK)      │
                         │ equipment_id │
                         │ user_id (FK) │
                         │ action_type  │
                         │ purpose      │
                         │ expected_ret │
                         │ created_at   │
                         └─────────────┘

┌─────────────────┐
│     User        │
│   系统用户       │
├─────────────────┤
│ id (PK)         │
│ feishu_open_id  │
│ name            │
│ avatar          │
│ created_at      │
└─────────────────┘
```

### 数据表详细定义

#### 1. categories - 器材分类表
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,  -- 分类名称(相机/镜头/声卡等)
    sort_order INTEGER DEFAULT 0,        -- 排序序号
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. equipment_models - 器材型号表
```sql
CREATE TABLE equipment_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,        -- 所属分类ID
    name VARCHAR(200) NOT NULL,          -- 型号名称(如"Pocket 3")
    description TEXT,                    -- 型号描述/规格
    total_count INTEGER DEFAULT 0,       -- 总数量(冗余字段)
    available_count INTEGER DEFAULT 0,   -- 可用数量(冗余字段)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### 3. equipments - 器材实例表
```sql
CREATE TABLE equipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,           -- 所属型号ID
    serial_number VARCHAR(200),          -- 设备序列号/编号
    qr_code VARCHAR(500) UNIQUE,         -- 条形码/条形码内容
    status INTEGER DEFAULT 0,            -- 状态:0=在库,1=借出
    current_user_id INTEGER,             -- 当前借用人ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES equipment_models(id) ON DELETE CASCADE,
    FOREIGN KEY (current_user_id) REFERENCES users(id)
);
```

#### 4. users - 用户表
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feishu_open_id VARCHAR(200) UNIQUE NOT NULL,  -- 飞书用户唯一ID
    name VARCHAR(100),                   -- 用户姓名
    avatar_url VARCHAR(500),             -- 头像URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. operation_logs - 操作日志表
```sql
CREATE TABLE operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,       -- 器材ID
    user_id INTEGER NOT NULL,            -- 操作人ID
    action_type VARCHAR(50) NOT NULL,    -- 操作类型:CHECKOUT/CHECKIN/CREATE/UPDATE/DELETE
    purpose TEXT,                        -- 出库用途
    expected_return_at TIMESTAMP,        -- 预计归还时间
    actual_return_at TIMESTAMP,          -- 实际归还时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🌐 API接口设计

### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 飞书code登录，返回用户信息和token |
| GET | `/api/auth/me` | 获取当前登录用户信息 |

### 分类管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取所有分类 |
| POST | `/api/categories` | 创建分类 |
| PUT | `/api/categories/{id}` | 更新分类 |
| DELETE | `/api/categories/{id}` | 删除分类 |

### 器材型号管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/models` | 获取型号列表(支持按分类筛选) |
| GET | `/api/models/{id}` | 获取型号详情(含器材列表) |
| POST | `/api/models` | 创建型号 |
| PUT | `/api/models/{id}` | 更新型号 |
| DELETE | `/api/models/{id}` | 删除型号 |

### 器材实例管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/equipments` | 获取器材列表(支持按型号/状态筛选) |
| GET | `/api/equipments/{id}` | 获取器材详情 |
| POST | `/api/equipments` | 批量创建器材(生成条形码) |
| PUT | `/api/equipments/{id}` | 更新器材信息 |
| DELETE | `/api/equipments/{id}` | 删除器材 |
| GET | `/api/equipments/by-qrcode` | 通过条形码查询器材 |

### 出入库操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/checkout` | 批量出库(扫码+填写信息) |
| POST | `/api/checkin` | 批量入库(扫码即可) |
| GET | `/api/checkout/active` | 获取当前借出列表 |

### 操作日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs` | 获取操作日志(支持分页、筛选) |
| GET | `/api/logs/equipment/{id}` | 获取指定器材的日志 |
| GET | `/api/logs/user/{id}` | 获取指定用户的日志 |

### 飞书扫码

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/feishu/scan-config` | 获取扫码JSAPI配置 |

---

## 📱 页面设计

### 整体布局

```
┌─────────────────────────────────────────────┐
│  ☰  器材管理系统          [用户头像]  ▼    │  ← 顶部导航栏
├─────────────────────────────────────────────┤
│                                             │
│              页面内容区域                    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  [设备]    [出入库]    [日志]               │  ← 底部导航(移动端)
└─────────────────────────────────────────────┘
```

### 响应式断点

| 设备 | 断点 | 布局 |
|------|------|------|
| 手机 | < 768px | 单列布局，底部导航 |
| 平板/电脑 | ≥ 768px | 左侧边栏导航，右侧内容 |

### 页面一：设备管理

**功能：**
- 树状展示：分类 → 型号 → 设备编号
- 支持展开/收起分类
- 每个型号显示数量(在库/总数)
- 点击可添加/编辑/删除

**界面元素：**
```
┌─────────────────────────────────────────────┐
│  设备管理                                    │
│  [+ 添加分类]                                │
├─────────────────────────────────────────────┤
│  ▼ 📁 相机                                  │
│     ├─ Pocket 3 (2/3)                    │
│     │   ├─ SN: PK3-001 [在库] [删除]      │
│     │   ├─ SN: PK3-002 [借出] [删除]      │
│     │   └─ SN: PK3-003 [在库] [删除]      │
│     └─ Sony A7M4 (1/1)                   │
│         └─ SN: A7M4-001 [在库] [删除]     │
│  ▶ 📁 镜头                                  │
│  ▶ 📁 声卡                                  │
├─────────────────────────────────────────────┤
│  点击型号可批量添加设备                      │
└─────────────────────────────────────────────┘
```

### 页面二：出入库

**功能：**
- 扫码区域(调用飞书扫码)
- 已扫描列表显示
- 出库时填写用途和预计归还时间
- 入库时只需确认

**出库界面：**
```
┌─────────────────────────────────────────────┐
│  器材出库                                    │
│  [切换至入库模式]                            │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │         [ 点击扫码 ]                    ││
│  │           📷 或 🔍                     ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  已扫描 (3):                                │
│  ┌─────────────────────────────────────────┐│
│  │ 🏷️ Pocket 3 - PK3-001          [删除]  ││
│  │ 🏷️ Sony A7M4 - A7M4-001         [删除]  ││
│  │ 🏷️ 麦克风 - MIC-001              [删除]  ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  出库信息:                                   │
│  ┌─────────────────────────────────────────┐│
│  │ 用途: [拍摄宣传片                       ]││
│  │ 预计归还: [2025-02-20 ▼] [14:00 ▼]      ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│        [    确认出库    ]                   │
└─────────────────────────────────────────────┘
```

**入库界面：**
```
┌─────────────────────────────────────────────┐
│  器材入库                                    │
│  [切换至出库模式]                            │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │         [ 点击扫码 ]                    ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  已扫描 (2):                                │
│  ┌─────────────────────────────────────────┐│
│  │ 🏷️ Pocket 3 - PK3-001 (借用人: 张三)   ││
│  │    借出时间: 2025-02-10 用途: 拍摄      ││
│  │ 🏷️ 麦克风 - MIC-001 (借用人: 李四)      ││
│  │    借出时间: 2025-02-12 用途: 录音      ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│        [    确认入库    ]                   │
└─────────────────────────────────────────────┘
```

### 页面三：操作日志

**功能：**
- 表格展示所有操作记录
- 支持按时间/用户/操作类型筛选
- 分页显示

**界面：**
```
┌─────────────────────────────────────────────┐
│  操作日志                                    │
├─────────────────────────────────────────────┤
│  筛选: [全部类型 ▼] [全部用户 ▼] [最近7天 ▼] │
├─────────────────────────────────────────────┤
│  ┌──────────┬─────────┬───────┬────────────┐│
│  │ 时间     │ 用户    │ 操作  │ 详情       ││
│  ├──────────┼─────────┼───────┼────────────┤│
│  │02-15 10:30│ 张三   │ 出库  │ Pocket 3   ││
│  │          │         │       │ 用途:拍摄  ││
│  ├──────────┼─────────┼───────┼──────┬─────┤│
│  │02-15 09:15│ 李四   │ 入库  │ 麦克风    ││
│  ├──────────┼─────────┼───────┼──────┴─────┤│
│  │02-14 16:00│ 王五   │ 新增  │ 新分类:灯光││
│  └──────────┴─────────┴───────┴────────────┘│
├─────────────────────────────────────────────┤
│        [ < 上一页 ]  第 1/5 页  [ 下一页 > ] │
└─────────────────────────────────────────────┘
```

---

## 🎨 设计系统

### 颜色规范

```css
:root {
    /* 主色调 - 飞书蓝 */
    --primary: #3370FF;
    --primary-light: #E8F1FF;
    --primary-dark: #2860DD;
    
    /* 状态色 */
    --success: #34D399;  /* 成功/在库 */
    --warning: #FBBF24;  /* 警告 */
    --danger: #EF4444;   /* 删除/借出 */
    --info: #6B7280;     /* 信息 */
    
    /* 中性色 */
    --bg-primary: #FFFFFF;
    --bg-secondary: #F5F6F7;
    --bg-tertiary: #EBECED;
    --text-primary: #1F2329;
    --text-secondary: #646A73;
    --text-tertiary: #8F959E;
    --border: #DEE0E3;
    
    /* 阴影 */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### 间距规范

```css
:root {
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-xxl: 48px;
}
```

### 字体规范

```css
:root {
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", 
                 "PingFang SC", "Hiragino Sans GB", sans-serif;
    
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;
    --text-lg: 18px;
    --text-xl: 20px;
    --text-2xl: 24px;
}
```

### 圆角规范

```css
:root {
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 9999px;
}
```

---

## 🔨 核心功能实现

### 1. 飞书扫码调用

```javascript
// 调用飞书客户端扫码
function scanQRCode() {
    tt.scanCode({
        scanType: ['qrCode', 'barCode'],
        success: (res) => {
            // res.result 为扫描结果
            handleScanResult(res.result);
        },
        fail: (err) => {
            showToast('扫码失败: ' + err.errMsg);
        }
    });
}
```

### 2. 批量出库流程

```
1. 用户点击"扫码"按钮
2. 调用 tt.scanCode() 扫描器材条形码
3. 根据条形码内容查询器材信息
4. 检查器材状态:
   - 在库 → 添加到扫描列表
   - 借出 → 提示"该器材已借出"
5. 用户可继续扫码或填写出库信息
6. 点击"确认出库":
   a. 更新器材状态为"借出"
   b. 设置 current_user_id
   c. 创建 operation_logs 记录
   d. 更新 equipment_models 的可用数量
```

### 3. 批量入库流程

```
1. 用户点击"扫码"按钮
2. 扫描器材条形码
3. 查询器材信息和当前借用记录
4. 添加到扫描列表(显示原借用人)
5. 点击"确认入库":
   a. 更新器材状态为"在库"
   b. 清空 current_user_id
   c. 更新 operation_logs 的 actual_return_at
   d. 更新 equipment_models 的可用数量
```

### 4. 条形码生成规则

每个器材的条形码内容建议格式:
```
EQUIP:{equipment_id}:{random_hash}

示例:
EQUIP:42:a7f3d9e2
```

生成代码:
```python
import secrets

def generate_qr_content(equipment_id: int) -> str:
    random_part = secrets.token_hex(4)
    return f"EQUIP:{equipment_id}:{random_part}"
```

---

## 🚀 开发步骤

### 阶段一：基础搭建
1. 创建项目目录结构
2. 初始化Python虚拟环境
3. 安装依赖: `fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`, `httpx`
4. 配置数据库模型
5. 创建基础FastAPI应用

### 阶段二：飞书集成
1. 实现飞书免登录流程
2. 创建环境检测中间件
3. 实现用户信息获取
4. 测试客户端内自动登录

### 阶段三：页面开发
1. 创建响应式HTML模板
2. 实现CSS样式系统
3. 编写JavaScript API封装
4. 实现三页面基本布局

### 阶段四：设备管理
1. 实现分类CRUD接口
2. 实现型号CRUD接口
3. 实现器材CRUD接口
4. 实现树状展示组件
5. 实现条形码批量生成

### 阶段五：出入库功能
1. 集成飞书扫码JSAPI
2. 实现出库接口和页面
3. 实现入库接口和页面
4. 实现扫码结果处理

### 阶段六：日志功能
1. 实现操作日志记录
2. 实现日志查询接口
3. 实现日志展示页面
4. 添加筛选和分页

### 阶段七：测试优化
1. 手机端测试
2. 电脑端测试
3. 扫码功能测试
4. 性能优化

---

## 📦 requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
aiosqlite==0.19.0
httpx==0.26.0
python-multipart==0.0.6
jinja2==3.1.3
python-dotenv==1.0.0
```

---

## ⚠️ 注意事项

1. **安全性:** APP_SECRET 不要硬编码在代码中，使用环境变量
2. **条形码打印:** 器材条形码建议用标签打印机打印并贴到器材上
3. **数据备份:** SQLite文件定期备份，防止数据丢失
4. **并发处理:** FastAPI天然支持异步，但SQLite并发有限，如需高并发考虑迁移到PostgreSQL
5. **飞书权限:** 确保应用申请了必要的权限，否则无法获取用户信息
6. **域名配置:** 飞书应用需要配置正确的域名，本地测试可使用内网穿透工具

---

## 🔗 参考链接

- [飞书免登录示例代码](https://open.feishu.cn/document/home/quickly-create-a-login-free-web-app/introduction-to-sample-code)
- [飞书免登录开发指南](https://open.feishu.cn/document/uYjL24iN/uMTMuMTMuMTM/development-guide/step-3)
- [飞书扫码API文档](https://open.feishu.cn/document/uYjL24iN/uYzNx4iN3EjL2cTM)

---

**文档版本:** v1.0  
**创建日期:** 2025-02-15  
**适用项目:** 飞书器材出入库管理系统
