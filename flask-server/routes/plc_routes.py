from flask import Blueprint, jsonify

plc_bp = Blueprint('plc', __name__)

@plc_bp.route('/get_type', methods=['GET'])
def get_typeNo():
    return jsonify([{'type_no': 1}])

@plc_bp.route('/get_program', methods=['GET'])
def get_programNo():
    return jsonify([{'program_no': 2}])
