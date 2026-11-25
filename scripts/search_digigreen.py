from huggingface_hub import HfApi

api = HfApi()

try:
    info = api.dataset_info("DigiGreen/Crop_Disease_Images")
    print("Found DigiGreen/Crop_Disease_Images!")
    print("Files:", [f.rfilename for f in info.siblings][:10])
except Exception as e:
    print("DigiGreen error:", e)

