-- ===========================================
-- Migration: Tabelas para reconhecimento facial (Rekognition) no KingSelection
-- Data: 2026-02
-- Uso: enroll (cadastro de rosto por cliente), match (reconhecer em fotos da galeria), cache por ETag
-- ===========================================

-- Rostos cadastrados por cliente (enroll): FaceId retornado pelo IndexFaces
CREATE TABLE IF NOT EXISTS rekognition_client_faces (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES king_gallery_clients(id) ON DELETE CASCADE,
  face_id VARCHAR(64) NOT NULL,
  image_id VARCHAR(64),
  reference_r2_key VARCHAR(1024),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gallery_id, client_id, face_id)
);

CREATE INDEX IF NOT EXISTS idx_rekognition_client_faces_gallery ON rekognition_client_faces(gallery_id);
CREATE INDEX IF NOT EXISTS idx_rekognition_client_faces_client ON rekognition_client_faces(client_id);
CREATE INDEX IF NOT EXISTS idx_rekognition_client_faces_face_id ON rekognition_client_faces(face_id);

-- Jobs de processamento de foto (match): uma linha por foto da galeria processada
CREATE TABLE IF NOT EXISTS rekognition_photo_jobs (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES king_photos(id) ON DELETE CASCADE,
  r2_key VARCHAR(1024) NOT NULL,
  r2_etag VARCHAR(128),
  process_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gallery_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_rekognition_photo_jobs_gallery ON rekognition_photo_jobs(gallery_id);
CREATE INDEX IF NOT EXISTS idx_rekognition_photo_jobs_status ON rekognition_photo_jobs(process_status);
CREATE INDEX IF NOT EXISTS idx_rekognition_photo_jobs_processed_at ON rekognition_photo_jobs(processed_at);

-- Rostos detectados em uma foto (após DetectFaces)
CREATE TABLE IF NOT EXISTS rekognition_photo_faces (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES king_photos(id) ON DELETE CASCADE,
  face_index INTEGER NOT NULL,
  bounding_box_json TEXT,
  confidence DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rekognition_photo_faces_photo ON rekognition_photo_faces(photo_id);

-- Matches: qual cliente foi reconhecido em qual rosto da foto (SearchFacesByImage)
CREATE TABLE IF NOT EXISTS rekognition_face_matches (
  id SERIAL PRIMARY KEY,
  photo_face_id INTEGER NOT NULL REFERENCES rekognition_photo_faces(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES king_gallery_clients(id) ON DELETE CASCADE,
  similarity DECIMAL(5,2),
  rekognition_face_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rekognition_face_matches_photo_face ON rekognition_face_matches(photo_face_id);
CREATE INDEX IF NOT EXISTS idx_rekognition_face_matches_client ON rekognition_face_matches(client_id);

-- Cache por ETag: evitar reprocessar mesma foto (cacheKey = match:galleryId:r2Key:etag:threshold:maxFaces)
CREATE TABLE IF NOT EXISTS rekognition_processing_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(512) NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rekognition_processing_cache_expires ON rekognition_processing_cache(expires_at);
