import json
import os
from huggingface_hub import HfApi, hf_hub_download

api = HfApi()

models = [
    "MdMahamudulHasan/chili-leaf-classification",
    "NiroshanDb23/chili-disease-vgg16",
]

print("=== INSPECTING HUGGING FACE CANDIDATES ===")
for model_id in models:
    print(f"\n--- Model: {model_id} ---")
    try:
        info = api.model_info(model_id)
        print(f"Tags: {info.tags}")
        print("Files:")
        for f in info.siblings:
            print(f"  - {f.rfilename}")
    except Exception as e:
        print(f"Error fetching info for {model_id}: {e}")

# Search for other relevant chilli models on HuggingFace
print("\n=== SEARCHING FOR OTHER CHILLI MODELS ON HF ===")
try:
    searches = api.list_models(search="chili disease", limit=5)
    for m in searches:
        print(f"Found: {m.id}")
except Exception as e:
    print(f"Search error: {e}")

try:
    searches2 = api.list_models(search="chilli disease", limit=5)
    for m in searches2:
        print(f"Found: {m.id}")
except Exception as e:
    print(f"Search error: {e}")

