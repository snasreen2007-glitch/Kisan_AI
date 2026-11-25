from huggingface_hub import hf_hub_download

content = hf_hub_download(repo_id="NiroshanDb23/chilli-disease-efficientnet-v3", filename="class_names.json")
with open(content, 'r') as f:
    print("Class names in NiroshanDb23/chilli-disease-efficientnet-v3:")
    print(f.read())

