"""
Mobile Model Export Script for ExecuTorch / PyTorch Mobile Android Deployment
Exports Rice and Chilli MobileNetV3-Small models with:
- Best trained checkpoint weights
- Calibrated temperature scaling parameter
- TorchScript (.pt) serialization
- torch.export (.ep) ExportedProgram graph
- Android ExecuTorch metadata JSON
"""

import json
import os
import sys
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.training.models import (
    CropDiseaseClassifier,
    CHILLI_CLASSES,
    RICE_CLASSES,
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "../training/checkpoints")


def export_model(crop: str):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    classes = RICE_CLASSES if crop == "rice" else CHILLI_CLASSES
    model = CropDiseaseClassifier(crop=crop)

    # 1. Load trained checkpoint if present
    ckpt_path = os.path.join(CHECKPOINT_DIR, f"{crop}_mobilenetv3_best.pth")
    if os.path.exists(ckpt_path):
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        model.load_state_dict(ckpt["state_dict"])
        print(f"Loaded {crop} trained checkpoint from {ckpt_path}")

    model.eval()
    example_input = torch.randn(1, 3, 224, 224)

    # 2. Export to TorchScript (.pt) for PyTorch Lite / ExecuTorch Android
    traced_model = torch.jit.trace(model, example_input)
    torchscript_path = os.path.join(OUTPUT_DIR, f"{crop}_mobilenetv3_small.pt")
    traced_model.save(torchscript_path)

    # 3. Export to torch.export for ExecuTorch EXIR graph
    try:
        exported_program = torch.export.export(model, (example_input,))
        ep_path = os.path.join(OUTPUT_DIR, f"{crop}_mobilenetv3_small.ep")
        torch.export.save(exported_program, ep_path)
        print(f"Exported {crop} torch.export graph -> {ep_path}")
    except Exception as e:
        print(f"Notice: torch.export serialization notice: {e}")

    # 4. Generate deployment metadata
    metadata = {
        "model_name": f"{crop.capitalize()} Disease & Pest MobileNetV3-Small",
        "architecture": "MobileNetV3-Small",
        "crop": crop,
        "input_shape": [1, 3, 224, 224],
        "preprocessing": {
            "resize": [224, 224],
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        },
        "classes": classes,
        "num_classes": len(classes),
        "confidence_threshold": 0.58,
        "calibrated_temperature": float(model.temperature.item()),
        "target_runtime": "ExecuTorch + XNNPACK / PyTorch Mobile (Android)",
    }

    meta_path = os.path.join(OUTPUT_DIR, f"{crop}_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Exported {crop} model -> {torchscript_path}")
    print(f"Exported {crop} metadata -> {meta_path}")


if __name__ == "__main__":
    export_model("rice")
    export_model("chilli")
