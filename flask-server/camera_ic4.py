"""
This sample shows, how to create an XML configuration file 
for a video capture device.
"""

import ctypes
import tisgrabber as tis

ic = ctypes.cdll.LoadLibrary("./tisgrabber_x64.dll")
tis.declareFunctions(ic)

# Kütüphaneyi başlat
ic.IC_InitLibrary(0)

# 'device.xml' dosyasından kamera ayarlarını yükle
hGrabber = ic.IC_LoadDeviceStateFromFile(None, tis.T("device.xml"))

# Cihaz geçerli mi diye kontrol et
if ic.IC_IsDevValid(hGrabber):
    ic.IC_StartLive(hGrabber, 1)  # Canlı görüntüyü başlat
    ic.IC_MsgBox(tis.T("Press OK to stop live video."), tis.T("Live Video"))
    ic.IC_StopLive(hGrabber)
else:
    ic.IC_MsgBox(tis.T("No device opened"), tis.T("Error"))

# Grabber'i serbest bırak
ic.IC_ReleaseGrabber(hGrabber)