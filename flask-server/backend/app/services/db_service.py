import base64
import pyodbc
import datetime
from pathlib import Path

# Access DB bağlantı parametreleri (isteğe göre dışardan da alabilir)
db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"
conn_str = (
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={db_path};'
)

def get_connection():
    return pyodbc.connect(conn_str)

# TypesF1 ekleme
def insert_type(data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO TypesF1 (
                TypeNo, ProgNo, ProgName, RectX, RectY, RectW, RectH
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data['TypeNo'], data['ProgNo'], data['ProgName'],
            data['RectX'], data['RectY'], data['RectW'], data['RectH']
        ))
        conn.commit()

# TypesF1 listeleme
def get_types():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM TypesF1")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]

# PolySettingsF1 ekleme
def insert_polysettings(data):
    with get_connection() as conn:
        cursor = conn.cursor()
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

# PolySettingsF1 listeleme
def get_polysettings():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM PolySettingsF1")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
def insert_tool(data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ToolsF1 (
            TypeNo, ProgNo, ToolNo, CornerNo, x
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        data['TypeNo'], data['ProgNo'],
        data['ToolNo'], data['CornerNo'], data['x']
    ))
    conn.commit()

def get_tools():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ToolsF1")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
def insert_result(data):
    with get_connection() as conn:
        dt = datetime.strptime(data['DateTime'], "%Y-%m-%d %H:%M:%S")
        cursor = conn.cursor()
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
        
def get_results():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Results")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    

def get_tools_by_typeprog(type_no, prog_no):
    if type_no is None or prog_no is None:
        raise ValueError('Eksik parametre - Get Tools by TypeProg')

    with get_connection() as conn:
        cursor = conn.cursor()
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

        result = [{'id': tool_no, 'points': points, 'status': 'empty'} for tool_no, points in tools.items()]
        return result


def update_polygons(data):
    type_no = data.get('typeNo')
    prog_no = data.get('progNo')
    polygons = data.get('polygons')

    if not type_no or not prog_no or not polygons:
        raise ValueError("Eksik parametre - update_polygons")

    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Eski verileri sil
        cursor.execute("""
            DELETE FROM ToolsF1 WHERE TypeNo = ? AND ProgNo = ?
        """, (type_no, prog_no))

        cursor.execute("""
            DELETE FROM HistTeach WHERE TypeNo = ? AND ProgNo = ?
        """, (type_no, prog_no))

        # 2. Yeni verileri yaz
        for polygon in polygons:
            tool_no = polygon.get('id')
            points = polygon.get('points', [])

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


def delete_polygons(data):
    type_no = data.get('typeNo')
    prog_no = data.get('progNo')
    polygons = data.get('polygons')
    tool_id = data.get('toolId')

    if not all([type_no, prog_no, polygons, tool_id]):
        raise ValueError("Eksik parametre - Delete Polygon")

    with get_connection() as conn:
        cursor = conn.cursor()

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



def insert_or_update_type_rect(data):
    type_no = data.get('typeNo')
    prog_no = data.get('progNo')
    polygons = data.get('polygons')
    rect_x = data.get('RectX')
    rect_y = data.get('RectY')
    rect_w = data.get('RectW')
    rect_h = data.get('RectH')

    if not all([type_no, prog_no, polygons, rect_x, rect_y, rect_w, rect_h]):
        raise ValueError("Eksik parametre - Insert or Update Type Rect")

    with get_connection() as conn:
        cursor = conn.cursor()

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
        else:
            # Yoksa yeni kayıt ekle
            cursor.execute("""
                INSERT INTO TypeImages (TypeNo, ProgramNo, RectX, RectY, RectW, RectH)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (type_no, prog_no, rect_x, rect_y, rect_w, rect_h))

        conn.commit()


def get_type_rects():

    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM TypeImages")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        result = [dict(zip(columns, row)) for row in rows]

        return result


def save_histogram(data):
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    tool_id = data.get("toolId")
    histogram = data.get("histogram")

    if not all([type_no, prog_no, tool_id, histogram]):
        raise ValueError("Eksik parametre - Save Histogram")
    
    with get_connection() as conn:
        cursor = conn.cursor()

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


def get_histograms(type_no, prog_no):
    if type_no is None or prog_no is None:
        raise ValueError("Eksik parametre - Type No or Prog No")
    
    with get_connection() as conn:
        cursor = conn.cursor()
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

        return response


def get_rgbi_teach(type_no, prog_no):
    if not type_no or not prog_no:
        raise ValueError("Eksik parametre - Type No or Prog No")
    
    with get_connection() as conn:
        cursor = conn.cursor()

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
    
        return data
    
def get_results_to_db(data):
        type_no = data.get("type_no")
        prog_no = data.get("prog_no")
        meas_type = data.get("measure_type")
        result = data.get("result")
        barcode = data.get("barcode")

        if not all([type_no, prog_no, meas_type, result, barcode]):
            raise ValueError("Eksik parametre - Get Result To DB")

        with get_connection() as conn:
            cursor = conn.cursor()

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

            return results
        

def save_rgbi(data):
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    measurements = data.get("measurements")  # Liste: [{id, min_r, max_r, ...}]

    if not all([type_no, prog_no, measurements]):
        raise ValueError("Eksik parametre - Save RGBI")
    
    with get_connection() as conn:
        cursor = conn.cursor()

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


def save_results(data):
    type_no = data['TypeNo']
    prog_no = data['ProgNo']
    meas_type = data['MeasType']
    barcode = data['Barcode']
    tool_count = data['ToolCount']
    result = data['Result']
    raw_datetime = data['DateTime']

    if not all([type_no, prog_no, meas_type, barcode, tool_count, result, raw_datetime]):
        raise ValueError("Eksik parametre - Save Results")

    if "_" not in raw_datetime:
        raise ValueError("DateTime formatı '_' içermiyor!")
    
    date_part, time_part = raw_datetime.split('_')  # "2025-07-10", "10-10-29-333"
    time_parts = time_part.split('-')  # ["10", "10", "29", "333"]
    if len(time_parts) != 4:
        raise ValueError("Zaman formatı geçersiz!")

    raw_dt = f"{date_part} {time_parts[0]}:{time_parts[1]}:{time_parts[2]}.{time_parts[3]}000"
    dt_obj = datetime.strptime(raw_dt, "%Y-%m-%d %H:%M:%S.%f")

    formatted_datetime = dt_obj.strftime("%d.%m.%Y %H:%M:%S.%f")[:-1]

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Results ([DateTime], TypeNo, ProgNo, MeasType, Barcode, ToolCount, Result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (formatted_datetime, type_no, prog_no, meas_type, barcode, tool_count, result))

        conn.commit()

def get_frame_results():
    with get_connection() as conn:
        cursor = conn.cursor()

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

        return result
    
def get_result_by_metadata(data):
    # Parametreleri al
        type_no = int(data.get("typeNo"))
        prog_no = int(data.get("progNo"))
        measure_type = data.get("measureType").upper()
        datetime_str = data.get("datetime")  # Örn: "2025-07-10 12-04-16-100"

        # Tarih format kontrolü
        if " " not in datetime_str:
            raise ValueError("Invalid time format")

        date_part, time_part = datetime_str.split(" ")

        try:
            hour, minute, second, millisec = time_part.split("-")
        except Exception as e:
            raise ValueError("Invalid time format - 2")

        microsec = millisec.ljust(6, '0')  # mikrosaniyeyi 6 haneye tamamla

        # Biçimlendirilmiş tarih-zaman stringi
        fixed_time = f"{hour}:{minute}:{second}.{microsec}"
        fixed_datetime_str = f"{date_part} {fixed_time}"

        # Python datetime nesnesine dönüştür
        dt_obj = datetime.strptime(fixed_datetime_str, "%Y-%m-%d %H:%M:%S.%f")
        dt_obj = dt_obj.replace(microsecond=0)  # Access mikro saniye desteklemez

        with get_connection() as conn:
            cursor = conn.cursor()

            # SQL sorgusunu çalıştır: zaman aralığıyla eşleşenleri al
            cursor.execute("""
                SELECT * FROM Results 
                WHERE DateTime >= ? AND DateTime < ?
                AND TypeNo = ? AND ProgNo = ? AND MeasType = ?
            """, (dt_obj, dt_obj + datetime.timedelta(seconds=1), type_no, prog_no, measure_type))

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

                return result_dict
            else:
                return None