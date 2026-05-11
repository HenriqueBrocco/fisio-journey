##### Legado 
from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ModuleNotFoundError:
    mp = None
    python = None
    vision = None


class PoseRuntime:
    def __init__(self):
        if mp is None or python is None or vision is None:
            raise RuntimeError(
                "Dependência opcional ausente: 'mediapipe'. Instale com: pip install mediapipe"
            )

        model_path = os.getenv("POSE_LANDMARKER_MODEL_PATH", "assets/models/pose_landmarker.task")
        resolved_model_path = Path(model_path)

        if not resolved_model_path.is_absolute():
            backend_root = Path(__file__).resolve().parents[3]
            resolved_model_path = backend_root / resolved_model_path

        if not resolved_model_path.exists():
            raise RuntimeError(
                f"Modelo Pose Landmarker não encontrado em: {resolved_model_path}"
            )

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

        self._ts_ms += 33  # ~30 FPS lógico para o modo VIDEO
        result = self._landmarker.detect_for_video(mp_image, self._ts_ms)

        if not result.pose_landmarks:
            return None

        pose = result.pose_landmarks[0]
        kps: list[list[float]] = []
        for lm in pose:
            # lm.x, lm.y normalizados; z ignorado por enquanto
            # nem toda saída expõe visibility/presence do mesmo jeito,
            # então fazemos fallback seguro
            visibility = float(getattr(lm, "visibility", 1.0))
            kps.append([float(lm.x), float(lm.y), visibility])

        return kps

    @staticmethod
    def decode_jpeg(jpeg_bytes: bytes) -> np.ndarray | None:
        arr = np.frombuffer(jpeg_bytes, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
