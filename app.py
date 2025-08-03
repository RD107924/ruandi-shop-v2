# app.py
import sqlite3
import json
import os
import uuid
import hashlib
import requests # 【NEW】 用於發送網路請求
from bs4 import BeautifulSoup # 【NEW】 用於解析 HTML
from flask import Flask, jsonify, request, g, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from urllib.parse import urlparse # 【NEW】 用於解析 URL

# --- 設定 ---
DATABASE = '/data/database.db'
UPLOAD_FOLDER = '/data'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
# 【NEW】 人民幣對台幣的匯率（這是一個範例，真實上線應定期更新）
CNY_TO_TWD_RATE = 4.5 

app = Flask(__name__)
CORS(app) 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- 資料庫連線設定 (維持不變) ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row 
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# --- 輔助函式 (維持不變) ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- 【NEW】 管理員登入與驗證 ---
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'status': 'error', 'message': '缺少帳號或密碼'}), 400

    db = get_db()
    cursor = db.execute('SELECT password_hash FROM users WHERE username = ?', [username])
    user = cursor.fetchone()
    
    # 將傳入的密碼用同樣方式哈希
    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

    if user and user['password_hash'] == password_hash:
        # 登入成功，回傳一個簡單的 token (真實應用建議使用 JWT)
        # 這裡為了簡單起見，我們直接回傳成功訊息
        return jsonify({'status': 'success', 'message': '登入成功', 'token': 'fake-admin-token-for-auth'})
    else:
        return jsonify({'status': 'error', 'message': '帳號或密碼錯誤'}), 401

# --- 【NEW】 1688 商品連結代購功能 ---
@app.route('/api/scrape_1688', methods=['POST'])
def scrape_1688():
    url = request.json.get('url')
    if not url or '1688.com' not in url:
        return jsonify({'error': '無效的 1688 商品連結'}), 400

    # 【重要】以下為模擬爬蟲，實際情況複雜得多
    # 1688 有嚴格的反爬蟲，直接請求很可能失敗。
    # 真實世界需要: 1. 帶有 Cookie 的 Header 2. 使用代理 IP 3. 處理 JavaScript 動態渲染
    # 這裡我們返回一個模擬的成功資料結構，讓前端可以繼續開發。
    try:
        # 簡易從 URL 提取商品 ID
        path = urlparse(url).path
        product_id = path.split('/')[-1].replace('.html', '')

        # 模擬擷取到的資料
        scraped_data = {
            'id': f'1688-{product_id}',
            'name': '【模擬】1688 爆款藍牙耳機',
            'imageUrl': 'https://cbu01.alicdn.com/img/ibank/O1CN01x4Y2zC25T41G0i2X4_!!2209351044453-0-cib.jpg', # 範例圖片
            'price_rmb': 50.0, # 假設爬到的價格是 50 人民幣
            'min_quantity': 2, # 假設起批量為 2
            'specs': [ # 模擬的商品規格
                {'type': '顏色', 'options': ['太空黑', '珍珠白', '天空藍']},
                {'type': '套餐', 'options': ['官方標配', '豪華升級版']}
            ]
        }
        
        # 價格轉換
        price_twd = round(scraped_data['price_rmb'] * CNY_TO_TWD_RATE)
        
        return jsonify({
            'status': 'success',
            'product': {
                'id': scraped_data['id'],
                'name': scraped_data['name'],
                'imageUrl': scraped_data['imageUrl'],
                'price': price_twd, # 回傳轉換後的台幣價格
                'min_quantity': scraped_data['min_quantity'],
                'specs': scraped_data['specs'],
                'original_url': url # 將原始連結也一併回傳
            }
        })

    except Exception as e:
        # 如果模擬失敗，返回錯誤
        return jsonify({'error': f'擷取商品資訊失敗: {str(e)}'}), 500


# --- 圖片上傳 API (維持不變) ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    # ... (此函數維持不變)
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename_ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{filename_ext}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(save_path)
        image_url = f'/uploads/{unique_filename}'
        return jsonify({'imageUrl': image_url})
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# == 商品相關 API ==
# 【MODIFIED】 商品相關的管理 API 現在需要驗證
def check_admin_auth():
    # 簡易的驗證，檢查 header 是否有特定 token
    # 真實世界應使用更安全的機制
    auth_header = request.headers.get('Authorization')
    return auth_header == 'Bearer fake-admin-token-for-auth'

@app.route('/api/products', methods=['GET'])
def get_products():
    cursor = get_db().execute('SELECT * FROM products ORDER BY id DESC')
    products = [dict(row) for row in cursor.fetchall()]
    return jsonify(products)

@app.route('/api/products', methods=['POST'])
def add_product():
    if not check_admin_auth():
        return jsonify({'message': '權限不足'}), 403
    # ... (原有邏輯不變)
    new_product = request.json
    db = get_db()
    db.execute(
        'INSERT INTO products (name, image_url, base_price, service_fee) VALUES (?, ?, ?, ?)',
        [new_product['name'], new_product['imageUrl'], new_product['basePrice'], new_product['serviceFee']]
    )
    db.commit()
    return jsonify({'status': 'success', 'message': '商品新增成功'}), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    if not check_admin_auth():
        return jsonify({'message': '權限不足'}), 403
    # ... (原有邏輯不變)
    product_data = request.json
    db = get_db()
    db.execute(
        'UPDATE products SET name = ?, image_url = ?, base_price = ?, service_fee = ? WHERE id = ?',
        [product_data['name'], product_data['imageUrl'], product_data['basePrice'], product_data['serviceFee'], product_id]
    )
    db.commit()
    return jsonify({'status': 'success', 'message': '商品更新成功'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    if not check_admin_auth():
        return jsonify({'message': '權限不足'}), 403
    # ... (原有邏輯不變)
    db = get_db()
    db.execute('DELETE FROM products WHERE id = ?', [product_id])
    db.commit()
    return jsonify({'status': 'success', 'message': '商品刪除成功'})

# == 訂單相關 API ==
@app.route('/api/orders', methods=['GET'])
def get_orders():
    # 這個 API 也應該被保護
    if not check_admin_auth():
        return jsonify({'message': '權限不足'}), 403
    cursor = get_db().execute('SELECT * FROM orders ORDER BY created_at DESC')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/orders/<string:paopaohu_id>', methods=['GET'])
def get_orders_by_customer(paopaohu_id):
    # 這個是給客戶查單的，不需要權限驗證
    cursor = get_db().execute(
        'SELECT * FROM orders WHERE paopaohu_id = ? ORDER BY created_at DESC', 
        [paopaohu_id]
    )
    orders = [dict(row) for row in cursor.fetchall()]
    return jsonify(orders)

@app.route('/api/orders', methods=['POST'])
def add_order():
    # 【MODIFIED】 新增訂單時，要接收 warehouse 資訊
    order_data = request.json
    try:
        db = get_db()
        db.execute(
            # 新增 warehouse 欄位
            'INSERT INTO orders (paopaohu_id, payment_code, total_amount, items_json, warehouse) VALUES (?, ?, ?, ?, ?)',
            [
                order_data['paopaohuId'],
                order_data['paymentCode'],
                order_data['totalAmount'],
                json.dumps(order_data['items']),
                order_data['warehouse'] # 【NEW】 接收倉庫資訊
            ]
        )
        db.commit()
        return jsonify({'status': 'success'}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

# ... (系統管理 API 與啟動伺服器部分維持不變) ...
@app.route('/api/setup_database_on_render')
def setup_database_on_render():
    return "此功能已整合至 setup_db.py，請直接執行該檔案來初始化資料庫。"

if __name__ == '__main__':
    app.run(debug=True, port=5000)