from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, HistTeach, RGBITeach, Results, ToolsF1, TypeImages, TypesF1

# 1) Veritabanı bağlantısı (db klasörü içindeki mydb.sqlite dosyasına)
engine = create_engine("sqlite:///colyze.sqlite", echo=True)

# 2) Tabloları oluştur
Base.metadata.create_all(engine)

""""
# 3) Session
Session = sessionmaker(bind=engine)
session = Session()

# 4) Örnek kayıt ekleme
new_tool = ToolsF1(TypeNo=1, ProgNo=1, ToolNo=5, CornerNo=2, X=10.5, Y=20.3)
session.add(new_tool)
session.commit()

# 5) Veri çekme
tools = session.query(ToolsF1).all()
for t in tools:
    print(t.ID, t.TypeNo, t.ProgNo, t.ToolNo, t.CornerNo, t.X, t.Y)
"""