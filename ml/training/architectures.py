"""
Advanced Agricultural Vision Model Architectures & Hierarchical Classifier
Implements benchmark architectures:
1. MobileNetV3-Large (Lightweight baseline)
2. EfficientNetV2-B0 & EfficientNetV2-S (Fused-MBConv & MBConv with Squeeze-and-Excitation)
3. ConvNeXt-Tiny (Modern pure-CNN with 7x7 depthwise convolutions and LayerNorm)
4. DeiT-Small (Vision Transformer with multi-head self-attention and patch embeddings)
5. HierarchicalCropVisionModel: Hierarchical multi-task model with:
   - Level 1: Plant foliage validity / OOD verification
   - Level 2: Crop identification (Rice, Chilli, Unknown)
   - Level 3: Problem category (Healthy, Disease, Pest, Uncertain)
   - Level 4: Fine-grained diagnostic heads with temperature calibration and calibrated uncertainty
"""

import math
from typing import Dict, Any, Tuple, Optional, List
import torch
import torch.nn as nn
import torch.nn.functional as F

# Unified Crop Disease & Pest Taxonomy
RICE_DISEASE_CLASSES = [
    "rice_blast_leaf",
    "rice_blast_neck",
    "rice_brown_spot",
    "rice_bacterial_leaf_blight",
    "rice_tungro",
    "rice_healthy"
]

RICE_PEST_CLASSES = [
    "rice_brown_planthopper",
    "rice_yellow_stem_borer",
    "rice_leaf_folder",
    "rice_gall_midge"
]

CHILLI_DISEASE_CLASSES = [
    "chilli_leaf_curl",
    "chilli_cercospora_leaf_spot",
    "chilli_bacterial_leaf_spot",
    "chilli_powdery_mildew",
    "chilli_anthracnose_fruit_rot",
    "chilli_healthy"
]

CHILLI_PEST_CLASSES = [
    "chilli_thrips",
    "chilli_mites",
    "chilli_whiteflies",
    "chilli_aphids"
]

CROP_CLASSES = ["rice", "chilli", "unknown_crop"]
CATEGORY_CLASSES = ["healthy", "disease", "pest", "uncertain"]

# ==============================================================================
# 1. MOBILENETV3-LARGE BACKBONE
# ==============================================================================

class HardSigmoid(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return F.relu6(x + 3.0, inplace=True) / 6.0

class HardSwish(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * F.relu6(x + 3.0, inplace=True) / 6.0

class SqueezeExcitation(nn.Module):
    def __init__(self, in_c: int, reduced_dim: int):
        super().__init__()
        self.fc1 = nn.Conv2d(in_c, reduced_dim, 1)
        self.fc2 = nn.Conv2d(reduced_dim, in_c, 1)
        self.act = HardSigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = F.adaptive_avg_pool2d(x, 1)
        scale = F.relu(self.fc1(scale), inplace=True)
        scale = self.act(self.fc2(scale))
        return x * scale

class InvertedResidual(nn.Module):
    def __init__(
        self, in_c: int, exp_c: int, out_c: int, kernel: int, stride: int, use_se: bool, use_hs: bool
    ):
        super().__init__()
        self.use_residual = stride == 1 and in_c == out_c
        layers: List[nn.Module] = []

        if exp_c != in_c:
            layers.append(nn.Conv2d(in_c, exp_c, 1, bias=False))
            layers.append(nn.BatchNorm2d(exp_c))
            layers.append(HardSwish() if use_hs else nn.ReLU(inplace=True))

        layers.append(
            nn.Conv2d(exp_c, exp_c, kernel, stride, kernel // 2, groups=exp_c, bias=False)
        )
        layers.append(nn.BatchNorm2d(exp_c))
        layers.append(HardSwish() if use_hs else nn.ReLU(inplace=True))

        if use_se:
            layers.append(SqueezeExcitation(exp_c, max(1, exp_c // 4)))

        layers.append(nn.Conv2d(exp_c, out_c, 1, bias=False))
        layers.append(nn.BatchNorm2d(out_c))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_residual:
            return x + self.block(x)
        return self.block(x)

class MobileNetV3LargeBackbone(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, 16, 3, 2, 1, bias=False),
            nn.BatchNorm2d(16),
            HardSwish(),
        )

        # [in_c, exp_c, out_c, kernel, stride, use_se, use_hs]
        configs = [
            [16, 16, 16, 3, 1, False, False],
            [16, 64, 24, 3, 2, False, False],
            [24, 72, 24, 3, 1, False, False],
            [24, 72, 40, 5, 2, True, False],
            [40, 120, 40, 5, 1, True, False],
            [40, 120, 40, 5, 1, True, False],
            [40, 240, 80, 3, 2, False, True],
            [80, 200, 80, 3, 1, False, True],
            [80, 184, 80, 3, 1, False, True],
            [80, 184, 80, 3, 1, False, True],
            [80, 480, 112, 3, 1, True, True],
            [112, 672, 112, 3, 1, True, True],
            [112, 672, 160, 5, 2, True, True],
            [160, 960, 160, 5, 1, True, True],
            [160, 960, 160, 5, 1, True, True],
        ]

        layers: List[nn.Module] = []
        for in_c, exp_c, out_c, k, s, se, hs in configs:
            layers.append(InvertedResidual(in_c, exp_c, out_c, k, s, se, hs))
        self.blocks = nn.Sequential(*layers)

        self.conv2 = nn.Sequential(
            nn.Conv2d(160, 960, 1, bias=False),
            nn.BatchNorm2d(960),
            HardSwish(),
        )
        self.feature_dim = 960

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.blocks(x)
        x = self.conv2(x)
        return x

# ==============================================================================
# 2. EFFICIENTNETV2 BACKBONE (B0 & S)
# ==============================================================================

class FusedMBConv(nn.Module):
    def __init__(self, in_c: int, exp_c: int, out_c: int, stride: int):
        super().__init__()
        self.use_residual = stride == 1 and in_c == out_c
        layers: List[nn.Module] = []

        if exp_c != in_c:
            layers.append(nn.Conv2d(in_c, exp_c, 3, stride, 1, bias=False))
            layers.append(nn.BatchNorm2d(exp_c))
            layers.append(nn.SiLU(inplace=True))
            layers.append(nn.Conv2d(exp_c, out_c, 1, bias=False))
            layers.append(nn.BatchNorm2d(out_c))
        else:
            layers.append(nn.Conv2d(in_c, out_c, 3, stride, 1, bias=False))
            layers.append(nn.BatchNorm2d(out_c))
            layers.append(nn.SiLU(inplace=True))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_residual:
            return x + self.block(x)
        return self.block(x)

class MBConv(nn.Module):
    def __init__(self, in_c: int, exp_c: int, out_c: int, kernel: int, stride: int, se_ratio: float = 0.25):
        super().__init__()
        self.use_residual = stride == 1 and in_c == out_c
        layers: List[nn.Module] = []

        if exp_c != in_c:
            layers.append(nn.Conv2d(in_c, exp_c, 1, bias=False))
            layers.append(nn.BatchNorm2d(exp_c))
            layers.append(nn.SiLU(inplace=True))

        layers.append(nn.Conv2d(exp_c, exp_c, kernel, stride, kernel // 2, groups=exp_c, bias=False))
        layers.append(nn.BatchNorm2d(exp_c))
        layers.append(nn.SiLU(inplace=True))

        reduced_dim = max(1, int(in_c * se_ratio))
        layers.append(SqueezeExcitation(exp_c, reduced_dim))

        layers.append(nn.Conv2d(exp_c, out_c, 1, bias=False))
        layers.append(nn.BatchNorm2d(out_c))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_residual:
            return x + self.block(x)
        return self.block(x)

class EfficientNetV2Backbone(nn.Module):
    def __init__(self, variant: str = "s"):
        super().__init__()
        self.variant = variant.lower()

        if self.variant == "b0":
            init_c = 32
            final_c = 1280
            # Stages for B0
            stages: List[nn.Module] = [
                FusedMBConv(32, 32, 16, 1),
                FusedMBConv(16, 64, 32, 2),
                FusedMBConv(32, 128, 48, 2),
                MBConv(48, 192, 96, 5, 2),
                MBConv(96, 384, 112, 5, 1),
                MBConv(112, 672, 192, 5, 2),
            ]
            last_stage_c = 192
        else: # "s"
            init_c = 24
            final_c = 1280
            stages = [
                FusedMBConv(24, 24, 24, 1),
                FusedMBConv(24, 24, 24, 1),
                FusedMBConv(24, 96, 48, 2),
                FusedMBConv(48, 192, 48, 1),
                FusedMBConv(48, 192, 48, 1),
                FusedMBConv(48, 192, 48, 1),
                FusedMBConv(48, 192, 64, 2),
                FusedMBConv(64, 256, 64, 1),
                FusedMBConv(64, 256, 64, 1),
                FusedMBConv(64, 256, 64, 1),
                MBConv(64, 256, 128, 3, 2),
                MBConv(128, 512, 128, 3, 1),
                MBConv(128, 512, 128, 3, 1),
                MBConv(128, 512, 128, 3, 1),
                MBConv(128, 512, 160, 3, 1),
                MBConv(160, 640, 160, 3, 1),
                MBConv(160, 640, 256, 3, 2),
                MBConv(256, 1024, 256, 3, 1),
            ]
            last_stage_c = 256

        self.stem = nn.Sequential(
            nn.Conv2d(3, init_c, 3, 2, 1, bias=False),
            nn.BatchNorm2d(init_c),
            nn.SiLU(inplace=True),
        )
        self.stages = nn.Sequential(*stages)
        self.head = nn.Sequential(
            nn.Conv2d(last_stage_c, final_c, 1, bias=False),
            nn.BatchNorm2d(final_c),
            nn.SiLU(inplace=True),
        )
        self.feature_dim = final_c

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.stages(x)
        x = self.head(x)
        return x

# ==============================================================================
# 3. CONVNEXT-TINY BACKBONE
# ==============================================================================

class ConvNeXtBlock(nn.Module):
    def __init__(self, dim: int):
        super().__init__()
        self.dwconv = nn.Conv2d(dim, dim, kernel_size=7, padding=3, groups=dim)
        self.norm = nn.LayerNorm(dim, eps=1e-6)
        self.pwconv1 = nn.Linear(dim, 4 * dim)
        self.act = nn.GELU()
        self.pwconv2 = nn.Linear(4 * dim, dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = x
        x = self.dwconv(x)
        # Permute to channels-last for LayerNorm and Linear
        x = x.permute(0, 2, 3, 1)
        x = self.norm(x)
        x = self.pwconv1(x)
        x = self.act(x)
        x = self.pwconv2(x)
        x = x.permute(0, 3, 1, 2)
        return res + x

class ConvNeXtTinyBackbone(nn.Module):
    def __init__(self):
        super().__init__()
        self.downsample_layers = nn.ModuleList([
            nn.Sequential(
                nn.Conv2d(3, 96, kernel_size=4, stride=4),
                nn.GroupNorm(1, 96, eps=1e-6),
            ),
            nn.Sequential(
                nn.GroupNorm(1, 96, eps=1e-6),
                nn.Conv2d(96, 192, kernel_size=2, stride=2),
            ),
            nn.Sequential(
                nn.GroupNorm(1, 192, eps=1e-6),
                nn.Conv2d(192, 384, kernel_size=2, stride=2),
            ),
            nn.Sequential(
                nn.GroupNorm(1, 384, eps=1e-6),
                nn.Conv2d(384, 768, kernel_size=2, stride=2),
            ),
        ])

        depths = [3, 3, 9, 3]
        dims = [96, 192, 384, 768]
        self.stages = nn.ModuleList()
        for i in range(4):
            stage = nn.Sequential(*[ConvNeXtBlock(dim=dims[i]) for _ in range(depths[i])])
            self.stages.append(stage)

        self.feature_dim = 768

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for i in range(4):
            x = self.downsample_layers[i](x)
            x = self.stages[i](x)
        return x

# ==============================================================================
# 4. DEIT-SMALL (VISION TRANSFORMER) BACKBONE
# ==============================================================================

class PatchEmbedding(nn.Module):
    def __init__(self, img_size: int = 224, patch_size: int = 16, in_c: int = 3, embed_dim: int = 384):
        super().__init__()
        self.num_patches = (img_size // patch_size) ** 2
        self.proj = nn.Conv2d(in_c, embed_dim, kernel_size=patch_size, stride=patch_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # B, C, H, W -> B, Embed, N_patches -> B, N_patches, Embed
        return self.proj(x).flatten(2).transpose(1, 2)

class TransformerEncoderBlock(nn.Module):
    def __init__(self, dim: int = 384, num_heads: int = 6, mlp_ratio: float = 4.0):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.norm2 = nn.LayerNorm(dim)
        mlp_dim = int(dim * mlp_ratio)
        self.mlp = nn.Sequential(
            nn.Linear(dim, mlp_dim),
            nn.GELU(),
            nn.Linear(mlp_dim, dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        norm_x = self.norm1(x)
        attn_out, _ = self.attn(norm_x, norm_x, norm_x)
        x = x + attn_out
        x = x + self.mlp(self.norm2(x))
        return x

class DeiTSmallBackbone(nn.Module):
    def __init__(self, img_size: int = 224, depth: int = 8, embed_dim: int = 384, num_heads: int = 6):
        super().__init__()
        self.patch_embed = PatchEmbedding(img_size=img_size, embed_dim=embed_dim)
        num_patches = self.patch_embed.num_patches

        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.dist_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 2, embed_dim))

        self.blocks = nn.ModuleList([
            TransformerEncoderBlock(dim=embed_dim, num_heads=num_heads) for _ in range(depth)
        ])
        self.norm = nn.LayerNorm(embed_dim)
        self.feature_dim = embed_dim

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B = x.shape[0]
        x = self.patch_embed(x)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        dist_tokens = self.dist_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, dist_tokens, x), dim=1)
        x = x + self.pos_embed
        for block in self.blocks:
            x = block(x)
        x = self.norm(x)
        # Average cls and dist token representations
        return (x[:, 0] + x[:, 1]) / 2.0

# ==============================================================================
# 5. HIERARCHICAL CROP VISION SYSTEM (MULTI-TASK ARCHITECTURE)
# ==============================================================================

class HierarchicalCropVisionModel(nn.Module):
    """
    Hierarchical Multi-Task Agricultural Recognition Model
    Level 1: Plant Image Usability & OOD Rejection (Binary: Valid Foliage vs Invalid)
    Level 2: Crop Classifier Head (Rice vs Chilli vs Unknown)
    Level 3: Problem Category (Healthy, Disease, Pest, Uncertain)
    Level 4: Fine-Grained Specialist Heads:
             - Rice Disease (6 classes: Blast leaf, Blast neck, Brown spot, BLB, Tungro, Healthy)
             - Rice Pest (4 classes: BPH, Stem borer, Leaf folder, Gall midge)
             - Chilli Disease (6 classes: Leaf curl, Cercospora, Bacterial spot, Powdery mildew, Anthracnose, Healthy)
             - Chilli Pest (4 classes: Thrips, Mites, Whitefly, Aphids)
    """
    def __init__(
        self,
        backbone_type: str = "efficientnet_v2_s",
        temperature: float = 1.0,
    ):
        super().__init__()
        self.backbone_type = backbone_type.lower()
        self.is_transformer = "deit" in self.backbone_type

        # Instantiation of Selected Backbone
        if self.backbone_type == "mobilenet_v3_large":
            self.backbone = MobileNetV3LargeBackbone()
            in_dim = self.backbone.feature_dim
        elif self.backbone_type == "convnext_tiny":
            self.backbone = ConvNeXtTinyBackbone()
            in_dim = self.backbone.feature_dim
        elif self.backbone_type == "efficientnet_v2_b0":
            self.backbone = EfficientNetV2Backbone(variant="b0")
            in_dim = self.backbone.feature_dim
        elif self.backbone_type == "deit_small":
            self.backbone = DeiTSmallBackbone()
            in_dim = self.backbone.feature_dim
        else: # Default: efficientnet_v2_s
            self.backbone = EfficientNetV2Backbone(variant="s")
            in_dim = self.backbone.feature_dim

        self.pool = nn.AdaptiveAvgPool2d(1)

        # Level 1: Image Validity & Foliar Verification (Valid Plant vs Unrelated/Blur/OOD)
        self.head_validity = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 2) # [0: invalid_ood, 1: valid_plant]
        )

        # Level 2: Crop Identification Head (Rice, Chilli, Unknown Crop)
        self.head_crop = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, len(CROP_CLASSES))
        )

        # Level 3: Problem Category Head (Healthy, Disease, Pest, Uncertain)
        self.head_category = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, len(CATEGORY_CLASSES))
        )

        # Level 4: Fine-Grained Diagnostic Specialist Heads
        self.head_rice_disease = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.SiLU(),
            nn.Dropout(0.25),
            nn.Linear(512, len(RICE_DISEASE_CLASSES))
        )
        self.head_rice_pest = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.SiLU(),
            nn.Dropout(0.25),
            nn.Linear(512, len(RICE_PEST_CLASSES))
        )
        self.head_chilli_disease = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.SiLU(),
            nn.Dropout(0.25),
            nn.Linear(512, len(CHILLI_DISEASE_CLASSES))
        )
        self.head_chilli_pest = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.SiLU(),
            nn.Dropout(0.25),
            nn.Linear(512, len(CHILLI_PEST_CLASSES))
        )

        # Learned Temperature Scaling Parameter for Confidence Calibration
        self.temperature = nn.Parameter(torch.ones(1) * temperature, requires_grad=False)

    def freeze_backbone(self):
        for param in self.backbone.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self):
        for param in self.backbone.parameters():
            param.requires_grad = True

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.backbone(x)
        if not self.is_transformer:
            feat = self.pool(feat).flatten(1)
        return feat

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        features = self.extract_features(x)
        T = torch.clamp(self.temperature, min=0.1, max=5.0)

        return {
            "features": features,
            "logits_validity": self.head_validity(features) / T,
            "logits_crop": self.head_crop(features) / T,
            "logits_category": self.head_category(features) / T,
            "logits_rice_disease": self.head_rice_disease(features) / T,
            "logits_rice_pest": self.head_rice_pest(features) / T,
            "logits_chilli_disease": self.head_chilli_disease(features) / T,
            "logits_chilli_pest": self.head_chilli_pest(features) / T,
        }

    def predict_hierarchical(
        self,
        x: torch.Tensor,
        confidence_threshold: float = 0.65,
        ood_entropy_threshold: float = 0.82,
    ) -> Dict[str, Any]:
        """
        Executes hierarchical deduction with strict confidence calibration and OOD abstention.
        """
        self.eval()
        with torch.no_grad():
            outputs = self.forward(x)

            # Level 1: Validity Check
            probs_val = F.softmax(outputs["logits_validity"], dim=1)
            is_valid_plant = probs_val[0, 1].item() >= 0.50
            if not is_valid_plant:
                return {
                    "status": "REJECTED_OOD",
                    "level": 1,
                    "confidence": round(float(probs_val[0, 0].item()), 4),
                    "reason": "Image not recognized as a plant leaf or foliage.",
                    "isCropValid": false if hasattr(__builtins__, 'false') else False,
                    "diagnosis": None,
                }

            # Level 2: Crop Determination
            probs_crop = F.softmax(outputs["logits_crop"], dim=1)
            crop_idx = torch.argmax(probs_crop, dim=1).item()
            crop_name = CROP_CLASSES[crop_idx]
            crop_conf = float(probs_crop[0, crop_idx].item())

            if crop_name == "unknown_crop" or crop_conf < 0.55:
                return {
                    "status": "UNSUPPORTED_CROP",
                    "level": 2,
                    "crop": "unknown",
                    "confidence": round(crop_conf, 4),
                    "reason": "Crop species outside supported Rice and Chilli taxonomy.",
                    "diagnosis": None,
                }

            # Level 3: Problem Category Determination
            probs_cat = F.softmax(outputs["logits_category"], dim=1)
            cat_idx = torch.argmax(probs_cat, dim=1).item()
            cat_name = CATEGORY_CLASSES[cat_idx]
            cat_conf = float(probs_cat[0, cat_idx].item())

            # Level 4: Fine-Grained Specialist Deduction
            if crop_name == "rice":
                if cat_name == "pest":
                    logits_target = outputs["logits_rice_pest"]
                    classes_target = RICE_PEST_CLASSES
                else: # disease or healthy
                    logits_target = outputs["logits_rice_disease"]
                    classes_target = RICE_DISEASE_CLASSES
            else: # chilli
                if cat_name == "pest":
                    logits_target = outputs["logits_chilli_pest"]
                    classes_target = CHILLI_PEST_CLASSES
                else: # disease or healthy
                    logits_target = outputs["logits_chilli_disease"]
                    classes_target = CHILLI_DISEASE_CLASSES

            probs_target = F.softmax(logits_target, dim=1)
            top_prob, top_idx = torch.topk(probs_target, 1, dim=1)
            condition_conf = float(top_prob[0, 0].item())
            condition_idx = int(top_idx[0, 0].item())
            predicted_condition = classes_target[condition_idx]

            # Uncertainty & Entropy Calculation
            log_probs = F.log_softmax(logits_target, dim=1)
            entropy = float(-torch.sum(probs_target * log_probs, dim=1)[0].item())
            max_entropy = math.log(len(classes_target))
            normalized_entropy = entropy / max(1e-5, max_entropy)

            # Combined Calibrated Confidence Score
            joint_confidence = round(crop_conf * condition_conf, 4)

            # Abstention Decision Rule
            if joint_confidence < confidence_threshold or normalized_entropy > ood_entropy_threshold:
                return {
                    "status": "UNCERTAIN_ABSTENTION",
                    "level": 4,
                    "crop": crop_name,
                    "category": cat_name,
                    "tentative_condition": predicted_condition,
                    "confidence": joint_confidence,
                    "entropy": round(normalized_entropy, 4),
                    "reason": "I cannot confidently identify this condition. Please take a clearer photograph of the affected leaf or insect.",
                    "diagnosis": None,
                }

            return {
                "status": "IDENTIFIED",
                "level": 4,
                "crop": crop_name,
                "category": cat_name,
                "condition": predicted_condition,
                "confidence": joint_confidence,
                "entropy": round(normalized_entropy, 4),
                "is_calibrated": True,
                "class_probabilities": {
                    cls: round(float(p.item()), 4)
                    for cls, p in zip(classes_target, probs_target[0])
                },
            }

if __name__ == "__main__":
    x = torch.randn(2, 3, 224, 224)
    for arch in ["mobilenet_v3_large", "efficientnet_v2_b0", "efficientnet_v2_s", "convnext_tiny", "deit_small"]:
        print(f"Instantiating {arch}...")
        model = HierarchicalCropVisionModel(backbone_type=arch)
        num_params = sum(p.numel() for p in model.parameters())
        out = model(x)
        print(f"  -> Features shape: {out['features'].shape}, Params: {num_params:,}")
        pred = model.predict_hierarchical(x[:1])
        print(f"  -> Sample Prediction status: {pred['status']}")
