import base64
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import traceback
from pathlib import Path
import pyodbc

db_bp = Blueprint('db', __name__)
TEMP_FRAMES_DIR = Path("temp_frames")

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

    result = [{'id': tool_no, 'points': points, 'status' : 'empty'} for tool_no, points in tools.items()]
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


@db_bp.route('/get_histogram_teach')
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


@db_bp.route('/get_results_to_db', methods=['POST'])
def get_results_to_db():
    try:
        data = request.get_json()

        type_no = data.get("type_no")
        prog_no = data.get("prog_no")
        meas_type = data.get("measure_type")
        result = data.get("result")
        barcode = data.get("barcode")

        if not type_no or not prog_no:
            return jsonify({"error": "Eksik parametre"}), 400

        query = """
            SELECT ID, DateTime, TypeNo, ProgNo, MeasType, Barcode, ToolCount, Result
            FROM Results
            WHERE TypeNo = ? AND ProgNo = ?
        """
        params = [type_no, prog_no]

        if meas_type:
            query += " AND MeasType = ?"
            params.append(meas_type)
        if result and result != "ALL":
            query += " AND Result = ?"
            params.append(result)
        if barcode:
            query += " AND Barcode = ?"
            params.append(barcode)

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        columns = [desc[0] for desc in cursor.description]

        results = []
        for row in rows:
            row_dict = {}
            for col, val in zip(columns, row):
                # Eğer val bytes ise, decode et
                if isinstance(val, bytes):
                    try:
                        val = val.decode('utf-8')
                    except UnicodeDecodeError:
                        val = val.hex()  # decode edilemezse hex string olarak döndür
                row_dict[col] = val
            results.append(row_dict)

        return jsonify(results)

    except Exception as e:
        import traceback
        print("🔴 get_results_to_db HATASI:\n", traceback.format_exc())
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
        raw_datetime = data['DateTime']


        # Doğru parçalama
        if "_" not in raw_datetime:
            raise ValueError("DateTime formatı '_' içermiyor!")
        
        date_part, time_part = raw_datetime.split('_')  # "2025-07-10", "10-10-29-333"
        time_parts = time_part.split('-')  # ["10", "10", "29", "333"]

        if len(time_parts) != 4:
            raise ValueError("Zaman formatı geçersiz!")

        # microsecond'u 6 haneli yap
        raw_dt = f"{date_part} {time_parts[0]}:{time_parts[1]}:{time_parts[2]}.{time_parts[3]}000"
        dt_obj = datetime.strptime(raw_dt, "%Y-%m-%d %H:%M:%S.%f")

        # Veritabanı için istenen format
        formatted_datetime = dt_obj.strftime("%d.%m.%Y %H:%M:%S.%f")[:-1]

        # SQL Insert
        cursor.execute("""
            INSERT INTO Results ([DateTime], TypeNo, ProgNo, MeasType, Barcode, ToolCount, Result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (formatted_datetime, type_no, prog_no, meas_type, barcode, tool_count, result))

        conn.commit()
        return jsonify({"message": "Sonuç kaydedildi"}), 200

    except Exception as e:
        print("Save_results_hist HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

    

@db_bp.route("/get_frame_results")
def get_frame_results():
    cursor.execute("SELECT * FROM Results ORDER BY DateTime ASC")
    rows = cursor.fetchall()
    columns = [col[0] for col in cursor.description]

    result = []
    for row in rows:
        row_dict = dict(zip(columns, row))

        # DateTime datetime objesi ise stringe çevir
        if isinstance(row_dict.get("DateTime"), datetime):
            row_dict["DateTime"] = row_dict["DateTime"].strftime("%-d.%m.%Y %H:%M:%S.%f")[:-3]

        # Burada tüm bytes tipindeki değerleri stringe çevir
        for key, value in row_dict.items():
            if isinstance(value, bytes):
                try:
                    row_dict[key] = value.decode("utf-8")  # ya da uygun encoding
                except Exception:
                    row_dict[key] = str(value)  # decode olmazsa fallback

        result.append(row_dict)

    conn.commit()
    print(result)
    return jsonify(result)

@db_bp.route("/get_result_by_metadata", methods=["GET"])
def get_result_by_metadata():
    try:
        # Parametreleri al
        type_no = int(request.args.get("typeNo"))
        prog_no = int(request.args.get("progNo"))
        measure_type = request.args.get("measureType").upper()
        datetime_str = request.args.get("datetime")  # Örn: "2025-07-10 12-04-16-100"

        # Tarih format kontrolü
        if " " not in datetime_str:
            return jsonify({"error": "Invalid datetime format"}), 400

        date_part, time_part = datetime_str.split(" ")

        try:
            hour, minute, second, millisec = time_part.split("-")
        except Exception as e:
            return jsonify({"error": f"Invalid time format: {str(e)}"}), 400

        microsec = millisec.ljust(6, '0')  # mikrosaniyeyi 6 haneye tamamla

        # Biçimlendirilmiş tarih-zaman stringi
        fixed_time = f"{hour}:{minute}:{second}.{microsec}"
        fixed_datetime_str = f"{date_part} {fixed_time}"

        # Python datetime nesnesine dönüştür
        dt_obj = datetime.strptime(fixed_datetime_str, "%Y-%m-%d %H:%M:%S.%f")
        dt_obj = dt_obj.replace(microsecond=0)  # Access mikro saniye desteklemez

        # SQL sorgusunu çalıştır: zaman aralığıyla eşleşenleri al
        cursor.execute("""
            SELECT * FROM Results 
            WHERE DateTime >= ? AND DateTime < ?
              AND TypeNo = ? AND ProgNo = ? AND MeasType = ?
        """, (dt_obj, dt_obj + timedelta(seconds=1), type_no, prog_no, measure_type))

        row = cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cursor.description]
            result_dict = {}

            # bytes tipindeki verileri JSON için uygun hale getir
            for key, value in zip(columns, row):
                if isinstance(value, bytes):
                    result_dict[key] = base64.b64encode(value).decode('utf-8')
                else:
                    result_dict[key] = value

            return jsonify(result_dict)
        else:
            return jsonify(None)

    except Exception as e:
        print("[get_result_by_metadata] Hata:", str(e))
        return jsonify({"error": str(e)}), 

