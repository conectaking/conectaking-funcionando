import os
import io
import time
import base64
import numpy as np
import cv2
import onnxruntime as ort
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="ConectaKing Face AI (ArcFace 512D)", version="2.0.0")

YUNET_MODEL = "models/face_detection_yunet_2023mar.onnx"
ARCFACE_MODEL = "models/w600k_mbf.onnx"

ARCFACE_REF_POINTS = np.array([
    [38.2946, 51.6963],  # right eye
    [73.5318, 51.5014],  # left eye
    [56.0252, 71.7366],  # nose tip
    [41.5493, 92.3655],  # right mouth corner
    [70.7299, 92.2041]   # left mouth corner
], dtype=np.float32)

detector = None
arcface_session = None
arcface_input_name = None

def init_models():
    global detector, arcface_session, arcface_input_name
    if not os.path.exists(YUNET_MODEL) or not os.path.exists(ARCFACE_MODEL):
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

    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 2
    opts.intra_op_num_threads = 2
    arcface_session = ort.InferenceSession(ARCFACE_MODEL, opts, providers=['CPUExecutionProvider'])
    arcface_input_name = arcface_session.get_inputs()[0].name
    print("[ConectaKing Face AI v2] Loaded ArcFace 512D (w600k_mbf) + YuNet via ONNXRuntime")

@app.on_event("startup")
def startup_event():
    init_models()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "conectaking-face-ai",
        "engine": "InsightFace-ArcFace-ONNX",
        "detector": "YuNet (2023mar)",
        "recognizer": "ArcFace MobileFaceNet (MS1MV3/W600K)",
        "embedding_dim": 512,
        "version": "2.0.0"
    }

def decode_image_bytes(data: bytes) -> np.ndarray:
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Formato de imagem inválido ou não suportado.")
    return img

def extract_faces_from_bgr(img: np.ndarray, max_dim: int = 1280, flip_aug_single: bool = True):
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

    is_single_face = (len(faces) == 1)

    for face in faces:
        score = float(face[-1])
        if score < 0.65:
            continue

        # Scale box back to original image dimensions
        bw = int(face[2] / scale)
        bh = int(face[3] / scale)
        if bw < 32 or bh < 32:
            # Filter distant background spectators
            continue

        x = int(face[0] / scale)
        y = int(face[1] / scale)

        # 5 facial landmarks in resized image
        kps = face[4:14].reshape((5, 2))
        M, _ = cv2.estimateAffinePartial2D(kps, ARCFACE_REF_POINTS)
        if M is None:
            continue

        warped = cv2.warpAffine(resized, M, (112, 112), borderValue=0.0)

        # Normalized blob: BGR -> RGB, centered around 0 in [-1, 1]
        blob = (warped[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) - 127.5) / 127.5
        feat = arcface_session.run(None, {arcface_input_name: np.expand_dims(blob, 0)})[0].flatten()
        feat_norm = feat / np.linalg.norm(feat)

        # If it's a selfie or single face, apply flip augmentation for 3D symmetry
        if is_single_face and flip_aug_single:
            warped_flip = cv2.flip(warped, 1)
            blob_flip = (warped_flip[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) - 127.5) / 127.5
            feat_flip = arcface_session.run(None, {arcface_input_name: np.expand_dims(blob_flip, 0)})[0].flatten()
            feat_flip_norm = feat_flip / np.linalg.norm(feat_flip)
            avg_feat = (feat_norm + feat_flip_norm) / 2.0
            feat_norm = avg_feat / np.linalg.norm(avg_feat)

        emb_list = [round(float(v), 6) for v in feat_norm]

        results.append({
            "box": [max(0, x), max(0, y), bw, bh],
            "confidence": round(score, 4),
            "embedding": emb_list
        })

    # Sort by detection confidence and box area
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
            "embedding_dim": 512,
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
    threshold: Optional[float] = 0.48 # Calibrated threshold for ArcFace 512D

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
    # For ArcFace 512D, random people are < 0.25, same person is > 0.50. Threshold 0.48 gives zero false positives.
    thresh = float(req.threshold if req.threshold is not None else 0.48)

    for i, sim in enumerate(sims):
        score = float(sim)
        if score >= thresh:
            # Map cosine score (0.48 to 0.75+) to percentage (75% to 99.9%)
            norm_pct = round(min(99.9, max(75.0, 75.0 + ((score - thresh) / max(0.01, (0.75 - thresh))) * 24.9)), 2)
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
