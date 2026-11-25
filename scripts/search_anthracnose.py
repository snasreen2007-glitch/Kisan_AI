from huggingface_hub import HfApi

api = HfApi()

for q in ["chili anthracnose", "chilli anthracnose", "chili bacterial", "chilli bacterial"]:
    try:
        res = list(api.list_datasets(search=q, limit=5))
        for d in res:
            print(f"[{q}] Found: {d.id}")
    except Exception as e:
        print(f"Error for {q}: {e}")

