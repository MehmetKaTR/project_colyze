import os
import shutil
import sys
from pathlib import Path


if getattr(sys, "frozen", False):
    APP_BASE_DIR = Path(sys.executable).resolve().parent
else:
    APP_BASE_DIR = Path(__file__).resolve().parent

RUNTIME_DIR = Path(os.environ.get("COLYZE_RUNTIME_DIR", APP_BASE_DIR))
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

TEMP_FRAMES_DIR = RUNTIME_DIR / "temp_frames"
TEMP_TEXTS_DIR = RUNTIME_DIR / "temp_texts"
ML_ROOT_DIR = RUNTIME_DIR / "ml"
DB_DIR = RUNTIME_DIR / "db"
CAMERA_PROFILES_DIR = RUNTIME_DIR / "camera_profiles"
CAMERA_PROFILES_FILE = CAMERA_PROFILES_DIR / "profiles.json"
DEVICE_XML_PATH = CAMERA_PROFILES_DIR / "devicef1.xml"

ROUTES_DIR = APP_BASE_DIR / "routes"
DEVICE_XML_TEMPLATE = ROUTES_DIR / "devicef1.xml"
TISGRABBER_DLL_PATH = ROUTES_DIR / "tisgrabber_x64.dll"


def ensure_runtime_layout():
    for p in [TEMP_FRAMES_DIR, TEMP_TEXTS_DIR, ML_ROOT_DIR, DB_DIR, CAMERA_PROFILES_DIR]:
        p.mkdir(parents=True, exist_ok=True)

    if not DEVICE_XML_PATH.exists() and DEVICE_XML_TEMPLATE.exists():
        try:
            shutil.copy2(DEVICE_XML_TEMPLATE, DEVICE_XML_PATH)
        except Exception:
            # Camera profile flow can still create xml later from device dialog.
            pass

