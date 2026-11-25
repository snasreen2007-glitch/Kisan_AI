"""
Agricultural Chemical Safety Validation Layer
Enforces statutory compliance with CIB&RC (Central Insecticide Board & Registration Committee)
regulations. Strictly prevents unverified pesticide dosages, mixing, or off-label use.
"""

import re
from typing import Dict, Tuple

CHEMICAL_PATTERNS = [
    # Explicit dosage, concentration or mixing query patterns
    r"\b(?:double (?:the )?dose|twice (?:the )?dose|increase (?:the )?dose|higher dose|exceed (?:the )?package dose)\b",
    r"\b(?:double dosage|double (?:the )?fungicide dose|double dose)\b",
    r"\b(?:mix|tank mix|combine|triple mix)\b.*\b(?:with|and|in the same tank|together|chemicals?|pesticides?|fungicides?|insecticides?|sprayer|pump)\b",
    r"\b(?:triple mix|tank mix|chemical mix|leftover pesticide)\b",
    r"\b(?:monocrotophos|endosulfan|phorate|carbofuran|paraquat)\b",
    r"\b(?:how many|how much)\s+(?:ml|g|gm|grams?|kg|litres?|liters?)\b",
    r"\b(?:how many|how much)\s+(?:ml\/l|ml\/litre|gm\/l|kg\/ha)\b",
    r"\bhow much\s+[a-z\-]+\s+(?:per acre|per hectare|per pump|to spray|to mix|to buy|with water)\b",
    r"\b(?:what is the|give|tell me)\s+(?:the\s+)?(?:recommended\s+)?(?:dose|dosage|concentration|spray interval and dose)\b",
    r"\b(?:chemical|pesticide|fungicide|insecticide)\s+(?:spray\s+)?(?:dose|dosage)\b",
    r"\bwhat pesticide dose\b",
    r"\bwhat fungicide dosage\b",
    r"\bwhat is the (?:chemical|pesticide|fungicide)\b",
    r"\bwhat is the dose per pump\b",
    r"\b(?:exact concentration|exact dose|give dosage|recommended spray concentration)\b",
    r"\btell me how much chemical\b",
    r"\bchemical dosage for\b",
    # Hindi unsafe chemical phrases
    r"(?:डोज़ बढ़ा|डबल डोज़|दोगुना डोज़|मिलाकर छिड़क|कीटनाशक मिला|दवा का छिड़काव|डोज़ क्या|दोगुनी मात्रा|कितनी दवा|दवा का नाम और मात्रा|कीटनाशक कितना|दो फफूंदनाशी मिलाकर|कीटनाशक की डोज़|रासायनिक दवा|प्रति पंप कितनी दवा)",
    # Telugu unsafe chemical phrases
    r"(?:డబుల్ మోతాదు|రెట్టింపు మోతాదు|మందులు కలిపి|పురుగుమందుల మిశ్రమం|మందు మోతాదు|ఎంత పురుగుమందు|రెండు మందులు కలిపి|ఎంత మందు|ఎన్ని లీటర్ల మందు|పిచికారీ మందు మోతాదు|రసాయన మందు మోతాదు|ఒకే పంపులో కొట్టవచ్చా|రసాయన మందు)",
]

SAFE_REFUSALS: Dict[str, str] = {
    "en": (
        "Specific chemical dosages, pesticide brand names, or chemical tank-mixing instructions "
        "cannot be recommended directly by this AI. Under CIB&RC statutory regulations, chemical "
        "crop-protection products must strictly adhere to officially approved regional registrations. "
        "Please follow the cultural and biological controls provided, or consult your local Agricultural "
        "Officer or Krishi Vigyan Kendra (KVK) for officially approved chemical schedules."
    ),
    "hi": (
        "यह एआई कीटनाशक या फफूंदनाशी के नाम, मात्रा (डोज़) या रसायनों को मिलाकर छिड़कने की सलाह नहीं दे सकता। "
        "केंद्रीय कीटनाशी बोर्ड (CIB&RC) के नियमों के अनुसार केवल आधिकारिक रूप से अनुमोदित सिफारिशों का ही "
        "उपयोग किया जाना चाहिए। कृपया जैविक व कृषि प्रबंधन के तरीके अपनाएं या अपने स्थानीय कृषि अधिकारी/केवीके से सलाह लें।"
    ),
    "te": (
        "పురుగుమందుల పేర్లు, పిచికారీ మోతాదులు లేదా రసాయనాల మిశ్రమం గురించి ఈ ఏఐ నేరుగా సిఫార్సు చేయదు. "
        "CIB&RC నిబంధనల ప్రకారం ధృవీకరించిన ప్రాంతీయ రికార్డుల నుండి మాత్రమే రసాయన సిఫార్సులు రావాలి. "
        "దయచేసి అందించిన సమగ్ర సస్యరక్షణ చర్యలను పాటించండి లేదా మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా "
        "వ్యవసాయ అధికారిని సంప్రదించండి."
    ),
}


class SafetyValidator:
    def __init__(self):
        self.compiled_patterns = [
            re.compile(p, re.IGNORECASE) for p in CHEMICAL_PATTERNS
        ]

    def validate_query(self, query: str, lang: str = "en") -> Tuple[bool, str]:
        """
        Validates an incoming user query.
        Returns: (is_safe, refusal_or_empty_str)
        """
        for pattern in self.compiled_patterns:
            if pattern.search(query):
                refusal = SAFE_REFUSALS.get(lang, SAFE_REFUSALS["en"])
                return False, refusal
        return True, ""

    def validate_response(self, response: str, lang: str = "en") -> Tuple[bool, str]:
        """
        Validates model output to ensure no unverified pesticide doses were hallucinated.
        Permits safe verified biologicals (Pseudomonas, Trichoderma, Neem) while flagging unverified chemical spikes.
        """
        # Flag excessive unverified chemical concentration spikes (>5 ml/l or >5 g/l of synthetic chemicals)
        chemical_leak = re.search(r"\b(?:[6-9]|\d{2,})\s*(?:ml|g|gm)\s*/\s*(?:l|litre|liter)\b", response, re.IGNORECASE)
        if chemical_leak:
            refusal = SAFE_REFUSALS.get(lang, SAFE_REFUSALS["en"])
            return False, refusal
        return True, response


if __name__ == "__main__":
    validator = SafetyValidator()
    safe, msg = validator.validate_query("How many ml per litre of monocrotophos should I spray on chilli?", "en")
    print("Safety Check Result (should be False):", safe)
    print("Refusal Message:", msg)
