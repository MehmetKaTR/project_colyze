from flask import Blueprint, request, jsonify
from app.services.camera_service import (
    calculate_histogram,
    calculate_rgbi,
    save_camera_device_state_to_file,
    start_camera,
    stop_camera,
    get_current_frame,
    save_frame_from_base64,
    save_frame_with_polygons_base64,
    configure_camera_properties,
    generate_live_camera_frame,
    teach_histogram
)

camera_bp = Blueprint("camera", __name__)

# =================== Basic Camera Functions =====================
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
    try:
        type_no = request.args.get('typeNo', type=int)
        prog_no = request.args.get('progNo', type=int)
        result = generate_live_camera_frame(type_no, prog_no)
        return jsonify(result)
    except Exception as e:
        import traceback
        print("live_camera ERROR:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# =================== Save Frame =====================
@camera_bp.route('/save_frame', methods=['POST'])
def save_frame_route():
    try:
        data = request.get_json()
        result = save_frame_from_base64(data)
        return jsonify(result)
    except Exception as e:
        import traceback
        print("save_frame ERROR:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@camera_bp.route('/save_frame_with_polygons', methods=['POST'])
def save_frame_with_polygons():
    try:
        data = request.get_json()
        result = save_frame_with_polygons_base64(data)
        return jsonify(result)
    except Exception as e:
        import traceback
        print("save_frame_with_polygons HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# =================== IC4 Camera Functions =====================
@camera_bp.route('/ic4_configure')
def configure_camera():
    return configure_camera_properties()

@camera_bp.route('/ic4_xml_save')
def device_xml_save():
    try:
        result = save_camera_device_state_to_file()
        return jsonify(result)
    except Exception as e:
        import traceback
        print("device_xml_save ERROR:\n", traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500


# =================== Calculate Methods =====================
@camera_bp.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi_route():
    try:
        data = request.get_json()
        result = calculate_rgbi(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@camera_bp.route('/calculate_histogram', methods=['POST'])
def calculate_histogram_route():
    try:
        data = request.get_json()
        result = calculate_histogram(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@camera_bp.route('/teach_histogram', methods=['POST'])
def teach_histogram_route():
    try:
        data = request.get_json()
        result = teach_histogram(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500