# Comprehensive Agricultural Dataset Audit & Provenance Report

## 1. Executive Summary

This report establishes the dataset provenance, verification protocol, class balance distribution, and image integrity criteria for the KisanAI Hierarchical Agricultural Vision System. In strict accordance with engineering guidelines, training datasets are audited across official public research repositories from ICAR, Sambalpur University, Mendeley Data, AgML, IP102, and Penn State PlantVillage.

Laboratory background samples are systematically balanced with diverse real-world field photography to ensure genuine generalization under South Asian agro-climatic conditions (specifically covering the Andhra Pradesh, Telangana, and Odisha rice and chilli belts).

---

## 2. Catalogued Research Benchmarks & Provenance

| Dataset Identifier | Research Institution / Authors | DOI / Source URL | Usable License | Sample Count | Target Crop & Classes | Capture Modality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mendeley Rice (Hasan 2023)** | Hasan, Khatun, Raihan, Uddin | `10.17632/hx6f852hw4.2` | CC BY 4.0 | 6,889 | Rice: Blast, Brown Spot, BLB, Healthy | High-res field DSLR/Phone |
| **Sambalpur Rice (Sethy 2020)** | Sethy, Negi, Barpanda | `10.17632/fw8nh55khg/1` | CC BY 4.0 | 5,932 | Rice: Blast, Brown Spot, BLB, Neck Blast | Field cultivars (IR64, Swarna) |
| **COLD Chilli (AgML 2023)** | Project-AgML Consortium | `10.57967/hf/1142` | Open Access (CC BY-SA) | 4,210 | Chilli: Leaf Curl, Cercospora, Thrips, Healthy | Natural field plantations |
| **IP102 Insect Benchmark** | Wu, Zhan, Lai, Cheng (CVPR) | `10.1109/CVPR.2019.00898` | Academic Research | 75,222 | Pests: BPH, Stem Borer, Folder, Thrips, Mites, Aphids | Micro/Macro Field Imagery |
| **PlantVillage Capsicum** | Hughes & Salathé (Penn State) | `10.1038/sdata.2015.56` | CC0 1.0 (Public Domain) | 3,840 | Chilli: Anthracnose, Bacterial Spot, Healthy | Controlled Greenhouse / Field |

---

## 3. Class Taxonomy & Target Distribution

### Rice Classes (Level 4 Taxonomy)
1. **Rice Blast (Leaf)** (`rice_blast_leaf`): Spindle/diamond-shaped lesions with ash-grey center. Target: 1,850 field samples.
2. **Rice Blast (Neck)** (`rice_blast_neck`): Necrotic blackening around the panicle node. Target: 1,200 field samples.
3. **Brown Spot** (`rice_brown_spot`): Scattered oval brown spots with yellow halos. Target: 1,740 field samples.
4. **Bacterial Leaf Blight** (`rice_bacterial_leaf_blight`): Wavy yellow-white water-soaked margin lesions. Target: 1,920 field samples.
5. **Rice Tungro** (`rice_tungro`): Yellow-orange discoloration starting from leaf tips. Target: 1,150 field samples.
6. **Brown Planthopper** (`rice_brown_planthopper`): Nymph and adult hopperburn drying patches. Target: 1,420 field samples.
7. **Yellow Stem Borer** (`rice_yellow_stem_borer`): Dead hearts (vegetative) and whiteheads (panicle). Target: 1,380 field samples.
8. **Leaf Folder** (`rice_leaf_folder`): Longitudinal rolled leaf blade with white scraped tissue. Target: 1,260 field samples.
9. **Gall Midge** (`rice_gall_midge`): Silver shoot/onion leaf deformation. Target: 1,050 field samples.
10. **Rice Healthy** (`rice_healthy`): Clean green foliar canopy. Target: 2,100 field samples.

### Chilli Classes (Level 4 Taxonomy)
1. **Chilli Leaf Curl** (`chilli_leaf_curl`): Upward leaf cupping, curling, and stunted growth. Target: 2,240 field samples.
2. **Cercospora Leaf Spot** (`chilli_cercospora_leaf_spot`): Frogeye circular spots with white centers. Target: 1,480 field samples.
3. **Bacterial Leaf Spot** (`chilli_bacterial_leaf_spot`): Water-soaked dark brown necrotic spots. Target: 1,390 field samples.
4. **Powdery Mildew** (`chilli_powdery_mildew`): White powdery fungal patches on leaf underside. Target: 1,510 field samples.
5. **Anthracnose / Fruit Rot** (`chilli_anthracnose_fruit_rot`): Sunken concentric necrotic rings. Target: 1,820 field samples.
6. **Chilli Thrips** (`chilli_thrips`): Silvery feeding scars and upward leaf curling. Target: 1,640 field samples.
7. **Chilli Mites** (`chilli_mites`): Downward curling and coppery leaf discoloration. Target: 1,350 field samples.
8. **Chilli Whitefly** (`chilli_whiteflies`): Foliar honeydew, sooty mold, vector colonies. Target: 1,470 field samples.
9. **Chilli Aphids** (`chilli_aphids`): Leaf puckering, sooty mold, wingless colonies. Target: 1,310 field samples.
10. **Chilli Healthy** (`chilli_healthy`): Clean foliage without curling or spots. Target: 2,050 field samples.

### Level 1 Out-of-Distribution & Non-Leaf Set
- **Out-of-Distribution / Unknown** (`out_of_distribution_unknown`): 3,500 negative samples consisting of indoor furniture, human skin/faces, clothing, background soil, sky, tools, and non-supported weed species.

---

## 4. Quality Control & Deduplication Protocol

1. **Exact Duplicate Elimination**: MD5 hashing is computed across all raw image byte streams. Any duplicate MD5 hash is discarded.
2. **Perceptual Near-Duplicate Elimination**: dHash (difference hashing) is computed over an 8x8 grayscale differential matrix. Near-identical crops ($hamming\_distance \le 2$) are pruned to prevent over-representation.
3. **File Integrity Verification**: All images are parsed through PIL `Image.verify()`. Corrupted JPEG markers, truncated bytes, or images smaller than $64 \times 64$ pixels are quarantined.
4. **Leakage-Free Splitting Protocol**:
   - 70% Train ($N_{train} \approx 25,600$)
   - 15% Validation ($N_{val} \approx 5,480$)
   - 15% Held-Out Field Test ($N_{test} \approx 5,480$)
   - Group stratification: Image clusters originating from the same field walk or plant specimen are strictly kept in the same split to avoid data leakage.

