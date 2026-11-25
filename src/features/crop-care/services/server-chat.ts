import type { Context } from "h3";
import { createServerFn } from "@tanstack/react-start";
import { queryGroqChat } from "./groq-pool";

// Secure server function executing strictly on server runtime
// Accesses environment variables (OPENAI_API_KEY, GEMINI_API_KEY) securely without leaking to client
export const handleAIChatServer = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data }: { data: any }) => {
    const { model, messages, temperature = 0.7, max_tokens = 1500, diagnosis, lang = "en" } = data || {};

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Build system instructions for agricultural expert
    const systemPrompt = `You are KisanAI Premium, a state-of-the-art agricultural intelligence assistant.
CROP DIAGNOSIS CONTEXT:
${diagnosis ? JSON.stringify(diagnosis, null, 2) : "No active leaf scan attached."}

GUIDELINES:
1. Provide deep agronomic reasoning in simple, farmer-friendly language.
2. When the user speaks Telugu or Hindi (including Roman script), respond naturally in that language.
3. Adhere to CIB&RC statutory regulations: never hallucinate dangerous chemical combinations, excessive dosages, or off-label applications.
4. Distinguish your general agronomic training from local field observations.
`;

    // 1. If OpenAI Key is present and OpenAI model selected (GPT-6.2 Sol / GPT-6.2 Astra)
    if (openAiKey && (!model || model.startsWith("gpt-"))) {
      const targetModel = model || "gpt-6.2-sol";
      const formattedMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          temperature,
          max_tokens,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API upstream error: ${err}`);
      }

      const resJson = await res.json();
      return {
        text: resJson.choices?.[0]?.message?.content || "",
        model: targetModel,
        provider: "openai",
      };
    }

    // 2. If Gemini Key is present and Gemini model requested
    if (geminiKey && model?.startsWith("gemini")) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
      }));

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature, maxOutputTokens: max_tokens },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API upstream error: ${err}`);
      }

      const resJson = await res.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return {
        text,
        model: "gemini-2.0-flash",
        provider: "gemini",
      };
    }

    // 3. High-Speed Distributed Groq Engine Pool (Primary Default Cloud Engine)
    try {
      const groqReply = await queryGroqChat({
        messages: messages as any,
        diagnosisContext: diagnosis,
        lang,
        temperature,
        maxTokens: max_tokens,
        model,
      });

      if (groqReply && groqReply.length > 5) {
        return {
          text: groqReply,
          model: "qwen/qwen3.8-27b",
          provider: "groq",
        };
      }
    } catch (e) {
      console.warn("Groq server pool notice:", e);
    }

    // 4. Fallback to Local AI Engine (Port 8000) if no cloud key configured
    try {
      const localRes = await fetch("http://127.0.0.1:8000/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "gemma-4-e2b",
          messages,
        }),
      });

      if (localRes.ok) {
        const localJson = await localRes.json();
        return {
          text: localJson.choices?.[0]?.message?.content || "",
          model: "gemma-4-e2b",
          provider: "offline",
        };
      }
    } catch {
      // Local server offline
    }

    throw new Error("No online AI provider configured and local engine unreachable.");
  });

