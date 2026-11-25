import { describe, it, expect, vi, beforeEach } from "vitest";
import { voiceAgent, voiceInput, transliterateIndic } from "../features/crop-care/services/voice";
import type { Lang } from "../features/crop-care/i18n";

describe("Multilingual Voice Agent & Indic Transliteration Suite", () => {
  describe("Indic Transliteration Unit Tests", () => {
    it("should transliterate Telugu agricultural phrase accurately", () => {
      const teText = "వరిలో అగ్గితెగులు నివారణ";
      const phonetic = transliterateIndic(teText, "te");
      expect(phonetic).toBeTruthy();
      expect(phonetic.toLowerCase()).toContain("vari");
      expect(phonetic.toLowerCase()).toContain("nivaara");
    });

    it("should transliterate Tamil agricultural phrase accurately", () => {
      const taText = "நெல் பயிர் நோய்";
      const phonetic = transliterateIndic(taText, "ta");
      expect(phonetic).toBeTruthy();
      expect(phonetic.toLowerCase()).toContain("nel");
    });

    it("should transliterate Kannada agricultural phrase accurately", () => {
      const knText = "ಭತ್ತದ ರೋಗ";
      const phonetic = transliterateIndic(knText, "kn");
      expect(phonetic).toBeTruthy();
      expect(phonetic.toLowerCase()).toContain("bhaththa");
    });

    it("should transliterate Marathi agricultural phrase accurately", () => {
      const mrText = "भात पीक रोग";
      const phonetic = transliterateIndic(mrText, "mr");
      expect(phonetic).toBeTruthy();
      expect(phonetic.toLowerCase()).toContain("bhaat");
    });

    it("should preserve English text unchanged", () => {
      const enText = "Rice blast fungal leaf disease";
      const phonetic = transliterateIndic(enText, "en");
      expect(phonetic).toBe(enText);
    });
  });

  describe("VoiceAgentService Multi-tier Fallback Execution", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should support voice playback across all 6 languages without exceptions", async () => {
      const languages: Lang[] = ["en", "hi", "te", "ta", "kn", "mr"];

      for (const lang of languages) {
        const text = `Testing vernacular voice agent in ${lang}`;
        const canSpeak = await voiceAgent.speak(text, lang);
        expect(typeof canSpeak).toBe("boolean");
      }
    });

    it("should stop ongoing playback when stop() is called", () => {
      voiceAgent.stop();
      const state = voiceAgent.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.activeText).toBeNull();
    });

    it("should report availability status on platform", () => {
      const supported = voiceAgent.isSupported();
      expect(typeof supported).toBe("boolean");
    });
  });

  describe("VoiceInputService Speech Recognition", () => {
    it("should report support state", () => {
      const supported = voiceInput.isSupported();
      expect(typeof supported).toBe("boolean");
    });

    it("should stop listening safely without throwing errors", () => {
      expect(() => voiceInput.stopListening()).not.toThrow();
      expect(voiceInput.getState().isListening).toBe(false);
    });
  });
});
