import sys
import subprocess
from pathlib import Path

# Locate virtual environment in project root or local folder
root_dir = Path(__file__).resolve().parent.parent.parent
venv_root = root_dir / ".venv"
venv_local = Path(__file__).resolve().parent / ".venv"

venv_py = None
for venv in [venv_root, venv_local]:
    candidate = (
        venv / "Scripts" / "python.exe"
        if sys.platform == "win32"
        else venv / "bin" / "python"
    )
    if candidate.exists():
        venv_py = candidate
        break

python_executable = str(venv_py) if venv_py else sys.executable

cmd = [
    python_executable,
    "-m",
    "uvicorn",
    "app.main:app",
    "--reload",
    "--port",
    "8000",
]

sys.exit(subprocess.call(cmd))

