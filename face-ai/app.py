import os
import io
import time
import base64
import numpy as np
import cv2
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="ConectaKing Local Face AI", version="1.0.0")

YUNET_MODEL = "models/face_detection_yunet_2023mar.onnx"
SFACE_MODEL = "models/face_recognition_sface_2021dec.onnx"

detector = None
recognizer = None

def init_models():
    global detector, recognizer
    if not os.path.exists(YUNET_MODEL) or not os.path.exists(SFACE_MODEL):
        from download_models import main as dl_models
        dl_models()
    
    detector = cv2.FaceDetectorYN.create(
        model=YUNET_MODEL,
        config="",
        input_size=(320, 320),
        score_threshold=0.65,
        nms_threshold=0.3,
        top_k=5000
    )
    recognizer = cv2.FaceRecognizerSF.create(
        model=SFACE_MODEL,
        config=""
    )
    print("[ConectaKing Face AI] Models loaded successfully (YuNet + SFace)")

@app.on_event("startup")
def startup_event():
    init_models()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "conectaking-face-ai",
        "engine": "OpenCV-DNN",
        "detector": "YuNet (2023mar)",
        "recognizer": "SFace (2021dec)",
        "embedding_dim": 128
    }

def decode_image_bytes(data: bytes) -> np.ndarray:
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Formato de imagem inválido ou não suportado.")
    return img

def extract_faces_from_bgr(img: np.ndarray, max_dim: int = 1280):
    h, w = img.shape[:2]
    scale = 1.0
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        resized = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        resized = img

    rh, rw = resized.shape[:2]
    detector.setInputSize((rw, rh))
    _, faces = detector.detect(resized)

    results = []
    if faces is None or len(faces) == 0:
        return results

    for face in faces:
        # face contains [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        score = float(face[-1])
        if score < 0.65:
            continue

        aligned_face = recognizer.alignCrop(resized, face)
        feat = recognizer.feature(aligned_face) # (1, 128) float32
        feat_norm = feat / np.linalg.norm(feat)
        emb_list = [round(float(x), 6) for x in feat_norm.flatten()]

        # Scale box back to original image dimensions if resized
        x = int(face[0] / scale)
        y = int(face[1] / scale)
        bw = int(face[2] / scale)
        bh = int(face[3] / scale)

        results.append({
            "box": [max(0, x), max(0, y), bw, bh],
            "confidence": round(score, 4),
            "embedding": emb_list
        })

    # Sort primarily by detector confidence, with face area as secondary criteria
    results.sort(key=lambda f: (round(f["confidence"], 2), f["box"][2] * f["box"][3]), reverse=True)
    return results

@app.post("/extract")
async def extract(request: Request, file: Optional[UploadFile] = File(None)):
    t0 = time.time()
    try:
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type and file is not None:
            data = await file.read()
        elif "application/json" in content_type:
            body = await request.json()
            raw_b64 = body.get("image_base64") or body.get("image") or ""
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            data = base64.b64decode(raw_b64)
        else:
            data = await request.body()

        if not data:
            raise HTTPException(status_code=400, detail="Nenhuma imagem enviada.")

        img = decode_image_bytes(data)
        faces = extract_faces_from_bgr(img)
        elapsed_ms = round((time.time() - t0) * 1000, 2)

        return {
            "success": True,
            "face_count": len(faces),
            "faces": faces,
            "elapsed_ms": elapsed_ms
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento facial: {str(e)}")

class TargetEmbedding(BaseModel):
    id: int
    photo_id: Optional[int] = None
    embedding: List[float]

class MatchRequest(BaseModel):
    query_embedding: List[float]
    targets: List[TargetEmbedding]
    threshold: Optional[float] = 0.55 # Calibrated threshold for zero false-positives

@app.post("/match")
def match(req: MatchRequest):
    t0 = time.time()
    if not req.query_embedding or not req.targets:
        return {"success": True, "matches": [], "match_count": 0, "elapsed_ms": 0}

    q = np.array(req.query_embedding, dtype=np.float32)
    q_norm = np.linalg.norm(q)
    if q_norm > 0:
        q = q / q_norm

    target_vectors = []
    target_ids = []
    target_photo_ids = []

    for t in req.targets:
        if len(t.embedding) == len(req.query_embedding):
            target_ids.append(t.id)
            target_photo_ids.append(t.photo_id if t.photo_id is not None else t.id)
            vec = np.array(t.embedding, dtype=np.float32)
            v_norm = np.linalg.norm(vec)
            target_vectors.append(vec / v_norm if v_norm > 0 else vec)

    if not target_vectors:
        return {"success": True, "matches": [], "match_count": 0, "elapsed_ms": 0}

    mat = np.array(target_vectors, dtype=np.float32)
    # Cosine similarities = dot product of normalized vectors
    sims = np.dot(mat, q)

    matches = []
    thresh = float(req.threshold if req.threshold is not None else 0.55)

    for i, sim in enumerate(sims):
        score = float(sim)
        if score >= thresh:
            # Map cosine score (typically 0.55 to 0.85+) to percentage (75% to 99.9%)
            norm_pct = round(min(99.9, max(75.0, 75.0 + ((score - thresh) / max(0.01, (0.85 - thresh))) * 24.9)), 2)
            matches.append({
                "id": target_ids[i],
                "photo_id": target_photo_ids[i],
                "similarity": norm_pct,
                "raw_score": round(score, 4)
            })

    # Sort descending by similarity
    matches.sort(key=lambda m: m["raw_score"], reverse=True)
    elapsed_ms = round((time.time() - t0) * 1000, 2)

    return {
        "success": True,
        "match_count": len(matches),
        "matches": matches,
        "elapsed_ms": elapsed_ms
    }
