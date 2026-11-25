import pandas as pd
from huggingface_hub import hf_hub_download

path = hf_hub_download(repo_id="DigiGreen/Crop_Disease_Images", filename="annotations.parquet", repo_type="dataset")
df = pd.read_parquet(path)
chilli_df = df[df['crop'].str.lower() == 'chilli']
print("Chilli diagnoses in DigiGreen:")
print(chilli_df['diagnosis'].value_counts())

