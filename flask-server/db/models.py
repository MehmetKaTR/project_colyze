import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, BigInteger, text
from sqlalchemy.orm import declarative_base, sessionmaker
from path_config import DB_DIR, ensure_runtime_layout

Base = declarative_base()

class HistTeach(Base):
    __tablename__ = "HistTeach"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    Tool_ID = Column(String)  # Access Long Text → String
    Channel = Column(String)
    Bin_Index = Column(Integer)
    Values = Column(Integer)
    Hist_Tolerance = Column(Integer)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class RGBITeach(Base):
    __tablename__ = "RGBITeach"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    Tool_ID = Column(Integer)
    R_Min = Column(Integer)
    R_Max = Column(Integer)
    G_Min = Column(Integer)
    G_Max = Column(Integer)
    B_Min = Column(Integer)
    B_Max = Column(Integer)
    I_Min = Column(Integer)
    I_Max = Column(Integer)
    R_Tole = Column(Integer)
    G_Tole = Column(Integer)
    B_Tole = Column(Integer)
    I_Tole = Column(Integer)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class EdgePatternTeach(Base):
    __tablename__ = "EdgePatternTeach"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    Tool_ID = Column(Integer)
    Pattern_Hu = Column(String, default="")
    Pattern_Area = Column(Float, default=0)
    Threshold = Column(Float, default=120)
    Score_Tolerance = Column(Float, default=1.0)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class Results(Base):
    __tablename__ = "Results"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    DateTime = Column(DateTime)
    TypeNo = Column(Integer)
    Barcode = Column(BigInteger)
    ToolCount = Column(Integer)
    Result = Column(String)  # Long Text
    ProgNo = Column(Integer)
    MeasType = Column(String)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class ToolsF1(Base):
    __tablename__ = "ToolsF1"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    ToolNo = Column(Integer)
    CornerNo = Column(Integer)
    X = Column(Float)
    Y = Column(Float)
    R_Tole = Column(Float, default=0)
    G_Tole = Column(Float, default=0)
    B_Tole = Column(Float, default=0)
    I_Tole = Column(Float, default=0)
    Hist_Tolerance = Column(Float, default=0.1)
    Edge_Tolerance = Column(Float, default=0.08)
    Edge_Ref_Density = Column(Float, default=0)
    Edge_Pattern_Hu = Column(String, default="")
    Edge_Pattern_Area = Column(Float, default=0)
    Edge_Pattern_Threshold = Column(Float, default=120)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class TypeImages(Base):
    __tablename__ = "TypeImages"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgramNo = Column(Integer)  # Access’te Program No
    RectX = Column(Integer)
    RectY = Column(Integer)
    RectW = Column(Integer)
    RectH = Column(Integer)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class TypesF1(Base):
    __tablename__ = "TypesF1"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    ProgName = Column(String)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
    

class PolySettingsF1(Base):
    __tablename__ = "PolySettingsF1"

    D = Column(Integer, primary_key=True, autoincrement=True)  # AutoNumber
    TypeNo = Column(Integer)
    ProgNo = Column(Integer)
    ToolNo = Column(Integer)
    Gain = Column(Float)
    Exposure = Column(Float)
    R_Min = Column(Float)
    R_Max = Column(Float)
    G_Min = Column(Float)
    G_Max = Column(Float)
    B_Min = Column(Float)
    B_Max = Column(Float)
    I_Min = Column(Float)
    I_Max = Column(Float)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    
ensure_runtime_layout()
db_path = DB_DIR / "colyze.sqlite"
engine = create_engine(f"sqlite:///{db_path}", echo=False)

Session = sessionmaker(bind=engine)


def _ensure_toolsf1_schema():
    required_columns = {
        "R_Tole": "FLOAT DEFAULT 0",
        "G_Tole": "FLOAT DEFAULT 0",
        "B_Tole": "FLOAT DEFAULT 0",
        "I_Tole": "FLOAT DEFAULT 0",
        "Hist_Tolerance": "FLOAT DEFAULT 0.1",
        "Edge_Tolerance": "FLOAT DEFAULT 0.08",
        "Edge_Ref_Density": "FLOAT DEFAULT 0",
        "Edge_Pattern_Hu": "TEXT DEFAULT ''",
        "Edge_Pattern_Area": "FLOAT DEFAULT 0",
        "Edge_Pattern_Threshold": "FLOAT DEFAULT 120",
    }

    try:
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info('ToolsF1')")).fetchall()
            existing = {row[1] for row in rows}
            for col_name, col_def in required_columns.items():
                if col_name in existing:
                    continue
                conn.execute(text(f"ALTER TABLE ToolsF1 ADD COLUMN {col_name} {col_def}"))
    except Exception as e:
        print(f"ToolsF1 schema ensure warning: {e}")


_ensure_toolsf1_schema()


def _ensure_edge_pattern_table():
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS EdgePatternTeach (
                        ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        TypeNo INTEGER,
                        ProgNo INTEGER,
                        Tool_ID INTEGER,
                        Pattern_Hu TEXT DEFAULT '',
                        Pattern_Area FLOAT DEFAULT 0,
                        Threshold FLOAT DEFAULT 120,
                        Score_Tolerance FLOAT DEFAULT 1.0
                    )
                    """
                )
            )
    except Exception as e:
        print(f"EdgePatternTeach table ensure warning: {e}")


_ensure_edge_pattern_table()
