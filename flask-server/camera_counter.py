import cv2

def list_cameras(max_cameras=5):
    cameras = []
    for i in range(max_cameras):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            cameras.append(i)
        cap.release()
    return cameras

if __name__ == "__main__":
    cams = list_cameras(5)
    print("Aktif kamera indexleri:", cams)
    print("Toplam aktif kamera sayısı:", len(cams))
