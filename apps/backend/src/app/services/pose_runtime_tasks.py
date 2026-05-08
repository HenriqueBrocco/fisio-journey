from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ModuleNotFoundError:
    mp = None
    python = None
    vision = None


class PoseRuntimeTasks:
    def __init__(self):
        if mp is None or python is None or vision is None:
            raise RuntimeError(
                "Dependência opcional ausente: 'mediapipe'. Instale com: pip install mediapipe"
            )

        model_path = os.getenv("POSE_LANDMARKER_MODEL_PATH", "assets/models/pose_landmarker.task")
        resolved_model_path = Path(model_path)

        # Se vier relativo, resolve a partir da raiz do backend
        if not resolved_model_path.is_absolute():
            backend_root = Path(__file__).resolve().parents[3]
            resolved_model_path = backend_root / resolved_model_path

        if not resolved_model_path.exists():
            raise RuntimeError(f"Modelo Pose Landmarker não encontrado em: {resolved_model_path}")

        base_options = python.BaseOptions(model_asset_path=str(resolved_model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        self._landmarker = vision.PoseLandmarker.create_from_options(options)
        self._ts_ms = 0

    def infer_keypoints(self, bgr: np.ndarray) -> list[list[float]] | None:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        # Timestamp incremental simples para o modo VIDEO
        self._ts_ms += 33

        result = self._landmarker.detect_for_video(mp_image, self._ts_ms)

        if not result.pose_landmarks:
            return None

        pose = result.pose_landmarks[0]
        kps: list[list[float]] = []

        for lm in pose:
            visibility = float(getattr(lm, "visibility", 1.0))
            kps.append([float(lm.x), float(lm.y), visibility])

        return kps


    @staticmethod
    def decode_jpeg(jpeg_bytes: bytes) -> np.ndarray | None:
        # tentativa 1: OpenCV
        arr = np.frombuffer(jpeg_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            return img

        # tentativa 2: Pillow -> converte para BGR
        try:
            pil_img = Image.open(BytesIO(jpeg_bytes)).convert("RGB")
            rgb = np.array(pil_img)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            return bgr
        except Exception:
            return None