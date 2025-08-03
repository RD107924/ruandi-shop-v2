# setup_db.py
import sqlite3
import hashlib

DATABASE_FILE = 'database.db'
print("正在建立或更新資料庫 'database.db'...")
conn = sqlite3.connect(DATABASE_FILE)
cursor = conn.cursor()

# 【MODIFIED】 修改 products 資料表 (維持不變)
print("-> 正在建立 'products' 資料表...")
cursor.execute('''
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    base_price INTEGER NOT NULL,
    service_fee INTEGER NOT NULL
);
''')
print("   'products' 資料表... 成功")

# 【MODIFIED】 修改 orders 資料表，加入 warehouse 欄位
print("-> 正在建立 'orders' 資料表...")
cursor.execute('''
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paopaohu_id TEXT NOT NULL,
    payment_code TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    items_json TEXT NOT NULL,
    warehouse TEXT NOT NULL DEFAULT '深圳倉', -- 【NEW】新增倉庫欄位，預設為深圳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
''')
# 檢查 warehouse 欄位是否存在，如果不存在則新增
try:
    cursor.execute("SELECT warehouse FROM orders LIMIT 1")
    print("   'warehouse' 欄位已存在。")
except sqlite3.OperationalError:
    print("   'warehouse' 欄位不存在，正在新增...")
    cursor.execute("ALTER TABLE orders ADD COLUMN warehouse TEXT NOT NULL DEFAULT '深圳倉'")
    print("   'warehouse' 欄位新增成功。")

print("   'orders' 資料表... 成功")


# 【NEW】 新增 users 資料表用於管理員登入
print("-> 正在建立 'users' 資料表...")
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
''')
print("   'users' 資料表... 成功")


# 【NEW】 新增預設管理員帳號 (如果不存在)
# 密碼是 randy1007
# 為了安全，我們儲存密碼的哈希值，而不是明文
default_user = 'admin'
default_pass = 'randy1007'
# 使用 SHA-256 進行哈希
password_hash = hashlib.sha256(default_pass.encode('utf-8')).hexdigest()

cursor.execute("SELECT * FROM users WHERE username = ?", (default_user,))
if cursor.fetchone() is None:
    print(f"-> 正在新增預設管理員帳號 '{default_user}'...")
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (default_user, password_hash))
    print(f"   預設管理員 '{default_user}' 新增成功！")
else:
    print(f"-> 預設管理員帳號 '{default_user}' 已存在。")


conn.commit()
conn.close()
print("\n資料庫初始化與更新完成！")