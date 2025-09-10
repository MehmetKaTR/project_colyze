import ctypes
from app.services.calculation_methods import calculate_histogram_method, calculate_rgbi_method, teach_histogram_method
from . import tisgrabber as tis
import cv2
import numpy as np
import base64
from pathlib import Path
from datetime import datetime

from ..utils.image import decode_base64_image, crop_frame, encode_image_to_base64_uri
from ..utils.naming import generate_filename
from ..utils.paths import ensure_dirs, get_frame_path, get_text_path
from .result_writer import write_results_txt
from .polygon_drawer import draw_polygons
from .database_reader import get_crop_info_from_access

dll_path = Path(__file__).parent / "tisgrabber_x64.dll"
ic = ctypes.cdll.LoadLibrary(str(dll_path))
tis.declareFunctions(ic)
ic.IC_InitLibrary(0)

camera = None


# =================== Basic Camera Functions =====================
def start_camera():
    global camera
    if camera is None:
        camera = ic.IC_LoadDeviceStateFromFile(None, tis.T("./routes/devicef1.xml"))
        if not ic.IC_IsDevValid(camera):
            camera = None
            return False
        ic.IC_StartLive(camera, 1)
    return True

def stop_camera():
    global camera
    if camera is not None:
        ic.IC_StopLive(camera)
        ic.IC_ReleaseGrabber(camera)
        camera = None
        return True
    return False

def generate_live_camera_frame(type_no: int, prog_no: int):
    frame = get_current_frame()
    if frame is None:
        raise RuntimeError("Kameradan görüntü alınamadı")

    crop_info = get_crop_info_from_access(type_no, prog_no)
    processed = crop_frame(frame, crop_info)

    img_uri = encode_image_to_base64_uri(processed)
    return {'image': img_uri}

def get_current_frame():
    global camera
    if camera is None or not ic.IC_IsDevValid(camera):
        return None

    Width, Height, BitsPerPixel, ColorFormat = ctypes.c_long(), ctypes.c_long(), ctypes.c_int(), ctypes.c_int()
    ic.IC_GetImageDescription(camera, Width, Height, BitsPerPixel, ColorFormat)

    width, height = Width.value, Height.value
    bpp = BitsPerPixel.value // 8
    buffer_size = width * height * bpp

    if ic.IC_SnapImage(camera, 2000) == tis.IC_SUCCESS:
        image_ptr = ic.IC_GetImagePtr(camera)
        imagedata = ctypes.cast(image_ptr, ctypes.POINTER(ctypes.c_ubyte * buffer_size))
        image = np.ndarray(buffer=imagedata.contents, dtype=np.uint8, shape=(height, width, bpp))
        return cv2.flip(image, 0)
    return None


# =================== Save Frame =====================
def save_frame_from_base64(data):
    image_data_url = data.get("image")
    type_no = data.get("typeNo", "unknown")
    prog_no = data.get("progNo", "unknown")
    measure_type = data.get("measureType", "unknown").lower()
    datetime_str = data.get("datetime")
    results = data.get("results")

    if not image_data_url:
        raise ValueError("Image data missing")

    frame = decode_base64_image(image_data_url)
    if frame is None:
        raise ValueError("Invalid image data")

    ensure_dirs()

    # Dosya adı oluştur
    filename = generate_filename(type_no, prog_no, datetime_str, measure_type)

    # Kayıt yolları
    image_path = get_frame_path(filename)
    text_path = get_text_path(filename.replace(".jpg", ".txt"))

    # Görüntüyü kaydet
    cv2.imwrite(str(image_path), frame)

    # Sonuçları dosyaya yaz
    write_results_txt(text_path, results, measure_type)

    return {"saved": True, "filename": filename}

def save_frame_with_polygons_base64(data):
    image_data_url = data.get("image")
    type_no = data.get("typeNo", "unknown")
    prog_no = data.get("progNo", "unknown")
    measure_type = data.get("measureType", "unknown").lower()
    datetime_str = data.get("datetime")  
    polygons = data.get("polygons", [])

    if not image_data_url:
        raise ValueError("Image data missing")
    
    # Görüntüyü base64'ten çöz
    frame = decode_base64_image(image_data_url)
    if frame is None:
        raise ValueError("Invalid image data")
    
     # Polygonları çiz
    frame = draw_polygons(frame, polygons)

    # Dizinleri oluştur
    ensure_dirs()

    # Dosya adı ve kayıt yolu
    filename = generate_filename(type_no, prog_no, datetime_str, measure_type)
    image_path = get_frame_path(filename)

    # Görüntüyü kaydet
    cv2.imwrite(str(image_path), frame)

    return {"saved": True, "filename": filename}


# =================== IC4 Camera Configurations =====================
def configure_camera_properties():
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)
    if not ic.IC_IsDevValid(hGrabber):
        ic.IC_ReleaseGrabber(hGrabber)
        return {"status": "error", "message": "No device opened."}

    exposureauto = ctypes.c_long()
    ic.IC_SetPropertySwitch(hGrabber, tis.T("Exposure"), tis.T("Auto"), exposureauto)
    auto_exposure_value = exposureauto.value

    ic.IC_SetPropertySwitch(hGrabber, tis.T("Exposure"), tis.T("Auto"), 0)
    ic.IC_SetPropertyAbsoluteValue(hGrabber, tis.T("Exposure"), tis.T("Value"), ctypes.c_float(0.0303))

    expmin, expmax, exposure = ctypes.c_float(), ctypes.c_float(), ctypes.c_float()
    ic.IC_GetPropertyAbsoluteValue(hGrabber, tis.T("Exposure"), tis.T("Value"), exposure)
    ic.IC_GetPropertyAbsoluteValueRange(hGrabber, tis.T("Exposure"), tis.T("Value"), expmin, expmax)

    gainmin, gainmax, gain = ctypes.c_long(), ctypes.c_long(), ctypes.c_long()
    ic.IC_GetPropertyValue(hGrabber, tis.T("Gain"), tis.T("Value"), gain)
    ic.IC_GetPropertyValueRange(hGrabber, tis.T("Gain"), tis.T("Value"), gainmin, gainmax)

    focus_result = ic.IC_PropertyOnePush(hGrabber, tis.T("Focus"), tis.T("One Push"))
    focus_message = "Focus ayarlandı." if focus_result != -4 else "Kamera Focus özelliğini desteklemiyor."

    xml_path = tis.T("./routes/devicef1.xml")
    ic.IC_SaveDeviceStateToFile(hGrabber, xml_path)
    ic.IC_ReleaseGrabber(hGrabber)

    return {
        "status": "success",
        "exposure_auto": auto_exposure_value,
        "exposure": exposure.value,
        "exposure_range": [expmin.value, expmax.value],
        "gain": gain.value,
        "gain_range": [gainmin.value, gainmax.value],
        "focus_message": focus_message,
        "xml_saved_to": "./routes/devicef1.xml"
    }

def save_camera_device_state_to_file(xml_path="./routes/device.xml"):
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

    if not ic.IC_IsDevValid(hGrabber):
        ic.IC_MsgBox(tis.T("No device opened"), tis.T("Simple Live Video"))
        ic.IC_ReleaseGrabber(hGrabber)
        return {"status": "error", "message": "Cihaz açık değil veya geçersiz."}

    ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(xml_path))
    ic.IC_ReleaseGrabber(hGrabber)

    return {
        "status": "success",
        "message": f"Ayarlar {xml_path} olarak kaydedildi.",
        "xml_path": xml_path
    }


# =================== Calculate/Teach Methods =====================
def calculate_rgbi(data):
    image_data_url = data.get("image")  
    polygons = data.get("polygons", [])

    if not polygons or not image_data_url:
        raise ValueError("Polygons or image data missing")
    
    frame = decode_base64_image(image_data_url)
    if frame is None:
        raise ValueError("Invalid image data")
    
    results = calculate_rgbi_method(frame, polygons)

    return {results}

def calculate_histogram(data):
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    polygons = data.get("polygons")
    image_data_url = data.get("image")
    teach_histograms = data.get("teachHistograms")

    if not all([type_no, prog_no, polygons, image_data_url, teach_histograms]):
        raise ValueError("Eksik veri - Histogram Calculation")
    
    frame = decode_base64_image(image_data_url)
    if frame is None:
        raise ValueError("Invalid image data")
    
    results = calculate_histogram_method(frame, polygons, teach_histograms)

    return {results}

def teach_histogram(data):
    type_no = data.get("typeNo")
    prog_no = data.get("progNo")
    polygons = data.get("polygons")
    image_data_url = data.get("image")
    
    if not all([type_no, prog_no, polygons, image_data_url]):
        raise ValueError("Eksik veri - Histogram Teach")
    
    frame = decode_base64_image(image_data_url)
    if frame is None:
        raise ValueError("Invalid image data")
    
    results = teach_histogram_method(frame, polygons)

    return {results}
