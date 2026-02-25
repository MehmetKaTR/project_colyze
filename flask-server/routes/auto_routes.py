from flask import Blueprint, jsonify, request, send_from_directory

from path_config import TEMP_FRAMES_DIR, TEMP_TEXTS_DIR, ensure_runtime_layout

auto_bp = Blueprint("auto", __name__)
ensure_runtime_layout()

print(f"TEMP_FRAMES_DIR: {TEMP_FRAMES_DIR}")
print(f"TEMP_TEXTS_DIR: {TEMP_TEXTS_DIR}")


@auto_bp.route("/frames/<filename>")
def serve_frame(filename):
    return send_from_directory(TEMP_FRAMES_DIR, filename)


@auto_bp.route("/auto_frames", methods=["GET"])
def get_auto_frames():
    try:
        if not TEMP_FRAMES_DIR.exists():
            return jsonify([])

        frame_data = []
        for file in TEMP_FRAMES_DIR.iterdir():
            if file.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
                continue

            filename = file.stem
            parts = filename.split("_")
            if len(parts) < 4:
                continue

            type_no = parts[0]
            prog_no = parts[1]
            dt_str = parts[2]
            time_str = parts[3]
            measure_type = parts[4] if len(parts) > 4 else "unknown"

            frame_data.append(
                {
                    "typeNo": type_no,
                    "progNo": prog_no,
                    "datetime": f"{dt_str} {time_str}",
                    "measureType": measure_type,
                    "filename": file.name,
                    "path": f"/frames/{file.name}",
                }
            )

        return jsonify(frame_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auto_bp.route("/auto_result_text", methods=["GET"])
def get_result_text():
    try:
        filename = request.args.get("filename")
        if not filename:
            return jsonify({"error": "filename is required"}), 400

        filename_base = file_stem = filename.rsplit(".", 1)[0]
        txt_path = TEMP_TEXTS_DIR / f"{file_stem}.txt"

        if not txt_path.exists():
            return jsonify({"error": "Result file not found"}), 404

        with open(txt_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f.readlines()]

        return jsonify({"result_lines": lines})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
