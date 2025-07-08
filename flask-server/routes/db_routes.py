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


@db_bp.route('/tools_by_typeprog', methods=['GET'])
def get_tools_by_typeprog():
    type_no = request.args.get('typeNo', type=int)
    prog_no = request.args.get('progNo', type=int)

    if type_no is None or prog_no is None:
        return jsonify({'error': 'Eksik parametre'}), 400

    cursor.execute("""
        SELECT ToolNo, CornerNo, X, Y 
        FROM ToolsF1 
        WHERE TypeNo = ? AND ProgNo = ?
        ORDER BY ToolNo, CornerNo
    """, (type_no, prog_no))

    rows = cursor.fetchall()
    tools = {}

    for tool_no, corner_no, x, y in rows:
        if tool_no not in tools:
            tools[tool_no] = []
        tools[tool_no].append({'x': x, 'y': y})

    result = [{'id': tool_no, 'points': points} for tool_no, points in tools.items()]
    return jsonify(result)

@db_bp.route('/update-polygons', methods=['POST'])
def update_polygons():
    data = request.get_json()
    type_no = data['typeNo']
    prog_no = data['progNo']
    polygons = data['polygons']

    # 🔥 1. Eski verileri tamamen sil
    cursor.execute("""
        DELETE FROM ToolsF1 WHERE TypeNo = ? AND ProgNo = ?
    """, (type_no, prog_no))

    cursor.execute("""
        DELETE FROM HistTeach WHERE TypeNo = ? AND ProgNo = ?
    """, (type_no, prog_no))

    # 🔄 2. Gelen güncel polygon listesini yaz
    for polygon in polygons:
        tool_no = polygon['id']
        points = polygon['points']

        for idx, point in enumerate(points):
            cursor.execute("""
                INSERT INTO ToolsF1 (TypeNo, ProgNo, ToolNo, CornerNo, X, Y)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                type_no,
                prog_no,
                tool_no,
                idx + 1,
                point['x'],
                point['y']
            ))

    conn.commit()
    return jsonify({"message": "Polygons updated"})


@db_bp.route('/delete-polygon', methods=['POST'])
def delete_polygon():
    try:
        data = request.get_json()
        type_no = data['typeNo']
        prog_no = data['progNo']
        tool_id = data['toolId']  # frontend'den gelen polygon id'si

        # ToolsF1 tablosundan sil
        cursor.execute("""
            DELETE FROM ToolsF1
            WHERE TypeNo = ? AND ProgNo = ? AND ToolNo = ?
        """, (type_no, prog_no, tool_id))

        # HistTeach tablosundan sil
        cursor.execute("""
            DELETE FROM HistTeach
            WHERE TypeNo = ? AND ProgNo = ? AND Tool_ID = ?
        """, (type_no, prog_no, tool_id))

        conn.commit()
        return jsonify({"message": f"Polygon {tool_id} veritabanından silindi."})

    except Exception as e:
        import traceback
        print("🔴 DELETE POLYGON HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


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


# =================== HistTeach =====================
@db_bp.route('/save_histogram', methods=['POST'])
def save_histogram():
    try:
        data = request.get_json()

        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        tool_id = data.get("toolId")
        histogram = data.get("histogram")  # {'r': [...], 'g': [...], 'b': [...]}

        if not all([type_no, prog_no, tool_id, histogram]):
            return jsonify({"error": "Eksik veri"}), 400


        # Önce var mı diye bak, varsa sil
        cursor.execute("""
            DELETE FROM HistTeach
            WHERE TypeNo=? AND ProgNo=? AND Tool_ID=?
        """, (type_no, prog_no, tool_id))

        # Sonra yeniden ekle
        for channel in ['r', 'g', 'b']:
            for i, val in enumerate(histogram[channel]):
                cursor.execute("""
                    INSERT INTO HistTeach (TypeNo, ProgNo, Tool_ID, Channel, Bin_Index, [Values])
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (type_no, prog_no, tool_id, channel.upper(), i, float(val)))

        conn.commit()
        return jsonify({"status": "OK", "message": "Teach histogram güncellendi"})
    
    except Exception as e:
        import traceback
        print("🔴 Histogram kayıt hatası:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@db_bp.route('/get_histograms')
def get_histograms():
    try:
        type_no = request.args.get("typeNo")
        prog_no = request.args.get("progNo")

        if not type_no or not prog_no:
            return jsonify({"error": "Eksik parametre"}), 400

        cursor.execute("""
            SELECT Tool_ID, Channel, Bin_Index, [Values] 
            FROM HistTeach
            WHERE TypeNo=? AND ProgNo=?
            ORDER BY Tool_ID, Channel, Bin_Index
        """, (type_no, prog_no))

        data = {}
        for tool_id, channel, bin_index, value in cursor.fetchall():
            key = str(tool_id)
            if key not in data:
                data[key] = {"r": [0]*256, "g": [0]*256, "b": [0]*256}
            ch = channel.lower()
            data[key][ch][int(bin_index)] = float(value)

        response = []
        for tool_id, hist in data.items():
            response.append({
                "toolId": tool_id,
                "histogram": hist
            })

        return jsonify(response)

    except Exception as e:
        import traceback
        print("🔴 get_histograms HATASI:\n", traceback.format_exc())
        return jsonify({ "error": str(e) }), 500


@db_bp.route('/get_rgbi_teach')
def get_rgbi_teach():
    try:
        type_no = request.args.get("typeNo")
        prog_no = request.args.get("progNo")

        if not type_no or not prog_no:
            return jsonify({"error": "Eksik parametre"}), 400

        cursor.execute("""
            SELECT Tool_ID, R_Min, R_Max, G_Min, G_Max, B_Min, B_Max, I_Min, I_Max
            FROM RGBITeach
            WHERE TypeNo=? AND ProgNo=?
            ORDER BY Tool_ID
        """, (type_no, prog_no))

        data = []
        for row in cursor.fetchall():
            data.append({
                "toolId": str(row.Tool_ID),
                "rMin": row.R_Min,
                "rMax": row.R_Max,
                "gMin": row.G_Min,
                "gMax": row.G_Max,
                "bMin": row.B_Min,
                "bMax": row.B_Max,
                "iMin": row.I_Min,
                "iMax": row.I_Max,
            })

        return jsonify(data)

    except Exception as e:
        import traceback
        print("🔴 get_rgbi_teach HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@db_bp.route('/save_rgbi', methods=['POST'])
def save_rgbi():
    try:
        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        measurements = data.get("measurements")  # Liste: [{id, min_r, max_r, ...}]

        if not all([type_no, prog_no, measurements]):
            return jsonify({"error": "Eksik veri"}), 400

        for m in measurements:
            tool_id = m["id"]
            r_min = float(m["min_r"])
            r_max = float(m["max_r"])
            g_min = float(m["min_g"])
            g_max = float(m["max_g"])
            b_min = float(m["min_b"])
            b_max = float(m["max_b"])
            i_min = float(m["min_i"])
            i_max = float(m["max_i"])

            # Eski veriyi sil
            cursor.execute("""
                DELETE FROM RGBITeach
                WHERE TypeNo=? AND ProgNo=? AND Tool_ID=?
            """, (type_no, prog_no, tool_id))

            # Yeni veriyi ekle
            cursor.execute("""
                INSERT INTO RGBITeach (TypeNo, ProgNo, Tool_ID,
                                       R_Min, R_Max,
                                       G_Min, G_Max,
                                       B_Min, B_Max,
                                       I_Min, I_Max)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                type_no, prog_no, tool_id,
                r_min, r_max,
                g_min, g_max,
                b_min, b_max,
                i_min, i_max
            ))

        conn.commit()
        return jsonify({"status": "OK", "message": "RGBI değerleri kaydedildi"})

    except Exception as e:
        import traceback
        print("🔴 RGBI kayıt hatası:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500



# =================== SaveResults =====================
@db_bp.route('/save_results', methods=['POST'])
def save_results():
    try:
        data = request.json
        type_no = data['TypeNo']
        prog_no = data['ProgNo']
        meas_type = data['MeasType']
        barcode = data['Barcode']
        tool_count = data['ToolCount']
        result = data['Result']

        now = datetime.now().strftime('%d.%m.%Y %H:%M:%S.%f')[:-3]  # Access için mikro saniyeyi 3 haneye indir
        cursor.execute("""
            INSERT INTO Results ([DateTime], [TypeNo], [ProgNo], [MeasType], [Barcode], [ToolCount], [Result])
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (now, type_no, prog_no, meas_type, barcode, tool_count, result))

        conn.commit()
        return jsonify({"message": "Sonuç kaydedildi"}), 200

    except Exception as e:
        import traceback
        print("Save_results_hist HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
