from flask import Blueprint, request, jsonify
from app.services.db_service import delete_polygons, get_frame_results, get_histograms, get_result_by_metadata, get_results, get_results_to_db, get_rgbi_teach, get_tools_by_typeprog, get_type_rects, insert_or_update_type_rect, insert_result, insert_tool, insert_type, insert_polysettings, get_types, get_polysettings, save_histogram, save_results, save_rgbi, update_polygons  # uygun import yap
import traceback
db_bp = Blueprint('db', __name__)


# =================== TypesF1 =====================
@db_bp.route('/types', methods=['POST'])
def insert_type_route():
    try:
        data = request.json
        insert_type(data)
        return jsonify({'message': 'TypesF1 eklendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@db_bp.route('/types', methods=['GET'])
def get_types_route():
    try:
        types = get_types()
        return jsonify(types)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =================== PolygonsSettingsF1 =====================
@db_bp.route('/polysettings', methods=['POST'])
def insert_polysettings_route():
    try:
        data = request.json
        insert_polysettings(data)
        return jsonify({'message': 'PolySettingsF1 eklendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@db_bp.route('/polysettings', methods=['GET'])
def get_polysettings_route():
    try:
        polysettings = get_polysettings()
        return jsonify(polysettings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =================== ToolsF1 =====================
@db_bp.route('/tools', methods=['POST'])
def insert_tool_route():
    try:
        data = request.json
        insert_tool(data)
        return jsonify({'message': 'ToolsF1 eklendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@db_bp.route('/tools', methods=['GET'])
def get_tools():
    try:
        tools = get_tools()
        return jsonify(tools)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# =================== Results =====================
@db_bp.route('/results', methods=['POST'])
def insert_result_route():
    try:
        data = request.json
        insert_result(data)
        return jsonify({'message': 'Results eklendi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@db_bp.route('/results', methods=['GET'])
def get_results_route():
    try:
        tools = get_results()
        return jsonify(tools)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@db_bp.route('/tools_by_typeprog', methods=['GET'])
def get_tools_by_typeprog_route():
    try:
        type_no = request.args.get('typeNo', type=int)
        prog_no = request.args.get('progNo', type=int)

        result = get_tools_by_typeprog(type_no, prog_no)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@db_bp.route('/update-polygons', methods=['POST'])
def update_polygons_route():
    try:
        data = request.json()
        update_polygons(data)
        return jsonify({'message': 'Polygons updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@db_bp.route('/delete-polygon', methods=['POST'])
def delete_polygons_route():
    try:
        data = request.json
        delete_polygons(data)
        return jsonify({'message': 'Polygons updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =================== Type Images =====================
@db_bp.route('/type-rect', methods=['POST'])
def insert_or_update_type_rect_route():
    try:
        data = request.json
        insert_or_update_type_rect(data)
        return jsonify({'message': 'Crop koordinatları kaydedildi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@db_bp.route('/type-rect', methods=['GET'])
def get_type_rects_route():
    try:
        get_type_rects()
        return jsonify({'message': 'TYPE Images'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500    


# =================== HistTeach =====================
@db_bp.route('/save_histogram', methods=['POST'])
def save_histogram_route():
    try:
        data = request.get_json()
        save_histogram(data)
        return jsonify({"status": "OK", "message": "Teach histogram güncellendi"})
    except Exception as e:
        print("🔴 Histogram kayıt hatası:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@db_bp.route('/get_histogram_teach', methods=['GET'])
def get_histograms_route():
    try:
        type_no = request.args.get("typeNo", type=int)
        prog_no = request.args.get("progNo", type=int)

        response = get_histograms(type_no, prog_no)
        return jsonify(response)
    except Exception as e:
        print("🔴 get_histograms HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@db_bp.route('/get_rgbi_teach')
def get_rgbi_teach_route():
    try:
        type_no = request.args.get("typeNo")
        prog_no = request.args.get("progNo")

        response = get_rgbi_teach(type_no, prog_no)
        return jsonify(response)
    except Exception as e:
        print("🔴 get_rgbi_teach HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@db_bp.route('/get_results_to_db', methods=['POST'])
def get_results_to_db_route():
    try:
        data = request.json
        response = get_results_to_db(data)
        return jsonify(response)
    except Exception as e:
        print("🔴 get_results_to_db HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500    
    
@db_bp.route('/save_rgbi', methods=['POST'])
def save_rgbi_route():
    try:
        data = request.get_json()
        save_rgbi(data)
        return jsonify({"status": "OK", "message": "RGBI değerleri kaydedildi"})
    except Exception as e:
        import traceback
        print("🔴 RGBI kayıt hatası:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    

# =================== SaveResults =====================
@db_bp.route('/save_results', methods=['POST'])
def save_results_route():
    try:
        data = request.json
        save_results(data)
        return jsonify({"message": "Sonuç kaydedildi"}), 200
    except Exception as e:
        print("Save_results HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@db_bp.route("/get_frame_results", methods=["GET"])
def get_frame_results_route():
    try:
        response = get_frame_results()
        return jsonify(response)
    except Exception as e:
        print("Save_results HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@db_bp.route("/get_result_by_metadata", methods=["GET"])
def get_result_by_metadata_route():
    try:
        data = request.json()
        response = get_result_by_metadata(data)
        return jsonify(response)
    except Exception as e:
        print("[get_result_by_metadata] Hata:", str(e))
        return jsonify({"error": str(e)}), 