from pathlib import Path

def ensure_dirs():
    Path("temp_frames").mkdir(exist_ok=True)
    Path("temp_texts").mkdir(exist_ok=True)

def get_frame_path(filename):
    return Path("temp_frames") / filename

def get_text_path(filename):
    return Path("temp_texts") / filename
