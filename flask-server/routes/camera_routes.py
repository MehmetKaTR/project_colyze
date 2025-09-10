from flask import Blueprint, Response, jsonify, request
import ctypes
import tisgrabber as tis
import cv2
import numpy as np
import base64
from pathlib import Path
import os
from datetime import datetime
import pyodbc
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

@camera_bp.route('/save_frame', methods=['POST'])
def save_frame():
    try:
        data = request.get_json()
        image_data_url = data.get("image")
        type_no = data.get("typeNo", "unknown")
        prog_no = data.get("progNo", "unknown")
        measure_type = data.get("measureType", "unknown").lower()
        datetime_str = data.get("datetime")
        results = data.get("results")

        print("resultinyo", results)

        # Format results (only for RGBI, not modifying structure)
        if measure_type == "rgbi":
            formatted_results = []
            for r in results:
                status_labels = ["OK" if s else "NOK" for s in r["each_status"]]
                formatted_results.append({
                    "id": r["id"],
                    "each_status_labels": status_labels
                })

        # Check image data
        if not image_data_url:
            return jsonify({"error": "Image data missing"}), 400

        # Decode image
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Create temp dirs
        temp_frame_dir = Path("temp_frames")
        temp_frame_dir.mkdir(exist_ok=True)

        temp_text_dir = Path("temp_texts")
        temp_text_dir.mkdir(exist_ok=True)

        # Create filename
        if datetime_str:
            filename_base = f"{type_no}_{prog_no}_{datetime_str}_{measure_type}"
        else:
            now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
            filename_base = f"{type_no}_{prog_no}_{now_str}_{measure_type}"

        # Save image
        image_path = temp_frame_dir / f"{filename_base}.jpg"
        cv2.imwrite(str(image_path), frame)

        # Save result as .txt
        text_path = temp_text_dir / f"{filename_base}.txt"
        with open(text_path, "w", encoding="utf-8") as f:
            for r in results:
                f.write(f"ID {r['id']}:\n")

                if measure_type == "rgbi":
                    status_labels = ["OK" if s else "NOK" for s in r["each_status"]]
                    f.write(f"  R: {r['avg_r']:.2f} -> {status_labels[0]}\n")
                    f.write(f"  G: {r['avg_g']:.2f} -> {status_labels[1]}\n")
                    f.write(f"  B: {r['avg_b']:.2f} -> {status_labels[2]}\n")
                    f.write(f"  I: {r['intensity']:.2f} -> {status_labels[3]}\n")

                elif measure_type == "histogram":
                    scores = r.get("scores", {})
                    f.write(f"  R_diff: {scores.get('R', 0):.4f}\n")
                    f.write(f"  G_diff: {scores.get('G', 0):.4f}\n")
                    f.write(f"  B_diff: {scores.get('B', 0):.4f}\n")

                f.write(f"  RESULT: {r['status']}\n")
                f.write("\n")

        return jsonify({"saved": True, "filename": f"{filename_base}.jpg"})
    except Exception as e:
        import traceback
        print("save_frame HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500



@camera_bp.route('/save_frame_with_polygons', methods=['POST'])
def save_frame_with_polygons():
    try:
        data = request.get_json()
        image_data_url = data.get("image")
        type_no = data.get("typeNo", "unknown")
        prog_no = data.get("progNo", "unknown")
        measure_type = data.get("measureType", "unknown").lower()
        datetime_str = data.get("datetime")  
        polygons = data.get("polygons", [])

        print(polygons)
        print("Tarih:", datetime_str)
        print("Poligon sayısı:", len(polygons))

        if not image_data_url:
            return jsonify({"error": "Image data missing"}), 400

        # Görüntüyü base64'ten çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Üzerine çizim için overlay (alpha karışımı için)
        overlay = frame.copy()
        print("görelim bakalım",polygons)

        for polygon in polygons:
            points = polygon.get("points", [])
            status = polygon.get("status", "").upper()

            if len(points) < 3:
                continue

            pts = np.array([[int(p['x']), int(p['y'])] for p in points], np.int32).reshape((-1, 1, 2))

            # Renk ve alpha belirle
            if status == "OK":
                fill_color = (69, 230, 16)  # BGR (Yeşil parlak)
                alpha = 0.4
            elif status == "NOK":
                fill_color = (36, 36, 192)  # BGR (Kırmızı parlak)
                alpha = 0.86
            else:
                fill_color = None
                alpha = 0.0

            # Beyaz sınır çiz (her durumda)
            cv2.polylines(frame, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

            # İçini doldur (alpha ile)
            if fill_color and alpha > 0:
                cv2.fillPoly(overlay, [pts], fill_color)

            # Polygon ortasını hesapla (yazı için)
            M = cv2.moments(pts)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
            else:
                cX, cY = pts[0][0][0], pts[0][0][1]

            # Polygon ID'sini yaz (beyaz, okunaklı)
            poly_id = str(polygon.get("id", ""))
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            text_size, _ = cv2.getTextSize(poly_id, font, font_scale, thickness)
            text_w, text_h = text_size
            text_x = cX - text_w // 2
            text_y = cY + text_h // 2

            cv2.putText(frame, poly_id, (text_x, text_y), font, font_scale, (255, 255, 255), thickness, lineType=cv2.LINE_AA)

        # Alpha blending ile doldurma işlemi
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        # Kaydetme dizini
        temp_dir = Path("temp_frames")
        temp_dir.mkdir(exist_ok=True)

        # Dosya ismi
        if datetime_str:
            filename = f"{type_no}_{prog_no}_{datetime_str}_{measure_type}.jpg"
        else:
            now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
            filename = f"{type_no}_{prog_no}_{now_str}_{measure_type}.jpg"

        filepath = temp_dir / filename
        cv2.imwrite(str(filepath), frame)

        return jsonify({"saved": True, "filename": filename})
    except Exception as e:
        import traceback
        print("save_frame HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/live_camera')
def live_camera():
    # TypeNo ve ProgNo parametrelerini al
    type_no = request.args.get('typeNo', type=int)
    prog_no = request.args.get('progNo', type=int)

    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    # Access'ten crop koordinatlarını çek
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


@camera_bp.route('/calculate_histogram', methods=['POST'])
def calculate_histogram():
    try:
        import base64, cv2, numpy as np

        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        polygons = data.get("polygons")
        image_data_url = data.get("image")
        teach_histograms = data.get("teachHistograms")  

        if not all([type_no, prog_no, polygons, image_data_url, teach_histograms]):
            return jsonify({"error": "Eksik veri"}), 400

        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape

        tolerance_threshold = 0.1

        results = []

        teach_dict = {str(item["toolId"]): item["histogram"] for item in teach_histograms}

        for poly in polygons:
            poly_id = str(poly.get("id"))  # Burada str yaptık!
            points = poly.get("points")
            if not points or poly_id not in teach_dict:
                results.append({ "id": poly_id, "status": "NOK", "reason": "Teach verisi yok" })
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

            teach_r = np.array(teach_dict[poly_id]["r"])
            teach_g = np.array(teach_dict[poly_id]["g"])
            teach_b = np.array(teach_dict[poly_id]["b"])

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

        return jsonify(results)

    except Exception as e:
        import traceback
        print("🔴 measure_histogram HATASI:\n", traceback.format_exc())
        return jsonify({ "error": str(e) }), 500



@camera_bp.route('/teach_histogram', methods=['POST'])
def teach_histogram():
    try:
        import base64
        import cv2
        import numpy as np
        from flask import jsonify, request

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

            r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
            g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
            b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

            r_hist = cv2.normalize(r_hist, r_hist).flatten().tolist()
            g_hist = cv2.normalize(g_hist, g_hist).flatten().tolist()
            b_hist = cv2.normalize(b_hist, b_hist).flatten().tolist()

            results.append({
                "toolId": poly_id,
                "histogram": {
                    "r": r_hist,
                    "g": g_hist,
                    "b": b_hist
                }
            })

        return jsonify({
            "status": "OK",
            "histograms": results
        }), 200

    except Exception as e:
        import traceback
        print("🔴 teach_histogram HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

