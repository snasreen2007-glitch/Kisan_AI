/**
 * Secure Backend Proxy Adapter
 * Protects secret credentials: Never embeds provider keys in client bundle.
 * Routes requests through /api/ai/chat proxy with streaming support.
 */

import { DEFAULT_ONLINE_MODEL_ID, ONLINE_MODELS } from "./model-config";
import type { Lang } from "../i18n";
import type { DiagnosisContext } from "../types/diagnosis-context";

export interface ChatMessagePayload {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export interface OnlineChatRequest {
  modelId?: string;
  messages: ChatMessagePayload[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  diagnosisContext?: DiagnosisContext;
  lang?: Lang;
  liveResearch?: boolean;
}

export interface OnlineChatChunk {
  delta: string;
  isFinished: boolean;
  modelUsed?: string;
  citations?: Array<{ title: string; url: string; institution?: string }>;
}

export class OnlineAIBackendService {
  private static instance: OnlineAIBackendService;
  private endpoint = "/api/ai/chat";

  public static getInstance(): OnlineAIBackendService {
    if (!OnlineAIBackendService.instance) {
      OnlineAIBackendService.instance = new OnlineAIBackendService();
    }
    return OnlineAIBackendService.instance;
  }

  /**
   * Checks if online service backend is reachable.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch("/api/ai/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Executes streaming chat completion through the secure backend.
   */
  async *streamCompletion(
    req: OnlineChatRequest,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const modelId = req.modelId || DEFAULT_ONLINE_MODEL_ID;
    const body = JSON.stringify({
      model: modelId,
      messages: req.messages,
      stream: true,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 1500,
      diagnosis: req.diagnosisContext,
      lang: req.lang || "en",
      live_research: req.liveResearch ?? false,
    });

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      signal: abortSignal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Online AI proxy error (${res.status}): ${errText || res.statusText}`);
    }

    if (!res.body) {
      throw new Error("No response stream received from online engine.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") return;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || parsed.delta || "";
              if (delta) {
                yield delta;
              }
            } catch {
              // Ignore non-json control packets
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Non-streaming direct completion.
   */
  async getCompletion(req: OnlineChatRequest, abortSignal?: AbortSignal): Promise<string> {
    let fullText = "";
    for await (const chunk of this.streamCompletion(req, abortSignal)) {
      fullText += chunk;
    }
    return fullText;
  }
}

export const onlineAIBackend = OnlineAIBackendService.getInstance();

