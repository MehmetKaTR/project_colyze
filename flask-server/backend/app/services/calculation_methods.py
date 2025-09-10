import cv2
import numpy as np

def calculate_rgbi_method(frame, polygons):
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

    return {"rgbi calculation results": results}

def calculate_histogram_method(frame, polygons, teach_histograms):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    height, width, _ = rgb_frame.shape
    tolerance_threshold = 0.1
    results = []

    teach_dict = {str(item["toolId"]): item["histogram"] for item in teach_histograms}

    for poly in polygons:
        poly_id = str(poly.get("id"))  # Burada str yaptık!
        points = poly.get("points")

        if not points or poly_id not in teach_dict:
            results.append({ "id": poly_id, "status": "NOK", "reason": "Teach verisi yok" })
            continue

        coords = [(int(p["x"]), int(p["y"])) for p in points]
        mask = np.zeros((height, width), dtype=np.uint8)

        cv2.fillPoly(mask, [np.array(coords)], 255)

        masked = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)

        r_hist = cv2.calcHist([masked], [0], mask, [256], [0, 256])
        g_hist = cv2.calcHist([masked], [1], mask, [256], [0, 256])
        b_hist = cv2.calcHist([masked], [2], mask, [256], [0, 256])

        r_hist = cv2.normalize(r_hist, r_hist).flatten()
        g_hist = cv2.normalize(g_hist, g_hist).flatten()
        b_hist = cv2.normalize(b_hist, b_hist).flatten()

        teach_r = np.array(teach_dict[poly_id]["r"])
        teach_g = np.array(teach_dict[poly_id]["g"])
        teach_b = np.array(teach_dict[poly_id]["b"])

        diff_r = np.linalg.norm(r_hist - teach_r)
        diff_g = np.linalg.norm(g_hist - teach_g)
        diff_b = np.linalg.norm(b_hist - teach_b)

        is_ok = all(diff < tolerance_threshold for diff in [diff_r, diff_g, diff_b])

        results.append({
            "id": poly_id,
            "status": "OK" if is_ok else "NOK",
            "diff_r": round(float(diff_r), 4),
            "diff_g": round(float(diff_g), 4),
            "diff_b": round(float(diff_b), 4),
        })
    
    return {"histogram calculation results": results}

def teach_histogram_method(frame, polygons):
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
    
    return {"histogram teach results": results}