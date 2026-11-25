from huggingface_hub import hf_hub_download

for ds in ["Project-AgML/COLD_chili_leaf_disease_classification", "WaruniSHA/chilli-diseases"]:
    print(f"\n--- {ds} README ---")
    try:
        path = hf_hub_download(repo_id=ds, filename="README.md", repo_type="dataset")
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            print(f.read()[:1500])
    except Exception as e:
        print(f"Error: {e}")

