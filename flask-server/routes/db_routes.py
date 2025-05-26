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
