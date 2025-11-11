# Project Colyze

Project Colyze is a **web-based part measurement and inspection system** that combines **React.js frontend** with a **Flask REST API backend** using **Python and OpenCV**. The system allows users to select regions of interest (ROI) on parts, load them into interactive measurement tools, and automatically analyze **shape, color, and dimensions** to determine if the part meets quality standards (OK / NOK).

---

## Features

- **Interactive Frontend Tools:** Select and analyze part areas directly in the browser.
- **Automated Measurement:** Analyze part features such as shape, size, and color using OpenCV.
- **Quality Verification:** System evaluates measurement results and returns OK / NOK feedback.
- **Dual Database Support (optional):** Store part images and results for historical tracking.
- **Photo Comparison:** Visualize the part **before** and **after** measurement.

- ![image](https://github.com/user-attachments/assets/49171c01-57e4-42f3-86b7-7b6239e97013)
- <img width="1902" height="1079" alt="auto" src="https://github.com/user-attachments/assets/55b70376-75b3-4e61-bfa4-aaa5823aedbb" />


- ![image](https://github.com/user-attachments/assets/69abdb27-4a11-4c25-a25c-6662716ce6ae)

---

## Workflow

1. **Upload or Capture Image:** Add a part image via upload or live camera feed.
2. **Select Region of Interest (ROI):** Use the frontend tool to select the exact area of the part for measurement.
3. **Load into Measurement Tool:** The selected ROI is processed to extract features (color, shape, dimensions).
4. **Automated Measurement:** Backend runs OpenCV algorithms to calculate measurements and compare with predefined thresholds.
5. **Result Feedback:** System returns OK / NOK depending on whether the part meets quality standards.
6. **Review Photos:** Compare **before** and **after** measurement images to verify analysis.

---

## Tech Stack

- **Frontend:** React.js, HTML, CSS  
  Interactive measurement tools and ROI selection implemented in React components.
- **Backend:** Python Flask REST API  
  Handles image processing, measurements, and returns JSON responses.
- **Image Processing:** OpenCV (Python)  
  Detects shapes, calculates dimensions, analyzes color distributions.
- **Communication:** RESTful API between frontend and backend.

---

## Getting Started

### Prerequisites

- Python 3.11 (Windows için test edilmiş: 3.11.5)  
- Node.js 18+ (LTS önerilir)  
- Microsoft Access Database Engine (opsiyonel, Access DB kullanıyorsanız)  
- Camera SDK DLL: `tisgrabber_x64.dll` (Windows kullanıcıları için)  
- Git (repo’yu klonlamak için)  

---

### Installation & Setup (Windows)

#### Repo’yu klonlayın:

```
git clone https://github.com/MehmetKaTR/project_colyze.git
cd project_colyze
```

- Backend (Python / Flask) kurulumu:

```
cd flask-server

# Virtual environment oluştur
python -m venv colyze-flask-env

# Aktifleştir (PowerShell)
.\colyze-flask-env\Scripts\Activate.ps1

# pip güncelle
python -m pip install --upgrade pip

# Gereksinimleri yükle
pip install -r requirements.txt
```

Eğer requirements.txt yoksa, pip ile aşağıdaki paketleri yükleyebilirsiniz:
Flask, flask-cors, opencv-python, opencv-contrib-python, numpy, pyodbc, py-tisgrabber, PyQt5 ve diğer listelenmiş paketler.

- Frontend (React / Vite) kurulumu:

```
cd ..\colyze

# Node paketlerini yükle
npm ci
```

npm ci lockfile kullanır, paket sürümlerinin tutarlı olmasını sağlar. Lockfile yoksa npm install kullanabilirsiniz.

- Running the Project (Development) Backend:

```
cd flask-server
.\colyze-flask-env\Scripts\Activate.ps1
python app.py
```

Frontend:

```
cd colyze
npm run dev
```

Frontend: http://localhost:5173/ (veya Vite config’de ayarladığınız path)

Backend API: http://127.0.0.1:5000/

NOT: Database olmadan sağlıklı çalışmaz. İletişime geçiniz



