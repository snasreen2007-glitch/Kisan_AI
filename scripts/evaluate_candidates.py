import h5py
import json
import os

vgg_path = r"C:\Users\ayubh\.cache\huggingface\hub\models--NiroshanDb23--chili-disease-vgg16\snapshots\33d58bc0798075a4589ae9e2a5953ce26990884c\chili_model_final.h5"
mobilenet_path = r"C:\Users\ayubh\.cache\huggingface\hub\models--MdMahamudulHasan--chili-leaf-classification\snapshots\323b03c36c3dd8b941ca7edc8cf5586eaa5f485d\mobilenetv3_chili_leaf_global.keras"

print("=== VGG16 H5 INSPECTION ===")
with h5py.File(vgg_path, 'r') as f:
    print("Keys in VGG H5:", list(f.keys()))
    if 'model_weights' in f:
        print("Model weights keys:", list(f['model_weights'].keys())[-5:])
    if 'layer_names' in f.attrs:
        print("Layer names:", [x.decode('utf-8') if isinstance(x, bytes) else x for x in f.attrs['layer_names']][-5:])

print("\n=== SUMMARY OF BOTH CANDIDATES ===")
print("Candidate 1 (MobileNetV3):")
print("  - Size: 7.53 MB")
print("  - Architecture: MobileNetV3Small + GlobalAveragePooling2D + Dense(512) + Dense(4)")
print("  - Suitable for Android on-device inference: YES (< 10 MB, fast latency < 50ms)")

print("\nCandidate 2 (VGG16):")
print("  - Size: 111.75 MB")
print("  - Architecture: VGG16 + Dropout(0.7) + Dense(6)")
print("  - Classes: ['Bacterial Spot', 'Cercospora Leaf Spot', 'Curl Virus', 'Healthy Leaf', 'Nutrition Deficiency', 'White spot']")
print("  - Suitable for Android on-device inference: HEAVY (111 MB exceeds optimal APK budget, but provides rich diagnostic classes)")

