import os
import urllib.request

MODELS = {
    "models/face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "models/w600k_mbf.onnx": "https://huggingface.co/deepghs/insightface/resolve/main/buffalo_s/w600k_mbf.onnx"
}

def main():
    os.makedirs("models", exist_ok=True)
    for path, url in MODELS.items():
        if os.path.exists(path) and os.path.getsize(path) > 10000:
            print(f"[OK] {path} already exists ({os.path.getsize(path)} bytes)")
            continue
        print(f"[Downloading] {url} -> {path}...")
        req = urllib.request.Request(url, headers={"User-Agent": "ConectaKing-FaceAI/2.0"})
        with urllib.request.urlopen(req) as resp, open(path, "wb") as f:
            f.write(resp.read())
        print(f"[Downloaded] {path} ({os.path.getsize(path)} bytes)")

if __name__ == "__main__":
    main()
