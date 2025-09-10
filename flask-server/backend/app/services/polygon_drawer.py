import cv2, numpy as np

def draw_polygons(frame, polygons):
    overlay = frame.copy()
    for polygon in polygons:
        points = polygon.get("points", [])
        status = polygon.get("status", "").upper()

        if len(points) < 3:
            continue

        pts = np.array([[int(p['x']), int(p['y'])] for p in points], np.int32).reshape((-1, 1, 2))
        
        fill_color, alpha = {
            "OK":   ((69, 230, 16), 0.4),
            "NOK":  ((36, 36, 192), 0.86)
        }.get(status, (None, 0.0))

        cv2.polylines(frame, [pts], isClosed=True, color=(255, 255, 255), thickness=2)
        if fill_color and alpha > 0:
            cv2.fillPoly(overlay, [pts], fill_color)

        M = cv2.moments(pts)
        cX = int(M["m10"] / M["m00"]) if M["m00"] else pts[0][0][0]
        cY = int(M["m01"] / M["m00"]) if M["m00"] else pts[0][0][1]

        poly_id = str(polygon.get("id", ""))
        cv2.putText(frame, poly_id, (cX - 10, cY + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
    return frame
