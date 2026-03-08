import sqlite3

conn = sqlite3.connect('equipment.db')
cursor = conn.cursor()

print("=== 用户表 ===")
cursor.execute("SELECT id, name, feishu_open_id FROM users")
for row in cursor.fetchall():
    print(row)

print("\n=== 数据概览 ===")
cursor.execute("SELECT COUNT(*) FROM categories")
print(f"分类数: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM equipment_models")
print(f"型号数: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM equipments")
print(f"设备数: {cursor.fetchone()[0]}")

print("\n=== 最近操作日志 ===")
cursor.execute("SELECT id, action_type, created_at FROM operation_logs ORDER BY id DESC LIMIT 5")
for row in cursor.fetchall():
    print(row)

conn.close()
