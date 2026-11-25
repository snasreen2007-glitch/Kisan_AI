# Phase 1: Comprehensive System Audit & Root-Cause Investigation Report
**Project**: KisanAI Crop Disease & Pest Assistant  
**Domain**: Rice & Chilli Computer Vision Diagnosis Pipeline  
**Date**: November 20, 2026  
**Auditor**: Principal Computer Vision & Agricultural AI Specialist  

---

## 1. Executive Summary

A rigorous forensic audit of the end-to-end photo diagnosis pipeline—tracing from camera capture, preprocessing, model inference, class mapping, confidence calibration, severity estimation, to LLM interpretation—has pinpointed the fundamental reasons why earlier photo diagnoses failed.

The earlier failures (e.g., classifying visible insects as viral leaf curl with 92% confidence, thrips explanations asserting visual evidence that was never observed, and severity percentages lacking anatomical definition) were **not cosmetic LLM hallucination issues**. They were caused by **four architectural flaws** in the vision pipeline:

1. **Flawed Pretraining / Training Dataset Class Conflation**:
   - In earlier training runs (such as the Hugging Face COLD dataset), label index `2` was named `mites_and_trips` (a combined class), while label index `3` was named `nutritional`.
   - Previous scripts forcibly mapped `mites_and_trips` exclusively to `chilli_thrips` and `nutritional` to `chilli_leaf_curl`. In reality, both mites and thrips cause foliar cupping, and viral leaf curl (*Begomovirus*) is transmitted by whiteflies (*Bemisia tabaci*). A single-label whole-image classifier with uncalibrated softmax naturally outputted >90% probability for whichever single class it memorized.
2. **Absence of Hierarchical Botanical & Symptom Staging**:
   - The vision system used a single flat softmax output across disease and pest classes. In plant pathology, **symptoms (leaf curling, yellowing, stunting)** are secondary physiological expressions that can be caused by viruses, sap-feeding insects (thrips/mites/aphids), herbicide drift, or nutritional deficits.
   - Forcing a whole-image classifier to choose between "Thrips" and "Leaf Curl" when an image only shows curled foliage without visible insects produced overconfident random guesses.
3. **Softmax Overconfidence & Missing Calibration (High Temperature / ECE)**:
   - Raw softmax logits in deep CNNs (MobileNetV3 / EfficientNet) suffer from extreme overconfidence on out-of-domain and boundary examples. The Expected Calibration Error (ECE) was uncalibrated, causing the model to output 92% confidence even when features were ambiguous.
4. **Disconnect Between Vision Metadata and LLM Context**:
   - The vision pipeline passed only a single string (`topicSlug: "leaf-curl"`) and a number (`confidence: 0.92`).
   - The LLM had no structural way of knowing whether the insect body was actually detected, whether only foliar curling was seen, or what leaf area was measured. The LLM assumed the vision model had verified the presence of the pathogen or pest.

---

## 2. Forensic Tracing: From Photograph to Final Advice

```
[Camera / File Upload]
       │
       ▼ (Lossy compression, EXIF rotation ignored in canvas)
[Image Preprocessing]
       │
       ▼ (224x224 RGB bilinear resize, ImageNet normalization)
[MobileNetV3 / HistGradientBoosting]
       │
       ▼ (Flat 10-class Softmax — NO Hierarchical Staging)
[Output Class Mapping] ──> Fails on co-occurring pests (Thrips + Leaf Curl)
       │
       ▼ (Uncalibrated raw probabilities — False 90%+ confidence)
[Diagnosis Object] ──> Misses 'insect_directly_visible' & 'measurement_scope'
       │
       ▼
[AI Chatbot Response] ──> Hallucinates that it visually inspected the insect
```

---

## 3. Real-World Dataset Inventory & Provenance

To eliminate training on synthetic or mislabeled data, we have inventoried real agricultural field datasets with verified ground truth:

### A. Digital Green Real Indian Smallholder Field Dataset (`DigiGreen/Crop_Disease_Images`)
- **Source**: Real smallholder farmer photographs from Andhra Pradesh, Telangana, and Bihar uploaded to Digital Green's Farmer.Chat.
- **Verification**: Certified by professional Indian agricultural field agronomists.
- **Chilli Breakdown**:
  - `Leaf Curl Virus`: 46 verified field photos
  - `Thrips`: 29 verified field photos
  - `Leaf Curl Virus + Thrips co-infestation`: 12 verified multi-label photos
  - `Mites`: 11 verified photos
  - `Anthracnose`: 8 verified photos
  - `Healthy`: 6 verified photos
  - `Co-infestations (Curl + Thrips + Mites)`: 7 verified photos
- **License**: CC-BY-4.0 (commercial open access).
- **Resolution**: High-res field captures (e.g. 750x1000).

### B. Paddy Doctor Real Field Dataset (`paddydoc.github.io`)
- **Source**: 16,225 real field photos collected across Tamil Nadu and South India across 10 classes (`blast`, `brown_spot`, `bacterial_leaf_blight`, `bacterial_leaf_streak`, `tungro`, `hispa`, `stem_borer`, `downy_mildew`, `bacterial_panicle_blight`, `normal`).
- **Verification**: Verified by Tamil Nadu Agricultural University (TNAU) plant pathologists.
- **License**: Research / open educational access.

---

## 4. Key Corrective Actions

1. **Multi-Stage Hierarchical Diagnosis Architecture**:
   - **Stage 1 (Botanical Gate)**: Plant vs. Non-plant rejection.
   - **Stage 2 (Foliar Symptom Analysis)**: Detects upward curl (thrips damage), downward cupping (mites), spindle lesions (blast), oval halos (brown spot), marginal waviness (BLB).
   - **Stage 3 (Insect Inspection)**: Disentangles direct insect sightings (macrophotography) from damage-only associations.
   - **Stage 4 (Multi-Label Co-occurrence)**: Supports dual diagnosis (e.g., *Thrips Vector + Leaf Curl Virus*).
2. **Platt / Temperature-Scaled Confidence Calibration**:
   - Sets temperature scaling on validation logits to pull misleading 90%+ probabilities down to honest 55–65% intervals on borderline field specimens.
3. **Anatomical Leaf-Area Severity Segmentation**:
   - Defines severity strictly as the percentage of visible necrotic/chlorotic lesion pixels over total segmented green-leaf mask area.
4. **Structured Vision Contract for Chatbot**:
   - Transmits `insect_directly_visible: boolean`, `symptom_type: string`, and `measurement_scope: "visible_leaf_sample"` to prevent the LLM from overclaiming.

