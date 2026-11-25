import zipfile
import json

keras_path = r"C:\Users\ayubh\.cache\huggingface\hub\models--MdMahamudulHasan--chili-leaf-classification\snapshots\323b03c36c3dd8b941ca7edc8cf5586eaa5f485d\mobilenetv3_chili_leaf_global.keras"

with zipfile.ZipFile(keras_path, 'r') as z:
    cfg = json.loads(z.read("config.json"))
    for l in cfg.get("config", {}).get("layers", []):
        print(f"Layer: {l.get('name')}, class: {l.get('class_name')}")

