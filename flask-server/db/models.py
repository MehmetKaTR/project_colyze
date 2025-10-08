import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, BigInteger
from sqlalchemy.orm import declarative_base, sessionmaker

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

    
db_path = os.path.join(os.path.dirname(__file__), "colyze.sqlite")
engine = create_engine(f"sqlite:///{db_path}", echo=True)

Session = sessionmaker(bind=engine)