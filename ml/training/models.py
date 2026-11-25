"""
Crop Disease Classifier Model Architecture
Based on MobileNetV3-Small with calibrated classification heads for Rice and Chilli.
"""

import math
from typing import Any, Dict
import torch
import torch.nn as nn
import torch.nn.functional as F

RICE_CLASSES = [
    "rice_blast_leaf",
    "rice_blast_neck",
    "rice_brown_spot",
    "rice_bacterial_leaf_blight",
    "rice_bacterial_leaf_streak",
    "rice_tungro",
    "rice_yellow_stem_borer",
    "rice_hispa",
    "rice_downy_mildew",
    "rice_healthy",
    "unknown",
]

CHILLI_CLASSES = [
    "chilli_leaf_curl",
    "chilli_cercospora_leaf_spot",
    "chilli_powdery_mildew",
    "chilli_thrips",
    "chilli_healthy",
    "unknown",
]


class SqueezeExcitation(nn.Module):
    def __init__(self, in_channels: int, reduced_dim: int):
        super().__init__()
        self.fc1 = nn.Conv2d(in_channels, reduced_dim, 1)
        self.fc2 = nn.Conv2d(reduced_dim, in_channels, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = F.adaptive_avg_pool2d(x, 1)
        scale = F.relu(self.fc1(scale), inplace=True)
        scale = torch.sigmoid(self.fc2(scale))
        return x * scale


class InvertedResidual(nn.Module):
    def __init__(
        self,
        in_c: int,
        exp_c: int,
        out_c: int,
        kernel: int,
        stride: int,
        use_se: bool,
        act: str = "RE",
    ):
        super().__init__()
        self.use_residual = stride == 1 and in_c == out_c
        layers = []

        if exp_c != in_c:
            layers.append(nn.Conv2d(in_c, exp_c, 1, bias=False))
            layers.append(nn.BatchNorm2d(exp_c))
            layers.append(nn.Hardswish(inplace=True) if act == "HS" else nn.ReLU(inplace=True))

        # Depthwise
        layers.append(
            nn.Conv2d(exp_c, exp_c, kernel, stride, kernel // 2, groups=exp_c, bias=False)
        )
        layers.append(nn.BatchNorm2d(exp_c))
        layers.append(nn.Hardswish(inplace=True) if act == "HS" else nn.ReLU(inplace=True))

        if use_se:
            layers.append(SqueezeExcitation(exp_c, max(1, exp_c // 4)))

        # Project
        layers.append(nn.Conv2d(exp_c, out_c, 1, bias=False))
        layers.append(nn.BatchNorm2d(out_c))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_residual:
            return x + self.block(x)
        return self.block(x)


class MobileNetV3SmallBackbone(nn.Module):
    """Clean self-contained MobileNetV3-Small backbone without external weights dependency."""
    def __init__(self):
        super().__init__()
        # First layer
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, 16, 3, 2, 1, bias=False),
            nn.BatchNorm2d(16),
            nn.Hardswish(inplace=True),
        )

        # Inverted residual settings: [in_c, exp_c, out_c, k, s, se, act]
        configs = [
            [16, 16, 16, 3, 2, True, "RE"],
            [16, 72, 24, 3, 2, False, "RE"],
            [24, 88, 24, 3, 1, False, "RE"],
            [24, 96, 40, 5, 2, True, "HS"],
            [40, 240, 40, 5, 1, True, "HS"],
            [40, 240, 40, 5, 1, True, "HS"],
            [40, 120, 48, 5, 1, True, "HS"],
            [48, 144, 48, 5, 1, True, "HS"],
            [48, 288, 96, 5, 2, True, "HS"],
            [96, 576, 96, 5, 1, True, "HS"],
            [96, 576, 96, 5, 1, True, "HS"],
        ]

        layers = []
        for in_c, exp_c, out_c, k, s, se, act in configs:
            layers.append(InvertedResidual(in_c, exp_c, out_c, k, s, se, act))
        self.blocks = nn.Sequential(*layers)

        # Final feature expansion
        self.conv2 = nn.Sequential(
            nn.Conv2d(96, 576, 1, bias=False),
            nn.BatchNorm2d(576),
            nn.Hardswish(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.blocks(x)
        x = self.conv2(x)
        return x


class CropDiseaseClassifier(nn.Module):
    def __init__(self, crop: str = "rice", temperature: float = 1.0):
        super().__init__()
        self.crop = crop.lower()
        self.classes = RICE_CLASSES if self.crop == "rice" else CHILLI_CLASSES
        self.num_classes = len(self.classes)

        self.backbone = MobileNetV3SmallBackbone()
        self.pool = nn.AdaptiveAvgPool2d(1)

        self.classifier = nn.Sequential(
            nn.Linear(576, 1024),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(1024, self.num_classes),
        )

        self.temperature = nn.Parameter(torch.ones(1) * temperature, requires_grad=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        pooled = self.pool(features).flatten(1)
        logits = self.classifier(pooled)
        return logits / self.temperature

    def predict(
        self, x: torch.Tensor, confidence_threshold: float = 0.58
    ) -> Dict[str, Any]:
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=1)
            top_prob, top_idx = torch.topk(probs, 1, dim=1)

            conf = float(top_prob[0, 0].item())
            class_idx = int(top_idx[0, 0].item())
            class_name = self.classes[class_idx]

            # Entropy calculation for Out-Of-Distribution / Unknown detection
            log_probs = F.log_softmax(logits, dim=1)
            entropy = float(-torch.sum(probs * log_probs, dim=1)[0].item())
            max_entropy = math.log(self.num_classes)

            # Rejection rule: If confidence is below threshold OR entropy is very high, reject as unknown
            is_unknown = (
                class_name == "unknown"
                or conf < confidence_threshold
                or entropy > (max_entropy * 0.85)
            )

            return {
                "crop": self.crop,
                "label": "unknown" if is_unknown else class_name,
                "raw_label": class_name,
                "confidence": round(conf, 4),
                "entropy": round(entropy, 4),
                "is_rejected": is_unknown,
                "probabilities": {
                    cls: round(float(p.item()), 4)
                    for cls, p in zip(self.classes, probs[0])
                },
            }


if __name__ == "__main__":
    rice_model = CropDiseaseClassifier(crop="rice")
    chilli_model = CropDiseaseClassifier(crop="chilli")

    sample_tensor = torch.randn(1, 3, 224, 224)
    pred_rice = rice_model.predict(sample_tensor)
    pred_chilli = chilli_model.predict(sample_tensor)

    print("Rice Model Classes:", len(rice_model.classes))
    print("Rice Sample Prediction:", pred_rice)
    print("Chilli Model Classes:", len(chilli_model.classes))
    print("Chilli Sample Prediction:", pred_chilli)
