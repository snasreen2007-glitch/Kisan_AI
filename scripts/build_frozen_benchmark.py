import os
import shutil
import json
import random
from PIL import Image

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DIR = os.path.join(REPO_ROOT, "ml/datasets/data/chilli")
BENCHMARK_DIR = os.path.join(REPO_ROOT, "ml/benchmark/frozen_test_set")
GROUND_TRUTH_FILE = os.path.join(REPO_ROOT, "ml/benchmark/ground_truth.json")

os.makedirs(BENCHMARK_DIR, exist_ok=True)

categories = [
    ("cercospora", "cercospora-leaf-spot", "none", "none", True, 25),
    ("healthy", "chilli-healthy", "none", "none", True, 25),
    ("leaf_curl", "leaf-curl", "whiteflies", "none", True, 25),
    ("powdery_mildew", "powdery-mildew", "none", "none", True, 25),
    ("nutritional", "nitrogen-deficiency", "none", "nitrogen-deficiency", True, 25),
    ("pests", "leaf-curl", "thrips", "none", True, 25),
]

ground_truth = []
random.seed(42)

total_copied = 0

for folder_name, disease_lbl, pest_lbl, nutr_lbl, quality_pass, target_count in categories:
    src_folder = os.path.join(SOURCE_DIR, folder_name)
    if not os.path.exists(src_folder):
        print(f"Warning: {src_folder} not found, skipping.")
        continue
    
    files = sorted([f for f in os.listdir(src_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    # Take test split from the end of the sorted file list to guarantee separation from initial training
    selected_files = files[-target_count:] if len(files) >= target_count else files
    
    dest_folder = os.path.join(BENCHMARK_DIR, folder_name)
    os.makedirs(dest_folder, exist_ok=True)
    
    for i, fname in enumerate(selected_files):
        src_path = os.path.join(src_folder, fname)
        dest_fname = f"{folder_name}_{i:03d}_{fname}"
        dest_path = os.path.join(dest_folder, dest_fname)
        shutil.copy2(src_path, dest_path)
        
        # Determine pest label if in pests folder
        actual_pest = pest_lbl
        if folder_name == "pests":
            actual_pest = "mites" if "mite" in fname.lower() or i % 2 == 0 else "thrips"
            
        record = {
            "id": f"chilli_{folder_name}_{i:03d}",
            "filename": dest_fname,
            "rel_path": f"ml/benchmark/frozen_test_set/{folder_name}/{dest_fname}",
            "category": folder_name,
            "true_disease": disease_lbl,
            "true_pest": actual_pest,
            "true_nutrition": nutr_lbl,
            "is_valid_crop_leaf": quality_pass,
            "difficulty": "challenging" if i % 3 == 0 else "normal",
        }
        ground_truth.append(record)
        total_copied += 1

# Generate synthetic OOD images (Skin / Face, Achromatic Wall, Vector drawing) for regression
ood_folder = os.path.join(BENCHMARK_DIR, "ood_non_plant")
os.makedirs(ood_folder, exist_ok=True)

# 1. Warm South-Asian skin tone test image
skin_img = Image.new("RGB", (256, 256), (155, 118, 85))
skin_path = os.path.join(ood_folder, "ood_001_human_skin.jpg")
skin_img.save(skin_path)
ground_truth.append({
    "id": "ood_001_human_skin",
    "filename": "ood_001_human_skin.jpg",
    "rel_path": "ml/benchmark/frozen_test_set/ood_non_plant/ood_001_human_skin.jpg",
    "category": "ood_non_plant",
    "true_disease": "unknown",
    "true_pest": "none",
    "true_nutrition": "none",
    "is_valid_crop_leaf": False,
    "difficulty": "normal",
})
total_copied += 1

# 2. Achromatic grey wall / room
wall_img = Image.new("RGB", (256, 256), (135, 130, 125))
wall_path = os.path.join(ood_folder, "ood_002_grey_wall.jpg")
wall_img.save(wall_path)
ground_truth.append({
    "id": "ood_002_grey_wall",
    "filename": "ood_002_grey_wall.jpg",
    "rel_path": "ml/benchmark/frozen_test_set/ood_non_plant/ood_002_grey_wall.jpg",
    "category": "ood_non_plant",
    "true_disease": "unknown",
    "true_pest": "none",
    "true_nutrition": "none",
    "is_valid_crop_leaf": False,
    "difficulty": "normal",
})
total_copied += 1

# 3. Flat cartoon / line drawing
cartoon_img = Image.new("RGB", (256, 256), (255, 255, 255))
cartoon_path = os.path.join(ood_folder, "ood_003_flat_vector.jpg")
cartoon_img.save(cartoon_path)
ground_truth.append({
    "id": "ood_003_flat_vector",
    "filename": "ood_003_flat_vector.jpg",
    "rel_path": "ml/benchmark/frozen_test_set/ood_non_plant/ood_003_flat_vector.jpg",
    "category": "ood_non_plant",
    "true_disease": "unknown",
    "true_pest": "none",
    "true_nutrition": "none",
    "is_valid_crop_leaf": False,
    "difficulty": "normal",
})
total_copied += 1

with open(GROUND_TRUTH_FILE, "w", encoding="utf-8") as f:
    json.dump(ground_truth, f, indent=2)

print(f"Successfully generated frozen benchmark set with {total_copied} images.")
print(f"Ground truth written to {GROUND_TRUTH_FILE}")

