from flask import Blueprint, jsonify, request
import os
import datetime
from pathlib import Path

auto_bp = Blueprint("auto", __name__)

TEMP_FRAMES_DIR = Path("temp_frames")

@auto_bp.route("/auto_frames", methods=["GET"])
def get_auto_frames():
    try:
        if not TEMP_FRAMES_DIR.exists():
            return jsonify([])

        frame_data = []
        for file in TEMP_FRAMES_DIR.iterdir():
            if file.suffix.lower() not in [".jpg", ".jpeg", ".png"]:  # İzin verilen formatlar
                continue

            filename = file.stem  # dosya adını uzantısız al
            try:
                # Beklenen format: typeNo_progNo_datetime_measureType
                parts = filename.split("_")
                if len(parts) < 4:
                    continue

                type_no = parts[0]
                prog_no = parts[1]
                dt_str = parts[2]  # örnek: 8.07.2025
                time_str = parts[3]  # örnek: 10:45:14.7690000
                measure_type = parts[4] if len(parts) > 4 else "unknown"

                frame_data.append({
                    "typeNo": type_no,
                    "progNo": prog_no,
                    "datetime": f"{dt_str} {time_str}",
                    "measureType": measure_type,
                    "filename": file.name,
                    "path": f"/frames/{file.name}"
                })
            except Exception as parse_err:
                print(f"Dosya adından veri çözümlenemedi: {filename}", parse_err)
                continue

        return jsonify(frame_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
