from flask import Flask, request, jsonify
from flask_cors import CORS
import csv
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # ← Bu satır çok önemli

CSV_FILE_PATH = os.path.abspath('../colyze/public/documents/polygons.csv')

@app.route('/polygons', methods=['GET'])
def get_polygons():
    if not os.path.exists(CSV_FILE_PATH):
        return jsonify([])

    with open(CSV_FILE_PATH, newline='') as csvfile:
        reader = csv.reader(csvfile)
        polygons = []
        for row in reader:
            if len(row) >= 3:
                id = int(row[0])
                points = [{"x": float(row[i]), "y": float(row[i+1])} for i in range(1, len(row)-1, 2)]
                polygons.append({"id": id, "points": points})
    return jsonify(polygons)

@app.route('/save-polygons', methods=['POST'])
def save_polygons():
    polygons = request.json
    with open(CSV_FILE_PATH, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        for poly in polygons:
            row = [poly["id"]] + [coord for p in poly["points"] for coord in (p["x"], p["y"])]
            writer.writerow(row)
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(port=3000)
