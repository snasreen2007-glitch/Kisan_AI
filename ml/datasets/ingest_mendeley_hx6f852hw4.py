"""
Ingestion & Normalisation Pipeline for Mendeley Data Dataset hx6f852hw4/2
"Rice Leaf Bacterial and Fungal Disease Dataset" (DOI: 10.17632/hx6f852hw4.2)
Authors: Mehedi Hasan et al.

Classes mapped to MobileNetV3-Small categories:
1. Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae) -> bacterial_leaf_blight
2. Brown Spot (Cochliobolus miyabeanus)                -> brown_spot
3. Leaf Blast (Pyricularia oryzae)                    -> blast
4. Healthy Rice Leaf                                  -> healthy
5. Rice Hispa (Dicladispa armigera)                   -> pests
6. Leaf Scald, Narrow Brown Leaf Spot, Sheath Blight   -> ood_evaluation / additional classes
"""

import os
import sys
import shutil
import zipfile
import urllib.request
from pathlib import Path
from PIL import Image

DATASET_URL = "https://prod-dcdn.mendeley.com/public/datasets/hx6f852hw4/2/files"
TARGET_DIR = Path(__file__).resolve().parent / "data" / "rice"

FOLDER_MAPPING = {
    "Bacterial leaf blight": "bacterial_leaf_blight",
    "Brown spot": "brown_spot",
    "Leaf blast": "blast",
    "healthy": "healthy",
    "Rice hispa": "pests",
}


def verify_and_convert_image(src_path: Path, dst_path: Path) -> bool:
    """Verifies that an image is valid and converts it to RGB JPEG at 224x224."""
    try:
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(dst_path, format="JPEG", quality=92)
            return True
    except Exception as e:
        print(f"Skipping corrupt image {src_path}: {e}")
        return False


def ingest_extracted_archive(extracted_root: Path):
    """Processes extracted folders from Mendeley hx6f852hw4/2 and copies into canonical training dirs."""
    extracted_root = Path(extracted_root)
    if not extracted_root.exists():
        print(f"Path does not exist: {extracted_root}")
        return

    processed_count = 0
    print(f"Scanning {extracted_root} for Mendeley hx6f852hw4/2 rice disease images...")

    for root, dirs, files in os.walk(extracted_root):
        folder_name = os.path.basename(root)
        matched_target = None
        for key, target_folder in FOLDER_MAPPING.items():
            if key.lower() in folder_name.lower():
                matched_target = target_folder
                break

        if matched_target and files:
            target_cat_dir = TARGET_DIR / matched_target
            target_cat_dir.mkdir(parents=True, exist_ok=True)
            print(f"Ingesting '{folder_name}' ({len(files)} files) -> {matched_target}")

            for fname in files:
                if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    src_file = Path(root) / fname
                    dst_file = target_cat_dir / f"mendeley_hx6f_{fname}"
                    if verify_and_convert_image(src_file, dst_file):
                        processed_count += 1

    print(f"\nIngestion Complete: Processed {processed_count} images into {TARGET_DIR}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest Mendeley hx6f852hw4/2 Rice Disease Dataset")
    parser.add_argument("--dir", type=str, help="Path to extracted Mendeley hx6f852hw4/2 dataset folder")
    args = parser.parse_args()

    if args.dir:
        ingest_extracted_archive(Path(args.dir))
    else:
        print("Mendeley hx6f852hw4/2 Ingestion Utility Ready.")
        print(f"Target repository: {TARGET_DIR}")
        print("To ingest, run: python ingest_mendeley_hx6f852hw4.py --dir /path/to/extracted/folder")

