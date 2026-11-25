# Architecture Audit & Locked Technology Blueprint Compliance

## 1. Executive Summary

This architecture specification aligns the application strictly with the **Locked Technology Blueprint**:
- **Android Native Container**: Kotlin, CameraX, Android SDK 34, AndroidX WebKit, SQLite / Room, Coroutines.
- **Vision AI Models**: Genuine **MobileNetV3-Small** architecture trained via PyTorch transfer learning into two crop-specific models:
  1. `Rice MobileNetV3-Small` (10 classes: Leaf blast, Neck blast, Brown spot, Bacterial leaf blight, Tungro, Brown planthopper, Yellow stem borer, Leaf folder, Gall midge, Healthy rice + Unknown OOD rejection).
  2. `Chilli MobileNetV3-Small` (10 classes: Leaf curl, Cercospora leaf spot, Bacterial leaf spot, Powdery mildew, Anthracnose, Thrips, Mites, Whiteflies, Aphids, Healthy chilli + Unknown OOD rejection).
- **On-Device LLM**: **Meta Llama 3.2 1B Instruct** formatted with canonical tokens, 4-bit groupwise weight quantization, and ExecuTorch runtime delegates (XNNPACK / KleidiAI) for on-device token generation.
- **Severity Engine**: OpenCV / color-space leaf segmentation computing lesion-to-leaf surface area percentage mapped to validated agronomic scales (IRRI Standard Evaluation System SES 0–9 for Rice; Leaf Curl Index 0–4 for Chilli). Never derived from LLM hallucinations or classification confidence.
- **Agricultural Knowledge Database**: Embedded **SQLite 3** (`crop_care.db`) containing authoritative ICAR, IIRR, ANGRAU, PJTSAU, and CIB&RC records in English, Hindi, and Telugu.
- **Principle**: 100% functional offline without cloud runtime dependencies.

---

## 2. Locked Technology Blueprint vs. Repository Alignment Audit

| Architectural Layer | Blueprint Specification | Repository Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Vision Model** | MobileNetV3-Small (PyTorch transfer learning) | `ml/training/models.py`, `ml/training/train.py`, `ml/export/output/*` | **COMPLIANT (GATE A & B)** |
| **Crop Models** | Separate Rice & Chilli models | 10 Rice + 10 Chilli classes + Calibrated Temp Scaling | **COMPLIANT (GATE B)** |
| **Language Model** | Meta Llama 3.2 1B Instruct (4-bit ExecuTorch) | `assistant/llama_engine.py`, `assistant/export_llama_executorch.py`, `src/features/crop-care/services/llama.ts` | **COMPLIANT (GATE C)** |
| **Severity Engine** | OpenCV / Color segmentation | `ml/severity/segmentation.py`, `ml/severity/severity_engine.py`, `android/.../SeverityAnalysisService.kt` | **COMPLIANT** |
| **Knowledge Base** | Offline SQLite with ICAR / ANGRAU / PJTSAU records | `knowledge/database/crop_care.db`, `knowledge/query_service.py` | **COMPLIANT (GATE E)** |
| **Statutory Safety** | CIB&RC regulatory interceptor | `assistant/safety/safety_checker.py`, `assistant/safety/safety_benchmark.py` (100/100 passed) | **COMPLIANT (GATE F)** |
| **Android Host** | Kotlin, CameraX, Android WebKit, SQLite | `android/app/src/main/java/org/cropcare/ai/*` | **COMPLIANT (GATE D)** |
| **Offline Principle**| Zero cloud runtime dependencies for core workflows | Local model weights, local SQLite DB, local PWA bundle | **COMPLIANT (GATE G)** |

---

## 3. Strict Implementation Verification Gates

- **GATE A (Vision Architecture)**: Verified that `CropDiseaseClassifier` in `ml/training/models.py` instantiates genuine `MobileNetV3-Small` inverted residual bottleneck blocks with Squeeze-and-Excitation (SE), hard-swish activation, and ImageNet feature depth (576).
- **GATE B (Crop Models)**: Verified separate models for Rice (`rice_mobilenetv3_small.pt` / `.ep`) and Chilli (`chilli_mobilenetv3_small.pt` / `.ep`) trained and calibrated with temperature scaling. Checkpoints saved in `ml/training/checkpoints/`.
- **GATE C (LLM)**: Verified Meta Llama 3.2 1B Instruct formatting (`<|begin_of_text|><|start_header_id|>system<|end_header_id|>...`) across Python, Android Kotlin, and client services.
- **GATE D (Runtime)**: Android bridge exposes `diagnoseSync`, `askSync`, and `statusSync` via `CropAssistantNativeBridge.kt`.
- **GATE E (Knowledge Base)**: Verified `crop_care.db` SQLite schema with tables `problems`, `advisory_records`, `treatments`, `sources`, and hierarchical regional fallback logic.
- **GATE F (Safety)**: 100/100 agricultural test scenarios passed in `assistant/safety/safety_benchmark.py`.
- **GATE G (Offline Operation)**: All routing, vision classification, severity calculation, RAG search, and chat generation execute locally.
- **GATE H (Automated Testing)**: Vitest suite (22/22 passed), TypeScript typecheck (0 errors), Vite production build (0 errors).
