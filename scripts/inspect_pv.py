from huggingface_hub import HfApi

api = HfApi()
info = api.dataset_info("aymen31/PlantVillage")
print("Files:", [f.rfilename for f in info.siblings if "pepper" in f.rfilename.lower() or "bacterial" in f.rfilename.lower()][:10])
print("All files (sample):", [f.rfilename for f in info.siblings][:10])

