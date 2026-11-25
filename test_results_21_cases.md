# KisanAI - 21 Random Testcases Validation Report

**Date & Time**: 2026-11-19 18:57:28 UTC  
**Dataset**: Real Field Photos from `ml/datasets/data/paddy_doctor_raw/`  
**Evaluated Endpoint**: `POST http://127.0.0.1:8000/api/predict`  
**Overall Accuracy**: **17 / 21 (81.0%)**  
**Average Latency**: **391.6 ms** per photo  

---

## Summary Table of All 21 Testcases

| Case # | Photo File | Ground Truth Disease/Pest | Model Prediction | Confidence | Status | Top Candidates | Latency |
|:---:|:---|:---|:---|:---:|:---:|:---|:---:|
| 1 | `paddy_doc_p2_01987.jpg` | **rice-healthy** | **bacterial-leaf-blight** | 41% | 🟠 **REVIEW** | bacterial-leaf-blight (41%), rice-healthy (24%) | 4157.0 ms |
| 2 | `paddy_doc_p2_04112.jpg` | **bacterial-leaf-streak** | **bacterial-leaf-streak** | 99% | 🟢 **PASS** | bacterial-leaf-streak (99%), yellow-stem-borer (0%) | 247.1 ms |
| 3 | `paddy_doc_p2_00612.jpg` | **rice-blast** | **hispa** | 37% | 🟠 **REVIEW** | hispa (37%), brown-spot (28%) | 109.5 ms |
| 4 | `paddy_doc_04906.jpg` | **downy-mildew** | **downy-mildew** | 99% | 🟢 **PASS** | downy-mildew (99%), rice-blast (0%) | 185.1 ms |
| 5 | `paddy_doc_p2_00171.jpg` | **downy-mildew** | **downy-mildew** | 94% | 🟢 **PASS** | downy-mildew (94%), bacterial-leaf-streak (1%) | 217.4 ms |
| 6 | `paddy_doc_p2_02018.jpg` | **rice-healthy** | **rice-healthy** | 96% | 🟢 **PASS** | rice-healthy (96%), yellow-stem-borer (1%) | 131.0 ms |
| 7 | `paddy_doc_02315.jpg` | **brown-spot** | **brown-spot** | 54% | 🟢 **PASS** | brown-spot (54%), yellow-stem-borer (18%) | 156.4 ms |
| 8 | `paddy_doc_03525.jpg` | **hispa** | **hispa** | 89% | 🟢 **PASS** | hispa (89%), bacterial-leaf-blight (10%) | 217.1 ms |
| 9 | `paddy_doc_p2_00358.jpg` | **rice-blast** | **rice-blast** | 99% | 🟢 **PASS** | rice-blast (99%), bacterial-leaf-streak (0%) | 141.5 ms |
| 10 | `paddy_doc_00119.jpg` | **yellow-stem-borer** | **yellow-stem-borer** | 93% | 🟢 **PASS** | yellow-stem-borer (93%), tungro (5%) | 347.7 ms |
| 11 | `paddy_doc_02270.jpg` | **brown-spot** | **brown-spot** | 82% | 🟢 **PASS** | brown-spot (82%), downy-mildew (8%) | 119.8 ms |
| 12 | `paddy_doc_p2_04423.jpg` | **tungro** | **tungro** | 89% | 🟢 **PASS** | tungro (89%), rice-blast (3%) | 140.8 ms |
| 13 | `paddy_doc_p2_00373.jpg` | **rice-blast** | **rice-blast** | 97% | 🟢 **PASS** | rice-blast (97%), downy-mildew (1%) | 134.1 ms |
| 14 | `paddy_doc_p2_03787.jpg` | **bacterial-leaf-streak** | **bacterial-leaf-streak** | 98% | 🟢 **PASS** | bacterial-leaf-streak (98%), downy-mildew (0%) | 111.0 ms |
| 15 | `paddy_doc_p2_01986.jpg` | **rice-healthy** | **downy-mildew** | 47% | 🟠 **REVIEW** | downy-mildew (47%), hispa (22%) | 115.7 ms |
| 16 | `paddy_doc_01850.jpg` | **bacterial-leaf-blight** | **bacterial-leaf-blight** | 81% | 🟢 **PASS** | bacterial-leaf-blight (81%), tungro (12%) | 173.3 ms |
| 17 | `paddy_doc_03439.jpg` | **hispa** | **rice-healthy** | 69% | 🟠 **REVIEW** | rice-healthy (69%), bacterial-leaf-blight (15%) | 465.8 ms |
| 18 | `paddy_doc_p2_04373.jpg` | **tungro** | **tungro** | 97% | 🟢 **PASS** | tungro (97%), brown-spot (0%) | 152.5 ms |
| 19 | `paddy_doc_01893.jpg` | **bacterial-leaf-blight** | **bacterial-leaf-blight** | 97% | 🟢 **PASS** | bacterial-leaf-blight (97%), yellow-stem-borer (0%) | 173.6 ms |
| 20 | `paddy_doc_00111.jpg` | **yellow-stem-borer** | **yellow-stem-borer** | 98% | 🟢 **PASS** | yellow-stem-borer (98%), rice-healthy (1%) | 267.8 ms |
| 21 | `paddy_doc_02585.jpg` | **brown-spot** | **brown-spot** | 98% | 🟢 **PASS** | brown-spot (98%), bacterial-leaf-blight (0%) | 458.5 ms |

---

## Detailed Case-by-Case Breakdown

### Case #1: `paddy_doc_p2_01987.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/normal/paddy_doc_p2_01987.jpg`
- **Ground Truth**: `rice-healthy`
- **Predicted**: `bacterial-leaf-blight` (Confidence: 41.6%)
- **Status**: Discrepancy (see candidates)
- **Inference Latency**: 4157.0 ms
- **Top 3 Probabilities**:
  - `bacterial-leaf-blight`: 41.6%
  - `rice-healthy`: 24.2%
  - `downy-mildew`: 12.2%

### Case #2: `paddy_doc_p2_04112.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/bacterial_leaf_streak/paddy_doc_p2_04112.jpg`
- **Ground Truth**: `bacterial-leaf-streak`
- **Predicted**: `bacterial-leaf-streak` (Confidence: 99.6%)
- **Status**: Passed match
- **Inference Latency**: 247.1 ms
- **Top 3 Probabilities**:
  - `bacterial-leaf-streak`: 99.6%
  - `yellow-stem-borer`: 0.1%
  - `rice-blast`: 0.1%

### Case #3: `paddy_doc_p2_00612.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/blast/paddy_doc_p2_00612.jpg`
- **Ground Truth**: `rice-blast`
- **Predicted**: `hispa` (Confidence: 37.1%)
- **Status**: Discrepancy (see candidates)
- **Inference Latency**: 109.5 ms
- **Top 3 Probabilities**:
  - `hispa`: 37.1%
  - `brown-spot`: 28.2%
  - `rice-blast`: 28.0%

### Case #4: `paddy_doc_04906.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/downy_mildew/paddy_doc_04906.jpg`
- **Ground Truth**: `downy-mildew`
- **Predicted**: `downy-mildew` (Confidence: 99.4%)
- **Status**: Passed match
- **Inference Latency**: 185.1 ms
- **Top 3 Probabilities**:
  - `downy-mildew`: 99.4%
  - `rice-blast`: 0.2%
  - `yellow-stem-borer`: 0.1%

### Case #5: `paddy_doc_p2_00171.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/downy_mildew/paddy_doc_p2_00171.jpg`
- **Ground Truth**: `downy-mildew`
- **Predicted**: `downy-mildew` (Confidence: 94.2%)
- **Status**: Passed match
- **Inference Latency**: 217.4 ms
- **Top 3 Probabilities**:
  - `downy-mildew`: 94.2%
  - `bacterial-leaf-streak`: 1.6%
  - `yellow-stem-borer`: 1.6%

### Case #6: `paddy_doc_p2_02018.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/normal/paddy_doc_p2_02018.jpg`
- **Ground Truth**: `rice-healthy`
- **Predicted**: `rice-healthy` (Confidence: 96.8%)
- **Status**: Passed match
- **Inference Latency**: 131.0 ms
- **Top 3 Probabilities**:
  - `rice-healthy`: 96.8%
  - `yellow-stem-borer`: 1.5%
  - `downy-mildew`: 0.8%

### Case #7: `paddy_doc_02315.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/brown_spot/paddy_doc_02315.jpg`
- **Ground Truth**: `brown-spot`
- **Predicted**: `brown-spot` (Confidence: 54.9%)
- **Status**: Passed match
- **Inference Latency**: 156.4 ms
- **Top 3 Probabilities**:
  - `brown-spot`: 54.9%
  - `yellow-stem-borer`: 18.9%
  - `rice-blast`: 15.0%

### Case #8: `paddy_doc_03525.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/hispa/paddy_doc_03525.jpg`
- **Ground Truth**: `hispa`
- **Predicted**: `hispa` (Confidence: 89.1%)
- **Status**: Passed match
- **Inference Latency**: 217.1 ms
- **Top 3 Probabilities**:
  - `hispa`: 89.1%
  - `bacterial-leaf-blight`: 10.3%
  - `tungro`: 0.2%

### Case #9: `paddy_doc_p2_00358.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/blast/paddy_doc_p2_00358.jpg`
- **Ground Truth**: `rice-blast`
- **Predicted**: `rice-blast` (Confidence: 99.0%)
- **Status**: Passed match
- **Inference Latency**: 141.5 ms
- **Top 3 Probabilities**:
  - `rice-blast`: 99.0%
  - `bacterial-leaf-streak`: 0.2%
  - `yellow-stem-borer`: 0.2%

### Case #10: `paddy_doc_00119.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/stem_borer/paddy_doc_00119.jpg`
- **Ground Truth**: `yellow-stem-borer`
- **Predicted**: `yellow-stem-borer` (Confidence: 93.7%)
- **Status**: Passed match
- **Inference Latency**: 347.7 ms
- **Top 3 Probabilities**:
  - `yellow-stem-borer`: 93.7%
  - `tungro`: 5.2%
  - `rice-blast`: 0.3%

### Case #11: `paddy_doc_02270.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/brown_spot/paddy_doc_02270.jpg`
- **Ground Truth**: `brown-spot`
- **Predicted**: `brown-spot` (Confidence: 82.3%)
- **Status**: Passed match
- **Inference Latency**: 119.8 ms
- **Top 3 Probabilities**:
  - `brown-spot`: 82.3%
  - `downy-mildew`: 8.4%
  - `hispa`: 6.9%

### Case #12: `paddy_doc_p2_04423.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/tungro/paddy_doc_p2_04423.jpg`
- **Ground Truth**: `tungro`
- **Predicted**: `tungro` (Confidence: 89.9%)
- **Status**: Passed match
- **Inference Latency**: 140.8 ms
- **Top 3 Probabilities**:
  - `tungro`: 89.9%
  - `rice-blast`: 3.7%
  - `yellow-stem-borer`: 2.1%

### Case #13: `paddy_doc_p2_00373.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/blast/paddy_doc_p2_00373.jpg`
- **Ground Truth**: `rice-blast`
- **Predicted**: `rice-blast` (Confidence: 97.8%)
- **Status**: Passed match
- **Inference Latency**: 134.1 ms
- **Top 3 Probabilities**:
  - `rice-blast`: 97.8%
  - `downy-mildew`: 1.2%
  - `tungro`: 0.5%

### Case #14: `paddy_doc_p2_03787.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/bacterial_leaf_streak/paddy_doc_p2_03787.jpg`
- **Ground Truth**: `bacterial-leaf-streak`
- **Predicted**: `bacterial-leaf-streak` (Confidence: 98.7%)
- **Status**: Passed match
- **Inference Latency**: 111.0 ms
- **Top 3 Probabilities**:
  - `bacterial-leaf-streak`: 98.7%
  - `downy-mildew`: 0.7%
  - `yellow-stem-borer`: 0.3%

### Case #15: `paddy_doc_p2_01986.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/normal/paddy_doc_p2_01986.jpg`
- **Ground Truth**: `rice-healthy`
- **Predicted**: `downy-mildew` (Confidence: 47.1%)
- **Status**: Discrepancy (see candidates)
- **Inference Latency**: 115.7 ms
- **Top 3 Probabilities**:
  - `downy-mildew`: 47.1%
  - `hispa`: 22.3%
  - `rice-healthy`: 12.7%

### Case #16: `paddy_doc_01850.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/bacterial_leaf_blight/paddy_doc_01850.jpg`
- **Ground Truth**: `bacterial-leaf-blight`
- **Predicted**: `bacterial-leaf-blight` (Confidence: 81.9%)
- **Status**: Passed match
- **Inference Latency**: 173.3 ms
- **Top 3 Probabilities**:
  - `bacterial-leaf-blight`: 81.9%
  - `tungro`: 13.0%
  - `downy-mildew`: 1.5%

### Case #17: `paddy_doc_03439.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/hispa/paddy_doc_03439.jpg`
- **Ground Truth**: `hispa`
- **Predicted**: `rice-healthy` (Confidence: 69.6%)
- **Status**: Discrepancy (see candidates)
- **Inference Latency**: 465.8 ms
- **Top 3 Probabilities**:
  - `rice-healthy`: 69.6%
  - `bacterial-leaf-blight`: 15.3%
  - `hispa`: 5.3%

### Case #18: `paddy_doc_p2_04373.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/tungro/paddy_doc_p2_04373.jpg`
- **Ground Truth**: `tungro`
- **Predicted**: `tungro` (Confidence: 97.9%)
- **Status**: Passed match
- **Inference Latency**: 152.5 ms
- **Top 3 Probabilities**:
  - `tungro`: 97.9%
  - `brown-spot`: 0.6%
  - `hispa`: 0.5%

### Case #19: `paddy_doc_01893.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/bacterial_leaf_blight/paddy_doc_01893.jpg`
- **Ground Truth**: `bacterial-leaf-blight`
- **Predicted**: `bacterial-leaf-blight` (Confidence: 97.7%)
- **Status**: Passed match
- **Inference Latency**: 173.6 ms
- **Top 3 Probabilities**:
  - `bacterial-leaf-blight`: 97.7%
  - `yellow-stem-borer`: 1.0%
  - `brown-spot`: 0.4%

### Case #20: `paddy_doc_00111.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/stem_borer/paddy_doc_00111.jpg`
- **Ground Truth**: `yellow-stem-borer`
- **Predicted**: `yellow-stem-borer` (Confidence: 98.3%)
- **Status**: Passed match
- **Inference Latency**: 267.8 ms
- **Top 3 Probabilities**:
  - `yellow-stem-borer`: 98.3%
  - `rice-healthy`: 1.2%
  - `rice-blast`: 0.2%

### Case #21: `paddy_doc_02585.jpg`
- **Relative Path**: `ml/datasets/data/paddy_doctor_raw/brown_spot/paddy_doc_02585.jpg`
- **Ground Truth**: `brown-spot`
- **Predicted**: `brown-spot` (Confidence: 98.1%)
- **Status**: Passed match
- **Inference Latency**: 458.5 ms
- **Top 3 Probabilities**:
  - `brown-spot`: 98.1%
  - `bacterial-leaf-blight`: 0.9%
  - `tungro`: 0.4%
