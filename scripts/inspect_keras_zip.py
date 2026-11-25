import zipfile
import json
import os

keras_path = r"C:\Users\ayubh\.cache\huggingface\hub\models--MdMahamudulHasan--chili-leaf-classification\snapshots\323b03c36c3dd8b941ca7edc8cf5586eaa5f485d\mobilenetv3_chili_leaf_global.keras"

# Keras v3 .keras files are zip archives containing config.json and weights.h5
with zipfile.ZipFile(keras_path, 'r') as z:
    names = z.namelist()
    print("Files in .keras zip:", names)
    if "config.json" in names:
        cfg = json.loads(z.read("config.json"))
        print("\nModel class name:", cfg.get("class_name"))
        layers = cfg.get("config", {}).get("layers", [])
        print("Number of layers:", len(layers))
        # Print output layer config to see number of classes
        if layers:
            out_layer = layers[-1]
            print("Last layer:", json.dumps(out_layer, indent=2))
    if "metadata.json" in names:
        meta = json.loads(z.read("metadata.json"))
        print("Metadata:", json.dumps(meta, indent=2))

