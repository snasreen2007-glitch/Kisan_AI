from huggingface_hub import HfApi

api = HfApi()

for d in api.list_datasets(search="plantvillage", limit=5):
    print(f"Found plantvillage dataset: {d.id}")

