from huggingface_hub import HfApi

api = HfApi()

for ds in ["Project-AgML/COLD_chili_leaf_disease_classification", "WaruniSHA/chilli-diseases"]:
    print(f"\n--- Dataset: {ds} ---")
    try:
        info = api.dataset_info(ds)
        print("Tags:", info.tags)
        print("Files (sample 10):", [f.rfilename for f in info.siblings[:10]])
    except Exception as e:
        print(f"Error: {e}")

