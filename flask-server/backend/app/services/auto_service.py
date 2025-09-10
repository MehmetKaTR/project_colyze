import os
from pathlib import Path

class AutoService:
    def __init__(self):
        self.frames_dir = Path("temp_frames")
        self.text_dir = Path("temp_texts")

    def get_auto_frames(self):
        if not self.frames_dir.exists():
            return []

        frame_data = []
        for file in self.frames_dir.iterdir():
            if file.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
                continue

            filename = file.stem
            parts = filename.split("_")
            if len(parts) < 4:
                continue

            try:
                frame_data.append({
                    "typeNo": parts[0],
                    "progNo": parts[1],
                    "datetime": f"{parts[2]} {parts[3]}",
                    "measureType": parts[4] if len(parts) > 4 else "unknown",
                    "filename": file.name,
                    "path": f"/frames/{file.name}"
                })
            except Exception as e:
                print(f"Hatalı dosya: {file.name} - {e}")
                continue

        return frame_data

    def get_result_text(self, filename):
        filename_base = Path(filename).stem
        txt_path = self.text_dir / f"{filename_base}.txt"

        if not txt_path.exists():
            raise FileNotFoundError("Result file not found")

        with open(txt_path, "r", encoding="utf-8") as f:
            return {"result_lines": [line.strip() for line in f.readlines()]}
