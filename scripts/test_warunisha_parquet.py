from huggingface_hub import hf_hub_download
import pandas as pd

try:
    path = hf_hub_download(
        repo_id="WaruniSHA/chilli-diseases",
        filename="data/train-00000-of-00003.parquet",
        repo_type="dataset"
    )
    df = pd.read_parquet(path)
    print("WaruniSHA slice 0 shape:", df.shape)
    print("WaruniSHA label distribution:\n", df['label'].value_counts())
except Exception as e:
    print("Error:", e)

