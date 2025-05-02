from flask import Flask, request, jsonify
import numpy as np
from PIL import Image

app = Flask(__name__)

@app.route('/calculate_rgb', methods=['POST'])
def calculate_rgb():
    data = request.json
    points = data['polygonPoints']  # Noktaları alıyoruz

    # Burada RGB hesaplamasını yapabiliriz
    # Şu an simülasyon olarak bir değer döndürüyoruz
    rgb = {"r": 100, "g": 150, "b": 200}

    return jsonify(rgb)

if __name__ == '__main__':
    app.run(debug=True)
