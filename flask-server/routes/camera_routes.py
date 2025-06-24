from flask import Blueprint, Response, jsonify, request
import ctypes
import tisgrabber as tis
import cv2
import numpy as np
import base64
import csv

camera_bp = Blueprint('camera', __name__)
ic = ctypes.cdll.LoadLibrary(r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\Colyze\flask-server\routes\tisgrabber_x64.dll")
tis.declareFunctions(ic)
ic.IC_InitLibrary(0)

camera = None

def start_camera():
    global camera
    if camera is None:
        camera = ic.IC_LoadDeviceStateFromFile(None, tis.T("./routes/devicef1.xml"))
        if not ic.IC_IsDevValid(camera):
            camera = None
            return False
        ic.IC_StartLive(camera, 1)
    return True

def stop_camera():
    global camera
    if camera is not None:
        ic.IC_StopLive(camera)
        ic.IC_ReleaseGrabber(camera)
        camera = None
        return True
    return False

def get_current_frame():
    global camera
    if camera is None or not ic.IC_IsDevValid(camera):
        return None

    # Görüntü açıklaması bilgilerini çek
    Width = ctypes.c_long()
    Height = ctypes.c_long()
    BitsPerPixel = ctypes.c_int()
    ColorFormat = ctypes.c_int()

    ic.IC_GetImageDescription(camera, Width, Height, BitsPerPixel, ColorFormat)

    width = Width.value
    height = Height.value
    bpp = BitsPerPixel.value // 8
    buffer_size = width * height * bpp

    # Görüntüyü al
    if ic.IC_SnapImage(camera, 2000) == tis.IC_SUCCESS:
        image_ptr = ic.IC_GetImagePtr(camera)

        imagedata = ctypes.cast(image_ptr, ctypes.POINTER(ctypes.c_ubyte * buffer_size))

        image = np.ndarray(buffer=imagedata.contents,
                           dtype=np.uint8,
                           shape=(height, width, bpp))

        # OpenCV işlemleri
        image = cv2.flip(image, 0)
        return image
    else:
        return None

@camera_bp.route('/start_camera')
def start_camera_route():
    if start_camera():
        return jsonify({'status': 'Camera started'})
    return jsonify({'error': 'Failed to start camera'}), 500

@camera_bp.route('/stop_camera')
def stop_camera_route():
    if stop_camera():
        return jsonify({'status': 'Camera stopped'})
    return jsonify({'error': 'Camera not running'}), 400


@camera_bp.route('/live_camera')
def live_camera():
    # TypeNo ve ProgNo parametrelerini al
    type_no = request.args.get('typeNo', type=int)
    prog_no = request.args.get('progNo', type=int)

    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    # Access'ten crop koordinatlarını çek
    import pyodbc
    db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"
    conn_str = (
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        fr'DBQ={db_path};'
    )
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()

    result = None
    if type_no is not None and prog_no is not None:
        try:
            cursor.execute("""
                SELECT RectX, RectY, RectW, RectH 
                FROM TypeImages 
                WHERE TypeNo = ? AND ProgramNo = ?
                ORDER BY ID DESC
            """, (type_no, prog_no))
            result = cursor.fetchone()
        except Exception as e:
            print("DB Hatası:", e)

    conn.close()

    # Eğer eşleşen kayıt varsa crop uygula
    if result:
        x, y, w, h = map(int, result)
        height, width = frame.shape[:2]

        x = max(0, min(x, width - 1))
        y = max(0, min(y, height - 1))
        w = max(1, min(w, width - x))
        h = max(1, min(h, height - y))

        cropped = frame[y:y + h, x:x + w]
    else:
        cropped = frame  # Eğer eşleşen kayıt yoksa tüm kareyi gönder

    _, buffer = cv2.imencode('.jpg', cropped)
    img_uri = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode()}"
    return jsonify({'image': img_uri})



@camera_bp.route('/ic4_xml_save')
def device_xml_save():
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

    if ic.IC_IsDevValid(hGrabber):
        ic.IC_SaveDeviceStateToFile(hGrabber, tis.T("./routes/device.xml"))
        response = {"status": "success", "message": "Ayarlar device.xml olarak kaydedildi."}
    else:
        ic.IC_MsgBox(tis.T("No device opened"), tis.T("Simple Live Video"))
        response = {"status": "error", "message": "Cihaz açık değil veya geçersiz."}

    ic.IC_ReleaseGrabber(hGrabber)
    return jsonify(response)

@camera_bp.route('/ic4_configure')
def configure_camera_properties():
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

    if not ic.IC_IsDevValid(hGrabber):
        ic.IC_ReleaseGrabber(hGrabber)
        return jsonify({"status": "error", "message": "No device opened."})

    # Exposure Auto bilgisi alınıyor
    exposureauto = ctypes.c_long()
    ic.IC_SetPropertySwitch(hGrabber, tis.T("Exposure"), tis.T("Auto"), exposureauto)
    auto_exposure_value = exposureauto.value

    # Auto kapat, manuel exposure değeri ayarla
    ic.IC_SetPropertySwitch(hGrabber, tis.T("Exposure"), tis.T("Auto"), 0)
    ic.IC_SetPropertyAbsoluteValue(hGrabber, tis.T("Exposure"), tis.T("Value"), ctypes.c_float(0.0303))

    # Exposure değerini ve aralığını al
    expmin = ctypes.c_float()
    expmax = ctypes.c_float()
    exposure = ctypes.c_float()
    ic.IC_GetPropertyAbsoluteValue(hGrabber, tis.T("Exposure"), tis.T("Value"), exposure)
    ic.IC_GetPropertyAbsoluteValueRange(hGrabber, tis.T("Exposure"), tis.T("Value"), expmin, expmax)

    # Gain bilgisi
    gainmin = ctypes.c_long()
    gainmax = ctypes.c_long()
    gain = ctypes.c_long()
    ic.IC_GetPropertyValue(hGrabber, tis.T("Gain"), tis.T("Value"), gain)
    ic.IC_GetPropertyValueRange(hGrabber, tis.T("Gain"), tis.T("Value"), gainmin, gainmax)

    # Focus denemesi
    focus_result = ic.IC_PropertyOnePush(hGrabber, tis.T("Focus"), tis.T("One Push"))
    focus_message = "Focus ayarlandı." if focus_result != -4 else "Kamera Focus özelliğini desteklemiyor."

    # ✅ Ayarları XML olarak kaydet (otomatik)
    xml_path = tis.T("./routes/devicef1.xml")
    ic.IC_SaveDeviceStateToFile(hGrabber, xml_path)

    ic.IC_ReleaseGrabber(hGrabber)

    return jsonify({
        "status": "success",
        "exposure_auto": auto_exposure_value,
        "exposure": exposure.value,
        "exposure_range": [expmin.value, expmax.value],
        "gain": gain.value,
        "gain_range": [gainmin.value, gainmax.value],
        "focus_message": focus_message,
        "xml_saved_to": "./routes/devicef1.xml"
    })

# =================== Calculate Methods =====================
@camera_bp.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi():
    try:
        data = request.get_json()
        polygons = data.get("polygons")
        image_data_url = data.get("image")
        
        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü verisi çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape
        results = []

        # Poligonlar üzerinden dön
        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            if not points:
                continue
            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_vals = masked[:, :, 0][mask == 255]
            g_vals = masked[:, :, 1][mask == 255]
            b_vals = masked[:, :, 2][mask == 255]
            if r_vals.size == 0: continue

            results.append({
                'id': poly_id,
                'avg_r': round(np.mean(r_vals), 1),
                'avg_g': round(np.mean(g_vals), 1),
                'avg_b': round(np.mean(b_vals), 1),
                'intensity': round((np.mean(r_vals) + np.mean(g_vals) + np.mean(b_vals)) / 3, 1)
            })

        return jsonify(results)
    except Exception as e:
        import traceback
        print("🔴 calculate_rgbi HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/analyze_histogram', methods=['POST'])
def analyze_histogram():
    try:
        data = request.get_json()
        polygons = data.get("polygons")
        image_data_url = data.get("image")
        
        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Image decode failed'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape
        results = []

        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            ref_r = np.array(poly.get("ref_r"))
            ref_g = np.array(poly.get("ref_g"))
            ref_b = np.array(poly.get("ref_b"))

            if not points or ref_r is None or ref_g is None or ref_b is None:
                continue

            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
            g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
            b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

            r_hist = cv2.normalize(r_hist, r_hist).flatten()
            g_hist = cv2.normalize(g_hist, g_hist).flatten()
            b_hist = cv2.normalize(b_hist, b_hist).flatten()

            sim_r = cv2.compareHist(r_hist, ref_r, cv2.HISTCMP_BHATTACHARYYA)
            sim_g = cv2.compareHist(g_hist, ref_g, cv2.HISTCMP_BHATTACHARYYA)
            sim_b = cv2.compareHist(b_hist, ref_b, cv2.HISTCMP_BHATTACHARYYA)
            sim_score = (sim_r + sim_g + sim_b) / 3

            threshold = 0.1
            status = "OK" if sim_score < threshold else "NOK"

            results.append({
                "id": poly_id,
                "status": status
            })

        return jsonify(results)
    
    except Exception as e:
        import traceback
        print("🔴 analyze_histogram error:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/measure_histogram', methods=['POST'])
def measure_histogram():
    try:
        import pyodbc
        import numpy as np

        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        polygons = data.get("polygons")
        image_data_url = data.get("image")

        if not all([type_no, prog_no, polygons, image_data_url]):
            return jsonify({"error": "Eksik veri"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape

        # DB bağlantısı
        # Access veritabanı bağlantısı
        db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"  # ← Burayı kendine göre düzelt
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            fr'DBQ={db_path};'
        )

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        tolerance_threshold = 0.1  # İstediğin gibi değiştir

        results = []

        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            if not points:
                continue

            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            # Histogramları çıkar
            r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
            g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
            b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

            r_hist = cv2.normalize(r_hist, r_hist).flatten()
            g_hist = cv2.normalize(g_hist, g_hist).flatten()
            b_hist = cv2.normalize(b_hist, b_hist).flatten()

            def get_histogram(channel):
                cursor.execute("""
                    SELECT Bin_Index, [Values] FROM HistTeach
                    WHERE TypeNo=? AND ProgNo=? AND Tool_ID=? AND Channel=?
                    ORDER BY Bin_Index
                """, (type_no, prog_no, poly_id, channel))
                rows = cursor.fetchall()
                return np.array([float(r[1]) for r in rows]) if rows else None


            teach_r = get_histogram('R')
            teach_g = get_histogram('G')
            teach_b = get_histogram('B')

            if teach_r is None or teach_g is None or teach_b is None:
                results.append({ "id": poly_id, "status": "NOK", "reason": "Teach verisi yok" })
                continue

            # Karşılaştır
            diff_r = np.linalg.norm(r_hist - teach_r)
            diff_g = np.linalg.norm(g_hist - teach_g)
            diff_b = np.linalg.norm(b_hist - teach_b)

            is_ok = all(diff < tolerance_threshold for diff in [diff_r, diff_g, diff_b])

            results.append({
                "id": poly_id,
                "status": "OK" if is_ok else "NOK",
                "diff_r": round(float(diff_r), 4),
                "diff_g": round(float(diff_g), 4),
                "diff_b": round(float(diff_b), 4),
            })

        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        import traceback
        print("🔴 measure_histogram HATASI:\n", traceback.format_exc())
        return jsonify({ "error": str(e) }), 500


@camera_bp.route('/teach_histogram', methods=['POST'])
def teach_histogram():
    try:
        import pyodbc
        import numpy as np
        import base64
        import cv2

        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        polygons = data.get("polygons")
        image_data_url = data.get("image")

        if not all([type_no, prog_no, polygons, image_data_url]):
            return jsonify({"error": "Eksik veri"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape

        db_path = r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\AccessDBS\colyze.accdb"  # ← Burayı kendine göre düzelt
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            fr'DBQ={db_path};'
        )

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            if not points:
                continue

            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
            g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
            b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

            r_hist = cv2.normalize(r_hist, r_hist).flatten()
            g_hist = cv2.normalize(g_hist, g_hist).flatten()
            b_hist = cv2.normalize(b_hist, b_hist).flatten()

            def save_histogram(channel, hist_data):
                cursor.execute("""
                    SELECT COUNT(*) FROM HistTeach
                    WHERE TypeNo=? AND ProgNo=? AND Tool_ID=? AND Channel=?
                """, (type_no, prog_no, poly_id, channel))
                count = cursor.fetchone()[0]

                if count == 0:
                    for bin_idx, val in enumerate(hist_data):
                        cursor.execute("""
                            INSERT INTO HistTeach (TypeNo, ProgNo, Tool_ID, Channel, Bin_Index, [Values])
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (type_no, prog_no, poly_id, channel, bin_idx, float(val)))
                else:
                    for bin_idx, val in enumerate(hist_data):
                        cursor.execute("""
                            UPDATE HistTeach SET [Values]=?
                            WHERE TypeNo=? AND ProgNo=? AND Tool_ID=? AND Channel=? AND Bin_Index=?
                        """, (float(val), type_no, prog_no, poly_id, channel, bin_idx))

            save_histogram('R', r_hist)
            save_histogram('G', g_hist)
            save_histogram('B', b_hist)

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"status": "Teach histograms saved/updated successfully."})

    except Exception as e:
        import traceback
        print("🔴 teach_histogram HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500