import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from app.services.pose_logic import rom_from_keypoints
from app.services.pose_runtime_tasks import PoseRuntimeTasks

FRAME_PATH = Path(__file__).resolve().parent / "assets" / "frame.jpg"

with open(FRAME_PATH, "rb") as f:
    jpeg = f.read()

print("Arquivo:", FRAME_PATH)
print("Tamanho bytes:", len(jpeg))

runtime = PoseRuntimeTasks()

print("Primeiros 16 bytes:", jpeg[:16])
img = runtime.decode_jpeg(jpeg)

if img is None:
    print("Falha ao decodificar JPEG.")
    raise SystemExit(1)

print("Shape imagem:", img.shape)

kps = runtime.infer_keypoints(img)

if kps is None:
    print("Nenhuma pose detectada.")
    raise SystemExit(0)

print("Quantidade de keypoints:", len(kps))
print("Quadril direito:", kps[24])
print("Joelho direito:", kps[26])
print("Tornozelo direito:", kps[28])

rom = rom_from_keypoints(kps)
print("ROM calculado:", rom)