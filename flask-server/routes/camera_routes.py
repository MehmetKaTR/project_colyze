from flask import Blueprint, Response, jsonify, request
import ctypes
import tisgrabber as tis
import cv2
import numpy as np
import base64
import csv

camera_bp = Blueprint('camera', __name__)
ic = ctypes.cdll.LoadLibrary(r"C:\Users\mehme\Desktop\University\Stajlar\Agasan\Colyze\flask-server\tisgrabber_x64.dll")

tis.declareFunctions(ic)
ic.IC_InitLibrary(0)

camera = None

def start_camera():
    global camera
    if camera is None:
        camera = ic.IC_LoadDeviceStateFromFile(None, tis.T("device.xml"))
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
    width = request.args.get('width', default=None, type=int)
    height = request.args.get('height', default=None, type=int)
    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500
    if width and height:
        frame = cv2.resize(frame, (width, height))
    _, buffer = cv2.imencode('.jpg', frame)
    img_uri = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode()}"
    return jsonify({'image': img_uri})

@camera_bp.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi():
    try:
        data = request.get_json()
        csv_text = data.get("csv")
        image_data_url = data.get("image")
        if not csv_text or not image_data_url:
            return jsonify({"error": "CSV or image data missing"}), 400
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü verisi çözülemedi'}), 500
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape
        results = []
        reader = csv.reader(csv_text.strip().split('\n'))
        for row in reader:
            if len(row) < 3:
                continue
            poly_id = int(row[0])
            coords = [float(x) for x in row[1:]]
            points = [(int(coords[i]), int(coords[i + 1])) for i in range(0, len(coords), 2)]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(points)], 255)
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
        return jsonify({"error": str(e)}), 500
