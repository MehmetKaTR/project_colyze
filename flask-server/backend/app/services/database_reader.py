import pyodbc

ACCESS_DB_PATH = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"

def get_crop_info_from_access(type_no, prog_no):
    if type_no is None or prog_no is None:
        return None

    try:
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            fr'DBQ={ACCESS_DB_PATH};'
        )
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RectX, RectY, RectW, RectH 
            FROM TypeImages 
            WHERE TypeNo = ? AND ProgramNo = ?
            ORDER BY ID DESC
        """, (type_no, prog_no))
        result = cursor.fetchone()
        conn.close()
        return result
    except Exception as e:
        print("Access DB Hatası:", e)
        return None
