"""
Automated Paddy Doctor Dataset Downloader (Hugging Face Mirror)
Downloads official Paddy Doctor parquet split (10 real field classes, 5,200+ images),
extracts JPEG images into ml/datasets/data/paddy_doctor_raw/<class_name>/<id>.jpg,
and executes real-field model training.
"""

import os
import sys
import io
import time
import urllib.request
import pandas as pd
import pyarrow.parquet as pq

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
RAW_TARGET_DIR = os.path.join(REPO_ROOT, "ml", "datasets", "data", "paddy_doctor_raw")
PARQUET_PATH = os.path.join(RAW_TARGET_DIR, "paddy_train_part1.parquet")

URL = "https://huggingface.co/datasets/Project-AgML/paddy_disease_classification/resolve/main/data/train-00000-of-00002.parquet"

CLASS_NAMES = [
    "bacterial_leaf_blight",
    "bacterial_leaf_streak",
    "bacterial_panicle_blight",
    "blast",
    "brown_spot",
    "stem_borer",   # 'dead_heart' in original
    "downy_mildew",
    "hispa",
    "normal",
    "tungro"
]

def download_file(url: str, dest_path: str):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 350 * 1024 * 1024:
        print(f"[OK] Parquet file already downloaded: {dest_path} ({os.path.getsize(dest_path)/(1024*1024):.1f} MB)")
        return dest_path

    print(f"Downloading Paddy Doctor parquet from:\n  {url}")
    print(f"Target: {dest_path}")
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req) as resp:
        total_size = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024 # 1 MB
        t0 = time.time()
        
        with open(dest_path, "wb") as f:
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                elapsed = max(time.time() - t0, 0.1)
                speed_mb = (downloaded / (1024 * 1024)) / elapsed
                pct = (downloaded / total_size) * 100.0 if total_size > 0 else 0.0
                print(f"\rDownloading: {downloaded/(1024*1024):.1f}/{total_size/(1024*1024):.1f} MB ({pct:.1f}%) | Speed: {speed_mb:.2f} MB/s", end="", flush=True)

    print(f"\n[OK] Download complete in {time.time() - t0:.1f}s!")
    return dest_path

def extract_parquet_images(parquet_path: str, max_per_class: int = 400):
    print(f"\nExtracting real field images from {parquet_path}...")
    table = pq.read_table(parquet_path)
    df = table.to_pandas()
    print(f"Total rows in parquet: {len(df)}")

    counts = {c: 0 for c in CLASS_NAMES}
    extracted_total = 0

    for idx, row in df.iterrows():
        raw_lbl = int(row["label"])
        cls_name = CLASS_NAMES[raw_lbl] if raw_lbl < len(CLASS_NAMES) else "normal"

        if counts[cls_name] >= max_per_class:
            continue

        target_dir = os.path.join(RAW_TARGET_DIR, cls_name)
        os.makedirs(target_dir, exist_ok=True)

        img_data = row["image"]
        img_bytes = img_data.get("bytes") if isinstance(img_data, dict) else img_data

        if img_bytes:
            out_img_path = os.path.join(target_dir, f"paddy_doc_{idx:05d}.jpg")
            with open(out_img_path, "wb") as f_img:
                f_img.write(img_bytes)
            counts[cls_name] += 1
            extracted_total += 1

            if extracted_total % 250 == 0:
                print(f"Extracted {extracted_total} real images across classes...")

    print("\n--- Extraction Summary (Real Indian Field Images) ---")
    for c, cnt in counts.items():
        print(f"  - {c:25s}: {cnt:4d} images")
    print(f"Total extracted real field images: {extracted_total}")

def main():
    dest = download_file(URL, PARQUET_PATH)
    extract_parquet_images(dest, max_per_class=400)
    print("\n[SUCCESS] Paddy Doctor images extracted. Ready for training!")

if __name__ == "__main__":
    main()

