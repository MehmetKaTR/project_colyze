from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import base64
import json
from db.models import Session, TypesF1, PolySettingsF1, ToolsF1, Results, HistTeach, TypeImages, RGBITeach, EdgePatternTeach
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, BigInteger
from sqlalchemy.orm import declarative_base, sessionmaker

db_bp = Blueprint('db', __name__)

# Session helper
def get_session():
    return Session()

# =================== TypesF1 =====================
@db_bp.route('/types', methods=['POST'])
def insert_type():
    data = request.json
    session = get_session()
    new_type = TypesF1(
        TypeNo=data['TypeNo'],
        ProgNo=data['ProgNo'],
        ProgName=data['ProgName'],
    )
    session.add(new_type)
    session.commit()
    return jsonify({'message': 'TypesF1 eklendi'})


@db_bp.route('/types', methods=['GET'])
def get_types():
    session = get_session()
    types = session.query(TypesF1).all()
    result = [t.as_dict() for t in types]
    return jsonify(result)


@db_bp.route('/types', methods=['PUT'])
def update_type():
    data = request.json
    type_no = data.get('TypeNo')
    prog_no = data.get('ProgNo')
    new_prog_name = data.get('ProgName')

    if type_no is None or prog_no is None or new_prog_name is None:
        return jsonify({'error': 'TypeNo, ProgNo ve ProgName gerekli!'}), 400

    session = get_session()
    # Önce kaydı bul
    type_record = session.query(TypesF1).filter_by(TypeNo=type_no, ProgNo=prog_no).first()
    
    if not type_record:
        return jsonify({'error': 'Kayıt bulunamadı!'}), 404

    # ProgName güncelle
    type_record.ProgName = new_prog_name
    session.commit()

    return jsonify({'message': 'ProgName başarıyla güncellendi', 'updated_record': type_record.as_dict()})


@db_bp.route('/types', methods=['POST'])
def add_type():
    data = request.json
    type_no = data.get('TypeNo')
    prog_name = data.get('ProgName')

    if type_no is None or prog_name is None:
        return jsonify({'error': 'TypeNo ve ProgName gerekli!'}), 400

    session = get_session()
    # En büyük prog_no'yu bul
    max_prog = session.query(TypesF1).filter_by(TypeNo=type_no).order_by(TypesF1.ProgNo.desc()).first()
    new_prog_no = (max_prog.ProgNo + 1) if max_prog else 1

    new_type = TypesF1(
        TypeNo=type_no,
        ProgNo=new_prog_no,
        ProgName=prog_name
    )
    session.add(new_type)
    session.commit()

    return jsonify({'message': 'Program başarıyla eklendi', 'new_record': new_type.as_dict()})


@db_bp.route('/types', methods=['DELETE'])
def delete_type():
    data = request.json
    type_no = data.get('TypeNo')
    prog_no = data.get('ProgNo')

    session = get_session()

    try:
        if type_no is None:
            return jsonify({'error': 'TypeNo gerekli!'}), 400

        # Eğer sadece type_no verilmişse → o type’a ait tüm kayıtları sil
        if prog_no is None:
            deleted_rows = session.query(TypesF1).filter_by(TypeNo=type_no).delete()
            session.commit()

            if deleted_rows == 0:
                return jsonify({'error': f'Type {type_no} bulunamadı!'}), 404

            return jsonify({
                'message': f'Type {type_no} ve bağlı tüm programlar silindi ({deleted_rows} kayıt).'
            })

        # Eğer hem type_no hem prog_no varsa → sadece o kayıt silinir
        type_record = session.query(TypesF1).filter_by(TypeNo=type_no, ProgNo=prog_no).first()

        if not type_record:
            return jsonify({'error': 'Kayıt bulunamadı!'}), 404

        session.delete(type_record)
        session.commit()

        return jsonify({'message': f'Type {type_no}, Program {prog_no} başarıyla silindi.'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()



# =================== PolySettingsF1 =====================
@db_bp.route('/polysettings', methods=['POST'])
def insert_polysettings():
    data = request.json
    session = get_session()
    new_poly = PolySettingsF1(
        TypeNo=data['TypeNo'],
        ProgNo=data['ProgNo'],
        ToolNo=data['ToolNo'],
        Gain=data['Gain'],
        Exposure=data['Exposure'],
        RMin=data['RMin'], RMax=data['RMax'],
        GMin=data['GMin'], GMax=data['GMax'],
        BMin=data['BMin'], BMax=data['BMax'],
        IMin=data['IMin'], IMax=data['IMax']
    )
    session.add(new_poly)
    session.commit()
    return jsonify({'message': 'PolySettingsF1 eklendi'})

@db_bp.route('/polysettings', methods=['GET'])
def get_polysettings():
    session = get_session()
    poly = session.query(PolySettingsF1).all()
    result = [p.as_dict() for p in poly]
    return jsonify(result)

# =================== ToolsF1 =====================
@db_bp.route('/tools', methods=['POST'])
def insert_tool():
    data = request.json
    session = get_session()
    new_tool = ToolsF1(
        TypeNo=data['TypeNo'],
        ProgNo=data['ProgNo'],
        ToolNo=data['ToolNo'],
        CornerNo=data['CornerNo'],
        X=data['x'],
        Y=data['y']
    )
    session.add(new_tool)
    session.commit()
    return jsonify({'message': 'ToolsF1 eklendi'})

@db_bp.route('/tools', methods=['GET'])
def get_tools():
    session = get_session()
    tools = session.query(ToolsF1).all()
    result = [t.as_dict() for t in tools]
    return jsonify(result)

# =================== Results =====================
@db_bp.route('/results', methods=['POST'])
def insert_result():
    data = request.json
    session = get_session()
    dt = datetime.strptime(data['DateTime'], "%Y-%m-%d %H:%M:%S")
    new_res = Results(
        DateTime=dt,
        TypeNo=data['TypeNo'],
        ProgNo=data['ProgNo'],
        ToolNo=data['ToolNo'],
        R=data['R'],
        G=data['G'],
        B=data['B'],
        I=data['I'],
        OK_NOK=data['OK_NOK']
    )
    session.add(new_res)
    session.commit()
    return jsonify({'message': 'Results eklendi'})


@db_bp.route('/results', methods=['GET'])
def get_results():
    session = get_session()
    results = session.query(Results).all()
    result = [r.as_dict() for r in results]
    return jsonify(result)


# =================== Tools by Type & Prog =====================
@db_bp.route('/tools_by_typeprog', methods=['GET'])
def get_tools_by_typeprog():
    type_no = request.args.get('typeNo', type=int)
    prog_no = request.args.get('progNo', type=int)

    if type_no is None or prog_no is None:
        return jsonify({'error': 'Eksik parametre'}), 400

    session = get_session()
    tools_query = session.query(ToolsF1).filter_by(TypeNo=type_no, ProgNo=prog_no).order_by(ToolsF1.ToolNo, ToolsF1.CornerNo).all()

    tools = {}
    for t in tools_query:
        if t.ToolNo not in tools:
            tools[t.ToolNo] = {
                "points": [],
                "r": float(getattr(t, "R_Tole", 0) or 0),
                "g": float(getattr(t, "G_Tole", 0) or 0),
                "b": float(getattr(t, "B_Tole", 0) or 0),
                "i": float(getattr(t, "I_Tole", 0) or 0),
                "hist_tolerance": float(getattr(t, "Hist_Tolerance", 0.1) or 0.1),
                "edge_tolerance": float(getattr(t, "Edge_Tolerance", 0.08) or 0.08),
                "edge_ref_density": float(getattr(t, "Edge_Ref_Density", 0) or 0),
                "edge_pattern_hu": getattr(t, "Edge_Pattern_Hu", "") or "",
                "edge_pattern_area": float(getattr(t, "Edge_Pattern_Area", 0) or 0),
                "edge_pattern_threshold": float(getattr(t, "Edge_Pattern_Threshold", 120) or 120),
            }
        tools[t.ToolNo]["points"].append({'x': t.X, 'y': t.Y})

    rgbi_rows = session.query(RGBITeach).filter_by(TypeNo=type_no, ProgNo=prog_no).all()
    rgbi_map = {int(r.Tool_ID): r for r in rgbi_rows}

    hist_rows = session.query(HistTeach).filter_by(TypeNo=type_no, ProgNo=prog_no).all()
    hist_map = {}
    for row in hist_rows:
        tid = int(row.Tool_ID)
        if tid not in hist_map and getattr(row, "Hist_Tolerance", None) is not None:
            hist_map[tid] = float(row.Hist_Tolerance)

    edge_rows = session.query(EdgePatternTeach).filter_by(TypeNo=type_no, ProgNo=prog_no).all()
    edge_map = {int(r.Tool_ID): r for r in edge_rows}

    result = []
    for tool_no, item in tools.items():
        rgbi = rgbi_map.get(tool_no)
        hist_tol = hist_map.get(tool_no, item["hist_tolerance"])
        edge_teach = edge_map.get(tool_no)
        try:
            edge_pattern_hu = json.loads(item["edge_pattern_hu"]) if item["edge_pattern_hu"] else []
        except Exception:
            edge_pattern_hu = []
        if edge_teach and getattr(edge_teach, "Pattern_Hu", None):
            try:
                edge_pattern_hu = json.loads(edge_teach.Pattern_Hu)
            except Exception:
                pass

        result.append({
            "id": tool_no,
            "points": item["points"],
            "status": "empty",
            "r": float(getattr(rgbi, "R_Tole", item["r"]) or item["r"]),
            "g": float(getattr(rgbi, "G_Tole", item["g"]) or item["g"]),
            "b": float(getattr(rgbi, "B_Tole", item["b"]) or item["b"]),
            "i": float(getattr(rgbi, "I_Tole", item["i"]) or item["i"]),
            "hist_tolerance": float(hist_tol),
            "edge_tolerance": float(getattr(edge_teach, "Score_Tolerance", item["edge_tolerance"]) or item["edge_tolerance"]),
            "edge_ref_density": float(item["edge_ref_density"]),
            "edge_pattern_hu": edge_pattern_hu,
            "edge_pattern_area": float(getattr(edge_teach, "Pattern_Area", item["edge_pattern_area"]) or item["edge_pattern_area"]),
            "edge_pattern_threshold": float(getattr(edge_teach, "Threshold", item["edge_pattern_threshold"]) or item["edge_pattern_threshold"]),
        })
    return jsonify(result)


# =================== Update Polygons =====================
@db_bp.route('/update-polygons', methods=['POST'])
def update_polygons():
    data = request.get_json()
    type_no = data['typeNo']
    prog_no = data['progNo']
    polygons = data['polygons']

    session = get_session()

    # 1️⃣ Eski verileri sil
    session.query(ToolsF1).filter_by(TypeNo=type_no, ProgNo=prog_no).delete()
    # session.query(HistTeach).filter_by(TypeNo=type_no, ProgNo=prog_no).delete()

    # 2️⃣ Yeni polygon verilerini ekle
    for polygon in polygons:
        tool_no = polygon['id']
        points = polygon['points']
        r_tole = float(polygon.get('r', 0) or 0)
        g_tole = float(polygon.get('g', 0) or 0)
        b_tole = float(polygon.get('b', 0) or 0)
        i_tole = float(polygon.get('i', 0) or 0)
        hist_tol = float(polygon.get('hist_tolerance', 0.1) or 0.1)
        edge_tol = float(polygon.get('edge_tolerance', 0.08) or 0.08)
        edge_ref = float(polygon.get('edge_ref_density', 0) or 0)
        edge_pattern_hu = polygon.get('edge_pattern_hu', [])
        edge_pattern_area = float(polygon.get('edge_pattern_area', 0) or 0)
        edge_pattern_threshold = float(polygon.get('edge_pattern_threshold', 120) or 120)
        edge_pattern_hu_json = json.dumps(edge_pattern_hu) if isinstance(edge_pattern_hu, list) else ""
        for idx, point in enumerate(points):
            new_tool = ToolsF1(
                TypeNo=type_no,
                ProgNo=prog_no,
                ToolNo=tool_no,
                CornerNo=idx + 1,
                X=point['x'],
                Y=point['y'],
                R_Tole=r_tole,
                G_Tole=g_tole,
                B_Tole=b_tole,
                I_Tole=i_tole,
                Hist_Tolerance=hist_tol,
                Edge_Tolerance=edge_tol,
                Edge_Ref_Density=edge_ref,
                Edge_Pattern_Hu=edge_pattern_hu_json,
                Edge_Pattern_Area=edge_pattern_area,
                Edge_Pattern_Threshold=edge_pattern_threshold,
            )
            session.add(new_tool)

    session.commit()
    return jsonify({"message": "Polygons updated"})


# =================== Delete Polygon =====================
@db_bp.route('/delete-polygon', methods=['POST'])
def delete_polygon():
    data = request.get_json()
    type_no = data['typeNo']
    prog_no = data['progNo']
    tool_id = data['toolId']

    session = get_session()

    # Önce ToolsF1 kontrol et
    tool_exists = session.query(ToolsF1).filter_by(TypeNo=type_no, ProgNo=prog_no, ToolNo=tool_id).count()
    if tool_exists:
        session.query(ToolsF1).filter_by(TypeNo=type_no, ProgNo=prog_no, ToolNo=tool_id).delete()
        session.query(HistTeach).filter_by(TypeNo=type_no, ProgNo=prog_no, Tool_ID=tool_id).delete()
        session.query(EdgePatternTeach).filter_by(TypeNo=type_no, ProgNo=prog_no, Tool_ID=tool_id).delete()
        session.commit()
        return jsonify({"message": f"Polygon {tool_id} veritabanından silindi."})
    else:
        return jsonify({"message": f"Polygon {tool_id} bulunamadı, silme işlemi yapılmadı."})


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

    session = get_session()
    type_img = session.query(TypeImages).filter_by(TypeNo=type_no, ProgramNo=prog_no).first()

    if type_img:
        type_img.RectX = rect_x
        type_img.RectY = rect_y
        type_img.RectW = rect_w
        type_img.RectH = rect_h
        message = 'Crop koordinatları güncellendi'
    else:
        type_img = TypeImages(
            TypeNo=type_no,
            ProgramNo=prog_no,
            RectX=rect_x,
            RectY=rect_y,
            RectW=rect_w,
            RectH=rect_h
        )
        session.add(type_img)
        message = 'Crop koordinatları kaydedildi'

    session.commit()
    return jsonify({'message': message})



@db_bp.route('/type-rect', methods=['GET'])
def get_type_rects():
    session = get_session()
    rects = session.query(TypeImages).all()
    result = [r.as_dict() for r in rects]
    return jsonify(result)

@db_bp.route('/type-rect/<int:type_no>/<int:prog_no>', methods=['GET'])
def get_type_rect_coords(type_no, prog_no):
    """Belirli TypeNo ve ProgramNo için crop koordinatlarını getir"""
    session = get_session()
    try:
        type_img = session.query(TypeImages).filter_by(
            TypeNo=type_no, 
            ProgramNo=prog_no
        ).order_by(TypeImages.ID.desc()).first()
        
        if type_img:
            return jsonify({
                'found': True,
                'RectX': type_img.RectX,
                'RectY': type_img.RectY,
                'RectW': type_img.RectW,
                'RectH': type_img.RectH
            })
        else:
            return jsonify({'found': False})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# =================== HistTeach =====================
@db_bp.route('/save_histogram', methods=['POST'])
def save_histogram():
    data = request.get_json()
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    tool_id = data.get("toolId")
    histogram = data.get("histogram")
    #hist_tolerance = float(data.get("histTolerance", 0.1))  # Default 0.1

    if not all([type_no, prog_no, tool_id, histogram]):
        return jsonify({"error": "Eksik veri"}), 400

    session = get_session()
    # Önce eski verileri sil
    session.query(HistTeach).filter_by(TypeNo=type_no, ProgNo=prog_no, Tool_ID=tool_id).delete()

    # Yeni veriyi ekle
    for channel in ['r', 'g', 'b']:
        for i, val in enumerate(histogram[channel]):
            hist = HistTeach(
                TypeNo=type_no,
                ProgNo=prog_no,
                Tool_ID=str(tool_id),
                Channel=channel.upper(),
                Bin_Index=i,
                Values=float(val),
                #Hist_Tolerance=hist_tolerance  # ✅ artık db’ye kaydediliyor
            )
            session.add(hist)

    session.commit()
    return jsonify({"status": "OK", "message": "Teach histogram güncellendi"})



@db_bp.route('/get_histogram_teach')
def get_histograms():
    type_no = request.args.get("typeNo")
    prog_no = request.args.get("progNo")

    if not type_no or not prog_no:
        return jsonify({"error": "Eksik parametre"}), 400

    session = get_session()
    rows = session.query(HistTeach).filter_by(TypeNo=type_no, ProgNo=prog_no)\
        .order_by(HistTeach.Tool_ID, HistTeach.Channel, HistTeach.Bin_Index).all()

    data = {}
    tolerance_dict = {}  # tool bazlı tolerans
    for row in rows:
        key = str(row.Tool_ID)
        if key not in data:
            data[key] = {"r": [0]*256, "g": [0]*256, "b": [0]*256}
            # hist_tolerance değerini al, yoksa default 0.1
            tolerance_dict[key] = float(getattr(row, "Hist_Tolerance", 0.1))
        data[key][row.Channel.lower()][row.Bin_Index] = float(row.Values)

    # JSON yanıtında her tool için histogram + hist_tolerance
    response = []
    for tool_id, hist in data.items():
        response.append({
            "toolId": tool_id,
            "histogram": hist,
            "hist_tolerance": tolerance_dict.get(tool_id, 0.1)
        })

    print("get_histo_py", response)
    return jsonify(response)



# =================== RGBITeach =====================
@db_bp.route('/get_rgbi_teach')
def get_rgbi_teach():
    type_no = request.args.get("typeNo")
    prog_no = request.args.get("progNo")

    if not type_no or not prog_no:
        return jsonify({"error": "Eksik parametre"}), 400

    session = get_session()
    rows = session.query(RGBITeach).filter_by(TypeNo=type_no, ProgNo=prog_no).order_by(RGBITeach.Tool_ID).all()

    data = []
    for row in rows:
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


@db_bp.route('/get_results_to_db', methods=['POST'])
def get_results_to_db():
    try:
        data = request.get_json()

        type_no = data.get("type_no")
        prog_no = data.get("prog_no")
        meas_type = data.get("measure_type")
        result_val = data.get("result")
        barcode = data.get("barcode")
        from_date = data.get("from_date")
        to_date = data.get("to_date")

        if not type_no or not prog_no:
            return jsonify({"error": "Eksik parametre"}), 400

        session = get_session()
        query = session.query(Results).filter(
            Results.TypeNo == type_no,
            Results.ProgNo == prog_no
        )

        if meas_type:
            query = query.filter(Results.MeasType == meas_type)
        if result_val and result_val != "ALL":
            query = query.filter(Results.Result == result_val)
        if barcode:
            query = query.filter(Results.Barcode == barcode)

        # 🔥 Tarih filtreleme
        if from_date:
            query = query.filter(Results.DateTime >= from_date)
        if to_date:
            query = query.filter(Results.DateTime <= to_date + " 23:59:59")

        rows = query.all()
        results_list = []

        for r in rows:
            row_dict = r.as_dict()
            for key, val in row_dict.items():
                if isinstance(val, bytes):
                    try:
                        row_dict[key] = val.decode("utf-8")
                    except UnicodeDecodeError:
                        row_dict[key] = val.hex()
            results_list.append(row_dict)

        return jsonify(results_list)

    except Exception as e:
        import traceback
        print("🔴 get_results_to_db HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@db_bp.route('/save_rgbi', methods=['POST'])
def save_rgbi():
    data = request.get_json()
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    measurements = data.get("measurements")

    if not all([type_no, prog_no, measurements]):
        return jsonify({"error": "Eksik veri"}), 400

    session = get_session()
    for m in measurements:
        tool_id = m["id"]
        # Eski veriyi sil
        session.query(RGBITeach).filter_by(TypeNo=type_no, ProgNo=prog_no, Tool_ID=tool_id).delete()
        # Yeni veriyi ekle
        new_rgbi = RGBITeach(
            TypeNo=type_no,
            ProgNo=prog_no,
            Tool_ID=tool_id,
            R_Min=float(m["min_r"]),
            R_Max=float(m["max_r"]),
            G_Min=float(m["min_g"]),
            G_Max=float(m["max_g"]),
            B_Min=float(m["min_b"]),
            B_Max=float(m["max_b"]),
            I_Min=float(m["min_i"]),
            I_Max=float(m["max_i"]),
            R_Tole=float(m["tole_r"]),
            G_Tole=float(m["tole_g"]),
            B_Tole=float(m["tole_b"]),
            I_Tole=float(m["tole_i"]),
        )
        session.add(new_rgbi)
        session.query(ToolsF1).filter_by(TypeNo=type_no, ProgNo=prog_no, ToolNo=tool_id).update({
            "R_Tole": float(m["tole_r"]),
            "G_Tole": float(m["tole_g"]),
            "B_Tole": float(m["tole_b"]),
            "I_Tole": float(m["tole_i"]),
        })

    session.commit()
    return jsonify({"status": "OK", "message": "RGBI değerleri kaydedildi"})


@db_bp.route('/save_hist', methods=['POST'])
def save_hist():
    data = request.get_json()
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    measurements = data.get("measurements")  # [{id, hist_tol}, ...]

    if not all([type_no, prog_no, measurements]):
        return jsonify({"error": "Eksik veri"}), 400

    print("BURAYA BAK LAN",measurements)
    session = get_session()
    for m in measurements:
        tool_id = m["id"]
        hist_tol = float(m.get("hist_tol", 0.1))  # default 0.1

        # İlgili TypeNo, ProgNo, Tool_ID için tüm eski histogramları güncelle
        session.query(HistTeach).filter_by(
            TypeNo=type_no,
            ProgNo=prog_no,
            Tool_ID=tool_id
        ).update({"Hist_Tolerance": hist_tol})
        session.query(ToolsF1).filter_by(
            TypeNo=type_no,
            ProgNo=prog_no,
            ToolNo=tool_id
        ).update({"Hist_Tolerance": hist_tol})

    session.commit()
    return jsonify({"status": "OK", "message": "Histogram toleransları kaydedildi"})



@db_bp.route('/save_edge_pattern', methods=['POST'])
def save_edge_pattern():
    data = request.get_json()
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    patterns = data.get("patterns")

    if not all([type_no, prog_no, patterns]):
        return jsonify({"error": "Eksik veri"}), 400

    session = get_session()
    for item in patterns:
        tool_id = int(item.get("id"))
        hu = item.get("edge_pattern_hu") or []
        area = float(item.get("edge_pattern_area", 0) or 0)
        threshold = float(item.get("edge_pattern_threshold", 120) or 120)
        score_tol = float(item.get("edge_tolerance", 1.0) or 1.0)

        session.query(EdgePatternTeach).filter_by(
            TypeNo=type_no,
            ProgNo=prog_no,
            Tool_ID=tool_id,
        ).delete()

        session.add(
            EdgePatternTeach(
                TypeNo=type_no,
                ProgNo=prog_no,
                Tool_ID=tool_id,
                Pattern_Hu=json.dumps(hu),
                Pattern_Area=area,
                Threshold=threshold,
                Score_Tolerance=score_tol,
            )
        )

    session.commit()
    return jsonify({"status": "OK", "message": "Edge pattern teach kaydedildi"})


@db_bp.route('/get_edge_pattern_teach')
def get_edge_pattern_teach():
    type_no = request.args.get("typeNo", type=int)
    prog_no = request.args.get("progNo", type=int)

    if not all([type_no, prog_no]):
        return jsonify({"error": "Eksik parametre"}), 400

    session = get_session()
    rows = session.query(EdgePatternTeach).filter_by(TypeNo=type_no, ProgNo=prog_no).order_by(EdgePatternTeach.Tool_ID).all()
    payload = []
    for row in rows:
        try:
            hu = json.loads(row.Pattern_Hu) if row.Pattern_Hu else []
        except Exception:
            hu = []
        payload.append(
            {
                "toolId": int(row.Tool_ID),
                "edge_pattern_hu": hu,
                "edge_pattern_area": float(row.Pattern_Area or 0),
                "edge_pattern_threshold": float(row.Threshold or 120),
                "edge_tolerance": float(row.Score_Tolerance or 1.0),
            }
        )

    return jsonify(payload)
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
        result_val = data['Result']
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

        session = get_session()
        new_result = Results(
            DateTime=dt_obj,
            TypeNo=type_no,
            ProgNo=prog_no,
            MeasType=meas_type,
            Barcode=barcode,
            ToolCount=tool_count,
            Result=result_val
        )
        session.add(new_result)
        session.commit()
        return jsonify({"message": "Sonuç kaydedildi"}), 200

    except Exception as e:
        import traceback
        print("Save_results_hist HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# =================== Get All Results =====================
@db_bp.route("/get_frame_results")
def get_frame_results():
    session = get_session()
    results = session.query(Results).order_by(Results.DateTime.asc()).all()
    result_list = []

    for r in results:
        row_dict = r.as_dict()
        # DateTime objesini stringe çevir
        if isinstance(row_dict.get("DateTime"), datetime):
            row_dict["DateTime"] = row_dict["DateTime"].strftime("%-d.%m.%Y %H:%M:%S.%f")[:-3]
        result_list.append(row_dict)

    return jsonify(result_list)


# =================== Get Result by Metadata =====================
@db_bp.route("/get_result_by_metadata", methods=["GET"])
def get_result_by_metadata():
    try:
        type_no = int(request.args.get("typeNo"))
        prog_no = int(request.args.get("progNo"))
        measure_type = request.args.get("measureType").upper()
        datetime_str = request.args.get("datetime")  # Örn: "2025-07-10 12-04-16-100"

        if " " not in datetime_str:
            return jsonify({"error": "Invalid datetime format"}), 400

        date_part, time_part = datetime_str.split(" ")
        hour, minute, second, millisec = time_part.split("-")
        microsec = millisec.ljust(6, '0')

        fixed_time = f"{hour}:{minute}:{second}.{microsec}"
        dt_obj = datetime.strptime(f"{date_part} {fixed_time}", "%Y-%m-%d %H:%M:%S.%f")
        dt_obj = dt_obj.replace(microsecond=0)

        session = get_session()
        row = session.query(Results).filter(
            Results.DateTime >= dt_obj,
            Results.DateTime < dt_obj + timedelta(seconds=1),
            Results.TypeNo == type_no,
            Results.ProgNo == prog_no,
            Results.MeasType == measure_type
        ).first()

        if row:
            row_dict = row.as_dict()
            # Eğer bytes varsa base64 encode
            for key, value in row_dict.items():
                if isinstance(value, bytes):
                    row_dict[key] = base64.b64encode(value).decode('utf-8')
            return jsonify(row_dict)
        else:
            return jsonify(None)

    except Exception as e:
        import traceback
        print("[get_result_by_metadata] Hata:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

