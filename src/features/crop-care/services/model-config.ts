/**
 * Central Model & Provider Configuration
 * Dual-Engine Architecture:
 * - Offline Engine: Google Gemma 4 E2B Mobile (LiteRT-LM Android + on-device fallback)
 * - Online Engine: Multi-provider backend (Default: OpenAI GPT-6.2 Sol / GPT-6.2 Astra; Optional: Gemini 2.0 Flash)
 */

export type EngineMode = "auto" | "offline" | "online";

export interface ModelDescriptor {
  id: string;
  name: string;
  provider: "offline" | "openai" | "gemini" | "groq" | "ollama";
  parameterCount: string;
  contextWindow: number;
  visionCapable: boolean;
  streamingSupported: boolean;
  description: string;
  recommendedRole: "balanced" | "advanced" | "offline-primary" | "offline-alternative";
}

export interface OfflineModelSpec {
  id: string;
  name: string;
  family: "gemma4" | "qwen2.5" | "llama3.2";
  checkpointFormat: "litert-lm" | "executorch";
  fileSizeMb: number;
  memoryMappedMb: number;
  activeRamMb: number;
  license: string;
  commercialUseAllowed: boolean;
  tokensPerSecCPU: number;
  tokensPerSecGPU: number;
  supportsMultimodal: boolean;
  officialHuggingFaceId: string;
}

export const OFFLINE_MODELS: Record<string, OfflineModelSpec> = {
  "gemma-4-e2b": {
    id: "gemma-4-e2b",
    name: "Google Gemma 4 E2B Mobile",
    family: "gemma4",
    checkpointFormat: "litert-lm",
    fileSizeMb: 2580,
    memoryMappedMb: 1120,
    activeRamMb: 790,
    license: "Apache 2.0",
    commercialUseAllowed: true,
    tokensPerSecCPU: 47,
    tokensPerSecGPU: 52,
    supportsMultimodal: true,
    officialHuggingFaceId: "litert-community/gemma-4-E2B-it-litert-lm",
  },
  "gemma-4-e4b": {
    id: "gemma-4-e4b",
    name: "Google Gemma 4 E4B Mobile",
    family: "gemma4",
    checkpointFormat: "litert-lm",
    fileSizeMb: 3650,
    memoryMappedMb: 1450,
    activeRamMb: 2240,
    license: "Apache 2.0",
    commercialUseAllowed: true,
    tokensPerSecCPU: 18,
    tokensPerSecGPU: 22,
    supportsMultimodal: true,
    officialHuggingFaceId: "litert-community/gemma-4-E4B-it-litert-lm",
  },
  "qwen-2.5-1.5b": {
    id: "qwen-2.5-1.5b",
    name: "Qwen 2.5 1.5B Instruct",
    family: "qwen2.5",
    checkpointFormat: "litert-lm",
    fileSizeMb: 1600,
    memoryMappedMb: 600,
    activeRamMb: 980,
    license: "Apache 2.0",
    commercialUseAllowed: true,
    tokensPerSecCPU: 38,
    tokensPerSecGPU: 45,
    supportsMultimodal: false,
    officialHuggingFaceId: "litert-community/Qwen2.5-1.5B-Instruct-litert-lm",
  },
  "llama-3.2-1b": {
    id: "llama-3.2-1b",
    name: "Meta Llama 3.2 1B Instruct",
    family: "llama3.2",
    checkpointFormat: "executorch",
    fileSizeMb: 1300,
    memoryMappedMb: 450,
    activeRamMb: 850,
    license: "Llama 3.2 Community",
    commercialUseAllowed: true,
    tokensPerSecCPU: 28,
    tokensPerSecGPU: 35,
    supportsMultimodal: false,
    officialHuggingFaceId: "meta-llama/Llama-3.2-1B-Instruct",
  },
};

export const DEFAULT_OFFLINE_MODEL_ID = "gemma-4-e2b";

export const ONLINE_MODELS: Record<string, ModelDescriptor> = {
  "gpt-6.2-sol": {
    id: "gpt-6.2-sol",
    name: "OpenAI GPT-6.2 Sol",
    provider: "openai",
    parameterCount: "High-Efficiency Frontier",
    contextWindow: 128000,
    visionCapable: true,
    streamingSupported: true,
    description: "Default balanced online engine. Fast, highly reliable agronomic reasoning and code synthesis.",
    recommendedRole: "balanced",
  },
  "gpt-6.2-astra": {
    id: "gpt-6.2-astra",
    name: "OpenAI GPT-6.2 Astra",
    provider: "openai",
    parameterCount: "Frontier Flagship",
    contextWindow: 200000,
    visionCapable: true,
    streamingSupported: true,
    description: "Advanced scientific flagship model with deep multilingual and complex pathological reasoning.",
    recommendedRole: "advanced",
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Google Gemini 2.0 Flash",
    provider: "gemini",
    parameterCount: "Multimodal Frontier",
    contextWindow: 1000000,
    visionCapable: true,
    streamingSupported: true,
    description: "Ultra-fast multimodal model with native high-resolution image analysis and multilingual mastery.",
    recommendedRole: "balanced",
  },
};

export const DEFAULT_ONLINE_MODEL_ID = "gpt-6.2-sol";

