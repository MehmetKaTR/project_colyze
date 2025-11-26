from flask import Blueprint, request, jsonify
import os
import csv

csv_bp = Blueprint('csv_ops', __name__)

@csv_bp.route('/polygons', methods=['GET'])
def get_polygons():
    path = os.path.abspath('../colyze/public/documents/polygons.csv')
    if not os.path.exists(path):
        return jsonify([])
    with open(path, newline='') as csvfile:
        reader = csv.reader(csvfile)
        polygons = []
        for row in reader:
            if len(row) >= 3:
                id = int(row[0])
                points = [{"x": float(row[i]), "y": float(row[i+1])} for i in range(1, len(row)-1, 2)]
                polygons.append({"id": id, "points": points})
    return jsonify(polygons)

@csv_bp.route('/save-polygons', methods=['POST'])
def save_polygons():
    data = request.get_json()
    path = os.path.abspath('../colyze/public/documents/polygons.csv')
    with open(path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        for poly in data['polygons']:
            row = [poly["id"]] + [int(coord) for point in poly["points"] for coord in (point["x"], point["y"])]
            writer.writerow(row)
    return jsonify({"status": "success"})

@csv_bp.route('/save-polygons-to-type-csv', methods=['POST'])
def save_polygons_to_type_csv():
    base_path = os.path.abspath('../colyze/public/documents/types')
    data = request.get_json()
    type_no = data.get("typeNo")
    if not type_no:
        return jsonify({"error": "typeNo is required"}), 400
    dir_path = os.path.join(base_path, f'type_{type_no}')
    os.makedirs(dir_path, exist_ok=True)
    target_path = os.path.join(dir_path, 'p2.csv')
    source_path = os.path.abspath('../colyze/public/documents/polygons.csv')
    with open(source_path, 'r', newline='') as infile, open(target_path, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        for row in csv.reader(infile):
            writer.writerow(row)
    return jsonify({"status": "success", "message": f"Saved to {target_path}"})

@csv_bp.route('/load-type-to-polygons', methods=['POST'])
def load_type_to_polygons():
    data = request.get_json()
    type_no = data.get("typeNo")
    if not type_no:
        return jsonify({"error": "typeNo is required"}), 400

    source_path = os.path.abspath(f'../colyze/public/documents/types/type_{type_no}/p2.csv')
    target_path = os.path.abspath('../colyze/public/documents/polygons.csv')

    if not os.path.exists(source_path):
        return jsonify({"error": f"Source file not found for type {type_no}"}), 404

    with open(source_path, 'r', newline='') as infile, open(target_path, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        for row in csv.reader(infile):
            writer.writerow(row)

    return jsonify({"status": "success", "message": f"Loaded type {type_no} into polygons.csv"})
