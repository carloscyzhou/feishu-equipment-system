"""
飞书认证模块
处理飞书免登录流程：获取token、换取用户信息、管理本地用户
"""
import httpx
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import User
from config import APP_ID as FEISHU_APP_ID, APP_SECRET as FEISHU_APP_SECRET

# 缓存 app_access_token
_app_access_token = None
_token_expire_time = None


async def get_app_access_token() -> str:
    """
    获取飞书 app_access_token
    文档: https://open.feishu.cn/document/server-docs/authentication-management/access-token/get-app_access_token
    """
    global _app_access_token, _token_expire_time
    
    # 检查缓存的token是否有效（提前5分钟过期）
    if _app_access_token and _token_expire_time and datetime.now() < _token_expire_time - timedelta(minutes=5):
        return _app_access_token
    
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={
            "app_id": FEISHU_APP_ID,
            "app_secret": FEISHU_APP_SECRET
        })
    
    result = response.json()
    
    if result.get("code") != 0:
        raise Exception(f"获取app_access_token失败: {result.get('msg', '未知错误')}")
    
    _app_access_token = result["app_access_token"]
    expire = result.get("expire", 7200)  # 默认2小时
    _token_expire_time = datetime.now() + timedelta(seconds=expire)
    
    return _app_access_token


async def get_user_access_token(code: str, app_token: str = None) -> dict:
    """
    用临时授权码换取用户访问凭证
    文档: https://open.feishu.cn/document/server-docs/authentication-management/access-token/get-user_access_token
    
    Args:
        code: JSAPI获取的临时授权码
        app_token: app_access_token，如未提供会自动获取
    
    Returns:
        包含 user_access_token 和 user 信息的字典
    """
    if app_token is None:
        app_token = await get_app_access_token()
    
    url = "https://open.feishu.cn/open-apis/authen/v1/access_token"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {app_token}",
                "Content-Type": "application/json"
            },
            json={
                "grant_type": "authorization_code",
                "code": code
            }
        )
    
    result = response.json()
    
    if result.get("code") != 0:
        raise Exception(f"换取user_access_token失败: {result.get('msg', '未知错误')}")
    
    return result.get("data", {})


async def get_user_info_by_code(code: str) -> dict:
    """
    通过code获取用户信息（完整流程）
    
    Args:
        code: JSAPI获取的临时授权码
    
    Returns:
        用户信息字典，包含:
        - open_id: 飞书用户唯一标识
        - union_id: 多应用唯一标识
        - user_id: 用户ID（需申请权限）
        - name: 用户姓名
        - avatar: 头像URL
        - email: 邮箱（需申请权限）
        - mobile: 手机号（需申请权限）
    """
    # 1. 获取 app_access_token
    app_token = await get_app_access_token()
    
    # 2. 用 code 换取 user_access_token 和用户信息
    user_data = await get_user_access_token(code, app_token)
    
    # 提取关键信息
    user_info = {
        "open_id": user_data.get("open_id"),
        "union_id": user_data.get("union_id"),
        "user_id": user_data.get("user_id"),
        "name": user_data.get("name"),
        "avatar": user_data.get("avatar_url"),
        "avatar_thumb": user_data.get("avatar_thumb"),
        "email": user_data.get("email"),
        "mobile": user_data.get("mobile"),
        "tenant_key": user_data.get("tenant_key"),
        "access_token": user_data.get("access_token"),
        "refresh_token": user_data.get("refresh_token"),
        "expires_in": user_data.get("expires_in")
    }
    
    return user_info


async def get_or_create_user(db: AsyncSession, feishu_open_id: str, name: str = None, avatar: str = None, feishu_user_id: str = None) -> User:
    """
    根据飞书open_id获取或创建本地用户
    
    Args:
        db: 数据库会话
        feishu_open_id: 飞书用户唯一标识
        name: 用户姓名（新用户时保存）
        avatar: 用户头像URL（新用户时保存）
        feishu_user_id: 飞书用户ID（新用户时保存）
    
    Returns:
        User 对象
    """
    # 查询用户
    result = await db.execute(select(User).where(User.feishu_open_id == feishu_open_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        # 创建新用户
        user = User(
            feishu_open_id=feishu_open_id,
            feishu_user_id=feishu_user_id,
            name=name or "未知用户",
            avatar_url=avatar
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # 更新用户信息（可选）
        updated = False
        if name and user.name != name:
            user.name = name
            updated = True
        if avatar and user.avatar_url != avatar:
            user.avatar_url = avatar
            updated = True
        if feishu_user_id and user.feishu_user_id != feishu_user_id:
            user.feishu_user_id = feishu_user_id
            updated = True
        if updated:
            await db.commit()
    
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
    """
    根据用户ID获取用户信息
    
    Args:
        db: 数据库会话
        user_id: 本地用户ID
    
    Returns:
        User 对象，不存在返回None
    """
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_open_id(db: AsyncSession, open_id: str) -> User:
    """
    根据飞书open_id获取用户信息
    
    Args:
        db: 数据库会话
        open_id: 飞书open_id
    
    Returns:
        User 对象，不存在返回None
    """
    result = await db.execute(select(User).where(User.feishu_open_id == open_id))
    return result.scalar_one_or_none()


async def get_jsapi_ticket() -> str:
    """
    获取飞书 JSAPI ticket
    用于前端调用飞书JSAPI时进行鉴权签名
    文档: https://open.feishu.cn/document/common-capabilities/js-sdk/jsapi/reference/server-side/get-ticket
    """
    app_token = await get_app_access_token()
    
    url = "https://open.feishu.cn/open-apis/jssdk/ticket/get"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {app_token}"}
        )
    
    result = response.json()
    
    if result.get("code") != 0:
        raise Exception(f"获取jsapi_ticket失败: {result.get('msg', '未知错误')}")
    
    return result["data"]["ticket"]


async def refresh_user_access_token(refresh_token: str) -> dict:
    """
    刷新用户access_token
    
    Args:
        refresh_token: 刷新令牌
    
    Returns:
        新的token信息
    """
    app_token = await get_app_access_token()
    
    url = "https://open.feishu.cn/open-apis/authen/v1/refresh_access_token"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {app_token}",
                "Content-Type": "application/json"
            },
            json={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token
            }
        )
    
    result = response.json()
    
    if result.get("code") != 0:
        raise Exception(f"刷新token失败: {result.get('msg', '未知错误')}")
    
    return result.get("data", {})
