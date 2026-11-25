from huggingface_hub import HfApi

api = HfApi()

print("=== SEARCHING FOR CHILLI DATASETS ON HF ===")
try:
    searches = api.list_datasets(search="chili leaf", limit=10)
    for d in searches:
        print(f"Found: {d.id}")
except Exception as e:
    print(f"Error: {e}")

try:
    searches2 = api.list_datasets(search="chilli", limit=10)
    for d in searches2:
        print(f"Found: {d.id}")
except Exception as e:
    print(f"Error: {e}")

