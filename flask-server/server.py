from flask import Flask, jsonify
from flask_cors import CORS
import cv2
import base64
import numpy as np

app = Flask(__name__)
CORS(app)  # React’ten gelecek istekleri açıyoruz

# Kamera nesnesi (0 = default webcam)
cap = cv2.VideoCapture(0)

@app.route('/capture')
def capture():
    ret, frame = cap.read()
    if not ret:
        return jsonify({ 'error': 'Kamera açılamadı.' }), 500

    # Ortalama R, G, B değerleri
    # OpenCV BGR format kullandığı için önce BGR, sonra RGB’ye çeviriyoruz:
    b, g, r = cv2.split(frame)
    avg_b = np.mean(b)
    avg_g = np.mean(g)
    avg_r = np.mean(r)
    intensity = (avg_r + avg_g + avg_b) / 3

    # Görüntüyü base64’e çevir
    _, buffer = cv2.imencode('.png', frame)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    img_data = f"data:image/png;base64,{img_b64}"

    return jsonify({
        'image': img_data,
        'avg_r': round(float(avg_r), 1),
        'avg_g': round(float(avg_g), 1),
        'avg_b': round(float(avg_b), 1),
        'intensity': round(float(intensity), 1)
    })

if __name__ == '__main__':
    app.run(debug=True)
