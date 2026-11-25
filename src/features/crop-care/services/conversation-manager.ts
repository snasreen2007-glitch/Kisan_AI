/**
 * KisanAI - Smart Conversation Manager & Memory Layer
 * Tracks conversation state, resolves pronoun references ("it", "them", "cure"),
 * computes dynamic diagnosis-driven suggested follow-up chips, and maintains a compact history window.
 */

import type { CropKey } from "../knowledge";
import type { DiagnosisContext } from "../types/diagnosis-context";
import { OfflineRAGEngine, type VerifiedKnowledgeRecord } from "./rag-knowledge";
import { AgriculturalSafetyValidator } from "./safety-validator";

export interface ConversationTurn {
  id: string;
  role: "farmer" | "assistant";
  text: string;
  timestamp: number;
  referencedCrop?: CropKey;
  referencedCondition?: string;
}

export interface ConversationState {
  currentCrop: CropKey;
  diagnosisContext?: DiagnosisContext | null;
  language: "en" | "hi" | "te";
  region: string;
  season: string;
  history: ConversationTurn[];
  summary: string;
  recommendedActionIds: string[];
}

export class ConversationManager {
  private state: ConversationState;

  constructor(
    crop: CropKey = "rice",
    lang: "en" | "hi" | "te" = "en",
    diagContext?: DiagnosisContext | null
  ) {
    this.state = {
      currentCrop: crop,
      diagnosisContext: diagContext,
      language: lang,
      region: "Andhra Pradesh",
      season: "kharif",
      history: [],
      summary: "",
      recommendedActionIds: []
    };
  }

  public updateDiagnosisContext(ctx: DiagnosisContext | null): void {
    this.state.diagnosisContext = ctx;
    if (ctx?.crop) {
      this.state.currentCrop = ctx.crop;
    }
  }

  public setLanguage(lang: "en" | "hi" | "te"): void {
    this.state.language = lang;
  }

  public addTurn(role: "farmer" | "assistant", text: string): void {
    const turn: ConversationTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      timestamp: Date.now(),
      referencedCrop: this.state.currentCrop,
      referencedCondition: this.state.diagnosisContext?.predictedDiseaseOrPest
    };
    this.state.history.push(turn);

    // Keep memory compact (rolling window of last 8 turns)
    if (this.state.history.length > 8) {
      const removed = this.state.history.shift();
      if (removed) {
        this.updateSummary(removed);
      }
    }
  }

  private updateSummary(turn: ConversationTurn): void {
    if (turn.role === "farmer") {
      this.state.summary += ` | Farmer asked about ${turn.text.slice(0, 40)}`;
    }
  }

  /**
   * Resolves contextual pronouns like "it", "them", "this problem", "the disease"
   * by binding them to the active diagnosis or recent conversation focus.
   */
  public resolveContextualQuery(rawQuery: string): { resolvedText: string; targetCondition?: string } {
    const q = rawQuery.trim();
    const qLower = q.toLowerCase();
    const activeCondition = this.state.diagnosisContext?.predictedDiseaseOrPest || "crop health issue";

    // Follow-up resolution
    if (/\b(?:it|this|this disease|this pest|them|these insects|the problem|ఈ సమస్య|దీనికి|यह|इस बीमारी)\b/i.test(qLower)) {
      return {
        resolvedText: `${q} (context: referring to ${activeCondition} on ${this.state.currentCrop})`,
        targetCondition: this.state.diagnosisContext?.topicSlug
      };
    }

    if (/^(?:what to do|how to control|how to cure|what is the cure|remedy|spray|dosage|ఏం చేయాలి|నివారణ|ఎలా నియంత్రించాలి|क्या करें|उपचार|दवा)\b/i.test(qLower)) {
      return {
        resolvedText: `What is the recommended management and cure for ${activeCondition} on ${this.state.currentCrop}?`,
        targetCondition: this.state.diagnosisContext?.topicSlug
      };
    }

    return { resolvedText: q, targetCondition: this.state.diagnosisContext?.topicSlug };
  }

  /**
   * Returns dynamic quick question chips based strictly on the current diagnosis.
   */
  public getSuggestedQuickChips(): Array<{ label: string; query: string }> {
    const lang = this.state.language;
    const diag = this.state.diagnosisContext;
    const condName = diag?.predictedDiseaseOrPest || (this.state.currentCrop === "rice" ? "Rice Crop" : "Chilli Crop");

    if (lang === "te") {
      if (diag?.topicSlug === "rice-healthy" || diag?.topicSlug === "chilli-healthy") {
        return [
          { label: "🌿 పైరు సంరక్షణ", query: "ఆరోగ్యకరమైన పంటకు పోషకాల యాజమాన్యం ఎలా చేయాలి?" },
          { label: "🧪 ఎరువుల మోతాదు", query: "యూరియా మరియు పొటాష్ సమతుల్య వాడకం ఎలా?" },
          { label: "📷 మళ్లీ స్కాన్ చేయాలా?", query: "తదుపరి స్కాన్ ఎప్పుడు చేయాలి?" }
        ];
      }
      return [
        { label: "🛠️ ఏం చేయాలి?", query: `${condName} తక్షణ నివారణ చర్యలు ఏమిటి?` },
        { label: "⚠️ ఎందుకు వచ్చింది?", query: `${condName} రావడానికి కారణాలు ఏమిటి?` },
        { label: "🌾 సులభంగా వివరించు", query: `${condName} గురించి రైతు భాషలో సులభంగా వివరించు.` },
        { label: "🛡️ రాకుండా జాగ్రత్తలు", query: `${condName} భవిష్యత్తులో రాకుండా నివారణ చర్యలు ఏమిటి?` }
      ];
    }

    if (lang === "hi") {
      if (diag?.topicSlug === "rice-healthy" || diag?.topicSlug === "chilli-healthy") {
        return [
          { label: "🌿 फसल की देखभाल", query: "स्वस्थ फसल के लिए खाद और पानी का सही प्रबंधन क्या है?" },
          { label: "🧪 यूरिया की मात्रा", query: "यूरिया और पोटाश का संतुलित अनुपात क्या होना चाहिए?" },
          { label: "📷 अगली जांच कब करें?", query: "अगला फोटो स्कैन कब करना चाहिए?" }
        ];
      }
      return [
        { label: "🛠️ क्या करें?", query: `${condName} के तत्काल रोकथाम के उपाय क्या हैं?` },
        { label: "⚠️ क्यों हुआ?", query: `${condName} होने का मुख्य कारण और मौसम का प्रभाव क्या है?` },
        { label: "🌾 सरल शब्दों में", query: `${condName} के बारे में आसान भाषा में समझाएं।` },
        { label: "🛡️ बचाव के उपाय", query: `${condName} से भविष्य में बचाव के लिए क्या करें?` }
      ];
    }

    // English defaults
    if (diag?.topicSlug === "rice-healthy" || diag?.topicSlug === "chilli-healthy") {
      return [
        { label: "🌿 Crop Maintenance", query: "How to maintain balanced nutrition for a healthy canopy?" },
        { label: "🧪 NPK Guidelines", query: "What is the recommended Nitrogen and Potassium ratio?" },
        { label: "📷 When to rescan?", query: "When should I perform the next leaf health scan?" }
      ];
    }

    return [
      { label: "🛠️ What should I do now?", query: `What are the immediate practical steps to stop ${condName}?` },
      { label: "⚠️ Why did this happen?", query: `What caused this ${condName} and what weather triggers it?` },
      { label: "🌾 Explain in simple words", query: `Explain ${condName} in simple plain farmer language.` },
      { label: "🛡️ How to prevent it?", query: `What cultural practices will prevent ${condName} in the next season?` },
      { label: "🔍 Similar looking problems", query: `What other diseases or nutrient deficiencies look like ${condName}?` }
    ];
  }

  /**
   * Builds the comprehensive Llama 3.2 1B prompt combining:
   * - System instructions
   * - Structured Diagnosis Context
   * - Verified RAG Knowledge Base Evidence
   * - Conversation History Window
   */
  public buildPrompt(farmerQuestion: string): { prompt: string; systemPrompt: string; evidence?: VerifiedKnowledgeRecord | null } {
    const { resolvedText } = this.resolveContextualQuery(farmerQuestion);
    const diag = this.state.diagnosisContext;
    const lang = this.state.language;
    const crop = this.state.currentCrop;

    // Retrieve verified agricultural knowledge evidence
    const evidence = OfflineRAGEngine.retrieveEvidence(crop, diag?.topicSlug, resolvedText, this.state.region);
    const ragContext = evidence ? OfflineRAGEngine.buildRAGContext(evidence, lang) : "";

    const diagHeader = diag ? `
[STRUCTURED FIELD DIAGNOSIS CONTEXT]
- Crop: ${diag.crop.toUpperCase()}
- Primary Pathogen/Pest Identified: ${diag.predictedDiseaseOrPest} (Slug: ${diag.topicSlug})
- Model Confidence: ${(diag.confidence * 100).toFixed(1)}% (Status: ${diag.confidenceCalibrationStatus})
- Visual Damage Severity: ${diag.severityScore} (${diag.severityCategory.toUpperCase()} stage)
- Measurement Method: ${diag.measurementMethod}
- Image Quality: ${diag.imageQualityStatus}
- Visible Pathology: ${diag.visibleSymptomsDetected.join(", ") || "Foliar lesions present"}
- Insect Body Directly Visible: ${diag.insectDirectlyVisible ? "YES (Macro insect body resolved)" : "NO (Microscopic pest/pathogen identified via foliar feeding scars and leaf morphology)"}
- Timestamp: ${new Date(diag.diagnosisTimestamp).toISOString()}
- Out-of-Distribution Warning: ${diag.isUncertainOrOOD ? "YES - Uncertain prediction, recommend rescan" : "NO - Confirmed in-distribution"}
` : `[STRUCTURED FIELD DIAGNOSIS CONTEXT: No active leaf photo scan attached. Querying general agronomic knowledge.]`;

    const systemPrompt = `You are KisanAI, a world-class on-device Agricultural Field Advisor and Agronomist powered by Meta Llama 3.2 1B Instruct.
You assist farmers cultivating Rice and Chilli in Andhra Pradesh, Telangana, and across India.

STRICT OPERATIONAL & ETHICAL GUIDELINES:
1. GROUNDING IN VERIFIED EVIDENCE:
   - Base your recommendations strictly on the [VERIFIED AGRICULTURAL KNOWLEDGE BASE EVIDENCE] provided below.
   - Do NOT invent unverified brand names, custom chemical dosages, or unregistered tank mixes.
   - Adhere strictly to CIB&RC statutory regulations: always advise consulting the local Agricultural Officer or KVK for chemical label validation.

2. VISUAL EVIDENCE HONESTY & ENTOMOLOGICAL ACCURACY:
   - If "Insect Body Directly Visible" is NO, NEVER claim that you can see physical insects crawling on the leaf.
   - Explain to the farmer that microscopic sucking pests (like thrips at 0.5–1mm or mites at 0.2mm) are recognized through their distinctive foliar symptoms (e.g. silvery rasping scars, upward boat-shaped leaf margins, puckering) rather than camera-resolved insect bodies.

3. CONVERSATIONAL PERSONALITY:
   - Talk naturally, warmly, concisely, and intelligently just like ChatGPT / Claude / Gemini.
   - Address the farmer respectfully ("bro", "farmer friend", "రైతు సోదరా", "किसान भाई").
   - Acknowledge their specific crop situation naturally without regurgitating robotic headers.
   - Explain biological reasons in simple words so an ordinary farmer understands why an action is needed.

3. CONTEXT-AWARE INTELLIGENCE:
   - Use the [STRUCTURED FIELD DIAGNOSIS CONTEXT] to resolve pronouns like "it", "this", or "what should I do".
   - Never claim you personally visually inspected the field; you are synthesizing data provided by the on-device vision model and leaf analysis.
   - If diagnosis confidence is uncertain (<40%) or image quality is blurry, advise re-taking a steady close-up photo before applying treatments.

4. MULTILINGUAL FLUENCY:
   - Respond fluently in the requested language: ${lang === "te" ? "Telugu (తెలుగు)" : lang === "hi" ? "Hindi (हिंदी)" : "English"}.
   - Maintain accurate verified numbers and local agricultural terminology.

${diagHeader}
${ragContext}
`;

    const userPrompt = resolvedText;
    return { prompt: userPrompt, systemPrompt, evidence };
  }

  public getHistory(): ConversationTurn[] {
    return [...this.state.history];
  }

  public clearHistory(): void {
    this.state.history = [];
    this.state.summary = "";
    this.state.recommendedActionIds = [];
  }
}

