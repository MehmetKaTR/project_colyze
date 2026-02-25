from flask import Blueprint, Response, jsonify, request
import requests
import cv2
from skimage.feature import local_binary_pattern
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import numpy as np
import json
import ctypes
import tisgrabber as tis
import cv2
import base64
from pathlib import Path
import os
from datetime import datetime
import sys
import shutil
import xml.etree.ElementTree as ET
from path_config import (
    APP_BASE_DIR,
    CAMERA_PROFILES_DIR,
    CAMERA_PROFILES_FILE,
    DEVICE_XML_PATH,
    DEVICE_XML_TEMPLATE,
    ML_ROOT_DIR,
    TEMP_FRAMES_DIR,
    TEMP_TEXTS_DIR,
    TISGRABBER_DLL_PATH,
    ensure_runtime_layout,
)

camera_bp = Blueprint('camera', __name__)
# camera = None

ensure_runtime_layout()
BASE_DIR = APP_BASE_DIR

# def start_camera():
#     global camera
#     if camera is None:
#         camera = cv2.VideoCapture(0)
#         if not camera.isOpened():
#             camera = None
#             return False
#     return True
# 
# def stop_camera():
#     global camera
#     if camera is not None:
#         camera.release()
#         camera = None
#         return True
#     return False
# 
# def get_current_frame():
#     if camera is None or not camera.isOpened():
#         return None
#     ret, frame = camera.read()
#     return frame if ret else None
# 
# @camera_bp.route('/shutdown', methods=['POST'])
# def shutdown():
#     func = request.environ.get('werkzeug.server.shutdown')
#     if func is None:
#         return jsonify({'error': 'Server shutdown not supported'}), 500
#     
#     # Kamera varsa kapat
#     stop_camera()
# 
#     func()
#     return jsonify({'status': 'Server shutting down...'})
# 
# def get_current_frame():
#     """Mevcut frame'i alır."""
#     global camera
#     if camera is None:
#         return None
# 
#     ret, frame = camera.read()
#     if not ret:
#         return None
# 
#     # Gerekirse OpenCV ile işlemler yap
#     frame = cv2.flip(frame, 0)  # Orijinal scriptteki gibi ters çevirme
#     return frame
# 
def encode_frame_to_jpeg(frame):
    """Frame'i JPEG formatına çevirir (HTTP üzerinden göstermek için)."""
    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        return None
    return buffer.tobytes()

# -------------------- IC Image Source Camera Setup --------------------

dll_path = str(TISGRABBER_DLL_PATH)
ic = ctypes.cdll.LoadLibrary(dll_path)
tis.declareFunctions(ic)
ic.IC_InitLibrary(0)

camera = None
active_profile_id = None

DEFAULT_PROFILE_ID = "default_profile"
DEFAULT_PROFILE_NAME = "Default Camera Profile"


def _ensure_profile_storage():
    CAMERA_PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    if not CAMERA_PROFILES_FILE.exists():
        CAMERA_PROFILES_FILE.write_text(
            json.dumps({"profiles": [], "active_profile_id": None}, indent=2),
            encoding="utf-8",
        )


def _ensure_default_profile(data):
    profiles = data.get("profiles")
    if not isinstance(profiles, list):
        profiles = []
        data["profiles"] = profiles

    default_exists = any(item.get("id") == DEFAULT_PROFILE_ID for item in profiles)
    if not default_exists:
        profiles.insert(
            0,
            {
                "id": DEFAULT_PROFILE_ID,
                "name": DEFAULT_PROFILE_NAME,
                "xml_path": str(_fallback_xml_path()),
                "created_at": datetime.now().isoformat(),
                "settings": {},
                "is_system": True,
                "locked": True,
                "camera_identity": _extract_camera_identity_from_xml(_fallback_xml_path()),
            },
        )

    if not data.get("active_profile_id"):
        data["active_profile_id"] = DEFAULT_PROFILE_ID

    return data


def _load_profiles_store():
    _ensure_profile_storage()
    try:
        raw = CAMERA_PROFILES_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
        if "profiles" not in data:
            data["profiles"] = []
        if "active_profile_id" not in data:
            data["active_profile_id"] = None
        data = _ensure_default_profile(data)
        _hydrate_profiles_camera_identity(data)
        return data
    except Exception:
        data = _ensure_default_profile({"profiles": [], "active_profile_id": None})
        _hydrate_profiles_camera_identity(data)
        return data


def _save_profiles_store(data):
    _ensure_profile_storage()
    normalized = _ensure_default_profile(data)
    _hydrate_profiles_camera_identity(normalized)
    CAMERA_PROFILES_FILE.write_text(json.dumps(normalized, indent=2), encoding="utf-8")


def _extract_camera_identity_from_xml(xml_path):
    identity = {
        "device_name": "Unknown Device",
        "device_base_name": "",
        "device_unique_name": "",
        "videoformat": "",
        "fps": "",
    }
    try:
        xml_file = Path(xml_path)
        if not xml_file.exists():
            return identity
        tree = ET.parse(str(xml_file))
        root = tree.getroot()
        device = root.find("device")
        if device is None:
            return identity

        identity["device_name"] = (device.attrib.get("name") or "").strip() or "Unknown Device"
        identity["device_base_name"] = (device.attrib.get("base_name") or "").strip()
        identity["device_unique_name"] = (device.attrib.get("unique_name") or "").strip()

        videoformat = device.findtext("videoformat")
        fps = device.findtext("fps")
        identity["videoformat"] = (videoformat or "").strip()
        identity["fps"] = (fps or "").strip()
    except Exception:
        return identity
    return identity


def _hydrate_profiles_camera_identity(data):
    changed = False
    profiles = data.get("profiles", [])
    for item in profiles:
        xml_path = item.get("xml_path")
        if not xml_path:
            continue
        current = item.get("camera_identity") or {}
        if current.get("device_name") and current.get("device_unique_name"):
            continue
        item["camera_identity"] = _extract_camera_identity_from_xml(xml_path)
        changed = True
    return changed


def _resolve_profile(profile_id):
    if not profile_id:
        return None
    data = _load_profiles_store()
    for item in data.get("profiles", []):
        if item.get("id") == profile_id:
            return item
    return None


def _safe_get_exposure_settings(hGrabber):
    result = {
        "exposure_auto": None,
        "exposure": None,
        "exposure_range": None,
    }
    try:
        exposureauto = ctypes.c_long()
        ic.IC_SetPropertySwitch(hGrabber, tis.T("Exposure"), tis.T("Auto"), exposureauto)
        result["exposure_auto"] = int(exposureauto.value)
    except Exception:
        pass
    try:
        exposure = ctypes.c_float()
        expmin = ctypes.c_float()
        expmax = ctypes.c_float()
        ic.IC_GetPropertyAbsoluteValue(hGrabber, tis.T("Exposure"), tis.T("Value"), exposure)
        ic.IC_GetPropertyAbsoluteValueRange(hGrabber, tis.T("Exposure"), tis.T("Value"), expmin, expmax)
        result["exposure"] = float(exposure.value)
        result["exposure_range"] = [float(expmin.value), float(expmax.value)]
    except Exception:
        pass
    return result


def _safe_get_gain_settings(hGrabber):
    result = {
        "gain": None,
        "gain_range": None,
    }
    try:
        gain = ctypes.c_long()
        gainmin = ctypes.c_long()
        gainmax = ctypes.c_long()
        ic.IC_GetPropertyValue(hGrabber, tis.T("Gain"), tis.T("Value"), gain)
        ic.IC_GetPropertyValueRange(hGrabber, tis.T("Gain"), tis.T("Value"), gainmin, gainmax)
        result["gain"] = int(gain.value)
        result["gain_range"] = [int(gainmin.value), int(gainmax.value)]
    except Exception:
        pass
    return result


def _read_grabber_settings(hGrabber):
    settings = {}
    settings.update(_safe_get_exposure_settings(hGrabber))
    settings.update(_safe_get_gain_settings(hGrabber))
    return settings


def _apply_settings_to_grabber(hGrabber, settings):
    if not settings:
        return
    try:
        if settings.get("exposure_auto") is not None:
            ic.IC_SetPropertySwitch(
                hGrabber,
                tis.T("Exposure"),
                tis.T("Auto"),
                int(settings["exposure_auto"]),
            )
    except Exception:
        pass
    try:
        if settings.get("exposure") is not None:
            ic.IC_SetPropertyAbsoluteValue(
                hGrabber,
                tis.T("Exposure"),
                tis.T("Value"),
                ctypes.c_float(float(settings["exposure"])),
            )
    except Exception:
        pass
    try:
        if settings.get("gain") is not None:
            ic.IC_SetPropertyValue(
                hGrabber,
                tis.T("Gain"),
                tis.T("Value"),
                ctypes.c_long(int(settings["gain"])),
            )
    except Exception:
        pass


def _fallback_xml_path():
    return DEVICE_XML_PATH


def _resolve_source_xml_path(source_xml_raw=None):
    candidates = []
    if source_xml_raw:
        candidates.append(Path(source_xml_raw))

    candidates.extend(
        [
            _fallback_xml_path(),
            DEVICE_XML_TEMPLATE,
            Path(__file__).resolve().parent / "devicef1.xml",
            Path.cwd() / "flask-server" / "routes" / "devicef1.xml",
            Path.cwd() / "routes" / "devicef1.xml",
        ]
    )

    for candidate in candidates:
        try:
            if candidate.exists():
                return candidate.resolve()
        except Exception:
            continue
    return None


def _current_xml_path():
    global active_profile_id
    if active_profile_id:
        profile = _resolve_profile(active_profile_id)
        if profile and profile.get("xml_path"):
            return Path(profile["xml_path"])
    return _fallback_xml_path()

def start_camera(profile_id=None):
    global camera, active_profile_id

    if profile_id is not None:
        active_profile_id = profile_id

    config_path = _current_xml_path()
    config_file = str(config_path)

    # If no xml exists for current selection, ask user to select camera and persist.
    if not os.path.exists(config_file):
        print("Camera profile xml not found -> opening camera selection dialog...")
        hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

        if ic.IC_IsDevValid(hGrabber):
            ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(config_file))
            ic.IC_ReleaseGrabber(hGrabber)
        else:
            print("No camera selected.")
            return False

    if camera is None:
        camera = ic.IC_LoadDeviceStateFromFile(None, tis.T(config_file))
        if not ic.IC_IsDevValid(camera):
            camera = None
            return False
        ic.IC_StartLive(camera, 1)

    return True


def stop_camera():
    global camera
    if camera is not None:
        try:
            if ic.IC_IsDevValid(camera):
                ic.IC_StopLive(camera)
                ic.IC_ReleaseGrabber(camera)
            else:
                print("Kamera zaten geçersiz durumda, kapatmaya gerek yok.")
        except Exception as e:
            print("Kamera durdurulurken hata:", e)
        finally:
            camera = None
            return True
    else:
        print("Kamera zaten None durumda.")
        return False


def get_current_frame():
    global camera
    if camera is None or not ic.IC_IsDevValid(camera):
        return None

    # Görüntü açıklaması bilgilerini çek
    Width = ctypes.c_long()
    Height = ctypes.c_long()
    BitsPerPixel = ctypes.c_int()
    ColorFormat = ctypes.c_int()

    ic.IC_GetImageDescription(camera, Width, Height, BitsPerPixel, ColorFormat)

    width = Width.value
    height = Height.value
    bpp = BitsPerPixel.value // 8
    buffer_size = width * height * bpp

    # Görüntüyü al
    if ic.IC_SnapImage(camera, 2000) == tis.IC_SUCCESS:
        image_ptr = ic.IC_GetImagePtr(camera)

        imagedata = ctypes.cast(image_ptr, ctypes.POINTER(ctypes.c_ubyte * buffer_size))

        image = np.ndarray(buffer=imagedata.contents,
                           dtype=np.uint8,
                           shape=(height, width, bpp))

        # OpenCV işlemleri
        image = cv2.flip(image, 0)
        return image
    else:
        return None


# -------------------- Flask Routes --------------------

@camera_bp.route('/start_camera')
def start_camera_route():
    profile_id = request.args.get("profile_id")
    if start_camera(profile_id=profile_id):
        return jsonify({'status': 'Camera started'})
    return jsonify({'error': 'Failed to start camera'}), 500

@camera_bp.route('/stop_camera')
def stop_camera_route():
    try:
        stopped = stop_camera()
        if stopped:
            return jsonify({'status': 'Camera stopped successfully'})
        else:
            return jsonify({'status': 'Camera was not running'})
    except Exception as e:
        print("Kamera durdurma hatası:", e)
        return jsonify({'error': str(e)}), 500


@camera_bp.route('/camera_profiles', methods=['GET'])
def get_camera_profiles():
    global active_profile_id
    data = _load_profiles_store()
    stored_active = data.get("active_profile_id")
    if stored_active and not active_profile_id:
        active_profile_id = stored_active
    if active_profile_id and stored_active != active_profile_id:
        data["active_profile_id"] = active_profile_id
        _save_profiles_store(data)

    return jsonify({
        "profiles": data.get("profiles", []),
        "active_profile_id": active_profile_id,
    })


@camera_bp.route('/camera_profiles/create', methods=['POST'])
def create_camera_profile():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Profile name is required"}), 400

    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)
    if not ic.IC_IsDevValid(hGrabber):
        try:
            ic.IC_ReleaseGrabber(hGrabber)
        except Exception:
            pass
        return jsonify({"error": "No device selected"}), 400

    _ensure_profile_storage()
    profile_id = f"profile_{int(datetime.now().timestamp() * 1000)}"
    xml_path = CAMERA_PROFILES_DIR / f"{profile_id}.xml"
    ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(str(xml_path)))
    settings = _read_grabber_settings(hGrabber)
    ic.IC_ReleaseGrabber(hGrabber)

    data = _load_profiles_store()
    profile = {
        "id": profile_id,
        "name": name,
        "xml_path": str(xml_path),
        "created_at": datetime.now().isoformat(),
        "settings": settings,
        "camera_identity": _extract_camera_identity_from_xml(xml_path),
    }
    data["profiles"].append(profile)
    data["active_profile_id"] = profile_id
    _save_profiles_store(data)

    return jsonify({"status": "success", "profile": profile, "active_profile_id": profile_id})


@camera_bp.route('/camera_profiles/create_from_xml', methods=['POST'])
def create_camera_profile_from_xml():
    global active_profile_id
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Profile name is required"}), 400

    source_xml_raw = payload.get("source_xml_path")
    source_xml = _resolve_source_xml_path(source_xml_raw)
    if source_xml is None:
        return jsonify({"error": "Source xml not found. Expected devicef1.xml in routes folder."}), 404

    _ensure_profile_storage()
    profile_id = f"profile_{int(datetime.now().timestamp() * 1000)}"
    target_xml = CAMERA_PROFILES_DIR / f"{profile_id}.xml"
    shutil.copy2(source_xml, target_xml)

    profile = {
        "id": profile_id,
        "name": name,
        "xml_path": str(target_xml),
        "created_at": datetime.now().isoformat(),
        "settings": {},
        "source_xml_path": str(source_xml),
        "camera_identity": _extract_camera_identity_from_xml(target_xml),
    }

    data = _load_profiles_store()
    data["profiles"].append(profile)
    data["active_profile_id"] = profile_id
    active_profile_id = profile_id
    _save_profiles_store(data)

    return jsonify({"status": "success", "profile": profile, "active_profile_id": profile_id})


@camera_bp.route('/camera_profiles/activate', methods=['POST'])
def activate_camera_profile():
    global active_profile_id
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    if not profile_id:
        return jsonify({"error": "profile_id is required"}), 400

    profile = _resolve_profile(profile_id)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    active_profile_id = profile_id
    data = _load_profiles_store()
    data["active_profile_id"] = profile_id
    _save_profiles_store(data)

    stop_camera()
    started = start_camera(profile_id=profile_id)

    return jsonify({
        "status": "success" if started else "warning",
        "message": "Profile activated" if started else "Profile set, but camera could not start.",
        "active_profile_id": profile_id,
    })


@camera_bp.route('/camera_profiles/delete', methods=['POST'])
def delete_camera_profile():
    global active_profile_id
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    if not profile_id:
        return jsonify({"error": "profile_id is required"}), 400
    if profile_id == DEFAULT_PROFILE_ID:
        return jsonify({"error": "Default profile cannot be deleted"}), 400

    data = _load_profiles_store()
    profiles = data.get("profiles", [])
    target = None
    remaining = []
    for item in profiles:
        if item.get("id") == profile_id:
            target = item
        else:
            remaining.append(item)

    if target is None:
        return jsonify({"error": "Profile not found"}), 404

    xml_path_raw = target.get("xml_path")
    if xml_path_raw:
        try:
            xml_path = Path(xml_path_raw)
            if xml_path.exists():
                xml_path.unlink()
        except Exception as e:
            print(f"Failed to delete profile xml: {e}")

    was_active = active_profile_id == profile_id
    data["profiles"] = remaining

    if was_active:
        active_profile_id = remaining[0]["id"] if remaining else None
        data["active_profile_id"] = active_profile_id
        stop_camera()
        if active_profile_id:
            start_camera(profile_id=active_profile_id)
    else:
        if data.get("active_profile_id") == profile_id:
            data["active_profile_id"] = active_profile_id

    _save_profiles_store(data)
    return jsonify({
        "status": "success",
        "deleted_profile_id": profile_id,
        "active_profile_id": active_profile_id,
    })


@camera_bp.route('/camera_profiles/update_settings', methods=['POST'])
def update_camera_profile_settings():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    if not profile_id:
        return jsonify({"error": "profile_id is required"}), 400

    profile = _resolve_profile(profile_id)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    xml_path = Path(profile.get("xml_path", ""))
    if not xml_path.exists():
        return jsonify({"error": "Profile xml file not found"}), 404

    hGrabber = ic.IC_LoadDeviceStateFromFile(None, tis.T(str(xml_path)))
    if not ic.IC_IsDevValid(hGrabber):
        try:
            ic.IC_ReleaseGrabber(hGrabber)
        except Exception:
            pass
        return jsonify({"error": "Profile camera state is invalid"}), 500

    desired_settings = {
        "exposure_auto": payload.get("exposure_auto"),
        "exposure": payload.get("exposure"),
        "gain": payload.get("gain"),
    }
    _apply_settings_to_grabber(hGrabber, desired_settings)
    ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(str(xml_path)))
    merged_settings = _read_grabber_settings(hGrabber)
    ic.IC_ReleaseGrabber(hGrabber)

    data = _load_profiles_store()
    updated = None
    for item in data.get("profiles", []):
        if item.get("id") == profile_id:
            item["settings"] = merged_settings
            updated = item
            break
    _save_profiles_store(data)

    if profile_id == active_profile_id:
        stop_camera()
        start_camera(profile_id=profile_id)

    return jsonify({"status": "success", "profile": updated})


@camera_bp.route('/current_frame')
def current_frame_route():
    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'No frame available'}), 500

    jpeg = encode_frame_to_jpeg(frame)
    return Response(jpeg, mimetype='image/jpeg')


@camera_bp.route('/save_txt', methods=['POST'])
def save_txt():
    try:
        data = request.get_json()
        image_data_url = data.get("image")
        type_no = data.get("typeNo", "unknown")
        prog_no = data.get("progNo", "unknown")
        measure_type = data.get("measureType", "unknown").lower()
        datetime_str = data.get("datetime")
        results = data.get("results")

        if not image_data_url:
            return jsonify({"error": "Image data missing"}), 400

        # Decode image
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Create directories
        temp_text_dir = TEMP_TEXTS_DIR
        print("text dir",temp_text_dir)

        temp_text_dir.mkdir(parents=True, exist_ok=True)

        # File naming
        if datetime_str:
            filename_base = f"{type_no}_{prog_no}_{datetime_str}_{measure_type}"
        else:
            now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
            filename_base = f"{type_no}_{prog_no}_{now_str}_{measure_type}"

        # Save image
        #image_path = temp_frame_dir / f"{filename_base}.jpg"
        #print(image_path)
        #cv2.imwrite(str(image_path), frame)

        # Save result as .txt
        text_path = temp_text_dir / f"{filename_base}.txt"
        print("DEBUG TXT PATH: ", text_path)

        with open(text_path, "w", encoding="utf-8") as f:
            for r in results:
                f.write(f"ID {r['id']}:\n")
                if measure_type == "rgbi":
                    each_status = r.get("each_status", [])

                    # Teach verisi yoksa veya eksikse hata döndür
                    if (
                        not isinstance(each_status, list) 
                        or len(each_status) < 4 
                        or any(s is None or str(s).strip() == "" for s in each_status)
                    ):
                        return jsonify({"error": "Teach verisi bulunmuyor. Lütfen önce Teach yapın."}), 400

                    
                    status_labels = ["OK" if s else "NOK" for s in r["each_status"]]
                    f.write(f"  R: {r['avg_r']:.2f} -> {status_labels[0]}\n")
                    f.write(f"  G: {r['avg_g']:.2f} -> {status_labels[1]}\n")
                    f.write(f"  B: {r['avg_b']:.2f} -> {status_labels[2]}\n")
                    f.write(f"  I: {r['intensity']:.2f} -> {status_labels[3]}\n")
                elif measure_type == "histogram":
                    scores = r.get("scores", {})
                    f.write(f"  R_diff: {scores.get('R', 0):.4f}\n")
                    f.write(f"  G_diff: {scores.get('G', 0):.4f}\n")
                    f.write(f"  B_diff: {scores.get('B', 0):.4f}\n")
                elif measure_type == "edge":
                    if "score" in r:
                        f.write(f"  Found: {bool(r.get('found', False))}\n")
                        f.write(f"  Count: {int(r.get('count', 0) or 0)}\n")
                        f.write(f"  Score: {float(r.get('score', 0) or 0):.4f}\n")
                        f.write(f"  Tolerance: {float(r.get('tolerance', 0) or 0):.4f}\n")
                        f.write(f"  AreaRatio: {float(r.get('area_ratio', 0) or 0):.4f}\n")
                    else:
                        f.write(f"  Edge: {float(r.get('edge_density', 0)):.4f}\n")
                        f.write(f"  Ref: {float(r.get('ref_density', 0)):.4f}\n")
                        f.write(f"  Diff: {float(r.get('diff', 0)):.4f}\n")
                        f.write(f"  Tolerance: {float(r.get('tolerance', 0)):.4f}\n")
                f.write(f"  RESULT: {r['status']}\n\n")

        return jsonify({"saved": True, "filename": f"{filename_base}.jpg"})
    except Exception as e:
        import traceback
        print("save_txt HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/save_frame_with_polygons', methods=['POST'])
def save_frame_with_polygons():
    try:
        data = request.get_json()
        image_data_url = data.get("image")
        type_no = data.get("typeNo", "unknown")
        prog_no = data.get("progNo", "unknown")
        measure_type = data.get("measureType", "unknown").lower()
        datetime_str = data.get("datetime")
        polygons = data.get("polygons", [])

        if not image_data_url:
            return jsonify({"error": "Image data missing"}), 400

        # Decode image
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400

        overlay = frame.copy()

        for polygon in polygons:
            points = polygon.get("points", [])
            status = polygon.get("status", "").upper()
            if len(points) < 3:
                continue

            pts = np.array([[int(p['x']), int(p['y'])] for p in points], np.int32).reshape((-1,1,2))

            # Renk ve alpha
            if status == "OK":
                fill_color = (69, 230, 16)
                alpha = 0.4
            elif status == "NOK":
                fill_color = (36, 36, 192)
                alpha = 0.86
            else:
                fill_color = None
                alpha = 0.0

            # Sınır çiz
            cv2.polylines(frame, [pts], isClosed=True, color=(255,255,255), thickness=2)

            # İçini doldur
            if fill_color and alpha > 0:
                cv2.fillPoly(overlay, [pts], fill_color)

            # Polygon ID yaz
            M = cv2.moments(pts)
            cX, cY = (int(M["m10"]/M["m00"]), int(M["m01"]/M["m00"])) if M["m00"] != 0 else (pts[0][0][0], pts[0][0][1])
            poly_id = str(polygon.get("id",""))
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            text_size, _ = cv2.getTextSize(poly_id, font, font_scale, thickness)
            text_w, text_h = text_size
            text_x = cX - text_w // 2
            text_y = cY + text_h // 2
            cv2.putText(frame, poly_id, (text_x, text_y), font, font_scale, (255,255,255), thickness, lineType=cv2.LINE_AA)

        cv2.addWeighted(overlay, alpha, frame, 1-alpha, 0, frame)

        # Kaydetme
        temp_frame_dir = TEMP_FRAMES_DIR
        temp_frame_dir.mkdir(parents=True, exist_ok=True)

        if datetime_str:
            filename = f"{type_no}_{prog_no}_{datetime_str}_{measure_type}.jpg"
        else:
            now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
            filename = f"{type_no}_{prog_no}_{now_str}_{measure_type}.jpg"

        filepath = temp_frame_dir / filename
        cv2.imwrite(str(filepath), frame)
        print("DEBUG SAVE FRAME: ",filepath)

        return jsonify({"saved": True, "filename": filename})
    except Exception as e:
        import traceback
        print("save_frame_with_polygons HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/save_ml_pre_proc', methods=['POST'])
def save_ml_pre_proc():
    try:
        data = request.get_json()
        type_no = data.get("typeNo", "unknown")
        prog_no = data.get("progNo", "unknown")
        datetime_str = data.get("datetime")
        results = data.get("results")

        # Ana klasör → ml/type_no/prog_no
        save_dir = ML_ROOT_DIR / str(type_no) / str(prog_no)
        save_dir.mkdir(parents=True, exist_ok=True)
        print("ML PRE PROC SAVE DIR:", save_dir)

        # File naming
        if datetime_str:
            filename_base = f"{type_no}_{prog_no}_{datetime_str}_ml"
        else:
            now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
            filename_base = f"{type_no}_{prog_no}_{now_str}_ml"

        # Save result as .txt
        text_path = save_dir / f"{filename_base}.txt"
        print("ML PRE PROC RESULTS BEFORE WRITING ON TXT FILE:", results)    

        with open(text_path, "w", encoding="utf-8") as f:
            for r in results:
                poly_id = r.get("id")
                ok_nok = r.get("okNok", False)
                features = r.get("features", [])
                f.write(f"ID: {poly_id} | OK/NOK: {ok_nok}\n")
                f.write("Features:\n")
                f.write(" ".join(map(str, features)))  # features'i tek satırda yaz
                f.write("\n\n")  # polygonlar arası boşluk
                

        return jsonify({"saved": True, "filename": f"{filename_base}.jpg"})
    except Exception as e:
        import traceback
        print("save_frame HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


camera_mode = {
    "full": False  # default crop
}

@camera_bp.route('/live_camera')
def live_camera():
    x = request.args.get('x', type=int)
    y = request.args.get('y', type=int)
    w = request.args.get('w', type=int)
    h = request.args.get('h', type=int)
    full = request.args.get('full', 'false').lower() == 'true'

    frame = get_current_frame()
    if frame is None:
        return jsonify({'error': 'Kameradan görüntü alınamadı'}), 500

    if full or None in [x, y, w, h]:
        cropped = frame
    else:
        h_frame, w_frame = frame.shape[:2]
        x = max(0, min(x, w_frame-1))
        y = max(0, min(y, h_frame-1))
        w = max(1, min(w, w_frame-x))
        h = max(1, min(h, h_frame-y))
        cropped = frame[y:y+h, x:x+w]

    _, buffer = cv2.imencode('.jpg', cropped)
    img_uri = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode()}"
    return jsonify({'image': img_uri})

# =================== Camera Properties Save For Universal Systems =====================   
# 
# @camera_bp.route('/ic4_xml_save')
# def device_xml_save():
#     # Mevcut ayarları kaydet
#     camera_settings_file = Path("./routes/devicef1.json")
#     
#     settings = {}
#     cap = cv2.VideoCapture(2)
#     if not cap.isOpened():
#         return jsonify({"status": "error", "message": "Kamera açılamadı."}), 500
# 
#     settings['frame_width'] = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
#     settings['frame_height'] = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
#     settings['exposure'] = cap.get(cv2.CAP_PROP_EXPOSURE)
#     settings['gain'] = cap.get(cv2.CAP_PROP_GAIN)
#     settings['focus'] = cap.get(cv2.CAP_PROP_FOCUS)
# 
#     camera_settings_file.parent.mkdir(exist_ok=True)
#     with open(camera_settings_file, "w") as f:
#         json.dump(settings, f, indent=4)
# 
#     cap.release()
#     return jsonify({"status": "success", "message": f"Ayarlar {camera_settings_file} olarak kaydedildi."})
# 
# 
# @camera_bp.route('/ic4_configure')
# def configure_camera_properties():
#     cap = cv2.VideoCapture(2)
#     if not cap.isOpened():
#         return jsonify({"status": "error", "message": "Kamera açılamadı."}), 500
# 
#     # Exposure, gain, focus değerleri alınabilir veya değiştirilir
#     # Örnek: exposure manuel ayarlama (varsa)
#     cap.set(cv2.CAP_PROP_EXPOSURE, -5)  # Linux/Windows değer farklı olabilir
#     cap.set(cv2.CAP_PROP_GAIN, 0)
#     cap.set(cv2.CAP_PROP_FOCUS, 0)
# 
#     # Mevcut değerleri oku
#     settings = {
#         "exposure": cap.get(cv2.CAP_PROP_EXPOSURE),
#         "gain": cap.get(cv2.CAP_PROP_GAIN),
#         "focus": cap.get(cv2.CAP_PROP_FOCUS),
#         "frame_width": cap.get(cv2.CAP_PROP_FRAME_WIDTH),
#         "frame_height": cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
#     }
# 
#     # Ayarları JSON dosyasına kaydet
#     camera_settings_file.parent.mkdir(exist_ok=True)
#     with open(camera_settings_file, "w") as f:
#         json.dump(settings, f, indent=4)
# 
#     cap.release()
#     return jsonify({
#         "status": "success",
#         **settings,
#         "settings_saved_to": str("./routes/devicef1.json")
#     })

# =================== Camera Properties Save For Windows Systems (IC4) =====================   

@camera_bp.route('/ic4_xml_save')
def device_xml_save():
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

    if ic.IC_IsDevValid(hGrabber):
        xml_path_str = str(_fallback_xml_path())
        ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(xml_path_str))
        response = {
            "status": "success",
            "message": "Ayarlar devicef1.xml olarak kaydedildi.",
            "xml_saved_to": xml_path_str,
        }
    else:
        ic.IC_MsgBox(tis.T("No device opened"), tis.T("Simple Live Video"))
        response = {"status": "error", "message": "Cihaz açık değil veya geçersiz."}

    ic.IC_ReleaseGrabber(hGrabber)
    return jsonify(response)

@camera_bp.route('/ic4_configure')
def configure_camera_properties():
    hGrabber = ic.IC_ShowDeviceSelectionDialog(None)

    if not ic.IC_IsDevValid(hGrabber):
        ic.IC_ReleaseGrabber(hGrabber)
        return jsonify({"status": "error", "message": "No device opened."})

    xml_path_str = str(_fallback_xml_path())
    ic.IC_SaveDeviceStateToFile(hGrabber, tis.T(xml_path_str))

    ic.IC_ReleaseGrabber(hGrabber)

    return jsonify({
        "status": "success",
        "message": "Device configuration saved.",
        "xml_saved_to": xml_path_str
    })

# =================== Calculate Methods =====================
def _decode_image_data_url(image_data_url: str):
    header, encoded = image_data_url.split(",", 1)
    image_bytes = base64.b64decode(encoded)
    frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    return frame


def _polygon_binary_and_mask(gray_frame, points, threshold_value):
    coords = [(int(p["x"]), int(p["y"])) for p in points]
    pts = np.array(coords, dtype=np.int32)
    x, y, w, h = cv2.boundingRect(pts)
    if w <= 1 or h <= 1:
        return None, None, None

    roi_gray = gray_frame[y:y + h, x:x + w]
    local_pts = pts - np.array([x, y], dtype=np.int32)

    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [local_pts], 255)

    thr = int(np.clip(threshold_value, 0, 255))
    _, binary = cv2.threshold(roi_gray, thr, 255, cv2.THRESH_BINARY)
    binary = cv2.bitwise_and(binary, binary, mask=mask)
    return binary, (x, y, w, h), mask


def _hu_log_signature(contour):
    moments = cv2.moments(contour)
    hu = cv2.HuMoments(moments).flatten()
    hu = np.where(np.abs(hu) < 1e-30, 1e-30, hu)
    return (-np.sign(hu) * np.log10(np.abs(hu))).astype(np.float32)


@camera_bp.route('/teach_edge_pattern', methods=['POST'])
def teach_edge_pattern():
    try:
        data = request.get_json()
        polygons = data.get("polygons") or []
        image_data_url = data.get("image")

        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        frame = _decode_image_data_url(image_data_url)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        taught = []
        for poly in polygons:
            points = poly.get("points") or []
            if not points:
                continue

            threshold_value = float(poly.get("edge_pattern_threshold", 120) or 120)
            binary, bbox, _ = _polygon_binary_and_mask(gray, points, threshold_value)
            if binary is None:
                taught.append({"id": poly.get("id"), "error": "invalid_polygon"})
                continue

            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours = [c for c in contours if cv2.contourArea(c) > 30]
            if not contours:
                taught.append({"id": poly.get("id"), "error": "no_contour"})
                continue

            best = max(contours, key=cv2.contourArea)
            area = float(cv2.contourArea(best))
            hu_log = _hu_log_signature(best).tolist()

            taught.append({
                "id": poly.get("id"),
                "edge_pattern_hu": hu_log,
                "edge_pattern_area": area,
                "edge_pattern_threshold": threshold_value,
            })

        return jsonify({"taught": taught}), 200
    except Exception as e:
        import traceback
        print("teach_edge_pattern HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/measure_edge_pattern', methods=['POST'])
def measure_edge_pattern():
    try:
        data = request.get_json()
        polygons = data.get("polygons") or []
        image_data_url = data.get("image")

        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        frame = _decode_image_data_url(image_data_url)
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        results = []
        for poly in polygons:
            poly_id = poly.get("id")
            teach_hu = poly.get("edge_pattern_hu") or []
            teach_area = float(poly.get("edge_pattern_area", 0) or 0)
            threshold_value = float(poly.get("edge_pattern_threshold", 120) or 120)
            score_tol = float(poly.get("edge_tolerance", 1.0) or 1.0)

            if not teach_hu:
                results.append({"id": poly_id, "status": "NOK", "found": False, "reason": "teach_missing"})
                continue

            thr = int(np.clip(threshold_value, 0, 255))
            _, binary = cv2.threshold(gray, thr, 255, cv2.THRESH_BINARY)

            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours = [c for c in contours if cv2.contourArea(c) > 30]
            if not contours:
                results.append({"id": poly_id, "status": "NOK", "found": False, "reason": "no_contour", "count": 0, "detections": []})
                continue

            teach_vec = np.array(teach_hu, dtype=np.float32)
            detections = []
            best_score = None
            for contour in contours:
                cand_vec = _hu_log_signature(contour)
                score = float(np.sum(np.abs(cand_vec - teach_vec)))
                area = float(cv2.contourArea(contour))
                area_ratio = (area / teach_area) if teach_area > 1e-6 else 0.0
                area_ok = (teach_area <= 1e-6) or (0.4 <= area_ratio <= 2.5)
                if score <= score_tol and area_ok:
                    pts = [{"x": int(pt[0][0]), "y": int(pt[0][1])} for pt in contour]
                    detections.append({
                        "score": score,
                        "area_ratio": area_ratio,
                        "points": pts,
                    })
                    if best_score is None or score < best_score:
                        best_score = score

            count = len(detections)
            is_ok = count > 0
            status = "OK" if is_ok else "NOK"

            results.append({
                "id": poly_id,
                "found": is_ok,
                "count": count,
                "score": float(best_score) if best_score is not None else None,
                "tolerance": score_tol,
                "area_ratio": float(detections[0]["area_ratio"]) if detections else 0.0,
                "teach_area": float(teach_area),
                "detections": detections,
                "status": status,
            })

        return jsonify({"results": results}), 200
    except Exception as e:
        import traceback
        print("measure_edge_pattern HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/calculate_rgbi', methods=['POST'])
def calculate_rgbi():
    try:
        data = request.get_json()
        polygons = data.get("polygons")
        image_data_url = data.get("image")
        
        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü verisi çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape
        results = []

        # Poligonlar üzerinden dön
        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            if not points:
                continue
            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_vals = masked[:, :, 0][mask == 255]
            g_vals = masked[:, :, 1][mask == 255]
            b_vals = masked[:, :, 2][mask == 255]
            if r_vals.size == 0: continue

            results.append({
                'id': poly_id,
                'avg_r': round(np.mean(r_vals), 1),
                'avg_g': round(np.mean(g_vals), 1),
                'avg_b': round(np.mean(b_vals), 1),
                'intensity': round((np.mean(r_vals) + np.mean(g_vals) + np.mean(b_vals)) / 3, 1)
            })

        return jsonify(results)
    except Exception as e:
        import traceback
        print("🔴 calculate_rgbi HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# ------------- Parametreler -------------
LBP_RADIUS = 1
LBP_N_POINTS = 8 * LBP_RADIUS
GLCM_DISTANCES = [1, 2]
GLCM_ANGLES = [0, np.pi/4, np.pi/2, 3*np.pi/4]
# ----------------------------------------

def compute_glcm_features(gray, distances=[1,2], angles=[0, np.pi/4, np.pi/2, 3*np.pi/4], levels=16):
    """
    Skimage kullanmadan basit GLCM benzeri doku özellikleri çıkarır.
    """
    img = (gray / (256/levels)).astype(np.uint8)
    feats = []
    
    for d in distances:
        for angle in angles:
            # Dikey kaydırma örneği
            shifted = np.roll(img, shift=d, axis=0)
            diff = (img - shifted) ** 2
            feats.append(np.mean(diff))
            feats.append(np.std(diff))
    return np.array(feats, dtype=np.float32)


def extract_features(roi: np.ndarray, mask: np.ndarray = None, resize_to=(128,128)):
    """
    Poligon içindeki masked RGB ROI'den feature vector çıkarır.
    CPU dostu, klasik ML için uygun.

    NOT: roi burada BGR formatında beklenir (cv2.imdecode'den gelen).
    Eğer mask sağlanırsa (aynı kırpılmış ROI boyutunda) histogram ve istatistikler
    sadece mask'li pikseller üzerinden hesaplanır.
    """
    FIXED_FEATURE_SIZE = 86
    
    if roi is None or roi.size == 0:
        return np.zeros(1, dtype=np.float32)

    # Resize ROI
    roi_resized = cv2.resize(roi, resize_to, interpolation=cv2.INTER_AREA)
    cv2.imwrite("roi_resized.png",roi_resized)

    # Eğer mask verilmişse, onu da resize et ve binary hale getir
    mask_resized = None
    if mask is not None:
        mask_resized = cv2.resize(mask, resize_to, interpolation=cv2.INTER_NEAREST)
        cv2.imwrite("mask_resized.png", mask_resized)
        print(mask_resized)
        # mask'in 0/255 değerleri olduğunu varsayıyoruz; normalize et 0,1
        mask_resized = (mask_resized > 127).astype(np.uint8) # 0 1 yapıo işte 255 1 oluo fln
    
    # BGR -> HSV (düzeltildi: cv2 ile okunan frame BGR)
    hsv = cv2.cvtColor(roi_resized, cv2.COLOR_BGR2HSV)

    # --- Renk istatistikleri (mask varsa sadece mask içi pikseller) ---
    if mask_resized is not None and mask_resized.any():
        # mean using cv2.mean with mask
        mean_bgr = cv2.mean(roi_resized, mask=mask_resized)[:3]  # roi_resized içinde sadece mask_resized kısımların yani o piksellerin içindeki renkler ortalaması alınacak ilk 3 alioz G B R
        # std: kanal kanal mask'li değerlere göre
        std_bgr = []
        for c in range(3):
            vals = roi_resized[:,:,c][mask_resized==1]
            print("vals", vals)
            std_bgr.append(float(np.std(vals)) if vals.size > 0 else 0.0)
        std_bgr = np.array(std_bgr)
        # HSV mean/std similarly
        hsv_vals = cv2.cvtColor(roi_resized, cv2.COLOR_BGR2HSV)
        mean_hsv = cv2.mean(hsv_vals, mask=mask_resized)[:3]
        std_hsv = []
        for c in range(3):
            vals = hsv_vals[:,:,c][mask_resized==1]
            std_hsv.append(float(np.std(vals)) if vals.size > 0 else 0.0)
        std_hsv = np.array(std_hsv)
    else:
        mean_bgr = roi_resized.mean(axis=(0,1))
        std_bgr  = roi_resized.std(axis=(0,1))
        mean_hsv = hsv.mean(axis=(0,1))
        std_hsv  = hsv.std(axis=(0,1))

    # --- Histogramlar (mask varsa mask ile hesaplanır) ---
    hist_b = cv2.calcHist([roi_resized], [0], mask_resized, [16], [0,256]).flatten()
    hist_g = cv2.calcHist([roi_resized], [1], mask_resized, [16], [0,256]).flatten()
    hist_r = cv2.calcHist([roi_resized], [2], mask_resized, [16], [0,256]).flatten()
    hist = np.concatenate([hist_b, hist_g, hist_r])
    hist = hist / (hist.sum() + 1e-8)

    # --- Texture (LBP + GLCM) ---
    gray = cv2.cvtColor(roi_resized, cv2.COLOR_BGR2GRAY)

    # LBP histogram
    lbp = local_binary_pattern(gray, LBP_N_POINTS, LBP_RADIUS, method="uniform")
    n_bins = int(lbp.max() + 1) if lbp.size > 0 else 1
    lbp_hist,_ = np.histogram(lbp.ravel(), bins=n_bins, range=(0,n_bins))
    lbp_hist = lbp_hist / (lbp_hist.sum() + 1e-8)

    # GLCM benzeri özellikler
    glcm_feats = compute_glcm_features(gray)

    # --- Feature vector birleştir ---
    features = np.concatenate([
        mean_bgr, std_bgr,
        mean_hsv, std_hsv,
        hist,
        lbp_hist,
        glcm_feats
    ]).astype(np.float32)

    if features.size < FIXED_FEATURE_SIZE:
        features = np.pad(features, (0, FIXED_FEATURE_SIZE - features.size), 'constant')
    elif features.size > FIXED_FEATURE_SIZE:
        features = features[:FIXED_FEATURE_SIZE]

    return features


@camera_bp.route('/pre_proc_ml', methods=['POST'])
def pre_proc_ml():
    try:
        data = request.get_json()
        polygons = data.get("mlPolygons")
        image_data_url = data.get("image")
        
        if not polygons or not image_data_url:
            return jsonify({"error": "Polygons or image data missing"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü verisi çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR) # cv2 reads BGR

        height, width, _ = rgb_frame.shape
        results = []

        # Poligonlar üzerinden dön
        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            ok_nok = poly.get("okNok", False)
            if not points:
                continue
            coords = [(int(p["x"]), int(p["y"])) for p in points]

            # mask full-frame oluştur
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords, dtype=np.int32)], 255) # filling the back mask with white color related to polygons corrds

            # masked: background outside polygon -> 0
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask) # refilling the current frame according to mask that contain specific shape / magical and proccess -> match both: ok
            cv2.imwrite("alo.png", masked)

            # ---> ÖNEMLİ DÜZELTME: sadece polygon bounding box'ını kırp
            pts_np = np.array(coords, dtype=np.int32)
            x, y, w, h = cv2.boundingRect(pts_np)
            if w == 0 or h == 0:
                continue
            roi = masked[y:y+h, x:x+w]
            mask_crop = mask[y:y+h, x:x+w]
            cv2.imwrite("mask_crop.png",mask_crop)
            cv2.imwrite("roi.png",roi)

            # Feature çıkar (mask_crop ile birlikte veriyoruz)
            feat = extract_features(roi, mask=mask_crop)

            results.append({
                'id': poly_id,
                'features': feat.tolist(),
                'okNok': ok_nok
            })

        return jsonify(results)
    except Exception as e:
        import traceback
        print("🔴 calculate_ml HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    

@camera_bp.route('/predict_ml', methods=['POST'])
def predict_ml():
    try:
        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        tool_id = data.get("toolId")
        features_list = data.get("features")  # [[f1, f2, ...], [f1, f2, ...], ...]

        if not type_no or not prog_no or tool_id is None or not features_list:
            return jsonify({"error": "Eksik parametre"}), 400

        # Model yolunu oluştur
        model_path = f"{BASE_DIR}/ml/{type_no}/{prog_no}/models/tool_{tool_id}_model.pkl"
        if not os.path.exists(model_path):
            return jsonify({"error": "Model bulunamadı"}), 404

        # Modeli yükle
        model = joblib.load(model_path)

        # Tahmin yap
        predictions = model.predict(features_list)
        predictions = predictions.tolist()  # JSON için listeye çevir

        return jsonify({"predictions": predictions})

    except Exception as e:
        import traceback
        print("🔴 predict_ml HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@camera_bp.route('/calculate_histogram', methods=['POST'])
def calculate_histogram():
    try:
        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        polygons = data.get("polygons")
        image_data_url = data.get("image")
        teach_histograms = data.get("teachHistograms")

        print("piton polygons", polygons)

        if not all([type_no, prog_no, polygons, image_data_url]):
            return jsonify({"error": "Eksik veri"}), 400

        teach_missing = not bool(teach_histograms)
        teach_dict = {}
        if not teach_missing:
            try:
                teach_dict = {str(item["toolId"]): item["histogram"] for item in teach_histograms}
            except Exception:
                teach_missing = True

        # Görsel çöz
        header, encoded = image_data_url.split(",", 1)
        frame = cv2.imdecode(np.frombuffer(base64.b64decode(encoded), np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape

        results = []

        for poly in polygons:
            poly_id = str(poly.get("id"))
            points = poly.get("points")
            tolerance_threshold = poly.get("hist_tolerance", 0.1)  # her polygon için ayrı

            if not points:
                results.append({"id": poly_id, "status": "NOK", "reason": "Poligon eksik"})
                continue

            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_hist = cv2.normalize(cv2.calcHist([masked], [0], mask, [256], [0, 256]), None).flatten().tolist()
            g_hist = cv2.normalize(cv2.calcHist([masked], [1], mask, [256], [0, 256]), None).flatten().tolist()
            b_hist = cv2.normalize(cv2.calcHist([masked], [2], mask, [256], [0, 256]), None).flatten().tolist()

            # Teach yoksa sadece ölçüm döndür
            if teach_missing or poly_id not in teach_dict:
                results.append({
                    "id": poly_id,
                    "status": "MEASURED",
                    "reason": "Teach verisi yok",
                    "diff_r": None,
                    "diff_g": None,
                    "diff_b": None,
                    "r_hist": r_hist,
                    "g_hist": g_hist,
                    "b_hist": b_hist,
                })
                continue

            # Teach varsa karşılaştır
            teach_r = np.array(teach_dict[poly_id]["r"])
            teach_g = np.array(teach_dict[poly_id]["g"])
            teach_b = np.array(teach_dict[poly_id]["b"])

            diff_r = float(np.linalg.norm(np.array(r_hist) - teach_r))
            diff_g = float(np.linalg.norm(np.array(g_hist) - teach_g))
            diff_b = float(np.linalg.norm(np.array(b_hist) - teach_b))

            # Polygon kendi hist_tolerance değeri ile kontrol edilir
            is_ok = all(diff < tolerance_threshold for diff in [diff_r, diff_g, diff_b])

            results.append({
                "id": poly_id,
                "status": "OK" if is_ok else "NOK",
                "diff_r": round(diff_r, 4),
                "diff_g": round(diff_g, 4),
                "diff_b": round(diff_b, 4),
                "r_hist": r_hist,
                "g_hist": g_hist,
                "b_hist": b_hist,
            })

        return jsonify({
            "teach_missing": teach_missing,
            "results": results
        })

    except Exception as e:
        import traceback
        print("🔴 measure_histogram HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e), "results": []}), 500


@camera_bp.route('/teach_histogram', methods=['POST'])
def teach_histogram():
    try:
        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")
        polygons = data.get("polygons")
        image_data_url = data.get("image")

        if not all([type_no, prog_no, polygons, image_data_url]):
            return jsonify({"error": "Eksik veri"}), 400

        # Görüntüyü çöz
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({'error': 'Görüntü çözülemedi'}), 500

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width, _ = rgb_frame.shape

        results = []

        for poly in polygons:
            poly_id = poly.get("id")
            points = poly.get("points")
            if not points:
                continue

            coords = [(int(p["x"]), int(p["y"])) for p in points]
            mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(coords)], 255)
            masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

            r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
            g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
            b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

            r_hist = cv2.normalize(r_hist, r_hist).flatten().tolist()
            g_hist = cv2.normalize(g_hist, g_hist).flatten().tolist()
            b_hist = cv2.normalize(b_hist, b_hist).flatten().tolist()

            results.append({
                "toolId": poly_id,
                "histogram": {
                    "r": r_hist,
                    "g": g_hist,
                    "b": b_hist
                }
            })

        return jsonify({
            "status": "OK",
            "histograms": results
        }), 200

    except Exception as e:
        import traceback
        print("🔴 teach_histogram HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


def load_dataset_per_tool(folder_path):
    folder = Path(folder_path)
    if not folder.exists():
        raise FileNotFoundError(f"{folder_path} bulunamadı")

    txt_files = list(folder.glob("*.txt"))
    if not txt_files:
        raise FileNotFoundError(f"{folder_path} içinde hiç .txt bulunamadı")

    data_per_tool = {}

    for txt_file in txt_files:
        with open(txt_file, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f]

        i = 0
        while i < len(lines):
            line = lines[i]

            if line.startswith("ID:"):
                tool_id = int(line.split("ID:")[1].split("|")[0].strip())
                label_str = line.split("OK/NOK:")[-1].strip()
                label = 1 if label_str.lower() == "true" else 0

                i += 2  # "Features:" satırını geç
                features = []
                while i < len(lines) and lines[i] != "" and not lines[i].startswith("ID:"):
                    feats = list(map(float, lines[i].split()))
                    features.extend(feats)
                    i += 1

                if tool_id not in data_per_tool:
                    data_per_tool[tool_id] = {"X": [], "y": []}
                
                data_per_tool[tool_id]["X"].append(features)
                data_per_tool[tool_id]["y"].append(label)
            else:
                i += 1

    # Padding eksikleri ve numpy array’e çevirme
    for tool_id in data_per_tool:
        X = data_per_tool[tool_id]["X"]
        max_len = max(len(f) for f in X)
        X_padded = [f + [0.0]*(max_len-len(f)) for f in X]
        data_per_tool[tool_id]["X"] = np.array(X_padded, dtype=float)
        data_per_tool[tool_id]["y"] = np.array(data_per_tool[tool_id]["y"], dtype=int)

    return data_per_tool

# Flask route içinde kullanımı
@camera_bp.route('/teach_ml', methods=['POST'])
def train_ml_model_per_tool():
    try:
        data = request.get_json()
        type_no = data.get("typeNo")
        prog_no = data.get("progNo")

        if not type_no or not prog_no:
            return jsonify({"error": "typeNo veya progNo eksik"}), 400

        base_folder = f"{BASE_DIR}/ml/{type_no}/{prog_no}/"
        models_folder = f"{base_folder}/models"
        os.makedirs(models_folder, exist_ok=True)  # models klasörünü baştan oluştur

        data_per_tool = load_dataset_per_tool(base_folder)
        results = {}

        for tool_id, dataset in data_per_tool.items():
            # OK: 1 , NOK: 0
            X, y = dataset["X"], dataset["y"]
            if len(X) == 0:
                continue

            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)

            # Modeli kaydet
            joblib.dump(model, f"{models_folder}/tool_{tool_id}_model.pkl")

            results[tool_id] = {"validationAccuracy": acc}

        return jsonify({"message": "Modeller başarıyla eğitildi", "results": results}), 200

    except Exception as e:
        import traceback
        print("🔴 train_ml_model HATASI:\n", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


