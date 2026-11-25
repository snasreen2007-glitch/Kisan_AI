import { describe, expect, it } from "vitest";
import {
  crops,
  getTopic,
  searchTopics,
  topics,
} from "@/features/crop-care/knowledge";
import {
  assistantReply,
  getAdvisory,
  safetyPrecautions,
} from "@/features/crop-care/services/advisory";
import {
  areaBands,
  bandForScore,
  irriScale,
  leafCurlScale,
  sampleDiagnosis,
  scaleFor,
  severityLabel,
} from "@/features/crop-care/services/diagnosis";
import { assessPixels } from "@/features/crop-care/services/quality";
import {
  clearUserData,
  defaultSettings,
  historyService,
  newId,
  savedService,
  settingsService,
  storageUsage,
} from "@/features/crop-care/services/store";

describe("Quality Assessment Service", () => {
  it("detects blurry images via low Laplacian variance", () => {
    // Generate uniform grey image (0 sharpness)
    const w = 16, h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      pixels[i * 4] = 120;     // R
      pixels[i * 4 + 1] = 120; // G
      pixels[i * 4 + 2] = 120; // B
      pixels[i * 4 + 3] = 255; // A
    }
    const report = assessPixels(pixels, w, h);
    expect(report.sharpness).toBe(0);
    const blurCheck = report.checks.find((c) => c.id === "blur");
    expect(blurCheck?.pass).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("identifies adequate illumination and plant greenness", () => {
    const w = 16, h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      // High green component
      pixels[i * 4] = 60;
      pixels[i * 4 + 1] = 160;
      pixels[i * 4 + 2] = 50;
      pixels[i * 4 + 3] = 255;
    }
    const report = assessPixels(pixels, w, h);
    expect(report.brightness).toBeGreaterThan(45);
    expect(report.brightness).toBeLessThan(235);
    expect(report.greenShare).toBe(1);
    const lightCheck = report.checks.find((c) => c.id === "dark");
    expect(lightCheck?.pass).toBe(true);
  });
});

describe("Diagnosis & Severity Service", () => {
  it("determines appropriate scale per crop and disease", () => {
    expect(scaleFor("rice", "rice-blast")).toBe("irri-ses");
    expect(scaleFor("chilli", "leaf-curl")).toBe("leaf-curl-index");
    expect(scaleFor("chilli", "anthracnose")).toBe("area-band");
  });

  it("computes severity labels accurately", () => {
    expect(
      severityLabel({ scale: "irri-ses", score: 5, max: 9, band: "moderate" }),
    ).toBe("5 / 9");
    expect(
      severityLabel({ scale: "leaf-curl-index", score: 2, max: 4, band: "moderate" }),
    ).toBe("2 / 4");
    expect(
      severityLabel({ scale: "area-band", score: 18, max: 100, band: "moderate", areaPercent: 18 }),
    ).toBe("18%");
  });

  it("maps severity scores to appropriate bands", () => {
    // IRRI SES
    expect(bandForScore("irri-ses", 1)).toBe("mild");
    expect(bandForScore("irri-ses", 5)).toBe("moderate");
    expect(bandForScore("irri-ses", 9)).toBe("severe");

    // Leaf Curl Index
    expect(bandForScore("leaf-curl-index", 1)).toBe("mild");
    expect(bandForScore("leaf-curl-index", 2)).toBe("moderate");
    expect(bandForScore("leaf-curl-index", 3)).toBe("severe");

    // Area band
    expect(bandForScore("area-band", 5)).toBe("mild");
    expect(bandForScore("area-band", 20)).toBe("moderate");
    expect(bandForScore("area-band", 40)).toBe("severe");
  });
});

describe("Advisory & Safety Compliance", () => {
  it("enforces safety rule for chemical queries in all languages", () => {
    // English
    const enReply = assistantReply("what is the dosage of chlorpyrifos to spray?", {}, "en");
    expect(enReply.safety).toBe(true);
    expect(enReply.text).toContain("CIB&RC-verified");

    // Hindi
    const hiReply = assistantReply("कीटनाशक की कितनी दवा का छिड़काव करें?", {}, "hi");
    expect(hiReply.safety).toBe(true);
    expect(hiReply.text).toContain("CIB&RC-सत्यापित");

    // Telugu
    const teReply = assistantReply("పురుగు మందు పిచికారీ మోతాదు ఎంత?", {}, "te");
    expect(teReply.safety).toBe(true);
    expect(teReply.text).toContain("CIB&RC-ధృవీకరించిన");
  });

  it("never includes unverified chemical doses in advisory", () => {
    const adv = getAdvisory("rice", "rice-blast", {
      district: "Guntur",
      season: "kharif",
    });
    expect(adv).toBeDefined();
    // Chemical records must stay empty until verified by official regulatory board
    expect(adv?.chemical).toEqual([]);
    expect(safetyPrecautions.length).toBeGreaterThan(0);
  });
});

describe("Knowledge Library Search", () => {
  it("searches across multilingual vernacular names and symptoms", () => {
    // English query
    const blastEn = searchTopics("blast");
    expect(blastEn.some((t) => t.slug === "rice-blast")).toBe(true);

    // Scientific query
    const scientific = searchTopics("Pyricularia");
    expect(scientific.some((t) => t.slug === "rice-blast")).toBe(true);

    // Filter by crop (6 foliar diseases + 4 sucking pests + 4 nutrient deficiencies = 14)
    const chilliOnly = searchTopics("", { crop: "chilli" });
    expect(chilliOnly.every((t) => t.crop === "chilli")).toBe(true);
    expect(chilliOnly.length).toBe(14);

    // Filter by mode
    const pestsOnly = searchTopics("", { kind: "pest" });
    expect(pestsOnly.every((t) => t.kind === "pest")).toBe(true);
  });
});

describe("Local Storage & Data Isolation", () => {
  it("saves and retrieves settings correctly", () => {
    const custom = {
      ...defaultSettings,
      name: "Sita",
      district: "Warangal",
      season: "rabi" as const,
    };
    settingsService.save(custom);
    const loaded = settingsService.load();
    expect(loaded.name).toBe("Sita");
    expect(loaded.district).toBe("Warangal");
    expect(loaded.season).toBe("rabi");
  });

  it("computes storage usage without error", () => {
    const usage = storageUsage();
    expect(typeof usage.scans).toBe("number");
    expect(typeof usage.saved).toBe("number");
    expect(typeof usage.settings).toBe("number");
  });
});

describe("Multilingual I18n & Offline Agronomic Synthesis", () => {
  it("translates all core navigation and OOD keys across all 6 languages", async () => {
    const { translate } = await import("@/features/crop-care/i18n");
    const languages = ["en", "te", "hi", "ta", "kn", "mr"] as const;
    const requiredKeys = ["oodTitle", "navWeather", "navCalculator", "navYield", "navMarket", "retakeLeaf"] as const;

    for (const lang of languages) {
      for (const key of requiredKeys) {
        const text = translate(lang, key);
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it("generates localized offline Llama 3.2 1B agronomic responses without network", async () => {
    const { generateLlamaChatResponse } = await import("@/features/crop-care/services/llama");
    const languages = ["en", "te", "hi", "ta", "kn", "mr"] as const;

    for (const lang of languages) {
      const res = generateLlamaChatResponse("blb symptoms in paddy", lang);
      expect(res.model).toBe("Llama-3.2-1B-Instruct");
      expect(res.lang).toBe(lang);
      expect(res.text.length).toBeGreaterThan(20);
      expect(res.safetyTriggered).toBe(false);
    }
  });

  it("strictly triggers statutory CIB&RC safety refusal when chemical dosage is queried", async () => {
    const { generateLlamaChatResponse } = await import("@/features/crop-care/services/llama");
    const hazardousQueries = [
      "how much chemical dosage per acre to spray for blast?",
      "कितना कीटनाशक छिड़काव करें प्रति एकड़?",
      "పురుగుమందు మోతాదు ఎకరాకు ఎంత కలపాలి?",
    ];

    for (const query of hazardousQueries) {
      const res = generateLlamaChatResponse(query, "en");
      expect(res.safetyTriggered).toBe(true);
      expect(res.text).toContain("CIB&RC");
    }
  });

  it("handles conversational intents (greeting, action, cause, simple summary) dynamically", async () => {
    const { generateLlamaChatResponse } = await import("@/features/crop-care/services/llama");
    const scanCtx = {
      crop: "rice" as const,
      topicSlug: "rice-blast",
      severity: { scale: "irri-ses" as const, score: 7, max: 9, band: "severe" as const },
    };

    // 1. Casual greeting "bro" with scan context attached
    const greetingRes = generateLlamaChatResponse("bro", "en", scanCtx);
    expect(greetingRes.text).toContain("Rice Blast");
    expect(greetingRes.text).toContain("What should I do?");
    expect(greetingRes.text).not.toContain("Visual Pathology"); // Should not dump static raw report

    // 2. Action query "what should I do"
    const actionRes = generateLlamaChatResponse("what should I do", "en", scanCtx);
    expect(actionRes.text).toContain("Recommended Action Plan for Rice Blast");
    expect(actionRes.text).toContain("Safety Notice");

    // 3. Cause query "why did this happen"
    const causeRes = generateLlamaChatResponse("why did this happen", "en", scanCtx);
    expect(causeRes.text).toContain("Causes & Spread of Rice Blast");
    expect(causeRes.text).toContain("Magnaporthe oryzae");

    // 4. Simple summary "explain in simple words"
    const simpleRes = generateLlamaChatResponse("explain in simple words", "en", scanCtx);
    expect(simpleRes.text).toContain("Rice Blast in Simple Words");

    // 5. Vernacular greeting "బ్రో" in Telugu
    const teGreetingRes = generateLlamaChatResponse("బ్రో", "te", scanCtx);
    expect(teGreetingRes.text).toContain("అగ్గి తెగులు");
    expect(teGreetingRes.text).toContain("ఏం చేయాలి?");

    // 6. Multi-turn memory without scanCtx attached: follow-up query "how to treat it"
    const history = [
      { id: "1", role: "farmer" as const, text: "My rice leaves have rice blast" },
      { id: "2", role: "assistant" as const, text: "I identified Rice Blast on your crop.", refs: [{ crop: "rice" as const, slug: "rice-blast" }] },
    ];
    const followUpRes = generateLlamaChatResponse("how to treat it", "en", null, history);
    expect(followUpRes.text).toContain("Rice Blast");
    expect(followUpRes.text).toContain("Recommended Action Plan");
    expect(followUpRes.suggestions).toBeDefined();
    expect(followUpRes.suggestions?.length).toBeGreaterThan(0);
  });
});

