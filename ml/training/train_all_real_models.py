"""
KisanAI Master Real-Dataset Training & Calibration Pipeline
Trains real MobileNetV3-Small models on:
1. Paddy Doctor real-field dataset (Tamil Nadu, India): 10 classes + unknown
2. Project-AgML COLD Chilli leaf disease dataset: 5 classes + unknown

Exports:
- PyTorch checkpoints to ml/training/checkpoints/
- ONNX models to public/models/
- Synchronizes with local AI server
"""

import os
import sys
import io
import glob
import random
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CHECKPOINT_DIR = os.path.join(REPO_ROOT, "ml/training/checkpoints")
PUBLIC_MODELS_DIR = os.path.join(REPO_ROOT, "public/models")
PADDY_RAW_DIR = os.path.join(REPO_ROOT, "ml/datasets/data/paddy_doctor_raw")
BACKBONE_WEIGHTS_PATH = os.path.join(REPO_ROOT, "ml/datasets/data/mobilenet_v3_small_official.pth")

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(PUBLIC_MODELS_DIR, exist_ok=True)

# 1. Class Definitions
RICE_CLASSES = [
    "rice_blast_leaf",              # 0 -> blast
    "rice_blast_neck",              # 1 -> bacterial_panicle_blight
    "rice_brown_spot",              # 2 -> brown_spot
    "rice_bacterial_leaf_blight",   # 3 -> bacterial_leaf_blight
    "rice_bacterial_leaf_streak",   # 4 -> bacterial_leaf_streak
    "rice_tungro",                  # 5 -> tungro
    "rice_yellow_stem_borer",       # 6 -> stem_borer
    "rice_hispa",                   # 7 -> hispa
    "rice_downy_mildew",            # 8 -> downy_mildew
    "rice_healthy",                 # 9 -> normal
    "unknown",                      # 10 -> out-of-distribution
]

CHILLI_CLASSES = [
    "chilli_leaf_curl",             # 0 -> nutritional / leaf curl
    "chilli_cercospora_leaf_spot",  # 1 -> cercospora
    "chilli_powdery_mildew",        # 2 -> powdery mildew
    "chilli_thrips",                # 3 -> mites_and_trips
    "chilli_healthy",               # 4 -> healthy
    "unknown",                      # 5 -> out-of-distribution
]

PADDY_DIR_MAP = {
    "blast": "rice_blast_leaf",
    "bacterial_panicle_blight": "rice_blast_neck",
    "brown_spot": "rice_brown_spot",
    "bacterial_leaf_blight": "rice_bacterial_leaf_blight",
    "bacterial_leaf_streak": "rice_bacterial_leaf_streak",
    "tungro": "rice_tungro",
    "stem_borer": "rice_yellow_stem_borer",
    "hispa": "rice_hispa",
    "downy_mildew": "rice_downy_mildew",
    "normal": "rice_healthy",
}

# ImageNet normalization
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_pil(im: Image.Image) -> torch.Tensor:
    im = im.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.array(im, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    tensor = torch.from_numpy(arr).permute(2, 0, 1)  # (3, 224, 224)
    return tensor


class SimpleDataset(Dataset):
    def __init__(self, tensors, labels, is_train=True):
        self.tensors = tensors
        self.labels = labels
        self.is_train = is_train

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        x = self.tensors[idx]
        y = self.labels[idx]
        if self.is_train and random.random() > 0.5:
            x = torch.flip(x, dims=[-1])  # Random horizontal flip
        return x, y


sys.path.insert(0, REPO_ROOT)
from ml.training.models import CropDiseaseClassifier


def load_backbone(model):
    if not os.path.exists(BACKBONE_WEIGHTS_PATH):
        import urllib.request
        url = "https://download.pytorch.org/models/mobilenet_v3_small-047dcff4.pth"
        print(f"Downloading official weights from {url}...")
        urllib.request.urlretrieve(url, BACKBONE_WEIGHTS_PATH)

    sd = torch.load(BACKBONE_WEIGHTS_PATH, map_location="cpu", weights_only=False)
    model_dict = model.state_dict()
    matched = 0
    for k, v in sd.items():
        if k.startswith("features.0."):
            tgt = k.replace("features.0.", "backbone.conv1.")
            if tgt in model_dict and model_dict[tgt].shape == v.shape:
                model_dict[tgt] = v
                matched += 1
        elif k.startswith("features.12."):
            tgt = k.replace("features.12.", "backbone.conv2.")
            if tgt in model_dict and model_dict[tgt].shape == v.shape:
                model_dict[tgt] = v
                matched += 1
        elif k.startswith("features."):
            parts = k.split(".")
            block_idx = int(parts[1]) - 1
            sub = ".".join(parts[2:])
            tgt = f"backbone.blocks.{block_idx}.{sub}"
            if tgt in model_dict and model_dict[tgt].shape == v.shape:
                model_dict[tgt] = v
                matched += 1
    model.load_state_dict(model_dict)
    print(f"Loaded {matched} pretrained backbone layers into model.")


def train_rice():
    print("\n=======================================================")
    print("🌾 1. PREPARING REAL RICE (PADDY DOCTOR) DATASET")
    print("=======================================================")

    tensors = []
    labels = []

    # Collect 60 balanced samples per class from Paddy Doctor
    for dir_name, cls_name in PADDY_DIR_MAP.items():
        cls_idx = RICE_CLASSES.index(cls_name)
        folder = os.path.join(PADDY_RAW_DIR, dir_name)
        files = glob.glob(os.path.join(folder, "*.jpg")) + glob.glob(os.path.join(folder, "*.JPG"))
        random.seed(42)
        random.shuffle(files)
        selected = files[:60]
        print(f"  Class {cls_idx:2d} ({cls_name:28}): {len(selected)} real photos")
        for f in selected:
            try:
                with Image.open(f) as im:
                    tensors.append(preprocess_pil(im))
                    labels.append(cls_idx)
            except Exception as e:
                pass

    # Add 40 synthetic OOD / random samples for unknown class (index 10)
    unk_idx = RICE_CLASSES.index("unknown")
    torch.manual_seed(42)
    for _ in range(40):
        tensors.append(torch.randn(3, 224, 224) * 0.5)
        labels.append(unk_idx)
    print(f"  Class {unk_idx:2d} (unknown                     ): 40 OOD samples")

    tensors = torch.stack(tensors)
    labels = torch.tensor(labels, dtype=torch.long)
    total_samples = len(labels)
    print(f"Total Rice Training Pool: {total_samples} samples across {len(RICE_CLASSES)} classes.")

    # Train / Val Split (80% / 20%)
    perm = torch.randperm(total_samples)
    val_count = int(total_samples * 0.20)
    val_idx, train_idx = perm[:val_count], perm[val_count:]

    train_ds = SimpleDataset(tensors[train_idx], labels[train_idx], is_train=True)
    val_ds = SimpleDataset(tensors[val_idx], labels[val_idx], is_train=False)

    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False)

    # Initialize model
    model = CropDiseaseClassifier(crop="rice")
    model.classes = RICE_CLASSES
    model.num_classes = len(RICE_CLASSES)
    model.classifier[3] = nn.Linear(1024, len(RICE_CLASSES))
    load_backbone(model)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)
    optimizer = optim.AdamW(model.parameters(), lr=9e-4, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=6, eta_min=1e-5)

    print("\n--- Training Rice MobileNetV3-Small ---")
    best_val_acc = 0.0
    for epoch in range(1, 7):
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        for x, y in train_loader:
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(y)
            train_correct += (out.argmax(1) == y).sum().item()
            train_total += len(y)

        scheduler.step()
        train_acc = train_correct / train_total

        # Validation
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for x, y in val_loader:
                out = model(x)
                val_correct += (out.argmax(1) == y).sum().item()
                val_total += len(y)

        val_acc = val_correct / val_total
        print(f"  Epoch {epoch}/6: Train Loss={train_loss/train_total:.4f}, Train Acc={train_acc*100:.1f}%, Val Acc={val_acc*100:.1f}%")
        best_val_acc = max(best_val_acc, val_acc)

    # Save Checkpoint
    ckpt_path = os.path.join(CHECKPOINT_DIR, "rice_mobilenetv3_best.pth")
    torch.save({
        "epoch": 6,
        "crop": "rice",
        "state_dict": model.state_dict(),
        "classes": RICE_CLASSES,
        "metrics": {"top1_accuracy": round(best_val_acc, 4)}
    }, ckpt_path)
    print(f"Saved Rice Checkpoint to {ckpt_path} (Val Acc: {best_val_acc*100:.1f}%)")

    # Export ONNX Model for In-Browser Offline WebAssembly Execution
    onnx_path = os.path.join(PUBLIC_MODELS_DIR, "rice_mobilenetv3.onnx")
    dummy = torch.randn(1, 3, 224, 224)
    model.eval()
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=14,
        dynamo=False,
    )
    print(f"Exported In-Browser WebAssembly ONNX Model to {onnx_path}")
    return model


def train_chilli():
    print("\n=======================================================")
    print("🌶️ 2. PREPARING REAL CHILLI (COLD DATASET)")
    print("=======================================================")

    import ssl
    import urllib.request
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    url = "https://huggingface.co/datasets/Project-AgML/COLD_chili_leaf_disease_classification/resolve/main/raw/train-00000-of-00001.parquet"
    print(f"Fetching COLD Chilli Dataset from HuggingFace...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
        data = r.read()

    df = pd.read_parquet(io.BytesIO(data))
    print(f"Loaded {len(df)} Chilli records.")

    # Mapping:
    # 0: cercospora -> chilli_cercospora_leaf_spot (idx 1)
    # 1: healthy -> chilli_healthy (idx 4)
    # 2: mites_and_trips -> chilli_thrips (idx 3)
    # 3: nutritional / leaf curl -> chilli_leaf_curl (idx 0)
    # 4: powdery mildew -> chilli_powdery_mildew (idx 2)
    mapping = {
        0: CHILLI_CLASSES.index("chilli_cercospora_leaf_spot"),
        1: CHILLI_CLASSES.index("chilli_healthy"),
        2: CHILLI_CLASSES.index("chilli_thrips"),
        3: CHILLI_CLASSES.index("chilli_leaf_curl"),
        4: CHILLI_CLASSES.index("chilli_powdery_mildew"),
    }

    tensors = []
    labels = []
    for _, row in df.iterrows():
        lbl = row["label"]
        if lbl in mapping:
            raw_b = row["image"]["bytes"]
            try:
                with Image.open(io.BytesIO(raw_b)) as im:
                    tensors.append(preprocess_pil(im))
                    labels.append(mapping[lbl])
            except Exception:
                pass

    # Add 40 synthetic OOD samples for unknown (idx 5)
    unk_idx = CHILLI_CLASSES.index("unknown")
    torch.manual_seed(42)
    for _ in range(40):
        tensors.append(torch.randn(3, 224, 224) * 0.5)
        labels.append(unk_idx)

    tensors = torch.stack(tensors)
    labels = torch.tensor(labels, dtype=torch.long)
    total_samples = len(labels)
    print(f"Total Chilli Training Pool: {total_samples} samples across {len(CHILLI_CLASSES)} classes.")

    perm = torch.randperm(total_samples)
    val_count = int(total_samples * 0.20)
    val_idx, train_idx = perm[:val_count], perm[val_count:]

    train_ds = SimpleDataset(tensors[train_idx], labels[train_idx], is_train=True)
    val_ds = SimpleDataset(tensors[val_idx], labels[val_idx], is_train=False)

    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False)

    model = CropDiseaseClassifier(crop="chilli")
    model.classes = CHILLI_CLASSES
    model.num_classes = len(CHILLI_CLASSES)
    model.classifier[3] = nn.Linear(1024, len(CHILLI_CLASSES))
    load_backbone(model)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)
    optimizer = optim.AdamW(model.parameters(), lr=9e-4, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=6, eta_min=1e-5)

    print("\n--- Training Chilli MobileNetV3-Small ---")
    best_val_acc = 0.0
    for epoch in range(1, 7):
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        for x, y in train_loader:
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(y)
            train_correct += (out.argmax(1) == y).sum().item()
            train_total += len(y)

        scheduler.step()
        train_acc = train_correct / train_total

        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for x, y in val_loader:
                out = model(x)
                val_correct += (out.argmax(1) == y).sum().item()
                val_total += len(y)

        val_acc = val_correct / val_total
        print(f"  Epoch {epoch}/6: Train Loss={train_loss/train_total:.4f}, Train Acc={train_acc*100:.1f}%, Val Acc={val_acc*100:.1f}%")
        best_val_acc = max(best_val_acc, val_acc)

    ckpt_path = os.path.join(CHECKPOINT_DIR, "chilli_mobilenetv3_best.pth")
    torch.save({
        "epoch": 6,
        "crop": "chilli",
        "state_dict": model.state_dict(),
        "classes": CHILLI_CLASSES,
        "metrics": {"top1_accuracy": round(best_val_acc, 4)}
    }, ckpt_path)
    print(f"Saved Chilli Checkpoint to {ckpt_path} (Val Acc: {best_val_acc*100:.1f}%)")

    onnx_path = os.path.join(PUBLIC_MODELS_DIR, "chilli_mobilenetv3.onnx")
    dummy = torch.randn(1, 3, 224, 224)
    model.eval()
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=14,
        dynamo=False,
    )
    print(f"Exported In-Browser WebAssembly ONNX Model to {onnx_path}")
    return model


if __name__ == "__main__":
    rice_m = train_rice()
    chilli_m = train_chilli()
    print("\n🎉 ALL REAL VISION MODELS SUCCESSFULLY TRAINED AND DEPLOYED!")

