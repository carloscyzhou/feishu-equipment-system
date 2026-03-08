"""
配置文件 - 飞书器材管理系统
"""
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 飞书应用配置
APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

if not APP_ID or not APP_SECRET:
    raise RuntimeError("缺少环境变量: FEISHU_APP_ID / FEISHU_APP_SECRET")

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./equipment.db")

# 应用配置
APP_NAME = os.getenv("APP_NAME", "飞书器材管理系统")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")


# 飞书API配置
FEISHU_BASE_URL = "https://open.feishu.cn/open-apis"
FEISHU_AUTH_URL = f"{FEISHU_BASE_URL}/authen/v1/access_token"
FEISHU_USER_URL = f"{FEISHU_BASE_URL}/contact/v3/users/"
FEISHU_APP_TOKEN_URL = f"{FEISHU_BASE_URL}/auth/v3/app_access_token/internal"

# 条形码配置
QR_CODE_PREFIX = "EQUIP"
