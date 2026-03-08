"""
数据库模型定义 - 飞书器材管理系统 (SQLAlchemy 1.4 异步版本)
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, Text, ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import StaticPool
from config import DATABASE_URL
import aiosqlite

# 确保使用异步驱动
_db_url = DATABASE_URL
if _db_url.startswith("sqlite://") and not _db_url.startswith("sqlite+aiosqlite://"):
    _db_url = _db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

# 创建异步引擎 (SQLite)
async_engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False}
)

# 创建异步会话工厂
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


class Category(Base):
    """器材分类表"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, comment="分类名称")
    sort_order = Column(Integer, default=0, comment="排序序号")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间(UTC)")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间(UTC)")
    
    # 关联关系
    models = relationship("EquipmentModel", back_populates="category", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name})>"


class EquipmentModel(Base):
    """器材型号表"""
    __tablename__ = "equipment_models"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False, comment="型号名称")
    description = Column(Text, nullable=True, comment="型号描述")
    total_count = Column(Integer, default=0, comment="总数量")
    available_count = Column(Integer, default=0, comment="可用数量")
    sort_order = Column(Integer, default=0, comment="排序序号")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间(UTC)")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间(UTC)")
    
    # 关联关系
    category = relationship("Category", back_populates="models")
    equipments = relationship("Equipment", back_populates="model", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<EquipmentModel(id={self.id}, name={self.name})>"


class Equipment(Base):
    """器材实例表"""
    __tablename__ = "equipments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_id = Column(Integer, ForeignKey("equipment_models.id", ondelete="CASCADE"), nullable=False)
    serial_number = Column(String(200), nullable=True, comment="序列号")
    qr_code = Column(String(500), unique=True, nullable=True, comment="条形码内容")
    status = Column(Integer, default=0, comment="状态:0=在库,1=借出")
    current_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sort_order = Column(Integer, default=0, comment="排序序号")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间(UTC)")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间(UTC)")
    
    # 关联关系
    model = relationship("EquipmentModel", back_populates="equipments")
    current_user = relationship("User", back_populates="borrowed_equipments")
    operation_logs = relationship("OperationLog", back_populates="equipment")
    
    def __repr__(self):
        return f"<Equipment(id={self.id}, serial_number={self.serial_number}, status={self.status})>"


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    feishu_open_id = Column(String(200), unique=True, nullable=False, comment="飞书用户OpenID")
    feishu_user_id = Column(String(200), unique=True, nullable=True, comment="飞书用户UserID")
    name = Column(String(100), nullable=True, comment="用户姓名")
    avatar_url = Column(String(500), nullable=True, comment="头像URL")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间(UTC)")
    
    # 关联关系
    borrowed_equipments = relationship("Equipment", back_populates="current_user")
    operation_logs = relationship("OperationLog", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, name={self.name}, feishu_open_id={self.feishu_open_id})>"


class OperationLog(Base):
    """操作日志表"""
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(Integer, ForeignKey("equipments.id", ondelete="SET NULL"), nullable=True)
    feishu_open_id = Column(String(200), ForeignKey("users.feishu_open_id"), nullable=False)
    action_type = Column(String(50), nullable=False, comment="操作类型:CHECKOUT/CHECKIN/CREATE/UPDATE/DELETE")
    purpose = Column(Text, nullable=True, comment="出库用途")
    expected_return_at = Column(DateTime, nullable=True, comment="预计归还时间")
    actual_return_at = Column(DateTime, nullable=True, comment="实际归还时间")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间(UTC)")
    
    # 关联关系
    equipment = relationship("Equipment", back_populates="operation_logs")
    user = relationship("User", back_populates="operation_logs", foreign_keys="OperationLog.feishu_open_id")
    
    def __repr__(self):
        return f"<OperationLog(id={self.id}, action_type={self.action_type}, equipment_id={self.equipment_id})"


async def init_db():
    """初始化数据库，创建所有表"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库初始化完成")


async def get_db():
    """获取数据库会话的依赖函数"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
