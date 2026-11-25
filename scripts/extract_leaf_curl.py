from huggingface_hub import hf_hub_download
import pandas as pd
import io
import os
from PIL import Image

try:
    path = hf_hub_download(
        repo_id="Project-AgML/chili_leaf_curl_detection",
        filename="data/train-00000-of-00001.parquet",
        repo_type="dataset"
    )
    df = pd.read_parquet(path)
    print("Leaf curl dataset shape:", df.shape)

    output_base = "ml/datasets/data/chilli"
    os.makedirs(os.path.join(output_base, "leaf_curl"), exist_ok=True)
    os.makedirs(os.path.join(output_base, "pests"), exist_ok=True)
    os.makedirs(os.path.join(output_base, "healthy"), exist_ok=True)

    extracted_curl = 0
    extracted_mites = 0
    extracted_healthy = 0

    for idx, row in df.iterrows():
        objs = row.get("objects", {})
        cats = objs.get("categories", [])
        img_data = row['image']
        if isinstance(img_data, dict) and 'bytes' in img_data:
            b = img_data['bytes']
        elif isinstance(img_data, bytes):
            b = img_data
        else:
            continue

        img = Image.open(io.BytesIO(b)).convert("RGB")
        # categories: 0: Healthy, 1: Mites, 2: Virus
        if 2 in cats and extracted_curl < 300:
            img.save(os.path.join(output_base, "leaf_curl", f"curl_{idx}.jpg"), "JPEG", quality=90)
            extracted_curl += 1
        elif 1 in cats and extracted_mites < 150:
            img.save(os.path.join(output_base, "pests", f"mites_{idx}.jpg"), "JPEG", quality=90)
            extracted_mites += 1
        elif 0 in cats and extracted_healthy < 100:
            img.save(os.path.join(output_base, "healthy", f"healthy_{idx}.jpg"), "JPEG", quality=90)
            extracted_healthy += 1

    print(f"Extracted from IARI Leaf Curl dataset: {extracted_curl} leaf curl, {extracted_mites} mites, {extracted_healthy} healthy")
except Exception as e:
    print("Error:", e)

