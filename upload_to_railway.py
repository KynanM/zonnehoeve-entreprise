import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Config laden uit environment (of gebruik .env file)
RAILWAY_URL = os.getenv("RAILWAY_URL", "https://zonnehoeve-entreprise-backend-production.up.railway.app")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

# Pad naar lokale PDF/Docx map
RAW_DATA_PATH = Path("./backend/data/raw_documents")

def upload_documents():
    if not RAW_DATA_PATH.exists():
        print(f"Directory {RAW_DATA_PATH} bestaat niet!")
        return

    files = [f for f in RAW_DATA_PATH.iterdir() if f.is_file() and f.suffix.lower() in [".pdf", ".docx"]]
    
    if not files:
        print("Geen documenten gevonden om te uploaden.")
        return

    print(f"Start uploaden van {len(files)} documenten naar {RAILWAY_URL}... (via HTTP/s)")
    
    headers = {
        "x-admin-key": ADMIN_API_KEY
    }
    
    url = f"{RAILWAY_URL}/api/documents/upload"
    
    for file_path in files:
        print(f"\n- Uploaden: {file_path.name}")
        
        try:
            with open(file_path, "rb") as f:
                files_data = {"file": (file_path.name, f, "application/octet-stream")}
                response = requests.post(url, headers=headers, files=files_data)
                
            if response.status_code == 200:
                print(f"[OK] Succes! {response.json().get('message')}")
            else:
                print(f"[ERR] Fout tijdens uploaden ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[WARN] Fout bij het verzenden van {file_path.name}: {e}")

if __name__ == "__main__":
    upload_documents()
