from flask import Blueprint, request, jsonify
from datetime import datetime
import pyodbc

db_bp = Blueprint('db', __name__)

# Access veritabanı bağlantısı
db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"  # ← Burayı kendine göre düzelt
conn_str = (
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={db_path};'
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# =================== TypesF1 =====================
@db_bp.route('/types', methods=['POST'])
def insert_type():
    data = request.json
    cursor.execute("""
        INSERT INTO TypesF1 (
            TypeNo, ProgNo, ProgName, RectX, RectY, RectW, RectH
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data['TypeNo'], data['ProgNo'], data['ProgName'],
        data['RectX'], data['RectY'], data['RectW'], data['RectH']
    ))
    conn.commit()
    return jsonify({'message': 'TypesF1 eklendi'})


@db_bp.route('/types', methods=['GET'])
def get_types():
    cursor.execute("SELECT * FROM TypesF1")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    return jsonify(result)


# =================== PolySettingsF1 =====================
@db_bp.route('/polysettings', methods=['POST'])
def insert_polysettings():
    data = request.json
    cursor.execute("""
        INSERT INTO PolySettingsF1 (
            TypeNo, ProgNo, ToolNo, Gain, Exposure,
            [R Mın], [R Max], [G Min], [G Max],
            [B Min], [B Max], [I Min], [I Max]
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data['TypeNo'], data['ProgNo'], data['ToolNo'],
        data['Gain'], data['Exposure'],
        data['RMin'], data['RMax'], data['GMin'], data['GMax'],
        data['BMin'], data['BMax'], data['IMin'], data['IMax']
    ))
    conn.commit()
    return jsonify({'message': 'PolySettingsF1 eklendi'})


@db_bp.route('/polysettings', methods=['GET'])
def get_polysettings():
    cursor.execute("SELECT * FROM PolySettingsF1")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    return jsonify(result)


# =================== ToolsF1 =====================
@db_bp.route('/tools', methods=['POST'])
def insert_tool():
    data = request.json
    cursor.execute("""
        INSERT INTO ToolsF1 (
            TypeNo, ProgNo, ToolNo, CornerNo, x
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        data['TypeNo'], data['ProgNo'],
        data['ToolNo'], data['CornerNo'], data['x']
    ))
    conn.commit()
    return jsonify({'message': 'ToolsF1 eklendi'})


@db_bp.route('/tools', methods=['GET'])
def get_tools():
    cursor.execute("SELECT * FROM ToolsF1")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    return jsonify(result)


@db_bp.route('/results', methods=['POST'])
def insert_result():
    data = request.json
    dt = datetime.strptime(data['DateTime'], "%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO Results (
            [DateTime], [TypeNo], [ProgNo], [ToolNo], [R], [G], [B], [I], [OK_NOK]
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dt, data['TypeNo'],
        data['ProgNo'], data['ToolNo'], 
        data['R'], data['G'], data['B'], data['I'], 
        data['OK_NOK']
    ))
    conn.commit()
    return jsonify({'message': 'Results eklendi'})


@db_bp.route('/results', methods=['GET'])
def get_results():
    cursor.execute("SELECT * FROM Results")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    return jsonify(result)


# =================== TypeImages =====================
@db_bp.route('/type-rect', methods=['POST'])
def insert_or_update_type_rect():
    data = request.json
    type_no = data['TypeNo']
    prog_no = data['ProgramNo']
    rect_x = data['RectX']
    rect_y = data['RectY']
    rect_w = data['RectW']
    rect_h = data['RectH']

    # Önce var mı kontrol et
    cursor.execute("""
        SELECT COUNT(*) FROM TypeImages WHERE TypeNo = ? AND ProgramNo = ?
    """, (type_no, prog_no))
    exists = cursor.fetchone()[0]

    if exists:
        # Kayıt varsa güncelle
        cursor.execute("""
            UPDATE TypeImages
            SET RectX = ?, RectY = ?, RectW = ?, RectH = ?
            WHERE TypeNo = ? AND ProgramNo = ?
        """, (rect_x, rect_y, rect_w, rect_h, type_no, prog_no))
        message = 'Crop koordinatları güncellendi'
    else:
        # Yoksa yeni kayıt ekle
        cursor.execute("""
            INSERT INTO TypeImages (TypeNo, ProgramNo, RectX, RectY, RectW, RectH)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (type_no, prog_no, rect_x, rect_y, rect_w, rect_h))
        message = 'Crop koordinatları kaydedildi'

    conn.commit()
    return jsonify({'message': message})



@db_bp.route('/type-rect', methods=['GET'])
def get_type_rects():
    cursor.execute("SELECT * FROM TypeImages")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    return jsonify(result)
