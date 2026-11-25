import pandas as pd
from huggingface_hub import hf_hub_download
import io
from PIL import Image

cold_raw_path = hf_hub_download(
    repo_id="Project-AgML/COLD_chili_leaf_disease_classification",
    filename="raw/train-00000-of-00001.parquet",
    repo_type="dataset"
)
df_cold = pd.read_parquet(cold_raw_path)
print("COLD raw shape:", df_cold.shape)
print("COLD label distribution:\n", df_cold['label'].value_counts())

# Check sample image
img_dict = df_cold['image'].iloc[0]
print("Image entry keys:", img_dict.keys() if isinstance(img_dict, dict) else type(img_dict))

