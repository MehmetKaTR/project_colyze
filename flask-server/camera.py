from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import base64
import numpy as np
import csv
import os

app = Flask(__name__)
CORS(app)

camera = cv2.VideoCapture(0)
CSV_FILE_PATH = os.path.abspath('../colyze/public/documents/polygons.csv')

def get_current_frame():
    ret, frame = camera.read()
    return frame if ret else None

@app.route('/live_camera')
def live_camera():
    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    _, buffer = cv2.imencode('.jpg', frame)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    img_uri = f"data:image/jpeg;base64,{img_base64}"

    return jsonify({'image': img_uri})

@app.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi():
    csv_text = request.data.decode('utf-8')
    reader = csv.reader(csv_text.strip().split('\n'))

    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    height, width, _ = rgb_frame.shape

    results = []

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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
