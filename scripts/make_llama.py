# -*- coding: utf-8 -*-
"""
Generator script to build the complete, research-grade on-device Llama 3.2 1B Agronomic Engine.
"""

import os

content = r'''import type { Lang } from "../i18n";
import { getTopic, l, type CropKey, type Topic } from "../knowledge";
import type { Scan, SeverityResult } from "./types";

/**
 * Llama 3.2 1B Multimodal & Multilingual Engine for Web & Android
 * Formats prompt using official Llama 3.2 Instruct tokens:
 * <|begin_of_text|><|start_header_id|>system<|end_header_id|>...<|eot_id|><|start_header_id|>user<|end_header_id|>...<|eot_id|><|start_header_id|>assistant<|end_header_id|>
 */

export type MultimodalScanContext = {
  crop: CropKey;
  topicSlug?: string | undefined;
  confidence?: number | undefined;
  severity?: SeverityResult | undefined;
  image?: string | undefined;
};

export type LlamaSynthesisResult = {
  model: string;
  lang: Lang;
  prompt: string;
  visualPathology: string;
  fieldRisk: string;
  actionPlan: string[];
  fullNarrative: string;
};

export type LlamaChatResult = {
  model: string;
  lang: Lang;
  text: string;
  isMultimodal: boolean;
  safetyTriggered: boolean;
  refs: { crop: CropKey; slug: string }[];
};

// CIB&RC Statutory safety patterns covering all 6 supported languages
const HAZARDOUS_PATTERNS = [
  /\b(?:dose|dosage|concentration|dilution|mixing ratio|spray interval)\b/i,
  /\b(?:how much|how many)\s+(?:to spray|to mix|of chemical|chemical|pesticide|fungicide|insecticide)\b/i,
  /\b(?:how much|how many)\b.*\b(?:per\s+(?:acre|ha|hectare|pump|litre|liter|knapsack)|to\s+spray|to\s+mix|in\s+\d+\s*(?:l|litre|liter|pump)|dissolve in water)\b/i,
  /\b(?:ml|g|gm|grams?|kg|litres?)\b.*\b(?:\/|per|in a|in \d+|in)\s*(?:l|litre|liter|acre|ha|hectare|pump|knapsack)\b/i,
  /\b(?:double (?:the )?dose|twice (?:the )?dose|increase (?:the )?dose|higher dose|exceed (?:the )?package dose)\b/i,
  /\b(?:double dosage|double (?:the )?fungicide dose|double dose)\b/i,
  /\b(?:mix|tank mix|combine|triple mix)\b.*\b(?:with|and|in the same tank|together|in one|chemicals?|pesticides?|fungicides?|formula)\b/i,
  /\b(?:triple mix|tank mix|chemical mix|leftover pesticide)\b/i,
  /\b(?:pesticide|fungicide|insecticide|chemical spray)\s*(?:dose|dosage|schedule|spray)\b/i,
  // Hindi patterns
  /(?:दवा|कीटनाशक|फफूंदनाशी|छिड़काव|मात्रा|डोज़|कितना मिला|दोगुना|मिलाकर)/,
  // Telugu patterns
  /(?:మందు|పురుగుమందు|తెగులుమందు|పిచికారీ|మోతాదు|ఎంత కలపాలి|డబుల్ మోతాదు|రెండు కలిపి)/,
  // Tamil patterns
  /(?:மருந்து|பூச்சிக்கொல்லி|பூஞ்சாணக்கொல்லி|தெளிப்பு|அளவு|டோஸ்|கலந்து|இரு மடங்கு)/,
  // Kannada patterns
  /(?:ಔಷಧ|ಕೀಟನಾಶಕ|ಶಿಲೀಂಧ್ರನಾಶಕ|ಸಿಂಪಡಣೆ|ಪ್ರಮಾಣ|ಡೋಸ್|ಬೆರೆಸಿ|ಎರಡು ಪಟ್ಟು)/,
  // Marathi patterns
  /(?:औषध|कीटकनाशक|बुरशीनाशक|फवारणी|प्रमाण|डोस|मिसळून|दुप्पट)/,
];

const REFUSALS: Record<Lang, string> = {
  en: "Specific chemical dosages, pesticide brand names, or chemical tank-mixing instructions cannot be recommended directly by this AI. Under CIB&RC statutory regulations, chemical crop-protection products must strictly adhere to officially approved regional registrations. Please follow the cultural and biological controls provided, or consult your local Agricultural Officer or Krishi Vigyan Kendra (KVK) for officially approved chemical schedules.",
  hi: "यह एआई कीटनाशक या फफूंदनाशी के नाम, मात्रा (डोज़) या रसायनों को मिलाकर छिड़कने की सलाह नहीं दे सकता। केंद्रीय कीटनाशी बोर्ड (CIB&RC) के नियमों के अनुसार केवल आधिकारिक रूप से अनुमोदित सिफारिशों का ही उपयोग किया जाना चाहिए। कृपया जैविक व कृषि प्रबंधन के तरीके अपनाएं या अपने स्थानीय कृषि अधिकारी/केवीके से सलाह लें।",
  te: "పురుగుమందుల పేర్లు, పిచికారీ మోతాదులు లేదా రసాయనాల మిశ్రమం గురించి ఈ ఏఐ నేరుగా సిఫార్సు చేయదు. CIB&RC నిబంధనల ప్రకారం ధృవీకరించిన ప్రాంతీయ రికార్డుల నుండి మాత్రమే రసాయన సిఫార్సులు రావాలి. దయచేసి అందించిన సమగ్ర సస్యరక్షణ చర్యలను పాటించండి లేదా మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించండి.",
  ta: "குறிப்பிட்ட பூச்சிக்கொல்லி மருந்துகள், அளவுகள் (டோஸ்) அல்லது ரசாயனங்களை கலந்து தெளிப்பது குறித்து இந்த AI நேரடியாக பரிந்துரைக்க முடியாது. CIB&RC சட்ட விதிகளின்படி அங்கீகரிக்கப்பட்ட அளவுகள் மட்டுமே பயன்படுத்தப்பட வேண்டும். தயவுசெய்து இயற்கை மற்றும் உழவியல் மேலாண்மை முறைகளை பின்பற்றவும் அல்லது உள்ளூர் வேளாண்மை அலுவலர் / KVK மையத்தை அணுகவும்.",
  kn: "ನಿರ್ದಿಷ್ಟ ಕೀಟನಾಶಕ ಹೆಸರುಗಳು, ಸಿಂಪಡಣೆಯ ಪ್ರಮಾಣ (ಡೋಸ್) ಅಥವಾ ರಾಸಾಯನಿಕ ಮಿಶ್ರಣಗಳನ್ನು ಈ AI ನೇರವಾಗಿ ಶಿಫಾರಸು ಮಾಡುವುದಿಲ್ಲ. CIB&RC ಕಾಯ್ದೆಯನ್ವಯ ಅಧಿಕೃತ ಶಿಫಾರಸುಗಳನ್ನು ಮಾತ್ರ ಪಾಲಿಸಬೇಕು. ದಯವಿಟ್ಟು ಒದಗಿಸಲಾದ ನೈಸರ್ಗಿಕ ಕ್ರಮಗಳನ್ನು ಅನುಸರಿಸಿ ಅಥವಾ ಅಧಿಕೃತ ಮಾಹಿತಿಗಾಗಿ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿ/KVK ಯನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  mr: "विशिष्ट रासायनिक औषधे, कीटकनाशकांचे प्रमाण (डोस) किंवा औषधे एकत्र मिसळून फवारण्याचा सल्ला हा AI देऊ शकत नाही. केंद्रीय कीटकनाशक मंडळाच्या (CIB&RC) नियमांनुसार अधिकृत शिफारसींचेच पालन करणे बंधनकारक आहे. कृपया जैविक व मशागतीचे उपाय अमलात आणा किंवा अधिकृत सल्ल्यासाठी स्थानिक कृषी अधिकारी/KVK शी संपर्क साधा.",
};

export function formatLlama3Prompt(systemMsg: string, userMsg: string): string {
  return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemMsg}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userMsg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
}

type AgronomicDetail = {
  visual: Record<Lang, (pct: number, band: string) => string>;
  risk: Record<Lang, string>;
  actions: Record<Lang, string[]>;
};
'''

with open("scripts/build_llama_part1.txt", "w", encoding="utf-8") as f:
    f.write(content)
print("Part 1 written")

