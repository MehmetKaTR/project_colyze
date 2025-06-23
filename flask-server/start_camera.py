import ctypes
import tisgrabber as tis
import os

# DLL ve fonksiyonlar
ic = ctypes.cdll.LoadLibrary("./tisgrabber_x64.dll")
tis.declareFunctions(ic)

# Başlat
ic.IC_InitLibrary(0)

# Dosya kontrolü
if not os.path.exists("device.xml"):
    print("[ERROR] 'device.xml' bulunamadı. Önce 'device_configurator.py' çalıştır.")
    exit()

# XML'den yükle
hGrabber = ic.IC_LoadDeviceStateFromFile(None, tis.T("device.xml"))

if ic.IC_IsDevValid(hGrabber):
    print("[INFO] Cihaz başarıyla yüklendi, canlı görüntü başlıyor...")
    ic.IC_StartLive(hGrabber, 1)
    ic.IC_MsgBox(tis.T("Kapatmak için OK'a bas."), tis.T("Canlı Görüntü"))
    ic.IC_StopLive(hGrabber)
else:
    print("[ERROR] Cihaz geçersiz.")

ic.IC_ReleaseGrabber(hGrabber)
