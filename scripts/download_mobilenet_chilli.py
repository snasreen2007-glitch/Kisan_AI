from huggingface_hub import hf_hub_download
import os

try:
    keras_path = hf_hub_download(repo_id="MdMahamudulHasan/chili-leaf-classification", filename="mobilenetv3_chili_leaf_global.keras")
    print("Downloaded MobileNetV3 keras model to:", keras_path)
    file_size_mb = os.path.getsize(keras_path) / (1024 * 1024)
    print(f"File size: {file_size_mb:.2f} MB")
except Exception as e:
    print(f"Error downloading: {e}")

