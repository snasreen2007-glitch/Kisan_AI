from huggingface_hub import hf_hub_download
import os

try:
    path = hf_hub_download(repo_id="NiroshanDb23/chili-disease-vgg16", filename="chili_model_final.h5")
    print("Downloaded NiroshanDb23 VGG16 model:", path)
    print("Size (MB):", os.path.getsize(path) / (1024 * 1024))
except Exception as e:
    print("Error:", e)

