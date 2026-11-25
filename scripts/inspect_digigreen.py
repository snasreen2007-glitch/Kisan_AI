from huggingface_hub import hf_hub_download
import pandas as pd

path = hf_hub_download(repo_id="DigiGreen/Crop_Disease_Images", filename="annotations.parquet", repo_type="dataset")
df = pd.read_parquet(path)
print("DigiGreen shape:", df.shape)
print("DigiGreen columns:", df.columns.tolist())
print("Crop counts (top 15):", df['crop'].value_counts()[:15] if 'crop' in df.columns else "no crop col")
print("Disease counts (sample):", df['disease'].value_counts()[:15] if 'disease' in df.columns else "no disease col")

