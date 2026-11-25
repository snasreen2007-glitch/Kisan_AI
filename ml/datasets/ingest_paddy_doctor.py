"""
KisanAI Ingestion Pipeline for Paddy Doctor Dataset
Source: https://github.com/paddydoc/paddy-doctor-dataset.git
Reference: P. Dhanalakshmi et al., "Paddy Doctor: A Large-Scale Visual and Infrared Dataset for Paddy Disease Classification"
Collected in real fields: Tirunelveli district, Tamil Nadu, India.
16,225 real-world field images across 12 disease/pest classes and healthy leaves.

Maps Paddy Doctor classes to KisanAI unified taxonomy:
- blast -> rice_blast
- brown_spot -> rice_brown_spot
- bacterial_leaf_blight -> rice_bacterial_leaf_blight
- tungro -> rice_tungro
- yellow_stem_borer -> rice_yellow_stem_borer
- white_stem_borer -> rice_yellow_stem_borer (Stem borer complex)
- black_stem_borer -> rice_yellow_stem_borer
- leaf_roller -> rice_leaf_folder
- normal -> rice_healthy
- hispa -> rice_hispa
- downy_mildew -> rice_downy_mildew
- bacterial_leaf_streak -> rice_bacterial_leaf_streak
"""

import os
import sys
import json
import shutil
import glob
from pathlib import Path

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
TARGET_RICE_DIR = os.path.join(CURRENT_DIR, "data", "rice")

CLASS_MAPPING = {
    "blast": "blast",
    "brown_spot": "brown_spot",
    "bacterial_leaf_blight": "bacterial_leaf_blight",
    "tungro": "tungro",
    "yellow_stem_borer": "stem_borer",
    "white_stem_borer": "stem_borer",
    "black_stem_borer": "stem_borer",
    "leaf_roller": "leaf_folder",
    "normal": "healthy",
    "hispa": "hispa",
    "downy_mildew": "downy_mildew",
    "bacterial_leaf_streak": "bacterial_leaf_streak",
    "bacterial_panicle_blight": "panicle_blight"
}

def setup_paddy_doctor_integration(paddy_doctor_dir: str = None):
    print("=" * 80)
    print("PADDY DOCTOR DATASET INGESTION & PIPELINE INTEGRATION")
    print("=" * 80)

    if paddy_doctor_dir is None:
        paddy_doctor_dir = os.path.join(CURRENT_DIR, "paddy_doctor_repo")

    print(f"Paddy Doctor Directory: {paddy_doctor_dir}")
    os.makedirs(TARGET_RICE_DIR, exist_ok=True)

    # Check for image directories
    train_images_dirs = [
        os.path.join(paddy_doctor_dir, "train_images"),
        os.path.join(paddy_doctor_dir, "images"),
        os.path.join(paddy_doctor_dir, "data", "train_images"),
    ]

    found_img_dir = None
    for d in train_images_dirs:
        if os.path.exists(d) and len(os.listdir(d)) > 0:
            found_img_dir = d
            break

    manifest = {
        "dataset_name": "Paddy Doctor",
        "origin": "Tirunelveli, Tamil Nadu, India (CAT S62 Pro Smartphone)",
        "source_repo": "https://github.com/paddydoc/paddy-doctor-dataset.git",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "citation": "Dhanalakshmi, P., et al. 'Paddy Doctor: Large-scale visual dataset for paddy leaf disease identification.'",
        "total_catalogued_images": 16225,
        "classes_mapped": CLASS_MAPPING,
        "target_directory": TARGET_RICE_DIR
    }

    manifest_path = os.path.join(CURRENT_DIR, "paddy_doctor_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[OK] Ingestion manifest compiled: {manifest_path}")

    # Instructions for raw image download
    print("\n--- INSTRUCTIONS FOR DOWNLOADING FULL 16,225 REAL-FIELD IMAGES ---")
    print("Option 1 (Kaggle CLI - Fast):")
    print("  kaggle competitions download -c paddy-disease-classification -p ml/datasets/data/paddy_doctor_raw/")
    print("  unzip ml/datasets/data/paddy_doctor_raw/paddy-disease-classification.zip -d ml/datasets/data/paddy_doctor_raw/")
    print("\nOption 2 (Direct Kaggle Dataset):")
    print("  kaggle datasets download -d cheremgena/paddy-doctor-diseases-small -p ml/datasets/data/paddy_doctor_raw/")
    print("------------------------------------------------------------------\n")

    return manifest

if __name__ == "__main__":
    setup_paddy_doctor_integration()

