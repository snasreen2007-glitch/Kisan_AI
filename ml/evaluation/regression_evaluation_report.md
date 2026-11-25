# KisanAI Master Vision Pipeline Regression Evaluation Report

**Overall Accuracy**: 100.0% (30/30)

**Expected Calibration Error (ECE)**: 0.1773

**Entomological Boundary Verification**: 100% compliant (Zero false insect body claims)

## Test Cases Summary Table

| Test ID | Crop | Expected | Predicted | Conf | Severity Protocol | Status |
|---|---|---|---|---|---|---|
| `chilli_healthy_1` | chilli | `chilli-healthy` | `chilli-healthy` | 0.94 | healthy_leaf | ✅ PASS |
| `chilli_healthy_2` | chilli | `chilli-healthy` | `chilli-healthy` | 0.94 | healthy_leaf | ✅ PASS |
| `chilli_thrips_1` | chilli | `thrips` | `thrips` | 0.84 | Leaf Area Damage Assessment (7.1... | ✅ PASS |
| `chilli_thrips_2` | chilli | `thrips` | `thrips` | 0.84 | Leaf Area Damage Assessment (6.7... | ✅ PASS |
| `chilli_leaf_curl_1` | chilli | `leaf-curl` | `leaf-curl` | 0.86 | Leaf Area Damage Assessment (37.... | ✅ PASS |
| `chilli_leaf_curl_2` | chilli | `leaf-curl` | `leaf-curl` | 0.86 | Leaf Area Damage Assessment (37.... | ✅ PASS |
| `chilli_co_infestation_1` | chilli | `thrips` | `thrips` | 0.88 | Leaf Area Damage Assessment (36.... | ✅ PASS |
| `chilli_co_infestation_2` | chilli | `thrips` | `thrips` | 0.88 | Leaf Area Damage Assessment (36.... | ✅ PASS |
| `chilli_cercospora_1` | chilli | `cercospora-leaf-spot` | `cercospora-leaf-spot` | 0.84 | Leaf Area Damage Assessment (7.5... | ✅ PASS |
| `chilli_cercospora_2` | chilli | `cercospora-leaf-spot` | `cercospora-leaf-spot` | 0.84 | Leaf Area Damage Assessment (7.5... | ✅ PASS |
| `rice_healthy_1` | rice | `rice-healthy` | `rice-healthy` | 0.51 | healthy_leaf | ✅ PASS |
| `rice_healthy_2` | rice | `rice-healthy` | `rice-healthy` | 0.60 | healthy_leaf | ✅ PASS |
| `rice_blast_1` | rice | `rice-blast` | `rice-blast` | 0.92 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_blast_2` | rice | `rice-blast` | `rice-blast` | 0.92 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_brown_spot_1` | rice | `brown-spot` | `brown-spot` | 0.89 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_brown_spot_2` | rice | `brown-spot` | `brown-spot` | 0.92 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_blb_1` | rice | `bacterial-leaf-blight` | `bacterial-leaf-blight` | 0.91 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_blb_2` | rice | `bacterial-leaf-blight` | `bacterial-leaf-blight` | 0.70 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_tungro_1` | rice | `tungro` | `tungro` | 0.68 | IRRI Standard Evaluation System ... | ✅ PASS |
| `rice_tungro_2` | rice | `tungro` | `tungro` | 0.68 | IRRI Standard Evaluation System ... | ✅ PASS |
| `ood_cartoon_1` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
| `ood_cartoon_2` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
| `ood_blurry_1` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
| `ood_blurry_2` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
| `ood_too_dark_1` | chilli | `rejected` | `rejected` | 0.12 | N/A | ✅ PASS |
| `ood_too_dark_2` | chilli | `rejected` | `rejected` | 0.12 | N/A | ✅ PASS |
| `ood_non_plant_1` | rice | `rejected` | `rejected` | 0.12 | N/A | ✅ PASS |
| `ood_non_plant_2` | rice | `rejected` | `rejected` | 0.12 | N/A | ✅ PASS |
| `ood_blurry_3` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
| `ood_cartoon_3` | rice | `rejected` | `rejected` | 0.15 | not_applicable | ✅ PASS |
