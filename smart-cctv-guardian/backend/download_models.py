"""
Utility script to download required OpenCV Face Detection & Recognition models:
- YuNet (Face Detection ONNX)
- SFace (Face Recognition ONNX)
"""
import os
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODELS = {
    "yunet.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "sface.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
}

def main():
    print("=== Smart CCTV Guardian: Model Provisioning Tool ===")
    for filename, url in MODELS.items():
        target = os.path.join(MODELS_DIR, filename)
        if os.path.exists(target):
            print(f"[OK] {filename} already exists ({os.path.getsize(target):,} bytes).")
        else:
            print(f"[DOWNLOADING] Fetching {filename} from OpenCV Zoo...")
            try:
                urllib.request.urlretrieve(url, target)
                print(f"[SUCCESS] Downloaded {filename} ({os.path.getsize(target):,} bytes).")
            except Exception as e:
                print(f"[ERROR] Failed to download {filename}: {e}")

if __name__ == "__main__":
    main()
