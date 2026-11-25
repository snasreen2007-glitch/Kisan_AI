"""
Unified Severity Analysis Engine
Combines image segmentation with validated IRRI SES and Leaf Curl scales.
"""

import os
import sys
from typing import Any, Dict, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.severity.segmentation import segment_leaf_and_lesions


def map_irri_ses(affected_percent: float) -> Dict[str, Any]:
    """
    Maps visible leaf lesion area percentage to the IRRI Standard Evaluation System (SES) 0-9 scale.
    Standardized by International Rice Research Institute (IRRI).
    """
    if affected_percent <= 0.05:
        score = 0
        band = "mild"
        desc = "No visible or negligible lesions (<0.05% leaf area)."
    elif affected_percent < 1.0:
        score = 1
        band = "mild"
        desc = "Small brown specks of pinhead size (less than 1% leaf area affected)."
    elif affected_percent <= 5.0:
        score = 3
        band = "mild"
        desc = "Typical spindle lesions infecting 1% to 5% of leaf area."
    elif affected_percent <= 25.0:
        score = 5
        band = "moderate"
        desc = "Typical necrotic lesions infecting 6% to 25% of leaf area."
    elif affected_percent <= 50.0:
        score = 7
        band = "severe"
        desc = "Extensive coalescence of lesions covering 26% to 50% of leaf area."
    else:
        score = 9
        band = "severe"
        desc = "Severe desiccation and blighting covering >50% of leaf area."

    return {
        "scale": "irri-ses",
        "score": score,
        "max": 9,
        "band": band,
        "area_percent": affected_percent,
        "explanation": desc,
    }


def map_leaf_curl_index(affected_percent: float) -> Dict[str, Any]:
    """
    Maps vegetative distortion percentage to the 0-4 Leaf Curl Severity Index.
    """
    if affected_percent <= 3.0:
        score = 0
        band = "mild"
        desc = "No visible upward curling or puckering symptoms."
    elif affected_percent <= 15.0:
        score = 1
        band = "mild"
        desc = "Slight curling on apical leaves; minimal growth reduction."
    elif affected_percent <= 35.0:
        score = 2
        band = "moderate"
        desc = "Curling and puckering on multiple leaves; slight internode reduction."
    elif affected_percent <= 60.0:
        score = 3
        band = "severe"
        desc = "Pronounced curling on >50% foliage; stunted plant architecture; flower drop."
    else:
        score = 4
        band = "severe"
        desc = "Extreme rosette stunting; thick deformed veins; complete loss of fruiting."

    return {
        "scale": "leaf-curl-index",
        "score": score,
        "max": 4,
        "band": band,
        "area_percent": affected_percent,
        "explanation": desc,
    }


def map_area_band(affected_percent: float) -> Dict[str, Any]:
    """
    Generic percentage area damage mapping.
    """
    if affected_percent <= 10.0:
        band = "mild"
        desc = f"Mild damage affecting approximately {affected_percent:.1f}% of visible tissue."
    elif affected_percent <= 25.0:
        band = "moderate"
        desc = f"Moderate damage affecting approximately {affected_percent:.1f}% of visible tissue."
    else:
        band = "severe"
        desc = f"Severe damage affecting approximately {affected_percent:.1f}% of visible tissue."

    return {
        "scale": "area-band",
        "score": round(affected_percent, 1),
        "max": 100,
        "band": band,
        "area_percent": affected_percent,
        "explanation": desc,
    }


def analyze_severity(crop: str, problem_slug: str, image_input: Any) -> Dict[str, Any]:
    """
    Unified entry point for disease and pest damage severity estimation.
    """
    seg = segment_leaf_and_lesions(image_input)
    if not seg.get("valid_leaf"):
        return {
            "success": False,
            "reason": seg.get("reason", "Unable to detect clear leaf canopy"),
            "band": "mild",
            "score": 0,
            "max": 9 if crop == "rice" else 4,
            "scale": "irri-ses" if crop == "rice" else "area-band",
            "area_percent": 0.0,
        }

    affected_pct = seg["affected_percent"]

    if crop == "rice":
        res = map_irri_ses(affected_pct)
    elif crop == "chilli" and problem_slug == "leaf-curl":
        res = map_leaf_curl_index(affected_pct)
    else:
        res = map_area_band(affected_pct)

    res["success"] = True
    res["total_plant_pixels"] = seg["total_plant_pixels"]
    res["lesion_pixels"] = seg["lesion_pixels"]
    res["limitation_note"] = (
        "Measurement estimates visible symptoms in this specific photograph only. "
        "A full field assessment requires checking at least 10 hills/plants across the plot."
    )
    return res


if __name__ == "__main__":
    import numpy as np
    dummy_img = np.zeros((256, 256, 3), dtype=np.uint8)
    dummy_img[:, :] = [40, 130, 35]
    # Add 12% brown blast spots
    dummy_img[80:160, 80:160] = [135, 70, 25]
    
    rice_res = analyze_severity("rice", "rice-blast", dummy_img)
    print("Rice severity result:", rice_res)
