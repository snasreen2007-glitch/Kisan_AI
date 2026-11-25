/**
 * KisanAI - Deterministic Agricultural Safety Engine
 * Enforces strict statutory compliance with CIB&RC (Central Insecticide Board & Registration Committee),
 * ICAR, ANGRAU, and PJTSAU agricultural documentation standards.
 * 
 * Sits as a mandatory filter between LLM generation and user display.
 */

import type { CropKey } from "../knowledge";

export interface SafetyCheckResult {
  isSafe: boolean;
  refusalMessage?: string;
  violations: string[];
  sanitizedResponse?: string;
}

// Statutory Refusal Messages in English, Hindi, and Telugu
export const STATUTORY_SAFETY_REFUSALS: Record<string, string> = {
  en:
    "⚠️ **Statutory Agricultural Safety Notice (CIB&RC Compliance)**:\n\n" +
    "This AI assistant cannot recommend custom chemical dosages, arbitrary pesticide mixing, or unverified tank formulations. " +
    "Under Indian CIB&RC regulations, chemical crop protection products must strictly follow label claims and approved regional registrations.\n\n" +
    "• **What you should do instead**: Apply recommended cultural practices, water management, and safe bio-controls (*Pseudomonas fluorescens* or Neem Seed Kernel Extract 5%).\n" +
    "• **For synthetic chemical options**: Consult your nearest Krishi Vigyan Kendra (KVK) or Mandal Agricultural Officer for verified regional prescriptions.",
  hi:
    "⚠️ **सांविधिक कृषि सुरक्षा सूचना (CIB&RC अनुपालन)**:\n\n" +
    "यह एआई सलाहकार मनमाने कीटनाशक डोज़, रसायनों के अनधिकृत मिश्रण (टैंक-मिक्स) या बिना पुष्टि वाले छिड़काव की सिफारिश नहीं कर सकता। " +
    "केंद्रीय कीटनाशी बोर्ड (CIB&RC) के नियमों के अनुसार केवल आधिकारिक रूप से पंजीकृत रसायनों व लेबल निर्देशों का ही पालन होना चाहिए।\n\n" +
    "• **सुरक्षित समाधान**: सांस्कृतिक उपाय अपनाएं, खेत में पानी का सही प्रबंधन करें और स्यूडोमोनास या नीम तेल (1500 ppm) का जैविक छिड़काव करें।\n" +
    "• **रसायनों के लिए**: अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या खंड कृषि अधिकारी से सलाह लें।",
  te:
    "⚠️ **చట్టబద్ధమైన వ్యవసాయ భద్రతా హెచ్చరిక (CIB&RC నిబంధనలు)**:\n\n" +
    "ఈ ఏఐ సహాయకుడు అనధికారిక రసాయన మోతాదులు, పురుగుమందుల మిశ్రమాలు (ట్యాంక్ మిక్సింగ్) లేదా ధృవీకరించని రసాయన మందులను సిఫార్సు చేయదు. " +
    "భారతీయ CIB&RC నిబంధనల ప్రకారం అధికారికంగా ఆమోదించబడిన లేబుల్ సిఫార్సులను మాత్రమే పాటించాలి.\n\n" +
    "• **సురక్షిత ప్రత్యామ్నాయాలు**: సమగ్ర సస్యరక్షణ పద్ధతులు, నీటి యాజమాన్యం మరియు సూడోమోనాస్ లేదా వేప గింజల కషాయం (NSKE 5%) వంటి సేంద్రీయ రక్షణ చర్యలను పాటించండి.\n" +
    "• **రసాయన మందుల కోసం**: మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా మండల వ్యవసాయ అధికారిని సంప్రదించండి."
};

// Hazardous query patterns that require immediate statutory refusal
const HAZARDOUS_QUERY_PATTERNS: RegExp[] = [
  // Dose multiplication or overdose
  /\b(?:double|triple|increase|higher|exceed|extra)\s+(?:the\s+)?(?:dose|dosage|amount|quantity|rate)\b/i,
  /\b(?:twice|two\s*times|3\s*times)\s+(?:the\s+)?(?:dose|dosage|pesticide|fungicide|urea)\b/i,
  // Custom chemical dosage per acre / pump inquiries
  /\b(?:how much|what)\s+(?:chemical\s+)?dosage\s+(?:per\s+(?:acre|pump|liter|litre)|to\s+spray)\b/i,
  // Tank mixing / combining multiple chemical classes without label compatibility
  /\b(?:tank\s*mix|combine|mix\s*together|mix\s*both|cocktail|blend)\b.*\b(?:pesticide|fungicide|insecticide|chemical|poison|spray)\b/i,
  /\b(?:mix|combine)\s+[a-z0-9\-]+\s+(?:with|and)\s+[a-z0-9\-]+\s+(?:in\s+(?:the\s+)?(?:same\s+)?(?:tank|pump|sprayer)|together)\b/i,
  // Banned, restricted, or hazardous chemical inquiries
  /\b(?:monocrotophos|endosulfan|phorate|carbofuran|paraquat|chlorpyrifos\s+50%|ddt|lindane)\b/i,
  // Off-label crop spraying
  /\b(?:spray\s+cotton\s+pesticide\s+on\s+chilli|spray\s+weedicide\s+on\s+standing\s+paddy)\b/i,
  // Multilingual dangerous patterns (Telugu / Hindi)
  /(?:డబుల్\s*మోతాదు|రెండు\s*కలిపి\s*పిచికారీ|పురుగుమందులు\s*కలపవచ్చా|ఎక్కువ\s*మోతాదు|పురుగుమందు\s*మోతాదు)/i,
  /(?:दोगुना\s*डोज़|मिलाकर\s*छिड़काव|दो\s*दवाएं\s*एक\s*साथ|ज्यादा\s*मात्रा|कितना\s*कीटनाशक)/i
];

// Master list of officially registered CIB&RC / ANGRAU / ICAR approved active ingredients for Rice & Chilli
export const APPROVED_REGISTRY: Record<CropKey, Record<string, { chemicals: string[]; maxDosePerLitre: string; phiDays: number }>> = {
  rice: {
    "rice-blast": {
      chemicals: ["tricyclazole 75% wp", "isoprothiolane 40% ec", "kasugamycin 3% sl"],
      maxDosePerLitre: "0.6 g (Tricyclazole) or 1.5 ml (Isoprothiolane)",
      phiDays: 30
    },
    "brown-spot": {
      chemicals: ["propiconazole 25% ec", "mancozeb 75% wp", "edifenphos 50% ec"],
      maxDosePerLitre: "1.0 ml (Propiconazole) or 2.0 g (Mancozeb)",
      phiDays: 25
    },
    "bacterial-leaf-blight": {
      chemicals: ["copper oxychloride 50% wp + streptocycline", "streptocycline"],
      maxDosePerLitre: "2.5 g (COC) + 0.1 g (Streptocycline)",
      phiDays: 21
    },
    "bacterial-leaf-streak": {
      chemicals: ["copper oxychloride 50% wp", "streptocycline"],
      maxDosePerLitre: "2.5 g (COC) + 0.1 g (Streptocycline)",
      phiDays: 21
    },
    "yellow-stem-borer": {
      chemicals: ["chlorantraniliprole 18.5% sc", "cartap hydrochloride 50% sp", "flubendiamide 39.35% sc"],
      maxDosePerLitre: "0.3 ml (Chlorantraniliprole) or 2.0 g (Cartap)",
      phiDays: 30
    },
    "hispa": {
      chemicals: ["chlorpyrifos 20% ec", "triazophos 40% ec"],
      maxDosePerLitre: "2.0 ml (Chlorpyrifos) or 1.5 ml (Triazophos)",
      phiDays: 28
    },
    "tungro": {
      chemicals: ["thiamethoxam 25% wg", "imidacloprid 17.8% sl"],
      maxDosePerLitre: "0.2 g (Thiamethoxam) or 0.25 ml (Imidacloprid) for vector control",
      phiDays: 21
    },
    "downy-mildew": {
      chemicals: ["metalaxyl 8% + mancozeb 64% wp"],
      maxDosePerLitre: "2.0 g / L",
      phiDays: 25
    },
    "rice-healthy": {
      chemicals: [],
      maxDosePerLitre: "None warranted for healthy canopy",
      phiDays: 0
    }
  },
  chilli: {
    "leaf-curl": {
      chemicals: ["diafenthiuron 50% wp", "spirotetramat 15.31% od"],
      maxDosePerLitre: "1.2 g (Diafenthiuron) or 1.0 ml (Spirotetramat) for whitefly vector",
      phiDays: 15
    },
    "thrips": {
      chemicals: ["fipronil 5% sc", "spinetoram 11.7% sc", "acetamiprid 20% sp"],
      maxDosePerLitre: "1.5 ml (Fipronil) or 0.9 ml (Spinetoram)",
      phiDays: 15
    },
    "mites": {
      chemicals: ["fenpyroximate 5% ec", "spiromesifen 22.9% sc", "wettable sulfur 80% wp"],
      maxDosePerLitre: "1.0 ml (Fenpyroximate) or 3.0 g (Sulfur)",
      phiDays: 10
    },
    "powdery-mildew": {
      chemicals: ["wettable sulfur 80% wp", "dinocap 48% ec", "hexaconazole 5% ec"],
      maxDosePerLitre: "3.0 g (Sulfur) or 1.0 ml (Hexaconazole)",
      phiDays: 15
    },
    "cercospora-leaf-spot": {
      chemicals: ["mancozeb 75% wp", "carbendazim 50% wp", "copper oxychloride 50% wp"],
      maxDosePerLitre: "2.0 g (Mancozeb) or 1.0 g (Carbendazim)",
      phiDays: 15
    },
    "anthracnose": {
      chemicals: ["azoxystrobin 23% sc", "difenoconazole 25% ec", "copper oxychloride 50% wp"],
      maxDosePerLitre: "1.0 ml (Azoxystrobin) or 0.5 ml (Difenoconazole)",
      phiDays: 15
    },
    "chilli-healthy": {
      chemicals: [],
      maxDosePerLitre: "None warranted for healthy canopy",
      phiDays: 0
    }
  }
};

export class AgriculturalSafetyValidator {
  /**
   * Validates incoming farmer query before routing to LLM or search.
   */
  public static validateUserQuery(query: string, lang: string = "en"): SafetyCheckResult {
    const trimmed = query.trim();
    const violations: string[] = [];

    for (const pattern of HAZARDOUS_QUERY_PATTERNS) {
      if (pattern.test(trimmed)) {
        violations.push(`Triggered hazardous agricultural query guard: ${pattern.toString()}`);
        return {
          isSafe: false,
          refusalMessage: STATUTORY_SAFETY_REFUSALS[lang] || STATUTORY_SAFETY_REFUSALS["en"],
          violations
        };
      }
    }

    return { isSafe: true, violations: [] };
  }

  /**
   * Deterministic validation of AI-generated responses before user presentation.
   * Strips hallucinated dosages, validates active ingredients against crop registry,
   * and blocks chemical spraying on healthy or uncertain diagnoses.
   */
  public static validateGeneratedResponse(
    response: string,
    crop: CropKey,
    problemSlug?: string,
    confidence: number = 0.90,
    lang: string = "en"
  ): SafetyCheckResult {
    const violations: string[] = [];
    let sanitized = response;

    // Rule 1: No chemical spray recommendations if crop is confirmed healthy
    if (problemSlug === "rice-healthy" || problemSlug === "chilli-healthy" || problemSlug === "healthy") {
      const sprayMention = /\b(?:spray|apply|chemical|fungicide|pesticide|insecticide|mancozeb|tricyclazole|propiconazole)\b/i.test(sanitized);
      if (sprayMention) {
        violations.push("Chemical treatment recommended for a healthy canopy");
        const replacement = lang === "te"
          ? "✅ మీ పంట ఆకులు ఆరోగ్యంగా ఉన్నాయి. ఎటువంటి రసాయన పిచికారీ అవసరం లేదు. కేవలం సాధారణ నీటి మరియు సమతుల్య ఎరువుల యాజమాన్యం సరిపోతుంది."
          : lang === "hi"
          ? "✅ आपकी फसल हरी-भरी और स्वस्थ है। किसी भी रासायनिक छिड़काव की कोई आवश्यकता नहीं है। केवल संतुलित खाद व पानी का ध्यान रखें।"
          : "✅ Your crop canopy is healthy! No chemical spraying is warranted. Maintain normal irrigation and balanced fertilizer management.";
        return { isSafe: true, violations, sanitizedResponse: replacement };
      }
    }

    // Rule 2: If model confidence is low / uncertain (< 0.40), chemical spraying must NOT be recommended
    if (confidence < 0.40) {
      const chemicalAdvocacy = /\b(?:spray|apply)\s+[a-z0-9\-]+\s+(?:ec|wp|sc|sl|wg|sp)\b/i.test(sanitized);
      if (chemicalAdvocacy) {
        violations.push("Chemical spray recommended on an uncertain / low-confidence diagnosis");
        sanitized += (
          lang === "te"
            ? "\n\n⚠️ *గమనిక: ఈ గుర్తింపు తక్కువ ఖచ్చితత్వంతో ఉంది. రసాయన మందులు పిచికారీ చేయడానికి ముందు స్పష్టమైన ఫోటోను మళ్లీ తీయండి లేదా స్థానిక వ్యవసాయ అధికారిచే నిర్ధారించుకోండి.*"
            : lang === "hi"
            ? "\n\n⚠️ *सूचना: रोग की पहचान निश्चित नहीं है। रासायनिक छिड़काव से पहले साफ फोटो लें अथवा कृषि अधिकारी से जांच कराएं।* "
            : "\n\n⚠️ *Caution: Diagnosis confidence is low. Do NOT spray synthetic chemicals without confirming the symptoms with a local agricultural officer or re-scanning.*"
        );
      }
    }

    // Rule 3: Detect unverified chemical dosages or arbitrary numbers with units (e.g. 50 ml/L or 15 kg/L)
    const dangerousDoseRegex = /\b(\d+(?:\.\d+)?)\s*(?:ml|g|gm|kg)\s*(?:\/|per)\s*(?:l|litre|liter)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = dangerousDoseRegex.exec(sanitized)) !== null) {
      const val = parseFloat(match[1]);
      // Any concentration above 5 ml/L or 5 g/L is almost universally phytotoxic in foliar sprays
      if (val > 5.0) {
        violations.push(`Unverified / excessive chemical concentration detected: ${match[0]}`);
        sanitized = sanitized.replace(match[0], "[adhere strictly to product container label]");
      }
    }

    // Rule 4: Verify that mentioned chemicals match approved registry for this exact crop
    const allowedForCrop = APPROVE_REGISTRY_SET(crop);
    const genericChemicalPattern = /\b([a-z]{4,20}(?:azole|phosphos|mectin|thrin|sulfur|prid|nocarb|amiprid|cloprid|strobin))\b/gi;
    while ((match = genericChemicalPattern.exec(sanitized)) !== null) {
      const chem = match[1].toLowerCase();
      // Allow general biological agents like pseudomonas / trichoderma / bacillus
      if (["pseudomonas", "trichoderma", "bacillus", "beauveria"].includes(chem)) continue;
      if (!allowedForCrop.has(chem)) {
        violations.push(`Chemical active ingredient '${chem}' is not verified / registered for ${crop}`);
      }
    }

    return {
      isSafe: violations.length === 0,
      violations,
      sanitizedResponse: sanitized
    };
  }
}

function APPROVE_REGISTRY_SET(crop: CropKey): Set<string> {
  const set = new Set<string>();
  const cropData = APPROVED_REGISTRY[crop] || {};
  for (const info of Object.values(cropData)) {
    for (const c of info.chemicals) {
      const tokens = c.toLowerCase().split(/\s+/);
      tokens.forEach(t => set.add(t));
    }
  }
  // Universal safe ingredients
  set.add("sulfur");
  set.add("copper");
  set.add("streptocycline");
  set.add("neem");
  return set;
}
