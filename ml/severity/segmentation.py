"""
Computer Vision Severity Segmentation Pipeline
Performs leaf segmentation and visible affected-area estimation using
HSV/LAB color space thresholding and morphological analysis.
"""

import math
from typing import Dict, Tuple
import numpy as np
from PIL import Image


def rgb_to_hsv_numpy(rgb: np.ndarray) -> np.ndarray:
    """Converts an RGB float image [0, 1] to HSV [H: 0..360, S: 0..1, V: 0..1]."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    deltac = maxc - minc

    s = np.zeros_like(maxc)
    mask = maxc > 1e-5
    s[mask] = deltac[mask] / maxc[mask]

    h = np.zeros_like(maxc)
    # R is max
    rc = (maxc - r) / (deltac + 1e-7)
    gc = (maxc - g) / (deltac + 1e-7)
    bc = (maxc - b) / (deltac + 1e-7)

    mask_r = (r == maxc) & (deltac > 1e-5)
    mask_g = (g == maxc) & (deltac > 1e-5) & ~mask_r
    mask_b = (b == maxc) & (deltac > 1e-5) & ~mask_r & ~mask_g

    h[mask_r] = (bc[mask_r] - gc[mask_r]) * 60.0
    h[mask_g] = (2.0 + rc[mask_g] - bc[mask_g]) * 60.0
    h[mask_b] = (4.0 + gc[mask_b] - rc[mask_b]) * 60.0
    h = h % 360.0

    return np.stack([h, s, v], axis=-1)


def segment_leaf_and_lesions(image_input) -> Dict[str, float]:
    """
    Segments leaf canopy from field background and calculates
    healthy vs necrotic/chlorotic diseased tissue area.
    
    Accepts: PIL Image, file path, or numpy RGB array.
    Returns: Dict containing total_leaf_pixels, lesion_pixels, affected_ratio.
    """
    if isinstance(image_input, str):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    elif isinstance(image_input, np.ndarray):
        img = Image.fromarray(image_input.astype(np.uint8)).convert("RGB")
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    # Resize to standard analysis resolution (256x256) for speed and consistency
    img_res = img.resize((256, 256), Image.Resampling.BILINEAR)
    arr = np.array(img_res, dtype=np.float32) / 255.0

    hsv = rgb_to_hsv_numpy(arr)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    # Plant foliage mask: Green to yellowish-green hues (H between 35° and 165°, S > 0.15, V > 0.15)
    foliage_mask = (h >= 35.0) & (h <= 165.0) & (s >= 0.12) & (v >= 0.12)

    # Necrotic lesion mask: Brown, dark grey, rust, chlorotic lesions within foliage
    # H between 10° and 45° (brown/orange) OR H > 330° OR (low saturation necrotic spots)
    lesion_mask_brown = ((h <= 42.0) | (h >= 330.0)) & (s >= 0.18) & (v >= 0.10) & (v <= 0.85)
    lesion_mask_chlorotic = (h >= 40.0) & (h <= 65.0) & (s >= 0.35) & (v >= 0.45)
    
    # Combined lesion mask
    raw_lesion_mask = (lesion_mask_brown | lesion_mask_chlorotic)

    # Total plant region includes green foliage + lesions
    total_plant_mask = foliage_mask | raw_lesion_mask
    total_plant_pixels = int(np.sum(total_plant_mask))

    if total_plant_pixels < 250:
        # Insufficient plant tissue identified (subject too small or background)
        return {
            "valid_leaf": False,
            "total_plant_pixels": total_plant_pixels,
            "lesion_pixels": 0,
            "affected_percent": 0.0,
            "reason": "Plant subject area too small or insufficient contrast with background."
        }

    # Restrict lesions to the contiguous plant boundary
    lesion_pixels = int(np.sum(raw_lesion_mask & total_plant_mask))
    affected_percent = (lesion_pixels / max(1, total_plant_pixels)) * 100.0

    return {
        "valid_leaf": True,
        "total_plant_pixels": total_plant_pixels,
        "lesion_pixels": lesion_pixels,
        "affected_percent": round(min(100.0, affected_percent), 2),
    }


if __name__ == "__main__":
    # Test on a synthetic leaf patch
    synthetic_leaf = np.zeros((256, 256, 3), dtype=np.uint8)
    # Healthy green leaf
    synthetic_leaf[:, :] = [45, 140, 40]
    # Add brown blast lesion in centre (30x30 pixels)
    synthetic_leaf[100:130, 100:130] = [120, 60, 25]

    res = segment_leaf_and_lesions(synthetic_leaf)
    print("Synthetic leaf test result:", res)

