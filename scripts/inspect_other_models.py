from huggingface_hub import HfApi
import json

api = HfApi()

other_models = [
    "Rifqiakmals/chili-plant-disease",
    "halloalya/chili-leaf-disease-model",
    "NiroshanDb23/Chili-Disease-Detector-SL",
    "NiroshanDb23/chilli-disease-efficientnet-v3",
]

for m in other_models:
    print(f"\n--- {m} ---")
    try:
        info = api.model_info(m)
        print("Tags:", info.tags)
        print("Files:", [f.rfilename for f in info.siblings])
    except Exception as e:
        print(f"Error: {e}")

