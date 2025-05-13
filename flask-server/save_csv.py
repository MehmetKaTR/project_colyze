from flask import Flask, request, jsonify
from flask_cors import CORS
import csv
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # ← Bu satır çok önemli


@app.route('/polygons', methods=['GET'])
def get_polygons():
    CSV_FILE_PATH = os.path.abspath('../colyze/public/documents/polygons.csv')
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
    data = request.get_json()
    polygons = data['polygons']

    CSV_FILE_PATH = os.path.abspath('../colyze/public/documents/polygons.csv')
    print(f"Saving to: {CSV_FILE_PATH}")

    with open(CSV_FILE_PATH, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        for poly in polygons:
            row = [poly["id"]]
            for point in poly["points"]:
                row.extend([int(point["x"]), int(point["y"])])
            writer.writerow(row)

    return jsonify({"status": "success"})



  # types klasörüne göre BASE_CSV_PATH belirleyin

@app.route('/save-polygons-to-type-csv', methods=['POST'])
def save_polygons_to_type_csv():
    BASE_CSV_PATH = os.path.abspath('../colyze/public/documents/types')
    data = request.json
    type_no = data.get("typeNo")
    if not type_no:
        return jsonify({"error": "typeNo is required"}), 400

    directory = os.path.join(BASE_CSV_PATH, f'type_{type_no}')
    if not os.path.exists(directory):
        os.makedirs(directory)

    file_path = os.path.join(directory, 'p2.csv')
    polygons_file_path = os.path.abspath('../colyze/public/documents/polygons.csv')

    print("Reading from polygons.csv path:", polygons_file_path)
    try:
        with open(polygons_file_path, 'r', newline='') as csvfile:
            reader = csv.reader(csvfile)
            polygons = list(reader)

        with open(file_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            for poly in polygons:
                writer.writerow(poly)

        return jsonify({"status": "success", "message": f"Data saved to {file_path}."})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(port=3000)
