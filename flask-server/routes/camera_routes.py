from flask import Blueprint, jsonify, request
import cv2
import base64
import numpy as np
import csv

camera_bp = Blueprint('camera', __name__)
camera = None

def start_camera():
    global camera
    if camera is None:
        camera = cv2.VideoCapture(0)
        if not camera.isOpened():
            camera = None
            return False
    return True

def stop_camera():
    global camera
    if camera is not None:
        camera.release()
        camera = None
        return True
    return False

def get_current_frame():
    if camera is None or not camera.isOpened():
        return None
    ret, frame = camera.read()
    return frame if ret else None

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
