import pyodbc

# Access veritabanı yolu
db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"
conn_str = (
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={db_path};'
)

# Bağlantıyı kur
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Veriler: typeNo=2, progNo=1 için 5 farklı tool (her biri 4 cornerlı dikdörtgen)
tools_data = [
    # Tool 1
    {'tool': 1, 'corners': [(100, 100), (200, 100), (200, 200), (100, 200)]},
    # Tool 2
    {'tool': 2, 'corners': [(300, 150), (400, 150), (400, 250), (300, 250)]},
    # Tool 3
    {'tool': 3, 'corners': [(500, 50), (600, 50), (600, 120), (500, 120)]},
    # Tool 4
    {'tool': 4, 'corners': [(700, 300), (800, 300), (800, 400), (700, 400)]},
    # Tool 5
    {'tool': 5, 'corners': [(900, 100), (1000, 100), (1000, 180), (900, 180)]},
]

type_no = 1
prog_no = 2

# Ekleme işlemi
for tool in tools_data:
    tool_no = tool['tool']
    for i, (x, y) in enumerate(tool['corners'], start=1):
        cursor.execute("""
            INSERT INTO ToolsF1 (TypeNo, ProgNo, ToolNo, CornerNo, X, Y)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (type_no, prog_no, tool_no, i, x, y))

conn.commit()
conn.close()

print("Veriler başarıyla eklendi.")
