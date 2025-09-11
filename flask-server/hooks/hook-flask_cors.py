# hook-flask_cors.py
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = collect_submodules('flask_cors')
