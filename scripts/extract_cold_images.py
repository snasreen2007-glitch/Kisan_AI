import pandas as pd
from huggingface_hub import hf_hub_download
import io
import os
from PIL import Image

cold_raw_path = hf_hub_download(
    repo_id="Project-AgML/COLD_chili_leaf_disease_classification",
    filename="raw/train-00000-of-00001.parquet",
    repo_type="dataset"
)
df = pd.read_parquet(cold_raw_path)

output_base = "ml/datasets/data/chilli"
label_map = {
    0: "cercospora",
    1: "healthy",
    2: "pests",       # mites and thrips
    3: "nutritional", # nutritional deficiency
    4: "powdery_mildew"
}

for lbl_idx, folder in label_map.items():
    os.makedirs(os.path.join(output_base, folder), exist_ok=True)

count = 0
for idx, row in df.iterrows():
    lbl = row['label']
    folder = label_map.get(lbl)
    if not folder:
        continue
    img_data = row['image']
    if isinstance(img_data, dict) and 'bytes' in img_data:
        b = img_data['bytes']
    elif isinstance(img_data, bytes):
        b = img_data
    else:
        continue
    
    img = Image.open(io.BytesIO(b)).convert("RGB")
    out_path = os.path.join(output_base, folder, f"cold_{idx}.jpg")
    img.save(out_path, "JPEG", quality=90)
    count += 1

print(f"Extracted {count} real chilli images into {output_base}")
for folder in label_map.values():
    p = os.path.join(output_base, folder)
    print(f"  - {folder}: {len(os.listdir(p))} images")

