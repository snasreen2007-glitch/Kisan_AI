from huggingface_hub import HfApi

api = HfApi()

for d in api.list_datasets(search="pepper", limit=5):
    print(f"Dataset: {d.id}")

