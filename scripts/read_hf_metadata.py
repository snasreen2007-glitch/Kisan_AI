from huggingface_hub import hf_hub_download
import json

def fetch_file(repo_id, filename):
    try:
        path = hf_hub_download(repo_id=repo_id, filename=filename)
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        return f"Error: {e}"

print("=== MdMahamudulHasan/chili-leaf-classification README ===")
print(fetch_file("MdMahamudulHasan/chili-leaf-classification", "README.md")[:1500])

print("\n=== NiroshanDb23/chili-disease-vgg16 classes.json ===")
print(fetch_file("NiroshanDb23/chili-disease-vgg16", "classes.json"))

print("\n=== NiroshanDb23/chili-disease-vgg16 README ===")
print(fetch_file("NiroshanDb23/chili-disease-vgg16", "README.md")[:1500])

