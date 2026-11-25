# KisanAI Architecture & Engineering Guidelines

## Core Principles

- **KisanAI** is a production-ready, offline-first agricultural intelligence platform powered by on-device computer vision and local LLM reasoning.
- Never use cloud AI as a silent replacement for local inference.
- Never hallucinate chemical dosages or unverified brand names; adhere strictly to statutory CIB&RC guidelines.

## Project Structure & Architecture

- Keep crop-care screens and device-local behavior under `src/features/crop-care`, leaving route files as entry points so offline-first product flows stay cohesive.
- Each app section is its own route; shared device state (notes, preferences, chat) lives in one provider mounted in `__root.tsx` around the app shell, so pages stay linked without losing state on navigation.
- Style pages with mobile-first Tailwind utilities on semantic tokens; `styles.css` holds tokens and a few helpers only, so phone layouts stay the default.
- Vision inference is driven by **MobileNetV3-Small** (with dedicated transfer-learned weights for Rice and Chilli).
- Agronomic reasoning and conversational diagnosis are driven by **Meta Llama 3.2 1B Instruct** (supporting dual-mode local Docker execution and 4-bit ExecuTorch Android APK deployment).
- Device storage is client-side and encrypted with AES-GCM 256-bit with PBKDF2 key derivation and exportable `.cropcare` archive capabilities.
