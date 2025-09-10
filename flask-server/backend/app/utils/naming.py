from datetime import datetime

def generate_filename(type_no, prog_no, datetime_str=None, measure_type="unknown"):
    if datetime_str:
        return f"{type_no}_{prog_no}_{datetime_str}_{measure_type}.jpg"
    now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    return f"{type_no}_{prog_no}_{now_str}_{measure_type}.jpg"
