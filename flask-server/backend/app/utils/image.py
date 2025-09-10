import base64, cv2, numpy as np

def decode_base64_image(data_url: str):
    try:
        header, encoded = data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None

def crop_frame(frame, crop_info):
    if not crop_info:
        return frame
    
    x, y, w, h = map(int, crop_info)
    height, width = frame.shape[:2]

    x = max(0, min(x, width - 1))
    y = max(0, min(y, height - 1))
    w = max(1, min(w, width - x))
    h = max(1, min(h, height - y))

    return frame[y:y+h, x:x+w]

def encode_image_to_base64_uri(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    encoded = base64.b64encode(buffer).decode()
    return f"data:image/jpeg;base64,{encoded}"