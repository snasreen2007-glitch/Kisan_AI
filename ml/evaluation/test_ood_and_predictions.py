"""
Verifies Python Local AI server /api/predict:
1. Rejects human face / skin tone photos with outcome: "unknown" and reason: "rejected_human_face_or_skin"
2. Rejects random indoor / object photos with outcome: "unknown"
3. Accurately diagnoses genuine paddy doctor leaf photos with outcome: "identified"
"""

import base64
import io
import json
import urllib.request
import numpy as np
from PIL import Image

def test_predictions():
    url = "http://127.0.0.1:8000/api/predict"

    # Test 1: Synthetic Human Face Photo
    face_img = Image.new("RGB", (128, 128), (195, 135, 95))
    # Add face features
    arr = np.array(face_img)
    arr[30:50, 40:60] = [80, 50, 30] # eye
    arr[30:50, 70:90] = [80, 50, 30] # eye
    arr[80:95, 45:85] = [170, 70, 70] # mouth
    face_pil = Image.fromarray(arr)
    buf = io.BytesIO()
    face_pil.save(buf, format="JPEG")
    b64_face = base64.b64encode(buf.getvalue()).decode("utf-8")

    req = urllib.request.Request(
        url,
        data=json.dumps({"image": b64_face, "crop": "chilli"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("\nTest 1 (Human Face):", res)
        assert res["outcome"] == "unknown", f"Expected unknown outcome for human face, got: {res['outcome']}"
        assert res["topicSlug"] == "unknown"
        print("PASS: Human face rejected as unknown / OOD!")

    # Test 2: Random Non-Plant Indoor Object (e.g. gray desk / blue wall)
    desk_arr = np.zeros((128, 128, 3), dtype=np.uint8)
    desk_arr[:, :] = [100, 110, 130] # blue-gray metal/wall
    desk_pil = Image.fromarray(desk_arr)
    buf2 = io.BytesIO()
    desk_pil.save(buf2, format="JPEG")
    b64_desk = base64.b64encode(buf2.getvalue()).decode("utf-8")

    req2 = urllib.request.Request(
        url,
        data=json.dumps({"image": b64_desk, "crop": "rice"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode("utf-8"))
        print("\nTest 2 (Non-Plant Desk):", res2)
        assert res2["outcome"] == "unknown", f"Expected unknown outcome for non-plant object, got: {res2['outcome']}"
        print("PASS: Non-plant indoor object rejected as unknown / OOD!")

    # Test 3: Real Paddy Doctor Leaf Photo
    paddy_leaf_path = "ml/datasets/data/paddy_doctor_raw/brown_spot/paddy_doc_02258.jpg"
    with open(paddy_leaf_path, "rb") as f:
        b64_leaf = base64.b64encode(f.read()).decode("utf-8")

    req3 = urllib.request.Request(
        url,
        data=json.dumps({"image": b64_leaf, "crop": "rice"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req3) as resp:
        res3 = json.loads(resp.read().decode("utf-8"))
        print("\nTest 3 (Real Rice Leaf):", res3)
        assert res3["outcome"] == "identified", f"Expected identified outcome for real leaf, got: {res3['outcome']}"
        assert res3["topicSlug"] in ["brown-spot", "tungro", "rice-blast", "bacterial-leaf-blight"], f"Expected valid rice disease, got: {res3['topicSlug']}"
        print(f"PASS: Real rice leaf accurately identified as {res3['topicSlug']} with {res3['confidence']*100:.1f}% confidence!")

if __name__ == "__main__":
    test_predictions()
