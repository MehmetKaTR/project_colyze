from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import base64
import numpy as np
import csv

app = Flask(__name__)
CORS(app)

camera = None  # Initialize camera as None

# Function to initialize the camera
def start_camera():
    global camera
    if camera is None:
        camera = cv2.VideoCapture(0)
        if not camera.isOpened():
            camera = None
            return False
    return True

# Function to stop the camera
def stop_camera():
    global camera
    if camera is not None:
        camera.release()
        camera = None
        return True
    return False

# Function to get the current frame from the camera
def get_current_frame():
    if camera is None or not camera.isOpened():
        return None
    ret, frame = camera.read()
    return frame if ret else None

@app.route('/start_camera')
def start_camera_route():
    if start_camera():
        return jsonify({'status': 'Camera started'}), 200
    else:
        return jsonify({'error': 'Failed to start the camera'}), 500

@app.route('/stop_camera')
def stop_camera_route():
    if stop_camera():
        return jsonify({'status': 'Camera stopped'}), 200
    else:
        return jsonify({'error': 'Camera is already stopped or not initialized'}), 400

@app.route('/live_camera')
def live_camera():
    width = request.args.get('width', default=None, type=int)
    height = request.args.get('height', default=None, type=int)
    print(width, height)

    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    # Eğer boyutlar belirtilmişse yeniden boyutlandır
    if width and height:
        frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)

    _, buffer = cv2.imencode('.jpg', frame)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    img_uri = f"data:image/jpeg;base64,{img_base64}"

    return jsonify({'image': img_uri})


@app.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi():
    try:
        data = request.get_json()
        csv_text = data.get("csv")
        image_data_url = data.get("image")

        if not csv_text or not image_data_url:
            return jsonify({"error": "CSV or image data missing"}), 400

        # base64 img'den frame oluştur
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Görüntü verisi çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape
        print(height, width)

        results = []
        reader = csv.reader(csv_text.strip().split('\n'))

        for row in reader:
            if len(row) < 3:
                continue
            try:
                poly_id = int(row[0])
                coords = [float(x) for x in row[1:]]
                points = [(int(coords[i]), int(coords[i + 1])) for i in range(0, len(coords), 2)]

                polygon_np = np.array(points, dtype=np.int32)
                mask = np.zeros((height, width), dtype=np.uint8)
                cv2.fillPoly(mask, [polygon_np], 255)

                masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)
                r_vals = masked[:, :, 0][mask == 255]
                g_vals = masked[:, :, 1][mask == 255]
                b_vals = masked[:, :, 2][mask == 255]

                if r_vals.size == 0:
                    continue

                avg_r = float(np.mean(r_vals))
                avg_g = float(np.mean(g_vals))
                avg_b = float(np.mean(b_vals))
                intensity = (avg_r + avg_g + avg_b) / 3

                results.append({
                    'id': poly_id,
                    'avg_r': round(avg_r, 1),
                    'avg_g': round(avg_g, 1),
                    'avg_b': round(avg_b, 1),
                    'intensity': round(intensity, 1)
                })
            except Exception as e:
                print(f"Hata (ID: {row[0]}):", e)
                continue

        return jsonify(results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
