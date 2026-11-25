from huggingface_hub import hf_hub_download

try:
    path = hf_hub_download(repo_id="Project-AgML/chili_leaf_curl_detection", filename="README.md", repo_type="dataset")
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        print(f.read()[:1500])
except Exception as e:
    print(f"Error: {e}")

