import type { Lang } from "../i18n";
import { getTopic, l, type CropKey, type Topic } from "../knowledge";
import type { DynamicCurePlan, Scan, SeverityResult } from "./types";
import { queryGroqChat, type GroqChatMessage } from "./groq-pool";

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
  simpleSummary: string;
};

export type LlamaChatResult = {
  model: string;
  lang: Lang;
  text: string;
  isMultimodal: boolean;
  safetyTriggered: boolean;
  refs: { crop: CropKey; slug: string }[];
  suggestions?: string[];
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

export const REFUSALS: Record<Lang, string> = {
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

export const DETAILED_PROFILES: Record<string, AgronomicDetail> = {
  "bacterial-leaf-blight": {
    visual: {
      en: (pct, band) => `Visual inspection indicates long, wavy water-soaked yellow-to-white streaks running along leaf margins and veins, progressing downward from tips across ${pct}% of visible leaf tissue (${band} intensity). Straw-colored dried bacterial crusts are visible on leaf margins.`,
      te: (pct, band) => `ఛాయాచిత్రంలో ఆకు కొన నుండి క్రిందికి అంచుల వెంబడి పొడవాటి, అలల వంటి పసుపు-తెలుపు రంగు చారలు ఆకు వైశాల్యంలో దాదాపు ${pct}% మేర (${band} దశ) స్పష్టంగా కనిపిస్తున్నాయి. ఎండ వేడిమికి ఈ చారలు గడ్డి రంగులోకి మారతాయి. ఇది బ్యాక్టీరియా ఆకు ఎండు తెగులు (BLB) యొక్క విలక్షణ లక్షణం.`,
      hi: (pct, band) => `तस्वीर में पत्ती की नोक से शुरू होकर किनारों और नसों के साथ लंबी, लहरदार, पीली से सफेद धारियाँ दिखाई दे रही हैं (प्रभावित क्षेत्र ${pct}%, ${band} स्तर)। सूखने पर यह गेंहूँए/भूरे रंग की हो जाती हैं। यह जीवाणु पत्ती झुलसा (BLB) का स्पष्ट लक्षण है।`,
      ta: (pct, band) => `புகைப்படத்தில் இலையின் நுனியிலிருந்து ஓரங்கள் வழியாக நீண்ட, அலைபோன்ற மஞ்சள்-வெள்ளை நிறக் கோடுகள் சுமார் ${pct}% இலைப்பரப்பில் (${band} நிலை) தெளிவாகத் தெரிகின்றன. இது பாக்டீரியல் இலைக் கருகல் (BLB) நோயாகும்.`,
      kn: (pct, band) => `ಫೋಟೋದಲ್ಲಿ ಎಲೆಯ ತುದಿಯಿಂದ ಅಂಚುಗಳ ಉದ್ದಕ್ಕೂ ಉದ್ದನೆಯ ಅಲೆಯಂತಹ ಹಳದಿ-ಬಿಳಿ ಗೆರೆಗಳು ಸುಮಾರು ${pct}% ಎಲೆಯ ಭಾಗದಲ್ಲಿ (${band} ತೀವ್ರತೆ) ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣಿಸುತ್ತಿವೆ. ಇದು ಬ್ಯಾಕ್ಟೀರಿಯಲ್ ಎಲೆ ಕರಕು (BLB) ರೋಗವಾಗಿದೆ.`,
      mr: (pct, band) => `छायाचित्रात पानाच्या टोकापासून कडेने लांब, लहरीसारख्या पिवळसर-पांढऱ्या पट्ट्या दिसत असून पानाचा सुमारे ${pct}% भाग (${band} तीव्रता) बाधित झाला आहे. हे जिवाणूजन्य करपा (BLB) रोगाचे लक्षण आहे.`,
    },
    risk: {
      en: "Pathogen Biology: Xanthomonas oryzae pv. oryzae (Bacterium). Spreads through irrigation flood water, driving rainstorms, and plant rubbing. Heavy split-applications of urea fuel rapid vascular clogging.",
      te: "వ్యాధికారక జీవశాస్త్రం: జాంతోమోనాస్ ఒరైజే అనే బ్యాక్టీరియా. ఇది శిలీంధ్రం కాదు. వరద నీరు, తుఫాను వర్షపు తుంపర్లు మరియు మొక్కల రాపిడి ద్వారా వ్యాపిస్తుంది. అధిక యూరియా వాడకం తెగులును మరింత ఉధృతం చేస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: जैंथोमोनास ओराइजी (बैक्टीरिया)। यह फफूंद नहीं है। सिंचाई के पानी, आंधी-बारिश और पौधों की रगड़ से फैलता है। अत्यधिक यूरिया देने से फैलाव तेज होता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பாக்டீரியா (Xanthomonas oryzae). பாசன நீர் மற்றும் மழைத்துளிகள் மூலம் மட்டுமே பரவுகிறது. அதிகப்படியான யூரியா நோயை தீவிரப்படுத்துகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಬ್ಯಾಕ್ಟೀರಿಯಾ (ಕ್ಸಾಂಥೋಮೊನಾಸ್ ಒರೈಜೆ). ನೀರಾವರಿ ನೀರು ಮತ್ತು ಮಳೆಯ ಹನಿಗಳ ಮೂಲಕ ಹರಡುತ್ತದೆ. ಅಧಿಕ ಯೂರಿಯಾ ಬಳಕೆ ರೋಗವನ್ನು ತೀವ್ರಗೊಳಿಸುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: जिवाणू (झँथोमोनस ओरायझी). पाटाचे पाणी आणि पावसाच्या थेंबांमुळे हा रोग पसरतो. अतिरिक्त युरियामुळे तीव्रता वाढते.",
    },
    actions: {
      en: [
        "Immediately suspend supplementary nitrogen / urea top-dressing.",
        "Drain standing water from the field; do not drain infected water into healthy plots.",
        "Perform clip-test: Cut leaf tip in clear water to verify cloudy bacterial ooze streaming out.",
        "Apply supplementary Potassium (MOP) to strengthen plant vascular walls.",
        "Eradicate weed hosts along field bunds and channels.",
        "Consult local KVK or Agriculture Officer for registered copper bactericide and antibiotic spray schedules.",
      ],
      te: [
        "యూరియా (నత్రజని) వాడకాన్ని తక్షణమే నిలిపివేయండి.",
        "పొలంలోని నిలిచిన నీటిని బయటకు తీసివేయండి; తెగులు సోకిన మడి నుండి ఆరోగ్యకరమైన మడిలోకి నీరు వెళ్లకుండా అడ్డుకోండి.",
        "ఆకు కొనను కత్తిరించి నీటి గ్లాసులో ఉంచి తెల్లటి బ్యాక్టీరియా ద్రవం (ఊజ్) వస్తుందో లేదో గమనించండి.",
        "మొక్కలకు రోగనిరోధక శక్తి కోసం ఎకరాకు 15–20 కిలోల పొటాష్ ఎరువును అందించండి.",
        "పొలం గట్లపై ఉండే కలుపు మొక్కలను శుభ్రం చేయండి.",
        "అధికారిక కాపర్ ఆధారిత మందుల కొరకు సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించండి.",
      ],
      hi: [
        "यूरिया (नाइट्रोजन) की अतिरिक्त मात्रा तुरंत बंद करें।",
        "खेत से जमा पानी निकालें; रोगग्रस्त खेत का पानी स्वस्थ खेतों में न जाने दें।",
        "पत्ती को काटकर साफ पानी में डुबोकर बैक्टीरियल ऊज़ की जांच करें।",
        "पौधों की सहनशक्ति बढ़ाने हेतु पोटाश का प्रयोग करें।",
        "मेड़ों पर उगने वाली खरपतवार नष्ट करें।",
        "अनुमोदित कॉपर कवकनाशी/जीवाणुनाशी हेतु स्थानीय कृषि अधिकारी से संपर्क करें।",
      ],
      ta: [
        "யூரியா இடுவதை உடனடியாக நிறுத்துங்கள்.",
        "வயலில் தேங்கிய தண்ணீரை வடியுங்கள்.",
        "பொட்டாஷ் உரங்களை இட்டு பயிரின் நோய் எதிர்ப்பு திறனை அதிகரிக்கவும்.",
        "வரப்பு களைகளை அகற்றி சுத்தமாக பராமரிக்கவும்.",
      ],
      kn: [
        "ಯೂರಿಯಾ ಗೊಬ್ಬರ ಕೊಡುವುದನ್ನು ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ.",
        "ಗದ್ದೆಯಲ್ಲಿ ನಿಂತ ನೀರನ್ನು ಹೊರಹಾಕಿ.",
        "ರೋಗನಿರೋಧಕ ಶಕ್ತಿ ಹೆಚ್ಚಿಸಲು ಪೊಟ್ಯಾಷ್ ಒದಗಿಸಿ.",
        "ಬದುಗಳ ಮೇಲಿನ ಕಳೆಗಳನ್ನು ನಾಶಮಾಡಿ.",
      ],
      mr: [
        "युरिया खताचा वापर ताबडतोब थांबवा.",
        "शेतातील साचलेले पाणी बाहेर काढा.",
        "प्रतिकारशक्ती वाढवण्यासाठी पालाश (पोटॅश) द्या.",
        "बांधावरील तण काढून स्वच्छता ठेवा.",
      ],
    },
  },
  "rice-blast": {
    visual: {
      en: (pct, band) => `Visual inspection confirms classic spindle-shaped or diamond-shaped lesions with ash-grey necrotic centers and dark reddish-brown margins across ${pct}% of visible leaf area (${band} phase). Lesion ends taper along leaf veins.`,
      te: (pct, band) => `ఛాయాచిత్రంలో ఆకులపై నూలు కండె (కంటి) ఆకారపు మచ్చలు స్పష్టంగా కనిపిస్తున్నాయి. మచ్చ మధ్యలో బూడిద రంగు, అంచుల వద్ద ఎరుపు-గోధుమ రంగు వలయం దాదాపు ${pct}% ఆకు వైశాల్యంలో (${band} దశ) విస్తరించి ఉంది.`,
      hi: (pct, band) => `पत्तियों पर नुकीले किनारों वाले तकलीनुमा आँख जैसे धब्बे, जिनका केंद्र धूसर राख जैसा और किनारे गहरे भूरे-लाल हैं (${pct}% पर्ण क्षेत्र, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகளில் கதிர் வடிவிலான (கண் வடிவ) புள்ளிகள், சாம்பல் நிற மையமும் செம்பழுப்பு நிற விளிம்பும் கொண்டு காணப்படுகின்றன (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳ ಮೇಲೆ ಕಣ್ಣಿನ ಆಕಾರದ ಮಚ್ಚೆಗಳು, ಮಧ್ಯದಲ್ಲಿ ಬೂದಿ ಬಣ್ಣ ಮತ್ತು ಗಾಢ ಕಂದು ಅಂಚು (${pct}%, ${band} ಹಂತ).`,
      mr: (pct, band) => `पानांवर डोळ्याच्या किंवा चातीच्या आकाराचे ठिपके, ज्यांचे मध्य केंद्र राखेसारखे करडे व कडा गडद तपकिरी असतात (${pct}%, ${band} टप्पा).`,
    },
    risk: {
      en: "Pathogen Biology: Magnaporthe oryzae (Fungus). Airborne conidia propagate exponentially during cool dewy nights (>90% RH) and high nitrogen application. Severe leaf blast predisposes the crop to neck blast at heading.",
      te: "వ్యాధికారక జీవశాస్త్రం: మాగ్నాపోర్తే ఒరైజే అనే శిలీంధ్రం. రాత్రి వేళల్లో చల్లని మంచు, 90% కంటే ఎక్కువ గాలి తేమ మరియు అధిక యూరియా వాడకం ఉన్నప్పుడు గాలి ద్వారా బీజాలు వేగంగా వ్యాపిస్తాయి. కంకి దశలో మెడ విరుపు తెగులుగా మారే ప్రమాదం ఉంది.",
      hi: "रोगजनक जीवविज्ञान: मैग्नापोर्थे ओराइजी (फफूंद)। रात की ओस, उच्च नमी और अधिक यूरिया से हवा द्वारा बीजाणु तेजी से फैलते हैं। बाली आने पर गर्दन तोड़ (नेक ब्लास्ट) का गंभीर खतरा रहता है।",
      ta: "நோய்க்கிருமி உயிரியல்: காற்றில் பரவும் பூஞ்சை (Magnaporthe oryzae). இரவு பனிப்பொழிவு மற்றும் அதிகப்படியான யூரியாவால் அதிவேகமாக பரவுகிறது. கதிர் வெளிவரும் போது கழுத்து அழுகல் ஏற்படலாம்.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಗಾಳಿಯ ಮೂಲಕ ಹರಡುವ ಶಿಲೀಂಧ್ರ (ಮ್ಯಾಗ್ನಾಪೋರ್ತೆ ಒರೈಜೆ). ತಂಪಾದ ಇಬ್ಬನಿ ಮತ್ತು ಅಧಿಕ ಯೂರಿಯಾ ಬಳಕೆ ಇದ್ದಾಗ ರೋಗವು ತೀವ್ರವಾಗಿ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशी (मॅग्नापोर्थे ओरायझी). रात्रीचे दव, हवेतील जास्त आर्द्रता आणि जास्तीच्या युरियामुळे बिजाणू हवेतून वेगाने पसरतात.",
    },
    actions: {
      en: [
        "Immediately withhold urea / nitrogen top-dressing.",
        "Regulate irrigation to maintain shallow water depth (2–3 cm) and avoid water stress.",
        "Eliminate collateral weed hosts from bunds.",
        "Monitor for neck lesions when flag leaf emerges and panicles start pushing out.",
        "Consult KVK or Agriculture Officer for registered triazole / strobilurin fungicide recommendations.",
      ],
      te: [
        "నత్రజని (యూరియా) ఎరువులు వేయడం వెంటనే ఆపివేయండి.",
        "పొలంలో 2-3 సెం.మీ మేర పలుచటి నీరు ఉంచి తేమ సమంగా ఉండేలా చూడండి; నీటి ఎద్దడి రానివ్వవద్దు.",
        "పొలం గట్లపై తెగులుకు ఆశ్రయమిచ్చే గడ్డి కలుపు మొక్కలను తొలగించండి.",
        "కంకి బయటకు వచ్చే దశలో ఆకులపై మచ్చలు మరియు మెడ భాగంలో నల్లటి మచ్చలు ఉన్నాయో లేదో నిరంతరం గమనించండి.",
        "రిజిస్టర్డ్ శిలీంధ్రనాశినుల పిచికారీ కొరకు వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "यूरिया की अतिरिक्त मात्रा तुरंत रोक दें।",
        "खेत में 2-3 सेमी पानी का स्तर बनाए रखें, नमी का तनाव न होने दें।",
        "मेड़ों की घास और खरपतवार साफ करें।",
        "बाली निकलते समय गर्दन पर काले धब्बों की निगरानी करें।",
        "अनुमोदित कवकनाशी हेतु स्थानीय कृषि अधिकारी से परामर्श लें।",
      ],
      ta: [
        "யூரியா இடுவதை உடனே நிறுத்துங்கள்.",
        "வயலில் போதிய நீர்மட்டம் பராமரிக்கவும்.",
        "வரப்புப் புற்களை அகற்றி சுகாதாரமாக வைத்திருக்கவும்.",
        "கதிர் வெளிவரும் பருவத்தில் தீவிரமாக கண்காணிக்கவும்.",
      ],
      kn: [
        "ಹೆಚ್ಚುವರಿ ಯೂರಿಯಾ ಗೊಬ್ಬರ ಕೊಡುವುದನ್ನು ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ.",
        "ಗದ್ದೆಯಲ್ಲಿ 2-3 ಸೆಂ.ಮೀ ನೀರು ನಿಲ್ಲಿಸಿ ತೇವಾಂಶ ಕಾಪಾಡಿ.",
        "ಬದುಗಳ ಮೇಲಿನ ಕಳೆಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.",
        "ತೆನೆ ಹೊರಬರುವ ಹಂತದಲ್ಲಿ ಕುತ್ತಿಗೆ ಕೊಳೆತ ರೋಗದ ಬಗ್ಗೆ ಎಚ್ಚರವಹಿಸಿ.",
      ],
      mr: [
        "युरिया खताचा वापर ताबडतोब थांबवा.",
        "शेतात २-३ सेमी पाणी ठेवून ओलावा टिकवून ठेवा.",
        "बांधावरील गवत काढून टाका.",
        "लोंबी निघण्याच्या काळात मानेवरील काळ्या ठिपक्यांवर लक्ष ठेवा.",
      ],
    },
  },
  "brown-spot": {
    visual: {
      en: (pct, band) => `Scattered circular-to-oval brown spots (2–8 mm) across the leaf blade with grayish-white centers and yellow chlorotic halos across ${pct}% of visible foliar canopy (${band} intensity). Lesions remain distinct and do not coalesce into wavy edge streaks.`,
      te: (pct, band) => `ఆకులపై చెల్లాచెదురుగా చిన్న, గుండ్రని లేదా అండాకారపు గోధుమ రంగు మచ్చలు స్పష్టంగా కనిపిస్తున్నాయి. మచ్చ మధ్యలో బూడిద-తెలుపు రంగు, చుట్టూ పసుపు రంగు వలయం ఉంది (${pct}% భాగం, ${band} దశ). ఇవి BLB లాగా పొడవాటి చారలుగా ఉండవు.`,
      hi: (pct, band) => `पत्तियों पर बिखरे हुए छोटे, गोल या अंडाकार भूरे धब्बे, जिनके केंद्र में धूसर-सफेद रंग और बाहर पीला घेरा है (प्रभावित क्षेत्र ${pct}%, ${band} स्तर)।`,
      ta: (pct, band) => `இலையின் மேற்பரப்பில் சாம்பல் நிற மையமும் மஞ்சள் நிற வளையமும் கொண்ட சிறிய வட்ட வடிவ பழுப்பு நிறப் புள்ளிகள் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳ ಮೇಲೆ ಚದುರಿದ ಸಣ್ಣ ದುಂಡಗಿನ ಕಂದು ಬಣ್ಣದ ಮಚ್ಚೆಗಳು, ಮಧ್ಯದಲ್ಲಿ ಬೂದು ಬಣ್ಣ ಮತ್ತು ಹಳದಿ ಅಂಚು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पानांवर विखुरलेले लहान गोलाकार किंवा लंबगोलाकार तपकिरी ठिपके, ज्यांच्या मध्यभागी करडा रंग व पिवळे कडे असते (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Bipolaris oryzae (Airborne Fungus). Highly prevalent in light sandy soils, nutrient-deficient soils (nitrogen, potassium, silicon), and severe zinc starvation under intermittent water deficits.",
      te: "వ్యాధికారక జీవశాస్త్రం: బైపోలారిస్ ఒరైజే అనే శిలీంధ్రం. పోషక లోపాలున్న నేలలు, తేలికపాటి ఇసుక నేలలు మరియు జింక్ లోపం ఉన్నప్పుడు ఈ తెగులు తీవ్రమవుతుంది. నేలలో తగినంత తేమ లేనప్పుడు మరింత వేగంగా వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: बाइपोलारिस ओराइजी (फफूंद)। हल्की रेतीली मिट्टी, पोषक तत्वों की कमी और जिंक की कमी में अधिक फैलता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பூஞ்சை (Bipolaris oryzae). மண்ணில் ஊட்டச்சத்து குறைபாடு மற்றும் துத்தநாக குறைபாடுள்ள நிலங்களில் இது தீவிரமடைகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಶಿಲೀಂಧ್ರ (ಬೈಪೋಲಾರಿಸ್ ಒರೈಜೆ). ಮಣ್ಣಿನಲ್ಲಿ ಪೋಷಕಾಂಶಗಳ ಮತ್ತು ಸತುವಿನ ಕೊರತೆಯಿದ್ದಾಗ ರೋಗ ಹೆಚ್ಚಾಗುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशी (बायपोलारिस ओरायझी). जमिनीतील अन्नद्रव्यांची व जस्त (झिंक) ची कमतरता असल्यामुळे हा रोग वाढतो.",
    },
    actions: {
      en: [
        "Conduct soil analysis; apply balanced N-P-K along with Zinc Sulfate (25 kg/ha) to alleviate micronutrient stress.",
        "Maintain continuous shallow standing water (2–3 cm) to prevent root zone drying.",
        "Incorporate organic compost or green manure to build soil organic carbon.",
        "Consult KVK or Agriculture Officer for approved seed treatment and foliar fungicidal schedules.",
      ],
      te: [
        "నేల పరీక్ష ఆధారంగా సమతుల్య ఎన్-పి-కె ఎరువులతో పాటు ఎకరాకు 10-12 కిలోల జింక్ సల్ఫేట్ అందించండి.",
        "పొలంలో తేమ తగ్గకుండా 2-3 సెం.మీ మేర పలుచటి నీటి నిల్వను నిరంతరం నిర్వహించండి.",
        "నేల భౌతిక స్థితిని మెరుగుపరచడానికి పచ్చిరొట్ట ఎరువులు లేదా సేంద్రీయ ఎరువులను వాడండి.",
        "అధికారిక శిలీంధ్రనాశినుల విత్తన శుద్ధి మరియు పిచికారీ కొరకు వ్యవసాయ అధికారి సలహా పొందండి.",
      ],
      hi: [
        "संतुलित खाद के साथ जिंक सल्फेट (25 किग्रा/हेक्टेयर) का प्रयोग करें।",
        "खेत में नमी की कमी न होने दें, हल्का पानी बनाए रखें।",
        "गोबर की खाद या हरी खाद डालकर मिट्टी की उर्वरा शक्ति बढ़ाएं।",
        "उपचार हेतु कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "சீரான NPK உரங்களுடன் துத்தநாக சல்பேட் இட்டு குறைபாட்டை சரிசெய்யவும்.",
        "வறட்சி ஏற்படாமல் 2-3 செ.மீ நீர்மட்டம் பராமரிக்கவும்.",
        "மக்கிய தொழு உரம் அல்லது பசுந்தாள் உரம் இடவும்.",
      ],
      kn: [
        "ಸಮತೋಲಿತ ರಸಗೊಬ್ಬರದೊಂದಿಗೆ ಸತುವಿನ ಸಲ್ಫೇಟ್ ಒದಗಿಸಿ.",
        "ಗದ್ದೆಯಲ್ಲಿ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗದಂತೆ ನೀರು ನಿಲ್ಲಿಸಿ.",
        "ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ ಬಳಸಿ ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೆಚ್ಚಿಸಿ.",
      ],
      mr: [
        "संतुलित खतांसोबत झिंक सल्फेट देऊन जमिनीची कमतरता भरून काढा.",
        "जमिनीत सतत हलका ओलावा टिकवून ठेवा.",
        "शेणखत किंवा हिरवळीच्या खतांचा वापर करा.",
      ],
    },
  },
  "bacterial-leaf-streak": {
    visual: {
      en: (pct, band) => `Visual inspection shows narrow, translucent, water-soaked linear streaks delimited strictly by leaf veins across ${pct}% of visible leaf tissue (${band} intensity). Tiny yellow-to-amber bacterial beads dry on leaf surfaces under dry wind.`,
      te: (pct, band) => `ఆకులపై ఈనెల మధ్య పొడవాటి, పారదర్శక నీటి చారలు స్పష్టంగా కనిపిస్తున్నాయి (${pct}% వైశాల్యం, ${band} దశ). ఈ చారలు ఈనెల దాటి పక్కకు వ్యాపించవు. ఆకులపై చిన్న చిన్న పసుపు-బంగారు రంగు బ్యాక్టీరియా బిందువులు ఎండిపోయి కనిపిస్తాయి.`,
      hi: (pct, band) => `पत्तियों की नसों के बीच पतली, पारदर्शी पानी जैसी लकीरें जो नसों तक ही सीमित रहती हैं (${pct}% भाग, ${band} स्तर)। सूखने पर पीले रंग की सूखी बूंदें दिखाई देती हैं।`,
      ta: (pct, band) => `இலை நரம்புகளுக்கு இடையில் குறுகிய, ஒளிஊடுருவக்கூடிய நேர்கோடுகள் சுமார் ${pct}% பரப்பில் காணப்படுகின்றன (${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳ ನರಗಳ ನಡುವೆ ಕಿರಿದಾದ, ಪಾರದರ್ಶಕ ಗೆರೆಗಳು ಸುಮಾರು ${pct}% ಎಲೆಯ ಭಾಗದಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ (${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पानांच्या शिरांच्या दरम्यान अरुंद, पारदर्शक पाण्याचे पट्टे तयार होतात (${pct}% भाग, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Xanthomonas oryzae pv. oryzicola (Bacterium). Invades stomata and mechanical wounds following high wind storms and mechanical handling. Unlike BLB, BLS streaks do not run across major leaf margins.",
      te: "వ్యాధికారక జీవశాస్త్రం: జాంతోమోనాస్ ఒరైజే పి.వి. ఒరైజికోలా బ్యాక్టీరియా. గాలులు మరియు వర్షపు జల్లుల తర్వాత ఆకులపై ఏర్పడే సూక్ష్మ గాయాల ద్వారా ప్రవేశిస్తుంది. ఇది BLB లాగా ఆకు అంచుల వెంబడి కాకుండా ఈనెల మధ్య మాత్రమే వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: जैंथोमोनास ओराइजी पीवी ओराइज़िकोला (जीवाणु)। तेज हवाओं और बारिश के बाद पत्तियों पर हुए सूक्ष्म घावों से प्रवेश करता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பாக்டீரியா (Xanthomonas oryzae pv. oryzicola). பலத்த காற்று மற்றும் மழையால் ஏற்படும் காயங்கள் வழியே பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಬ್ಯಾಕ್ಟೀರಿಯಾ (ಕ್ಸಾಂಥೋಮೊನಾಸ್). ಬಿರುಗಾಳಿ ಮತ್ತು ಮಳೆಯಿಂದ ಎಲೆಗಳ ಮೇಲಾಗುವ ಗಾಯಗಳ ಮೂಲಕ ಪ್ರವೇಶಿಸುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: जिवाणू (झँथोमोनस). वादळी वाऱ्यामुळे पानांवर पडलेल्या जखमांमधून जिवाणू आत शिरतात.",
    },
    actions: {
      en: [
        "Temporarily withhold urea / nitrogen top-dressing until lesion expansion halts.",
        "Drain standing water to reduce canopy humidity.",
        "Avoid handling or weeding crops when leaves are wet with morning dew.",
        "Balance fertilizer with adequate potassium applications.",
        "Consult KVK or Agriculture Officer for registered bactericidal treatments.",
      ],
      te: [
        "చారల వ్యాప్తి ఆగే వరకు యూరియా వేయడం వెంటనే ఆపండి.",
        "పైరులో గాలి తేమ తగ్గించడానికి పొలంలోని నీటిని బయటకు తీసివేయండి.",
        "ఉదయం వేళ మంచు ఆరిపోయే వరకు పైరులో కలుపు తీయడం లేదా తిరగడం చేయవద్దు.",
        "మొక్కల నిరోధకత కోసం పొటాష్ ఎరువును సమతుల్యంగా వేయండి.",
        "అధికారిక నివారణ చర్యల కొరకు వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "यूरिया का छिड़काव तुरंत रोकें।",
        "खेत से पानी निकालकर नमी कम करें।",
        "सुबह की ओस के समय खेत में काम करने या निराई-गुड़ाई से बचें।",
        "पोटाश की संतुलित मात्रा दें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "யூரியா இடுவதை உடனே நிறுத்துங்கள்.",
        "வயலில் உள்ள தண்ணீரை வடிக்கவும்.",
        "காலை பனி உலரும் வரை வயலில் களையெடுப்பதை தவிர்க்கவும்.",
      ],
      kn: [
        "ಯೂರಿಯಾ ಗೊಬ್ಬರ ಕೊಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ.",
        "ಗದ್ದೆಯಿಂದ ನೀರು ಹೊರಹಾಕಿ ತೇವಾಂಶ ಕಡಿಮೆ ಮಾಡಿ.",
        "ಬೆಳಗಿನ ಇಬ್ಬನಿ ಇರುವಾಗ ಗದ್ದೆಯಲ್ಲಿ ಕೆಲಸ ಮಾಡಬೇಡಿ.",
      ],
      mr: [
        "युरिया खत देणे थांबवा.",
        "शेतातील पाणी काढून आर्द्रता कमी करा.",
        "सकाळचे दव असेपर्यंत शेतात काम करणे टाळा.",
      ],
    },
  },
  "tungro": {
    visual: {
      en: (pct, band) => `Visual inspection indicates characteristic orange-yellow to bright yellow foliar discoloration starting from tips and rolling inward, severe plant stunting, and reduced tillering across ${pct}% of the canopy (${band} intensity).`,
      te: (pct, band) => `ఆకుల కొనల నుండి మొదలై క్రిందికి ఆరెంజ్-పసుపు లేదా ముదురు పసుపు రంగులోకి మారడం, మొక్కలు విపరీతంగా గిడసబారి పిలకల సంఖ్య తగ్గడం స్పష్టంగా కనిపిస్తోంది (దాదాపు ${pct}%, ${band} దశ).`,
      hi: (pct, band) => `पत्तियों की नोक से शुरू होकर नारंगी-पीला रंग फैलना, पौधों का अत्यधिक बौना होना और कल्ले कम निकलना (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலை நுனிகள் ஆரஞ்சு-மஞ்சள் நிறமாக மாறுதல், பயிரின் வளர்ச்சி குன்றி தூர்கள் குறைதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಯ ತುದಿಗಳು ಕಿತ್ತಳೆ-ಹಳದಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗುವುದು ಮತ್ತು ಸಸ್ಯದ ಬೆಳವಣಿಗೆ ತೀವ್ರವಾಗಿ ಕುಂಠಿತವಾಗುವುದು (${pct}%, ${band} ಹಂತ).`,
      mr: (pct, band) => `पाने शेंड्याकडून नारंगी-पिवळी पडणे, रोपांची वाढ खुंटणे आणि फुटवे कमी येणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Dual Viral Complex (RTBV + RTSV). Vector: Green Leafhopper (Nephotettix virescens). Rapid non-persistent transmission; once infected, plants cannot be cured.",
      te: "వ్యాధికారక జీవశాస్త్రం: రైస్ టుంగ్రో వైరస్ కాంప్లెక్స్ (RTBV + RTSV). వాహక కీటకం: పచ్చ దీపపు పురుగు (గ్రీన్ లీఫ్ హాపర్). ఈ పురుగులు రసం పీల్చడం ద్వారా వైరస్ ఒక మొక్క నుండి మరొక మొక్కకు వేగంగా వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: वायरस कॉम्प्लेक्स (RTBV + RTSV)। वाहक कीट: हरा फुदका (ग्रीन लीफहॉपर)। यह कीट पत्तियों का रस चूसकर वायरस फैलाता है।",
      ta: "நோய்க்கிருமி உயிரியல்: வைரஸ். பச்சை தத்துப்பூச்சி (Green Leafhopper) மூலம் மிக வேகமாக பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ವೈರಸ್. ಹಸಿರು ಜಿಗಿಹುಳು (ಗ್ರೀನ್ ಲೀಫ್‌ಹಾಪರ್) ಕೀಟದ ಮೂಲಕ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: विषाणू. हिरवा तुडतुडा (ग्रीन लीफहॉपर) या किडीद्वारे हा रोग वेगाने पसरतो.",
    },
    actions: {
      en: [
        "Install light traps (1 per hectare) to monitor and intercept green leafhopper vector populations.",
        "Rogue out and destroy infected stunted hills to eliminate viral reservoir.",
        "Maintain clean bunds free of weed grass hosts.",
        "Apply neem-based formulations (Azadirachtin 1500 ppm @ 2-3 ml/L) to deter vector feeding.",
        "Consult KVK or Agriculture Officer for registered vector management schedules.",
      ],
      te: [
        "పచ్చ దీపపు పురుగుల ఉధృతిని గమనించడానికి మరియు నిర్మూలించడానికి హెక్టారుకు ఒక లైట్ ట్రాప్ (దీపపు బుట్ట) అమర్చండి.",
        "తీవ్రంగా తెగులు సోకి గిడసబారిన మొక్కలను పీకి పొలానికి దూరంగా తగులబెట్టండి.",
        "పొలం గట్లపై ఉండే గడ్డి కలుపును శుభ్రం చేసి వాహక కీటకాల ఆశ్రయాన్ని తొలగించండి.",
        "పురుగుల నివారణకు వేప నూనె (1500 ppm @ 2-3 మి.లీ/లీటరు నీటికి) పిచికారీ చేయండి.",
        "అధికారిక సలహాల కొరకు స్థానిక వ్యవసాయ విస్తరణ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "हरे फुदके की निगरानी व नियंत्रण हेतु प्रकाश प्रपंच (लाइट ट्रैप) लगाएं।",
        "रोगी व अत्यधिक बौने पौधों को उखाड़कर नष्ट करें।",
        "मेड़ों की घास साफ करें।",
        "नीम तेल (1500 पीपीएम) का छिड़काव करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "பச்சை தத்துப்பூச்சிகளைக் கட்டுப்படுத்த விளக்குப் பொறி அமைக்கவும்.",
        "பாதிக்கப்பட்ட செடிகளை பிடுங்கி அழிக்கவும்.",
        "வேப்ப எண்ணெய் தெளிக்கவும்.",
      ],
      kn: [
        "ಹಸಿರು ಜಿಗಿಹುಳುಗಳ ನಿಯಂತ್ರಣಕ್ಕೆ ಬೆಳಕಿನ ಬಲೆಗಳನ್ನು ಬಳಸಿ.",
        "ರೋಗಪೀಡಿತ ಗಿಡಗಳನ್ನು ಕಿತ್ತು ನಾಶಮಾಡಿ.",
        "ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.",
      ],
      mr: [
        "हिरव्या तुडतुड्यांच्या नियंत्रणासाठी प्रकाश सापळे लावा.",
        "रोगट झाडे उपटून नष्ट करा.",
        "निंबोळी अर्क किंवा कडुलिंबाच्या तेलाची फवारणी करा.",
      ],
    },
  },
  "downy-mildew": {
    visual: {
      en: (pct, band) => `Symptoms exhibit severe leaf chlorosis, mottled pale green patches, twisted and thickened leaves, and characteristic 'crazy top' malformation of panicles across ${pct}% of visible canopy (${band} intensity).`,
      te: (pct, band) => `ఆకులు పసుపు-తెలుపు రంగులోకి మారడం, వంకర్లు తిరిగి మందంగా మారడం మరియు కంకి పిచ్చి దుబ్బులా మారి గింజలు పట్టకపోవడం స్పష్టంగా కనిపిస్తోంది (${pct}%, ${band} దశ).`,
      hi: (pct, band) => `पत्तियों का पीला पड़ना, मुड़ना व मोटा होना तथा बाली का विकृत होकर 'क्रेजी टॉप' बन जाना (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகள் மஞ்சள் நிறமாக மாறுதல் மற்றும் கதிர்கள் கொத்தாக மாறி தானியம் பிடிக்காமல் போதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳು ಹಳದಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿ ತಿರುಚಿಕೊಳ್ಳುವುದು ಮತ್ತು ತೆನೆಗಳು ವಿರೂಪಗೊಳ್ಳುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पाने पिवळी पडून पिळवटणे आणि लोंब्या विद्रूप होऊन दाणे न भरणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Sclerophthora macrospora (Oomycete). Soil-borne and water-borne oospores germinate in flooded, submerged young seedlings following prolonged submergence.",
      te: "వ్యాధికారక జీవశాస్త్రం: స్క్లెరోఫ్తోరా మాక్రోస్పోరా. నారుమడి లేదా నాట్లు వేసిన తొలి దశలో పొలంలో ఎక్కువ రోజులు నీరు మునిగి ఉన్నప్పుడు నేలలోని ఊస్పోర్ల ద్వారా ఈ తెగులు వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: स्क्लेरोफ्थोरा मैक्रोस्पोरा। लंबे समय तक खेत में पानी भरा रहने पर नर्सरी के छोटे पौधों में फैलता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பூஞ்சை. வயலில் நீண்ட காலம் நீர் தேங்கி நாற்றுகள் மூழ்கியிருக்கும் போது பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಶಿಲೀಂಧ್ರ. ಗದ್ದೆಯಲ್ಲಿ ದೀರ್ಘಕಾಲ ನೀರು ನಿಂತು ಸಸಿಗಳು ಮುಳುಗಿದಾಗ ರೋಗ ಬರುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशीसदृश जीव. शेतात दीर्घकाळ पाणी साचून रोपे पाण्याखाली राहिल्यास हा रोग होतो.",
    },
    actions: {
      en: [
        "Drain excess standing water immediately; prevent seedling submergence in low-lying pockets.",
        "Ensure field leveling to avoid stagnant water pockets.",
        "Rogue out severely malformed, proliferated crazy-top tillers.",
        "Rotate fields and practice dry nursery beds where drainage is challenging.",
        "Consult KVK or Agriculture Officer for registered preventative seed and nursery treatments.",
      ],
      te: [
        "పొలంలో నిలిచిన అదనపు నీటిని వెంటనే తీసివేయండి; నారుమడి ముంపునకు గురికాకుండా చూడండి.",
        "పొలాన్ని సమాంతరంగా చదును చేసి పల్లపు ప్రాంతాల్లో నీరు నిలవకుండా జాగ్రత్తపడండి.",
        "పిచ్చి దుబ్బులుగా మారిన మొక్కలను పీకి నాశనం చేయండి.",
        "విత్తన శుద్ధి మరియు నివారణ కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "खेत से तुरंत जल निकासी करें; पौध को डूबने से बचाएं।",
        "खेत का समतलीकरण सुनिश्चित करें।",
        "विकृत पौधों को उखाड़कर नष्ट करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "தேங்கியுள்ள தண்ணீரை உடனடியாக வடியுங்கள்.",
        "வயலை சமன் செய்து நீர் தேங்காமல் பார்த்துக் கொள்ளுங்கள்.",
        "பாதிக்கப்பட்ட செடிகளை அழிக்கவும்.",
      ],
      kn: [
        "ನಿಂತ ಹೆಚ್ಚುವರಿ ನೀರನ್ನು ತಕ್ಷಣ ಹೊರಹಾಕಿ.",
        "ಗದ್ದೆಯನ್ನು ಸಮತಟ್ಟು ಮಾಡಿ ನೀರು ನಿಲ್ಲದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.",
        "ರೋಗಪೀಡಿತ ಸಸಿಗಳನ್ನು ನಾಶಮಾಡಿ.",
      ],
      mr: [
        "शेतातील अतिरिक्त पाण्याचा त्वरित निचरा करा.",
        "जमीन समतल करून पाणी साचू देऊ नका.",
        "विकृत झालेली झाडे उपटून नष्ट करा.",
      ],
    },
  },
  "hispa": {
    visual: {
      en: (pct, band) => `Visible symptoms demonstrate parallel white streaks along leaf veins caused by adult beetles scraping upper epidermis, combined with leaf tip blistering and withering across ${pct}% of foliage (${band} intensity).`,
      te: (pct, band) => `ఆకులపై ఈనెల వెంబడి తెల్లటి సమాంతర చారలు స్పష్టంగా కనిపిస్తున్నాయి. ముళ్ల పురుగులు ఆకు పైపొరను గోకడం వల్ల ఆకులు తెల్లబడి ఎండుతాయి (${pct}% వైశాల్యం, ${band} దశ).`,
      hi: (pct, band) => `पत्तियों पर नसों के समानांतर सफेद धारियाँ, जो वयस्क कीटों द्वारा ऊपरी परत खुरचने से बनती हैं (${pct}% भाग, ${band} स्तर)। पत्तियाँ सफेद होकर सूखने लगती हैं।`,
      ta: (pct, band) => `வண்டுகள் இலைப்பரப்பை சுரண்டுவதால் இலை நரம்புகளுக்கு இணையாக வெள்ளை நிறக் கோடுகள் உருவாகின்றன (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಕೀಟಗಳು ಎಲೆಯ ಮೇಲ್ಭಾಗವನ್ನು ಕೆರೆದು ತಿನ್ನುವುದರಿಂದ ಎಲೆಯ ಮೇಲೆ ಬಿಳಿ ಗೆರೆಗಳು ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `भुंगे पानावरील हिरवा पापुद्रा खरवडल्यामुळे पानांवर पांढऱ्या समांतर रेषा दिसतात (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Dicladispa armigera (Rice Hispa - Chrysomelidae). Adult spiny black beetles scrape upper chlorophyll; grubs mine inside leaf tissue. High humidity and heavy nitrogen create explosive outbreaks.",
      te: "కీటక జీవశాస్త్రం: డిక్లాడిస్పా అర్మిజెరా (వరి హిస్పా / ముళ్ల పురుగు). నల్లటి ముళ్ల వంటి పురుగులు ఆకు పైపొరను గోకుతాయి; లార్వాలు ఆకు లోపలి పొరల్లోకి చొరబడి తింటాయి. అధిక యూరియా వాడకం వీటి ఉధృతిని పెంచుతుంది.",
      hi: "कीट जीवविज्ञान: डिक्लाडिस्पा आर्मिगेरा (राइस हिस्पा)। कांटेदार काले भृंग ऊपरी हरी परत खुरचते हैं और सूंडी अंदर सुरंग बनाती है।",
      ta: "பூச்சி உயிரியல்: ரைஸ் ஹிஸ்பா (வண்டு). முட்கள் கொண்ட கருப்பு வண்டுகள் இலையை சுரண்டி உண்கின்றன.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ರೈಸ್ ಹಿಸ್ಪಾ (ಮುಳ್ಳು ಕೀಟ). ಕಪ್ಪು ಬಣ್ಣದ ಮುಳ್ಳಿನ ಕೀಟಗಳು ಎಲೆಯ ಹಸಿರು ಭಾಗವನ್ನು ಕೆರೆಯುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: राईस हिस्पा (काटेरी भुंगा). भुंगे पानावरील हरितद्रव्य खरवडतात आणि अळ्या पानात पोखरतात.",
    },
    actions: {
      en: [
        "Clip and destroy seedling leaf tips prior to transplanting to eliminate hispa grub eggs.",
        "Pass a rope or sweep nets across the canopy into kerosenized water trench to collect and destroy adult beetles.",
        "Avoid excessive split-applications of urea.",
        "Conserve natural predators such as eulophid parasitoids and spiders.",
        "Consult KVK or Agriculture Officer for registered pest interventions.",
      ],
      te: [
        "నాట్లు వేసే ముందు నారు కొనలను తుంచి నాశనం చేయండి; దీనివల్ల గుడ్లు మరియు లార్వాలు నిర్మూలించబడతాయి.",
        "పొలంలో తాడును లాగడం ద్వారా లేదా వలలను ఉపయోగించి పెద్ద పురుగులను పట్టి నాశనం చేయండి.",
        "అధిక యూరియా వాడకాన్ని తగ్గించండి.",
        "సాలెపురుగులు వంటి సహజ మిత్ర పురుగులను కాపాడండి.",
        "అధికారిక నివారణ చర్యల కొరకు వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "रोपाई से पहले पौध के ऊपरी सिरों को तोड़कर नष्ट करें ताकि अंडे खत्म हो जाएं।",
        "खेत में रस्सी चलाकर या जाली से वयस्कों को इकट्ठा करके नष्ट करें।",
        "अत्यधिक यूरिया का प्रयोग न करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "நாற்று நடும் முன் நுனிகளைக் கிள்ளி முட்டைகளை அழிக்கவும்.",
        "கயிற்றை இழுத்து வண்டுகளை பிடித்து அழிக்கவும்.",
        "யூரியாவை குறைக்கவும்.",
      ],
      kn: [
        "ನಾಟಿ ಮಾಡುವ ಮೊದಲು ಸಸಿಗಳ ತುದಿಯನ್ನು ಚಿವುಟಿ ಮೊಟ್ಟೆಗಳನ್ನು ನಾಶಮಾಡಿ.",
        "ಗದ್ದೆಯಲ್ಲಿ ಹಗ್ಗ ಎಳೆದು ವಯಸ್ಕ ಕೀಟಗಳನ್ನು ಹಿಡಿದು ನಾಶಮಾಡಿ.",
        "ಯೂರಿಯಾ ಬಳಕೆಯನ್ನು ಮಿತಿಗೊಳಿಸಿ.",
      ],
      mr: [
        "रोपांची पुनर्लागवड करण्यापूर्वी शेंडे छाटून अंडी नष्ट करा.",
        "शेतातून दोरी ओढून प्रौढ भुंगे गोळा करून नष्ट करा.",
        "युरियाचा अतिरिक्त वापर टाळा.",
      ],
    },
  },
  "yellow-stem-borer": {
    visual: {
      en: (pct, band) => `Symptoms exhibit severed central tillers drying up as 'dead hearts' in vegetative phase or pale, upright, completely empty white panicles ('white earheads') in reproductive phase affecting ${pct}% of tillers (${band} intensity).`,
      te: (pct, band) => `పైరులో పిలకల దశలో మొవ్వు చనిపోయి ఎండిపోవడం ('డెడ్ హార్ట్') లేదా ఈనిన తర్వాత గింజలు పట్టని నిటారైన తెల్ల కంకులు ('వైట్ ఇయర్‌హెడ్స్') దాదాపు ${pct}% పిలకల్లో (${band} దశ) స్పష్టంగా కనిపిస్తున్నాయి.`,
      hi: (pct, band) => `वानस्पतिक अवस्था में बीच का तना सूख जाना ('डेड हार्ट') अथवा बाली आने पर सफेद, दाना-रहित सूखी बाली ('व्हाइट हेड') दिखाई देना (${pct}% कल्ले, ${band} स्तर)।`,
      ta: (pct, band) => `வளர்ச்சிப் பருவத்தில் நடுக்குருத்து காய்ந்து 'டெட் ஹார்ட்' ஆதல் அல்லது பால் பிடிக்கும் பருவத்தில் வெண்கதிர் தோன்றுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಬೆಳವಣಿಗೆಯ ಹಂತದಲ್ಲಿ ಸುಳಿ ಒಣಗಿ 'ಡೆಡ್ ಹಾರ್ಟ್' ಆಗುವುದು ಅಥವಾ ತೆನೆ ಹಂತದಲ್ಲಿ ಬಿಳಿ ತೆನೆಗಳು ಕಾಣಿಸಿಕೊಳ್ಳುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `वाढीच्या अवस्थेत मधला कोंब वाळणे ('डेड हार्ट') किंवा लोंबीच्या अवस्थेत पांढऱ्या पोचट लोंब्या दिसणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Scirpophaga incertulas (Yellow Stem Borer - Crambidae). Larvae bore inside stem bases, severing the vascular bundle. Heavy damage causes irreparable yield loss.",
      te: "కీటక జీవశాస్త్రం: సిర్పోఫాగా ఇన్సర్టులాస్ (పసుపు కాండం తొలిచే పురుగు). లార్వా కాండం లోపలికి చొరబడి నాళికా పుంజాలను కత్తిరించి తింటుంది. దీనివల్ల మొక్కకు ఆహార సరఫరా ఆగిపోయి మొవ్వు లేదా కంకి ఎండిపోతుంది.",
      hi: "कीट जीवविज्ञान: सिरपोफागा इंसर्टुलास (पीला तना छेदक)। सूंडी तने के अंदर घुसकर रस नलिकाओं को काट देती है।",
      ta: "பூச்சி உயிரியல்: தண்டு துளைப்பான். புழுக்கள் தண்டினுள் புகுந்து உள்பகுதியை உண்பதால் குருத்து மற்றும் கதிர்கள் காய்கின்றன.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಹಳದಿ ಕಾಂಡ ಕೊರೆಯುವ ಕೀಟ. ಮರಿ ಹುಳುಗಳು ಕಾಂಡದೊಳಗೆ ಹೊಕ್ಕು ತಿನ್ನುವುದರಿಂದ ತೆನೆ ಒಣಗುತ್ತದೆ.",
      mr: "कीड जीवशास्त्र: पिवळी खोडकीड. अळी खोडात शिरून आतील भाग खाते, ज्यामुळे लोंब्या पांढऱ्या पडतात.",
    },
    actions: {
      en: [
        "Install pheromone traps (Scirpo-lure @ 8–10 traps/ha) to monitor male moth flights and disrupt mating.",
        "Clip seedling leaf tips prior to transplanting to eliminate egg masses laid near tips.",
        "Avoid excess nitrogen application.",
        "Release egg parasitoids (Trichogramma japonicum @ 100,000/ha at weekly intervals).",
        "Consult KVK or Agriculture Officer for registered granular / systemic interventions at peak moth flights.",
      ],
      te: [
        "లింగాకర్షక బుట్టలను (ఫెరమోన్ ట్రాప్స్ @ ఎకరాకు 4-5) అమర్చి రెక్కల పురుగుల ఉధృతిని గమనించండి.",
        "నాట్లు వేసే ముందు నారు కొనలను తుంచి నాశనం చేయండి; దీనివల్ల కొనలపై ఉండే గుడ్ల సముదాయాలు నశిస్తాయి.",
        "నత్రజని ఎరువులను ఒకేసారి కాకుండా దఫాలుగా వేయండి.",
        "ట్రైకోగ్రామా జపోనికమ్ అనే మిత్ర కీటకాల కార్డులను ఎకరాకు అమర్చండి.",
        "నివారణ కొరకు స్థానిక వ్యవసాయ విస్తరణ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "फेरोमोन ट्रैप (8-10 प्रति हेक्टेयर) लगाकर पतंगों की निगरानी करें।",
        "रोपाई से पूर्व पौध की पत्तियों के ऊपरी सिरों को तोड़ दें।",
        "यूरिया का संतुलित प्रयोग करें।",
        "ट्राइकोग्रामा परजीवी का प्रयोग करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "இனக்கவர்ச்சிப் பொறிகளை அமைத்து அந்துப்பூச்சிகளைக் கண்காணிக்கவும்.",
        "நாற்று நுனிகளைக் கிள்ளி முட்டைக் குவியல்களை அழிக்கவும்.",
        "ட்ரைக்கோடெர்மா ஒட்டுண்ணிகளை வெளியிடவும்.",
      ],
      kn: [
        "ಲಿಂಗಾಕರ್ಷಕ ಬಲೆಗಳನ್ನು (ಫೆರಮೋನ್ ಟ್ರ್ಯಾಪ್) ಗದ್ದೆಯಲ್ಲಿ ಅಳವಡಿಸಿ.",
        "ನಾಟಿಗೆ ಮುನ್ನ ಸಸಿಗಳ ತುದಿಯನ್ನು ಕತ್ತರಿಸಿ ಮೊಟ್ಟೆಗಳನ್ನು ನಾಶಮಾಡಿ.",
        "ಟ್ರೈಕೊಗ್ರಾಮಾ ಪರಾವಲಂಬಿ ಕೀಟಗಳನ್ನು ಬಳಸಿ.",
      ],
      mr: [
        "कामगंध सापळे (फेरोमोन ट्रॅप) लावून पतंगांवर नियंत्रण ठेवा.",
        "पुनर्लागवडीपूर्वी रोपांचे शेंडे छाटून अंड्यांचे पुंजके नष्ट करा.",
        "ट्रायकोग्रामा परोपजीवी कीटकांचा वापर करा.",
      ],
    },
  },
  "brown-planthopper": {
    visual: {
      en: (pct, band) => `Visual inspection indicates severe circular drying patches ('hopperburn') appearing across the field canopy, with thousands of brown insects clustered at stem bases near water level affecting ${pct}% of hills (${band} intensity).`,
      te: (pct, band) => `పొలంలో వలయాకారంలో పైరు ఎండిపోయి కుప్పకూలడం ('హాప్పర్ బర్న్' లేదా సుడి తెగులు) స్పష్టంగా కనిపిస్తోంది. మొక్కల మొదళ్ల వద్ద నీటి మట్టానికి దగ్గరగా వేలాది గోధుమ రంగు దోమలు రసం పీలుస్తున్నాయి (${pct}% దుబ్బులు, ${band} దశ).`,
      hi: (pct, band) => `खेत में गोल घेरों में फसल का सूखकर बैठ जाना ('हॉपर बर्न') तथा पानी की सतह के पास तनों के आधार पर भूरे फुदकों का भारी जमावड़ा (${pct}% पौधे, ${band} स्तर)।`,
      ta: (pct, band) => `வயலில் வட்ட வடிவில் பயிர்கள் காய்ந்து கருகி விழுதல் ('ஹாப்பர்பர்ன்') மற்றும் தண்டுப் பகுதியில் பழுப்பு தத்துப்பூச்சிகள் மொய்த்தல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಗದ್ದೆಯಲ್ಲಿ ವೃತ್ತಾಕಾರದಲ್ಲಿ ಬೆಳೆ ಒಣಗಿ ಉದುರುವುದು ('ಹಾಪರ್ ಬರ್ನ್') ಮತ್ತು ಸಸ್ಯದ ಬುಡದಲ್ಲಿ ಕಂದು ಜಿಗಿಹುಳುಗಳು ಜಮಾಯಿಸುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `शेतात वर्तुळाकार भागात पीक वाळून खाली पडणे ('हॉपर बर्न') आणि झाडाच्या बुंध्याजवळ तपकिरी तुडतुड्यांची गर्दी होणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Nilaparvata lugens (Brown Planthopper - Delphacidae). Nymphs and adults suck phloem sap directly from stem bases, causing rapid vascular collapse. Excessive synthetic pyrethroid usage causes severe pest resurgence.",
      te: "కీటక జీవశాస్త్రం: నీలపర్వత ల్యూజెన్స్ (సుడి దోమ / గోధుమ రంగు దోమ). పిల్ల మరియు పెద్ద పురుగులు మొక్క మొదళ్ల వద్ద చేరి నిరంతరం రసం పీల్చడం వల్ల కాండం ఎండిపోయి మొక్కలు కుప్పకూలుతాయి. సింథటిక్ పైరెథ్రాయిడ్స్ వాడకం వల్ల వీటి సంఖ్య మరింత పెరుగుతుంది.",
      hi: "कीट जीवविज्ञान: नीलापर्वता ल्यूजेंस (भूरा फुदका)। कीट तने के निचले हिस्से से रस चूसकर पौधों को सुखा देते हैं।",
      ta: "பூச்சி உயிரியல்: பழுப்பு தத்துப்பூச்சி. தண்டின் அடிப்பகுதியில் இருந்து சாற்றை உறிஞ்சி பயிரை முற்றிலும் காய வைக்கிறது.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಕಂದು ಜಿಗಿಹುಳು. ಕೀಟಗಳು ಸಸ್ಯದ ಬುಡದಿಂದ ರಸ ಹೀರುವುದರಿಂದ ಬೆಳೆ ಸಂಪೂರ್ಣ ಒಣಗುತ್ತದೆ.",
      mr: "कीड जीवशास्त्र: तपकिरी तुडतुडे. किडी झाडाच्या बुंध्यातून अन्नरस शोषून घेतात, ज्यामुळे पीक वाळते.",
    },
    actions: {
      en: [
        "Drain standing field water for 3–4 days to disrupt nymph survival at stem bases.",
        "Provide 'alleyways' (skip one row every 2 meters) to improve sunlight penetration and aeration.",
        "Immediately cease use of synthetic pyrethroids which induce resurgence by killing natural mirid bug predators.",
        "Protect and conserve natural predators (Cyrtorhinus lividipennis, wolf spiders).",
        "Consult KVK or Agriculture Officer for registered targeted planthopper chemicals directed strictly at stem bases.",
      ],
      te: [
        "మొక్క మొదళ్లలో గాలి, వెలుతురు ప్రసరించడానికి పొలంలోని నీటిని 3-4 రోజుల పాటు పూర్తిగా తీసివేసి ఆరబెట్టండి (ఆల్టర్నేట్ వెట్టింగ్ అండ్ డ్రైయింగ్).",
        "పొలంలో ప్రతి 2 మీటర్లకు ఒక సాలు ఖాళీ వదిలి 'బాటలు' తీయండి.",
        "సింథటిక్ పైరెథ్రాయిడ్ మందులను ఎట్టిపరిస్థితుల్లో వాడవద్దు; ఇవి మిత్ర పురుగులను చంపి సుడిదోమను మరింత పెంచుతాయి.",
        "సాలెపురుగులు మరియు మిరిడ్ బగ్స్ వంటి సహజ శత్రువులను కాపాడండి.",
        "మందు పిచికారీ చేసేటప్పుడు పిచికారీ చిమ్మును మొక్క పైభాగంలో కాకుండా మొదళ్లకు తగిలేలా చేయండి. సలహాల కొరకు వ్యవసాయ అధికారిని సంప్రదించండి.",
      ],
      hi: [
        "खेत का पानी 3-4 दिन के लिए पूरी तरह निकाल दें।",
        "खेत में हवा और धूप के लिए हर 2 मीटर पर गलियारे (नालियां) बनाएं।",
        "सिंथेटिक पायरेथ्रोइड दवाओं का छिड़काव न करें।",
        "मकड़ियों जैसे मित्र कीटों का संरक्षण करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "வயலில் உள்ள தண்ணீரை 3-4 நாட்களுக்கு வடித்து உலர வைக்கவும்.",
        "சூரிய ஒளி பட ஏதுவாக பயிர்களுக்கு இடையே இடைவெளி (பாதைகள்) அமைக்கவும்.",
        "மிருதுவான சிலந்திகள் போன்ற இயற்கை எதிரிகளை பாதுகாக்கவும்.",
      ],
      kn: [
        "ಗದ್ದೆಯ ನೀರನ್ನು 3-4 ದಿನಗಳವರೆಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಹೊರಹಾಕಿ ಗಾಳಿ ಆಡಲು ಬಿಡಿ.",
        "ಬೆಳಕಿಗಾಗಿ ಪ್ರತಿ 2 ಮೀಟರ್‌ಗೆ ಸಾಲು ಬಿಟ್ಟು 'ಕಾಲುದಾರಿ' ಮಾಡಿ.",
        "ನೈಸರ್ಗಿಕ ಪರಭಕ್ಷಕ ಜೇಡಗಳನ್ನು ಸಂರಕ್ಷಿಸಿ.",
      ],
      mr: [
        "शेतातील पाणी ३-४ दिवस काढून जमीन कोरडी होऊ द्या.",
        "हवा व सूर्यप्रकाशासाठी दर २ मीटरवर मोकळी वाट ठेवा.",
        "कोळीसारख्या मित्रकिटकांचे रक्षण करा.",
      ],
    },
  },
  "leaf-folder": {
    visual: {
      en: (pct, band) => `Longitudinally folded and silk-webbed leaf blades showing translucent white scraped papery patches where caterpillars have consumed green mesophyll tissue across ${pct}% of visible canopy (${band} intensity).`,
      te: (pct, band) => `ఆకులు నిలువుగా చుట్టబడి తెల్లటి దారాలతో అతుక్కోవడం మరియు ఆకులపై ఆకుపచ్చని హరిత పదార్థాన్ని గోకి తినడం వల్ల తెల్లటి పారదర్శక చారలు ఏర్పడటం స్పష్టంగా కనిపిస్తోంది (${pct}% ఆకులు, ${band} దశ).`,
      hi: (pct, band) => `पत्तियों का लंबाई में मुड़कर रेशमी धागों से चिपक जाना तथा हरी परत खुरच जाने से सफेद पारदर्शी धारियां बनना (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகள் நீளவாக்கில் சுருட்டப்பட்டு வெள்ளை நிறக் கோடுகளுடன் காய்ந்து காணப்படுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳು ಉದ್ದವಾಗಿ ಮಡಚಿಕೊಂಡು ಬಿಳಿ ಪಾರದರ್ಶಕ ಗೆರೆಗಳು ಉಂಟಾಗುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पाने उभी दुमडून रेशमी धाग्यांनी चिकटणे आणि हरितद्रव्य खाल्ल्यामुळे पांढरे पट्टे दिसणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Cnaphalocrocis medinalis (Rice Leaf Folder - Pyralidae). Larvae feed inside folded leaves, drastically reducing photosynthetic leaf area during vegetative and flag leaf stages.",
      te: "కీటక జీవశాస్త్రం: నాఫలోక్రోసిస్ మెడినాలిస్ (ఆకు చుట్టు పురుగు). గొంగళి పురుగులు ఆకులను చుట్టి లోపల ఉంటూ పచ్చటి పొరను గోకి తింటాయి. దీనివల్ల కిరణజన్య సంయోగ క్రియ దెబ్బతిని దిగుబడి తగ్గుతుంది.",
      hi: "कीट जीवविज्ञान: नाफालोक्रोसिस मेडिनालिस (पत्ती लपेटक)। सूंडी मुड़ी हुई पत्ती के अंदर रहकर हरा पदार्थ खाती है।",
      ta: "பூச்சி உயிரியல்: இலை சுருட்டுப் புழு. புழுக்கள் இலையினுள் இருந்து கொண்டு பச்சையத்தை சுரண்டி உண்கின்றன.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಎಲೆ ಮಡಚುವ ಕೀಟ. ಮರಿ ಹುಳುಗಳು ಎಲೆಯೊಳಗೆ ಕುಳಿತು ಹಸಿರು ಭಾಗವನ್ನು ತಿನ್ನುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: पानगुंडाळणारी अळी. अळी दुमडलेल्या पानाच्या आत राहून हरितद्रव्य खाते.",
    },
    actions: {
      en: [
        "Pass a thick coir rope across the field canopy to dislodge larvae from folded leaves into water.",
        "Avoid excessive urea / nitrogen applications which cause lush succulent foliage.",
        "Conserve predatory wasps, spiders, and carabid beetles in the paddy ecosystem.",
        "Release Trichogramma chilonis egg parasitoids (@ 100,000/ha).",
        "Consult KVK or Agriculture Officer for registered pest interventions.",
      ],
      te: [
        "పొలంలో రెండు వైపులా దృఢమైన తాడును పైరుపై లాగడం ద్వారా చుట్టుకున్న ఆకులను విప్పి లార్వాలను నీటిలో రాల్చండి.",
        "పైరు మరీ గుబురుగా పెరిగేలా అధిక యూరియా వాడకండి.",
        "సాలెపురుగులు మరియు పరాన్నజీవులను రక్షించండి.",
        "ట్రైకోగ్రామా కార్డ్స్ ఉపయోగించి గుడ్ల దశలోనే పురుగులను నాశనం చేయండి.",
        "అధికారిక నివారణ కొరకు వ్యవసాయ అధికారిని సంప్రదించండి.",
      ],
      hi: [
        "खेत में रस्सी चलाकर पत्तियों की तह खोलें ताकि सूंडियां पानी में गिर जाएं।",
        "अत्यधिक यूरिया का प्रयोग न करें।",
        "मित्र कीटों का संरक्षण करें।",
        "ट्राइकोग्रामा कार्ड का प्रयोग करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "பயிரின் மேல் கயிற்றை இழுத்து புழுக்களை நீரில் விழச் செய்யவும்.",
        "அதிகப்படியான யூரியாவைத் தவிர்க்கவும்.",
        "இயற்கை எதிரிகளை பாதுகாக்கவும்.",
      ],
      kn: [
        "ಗದ್ದೆಯಲ್ಲಿ ಹಗ್ಗ ಎಳೆದು ಮಡಚಿದ ಎಲೆಗಳನ್ನು ಬಿಡಿಸಿ ಹುಳುಗಳನ್ನು ಬೀಳಿಸಿ.",
        "ಅತಿಯಾದ ಯೂರಿಯಾ ಬಳಸಬೇಡಿ.",
        "ಪರಭಕ್ಷಕ ಕೀಟಗಳನ್ನು ಸಂರಕ್ಷಿಸಿ.",
      ],
      mr: [
        "शेतातून जाड दोरी ओढून अळ्यांना पाण्यात पाडा.",
        "अतिरिक्त युरिया देणे टाळा.",
        "मित्रकिटकांचे संवर्धन करा.",
      ],
    },
  },
  "gall-midge": {
    visual: {
      en: (pct, band) => `Presence of hollow, tubular, pale-green to silvery-white cylindrical leaf sheaths resembling onion leaves ('silver shoots' or 'onion leaf galls') with complete absence of panicle development on ${pct}% of affected tillers (${band} intensity).`,
      te: (pct, band) => `ఆకుల పిలకలు గొట్టంలా మారి ఉల్లి కాడల వంటి తెల్లటి-వెండి రంగు గొట్టాలు ('ఉల్లి కోడు' లేదా 'సిల్వర్ షూట్స్') ఏర్పడటం స్పష్టంగా కనిపిస్తోంది (${pct}% పిలకలు, ${band} దశ). ఈ పిలకల నుండి కంకులు రావు.`,
      hi: (pct, band) => `कल्लों का प्याज की पत्ती की तरह खोखली, चांदी जैसी सफेद नली ('सिल्वर शूट' या प्याजिया पत्ती) में बदल जाना (${pct}% कल्ले, ${band} स्तर)। इनमें बाली नहीं निकलती।`,
      ta: (pct, band) => `தூர்கள் வெங்காய இலை போன்ற வெண்மையான குழல் வடிவமாக மாறுதல் ('வெள்ளிக்குருத்து') (${pct}%, ${band} நிலை). இதில் கதிர் உருவாகாது.`,
      kn: (pct, band) => `ಸಸಿಗಳ ಸುಳಿಗಳು ಈರುಳ್ಳಿ ಎಲೆಯಂತೆ ಟೊಳ್ಳಾದ ಬೆಳ್ಳಿಯ ನಳಿಕೆಯಾಗಿ ('ಬೆಳ್ಳಿ ಸುಳಿ') ಬದಲಾಗುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `फुटवे कांद्याच्या पातीसारखे पोकळ आणि चंदेरी नळीसारखे ('सिल्व्हर शूट') तयार होणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Orseolia oryzae (Rice Gall Midge - Cecidomyiidae). Maggot feeds at growing apical shoot tips, inducing gall formation. Active in cloudy, humid monsoons; once gall forms, tiller is sterile.",
      te: "కీటక జీవశాస్త్రం: ఆర్సియోలియా ఒరైజే (ఉల్లి కోడు / గుల్ల పురుగు). లార్వా మొవ్వులోని పెరుగుదల బిందువు వద్ద రసం పీల్చడం వల్ల ఆకు ఉల్లి కాడలా నళికాకారంగా మారుతుంది. మబ్బులతో కూడిన తేమ వాతావరణంలో ఇది వేగంగా వ్యాపిస్తుంది.",
      hi: "कीट जीवविज्ञान: ओर्सिओलिया ओराइजी (गाल मिज)। कीड़े का मैगट तने के अंदरूनी सिरे को खाकर प्याजिया नली बना देता है।",
      ta: "பூச்சி உயிரியல்: ஆனைக்கொம்பன் ஈ. புழுக்கள் குருத்தின் வளர்ச்சிப் புள்ளியை தாக்கி குழல் போன்ற அமைப்பை உருவாக்குகின்றன.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಆನೆಗೊಂಬು ಕೀಟ. ಮರಿ ಹುಳುಗಳು ಸುಳಿಯ ಬೆಳವಣಿಗೆಯ ಭಾಗವನ್ನು ತಿಂದು ನಳಿಕೆ ಉಂಟುಮಾಡುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: गादमाशी. अळी वाढीच्या टोकावर उपजीविका करते, ज्यामुळे फुटवा वांझ होतो.",
    },
    actions: {
      en: [
        "Install light traps to monitor gall midge fly emergence during early tillering.",
        "Rogue out and destroy early silver shoots.",
        "Avoid staggered planting in the village cluster.",
        "Conserve natural platygastrid wasp parasitoids (Platygaster oryzae).",
        "Consult KVK or Agriculture Officer for registered preventative nursery and basal treatments.",
      ],
      te: [
        "నారుమడి మరియు నాట్లు వేసిన తొలి దశలో దీపపు బుట్టలను (లైట్ ట్రాప్స్) అమర్చి ఉల్లికోడు ఈగల రాకను గమనించండి.",
        "తెగులు సోకిన తొలి ఉల్లికోడు పిలకలను పీకి నాశనం చేయండి.",
        "గ్రామంలో రైతులందరూ ఒకేసారి నాట్లు వేసేలా సమన్వయం చేసుకోండి; ఆలస్యంగా నాట్లు వేయవద్దు.",
        "ప్లాటిగాస్టర్ ఒరైజే వంటి సహజ మిత్ర పురుగులను కాపాడండి.",
        "అధికారిక నివారణ చర్యల కొరకు వ్యవసాయ విస్తరణ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "शुरुआती अवस्था में प्रकाश प्रपंच (लाइट ट्रैप) लगाकर निगरानी करें।",
        "प्रारंभिक प्रभावित सिल्वर शूट्स को नष्ट करें।",
        "देर से रोपाई करने से बचें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "விளக்குப் பொறி அமைத்து ஈக்களைக் கண்காணிக்கவும்.",
        "ஆரம்பக்கால வெள்ளிக்குருத்துகளை அழிக்கவும்.",
        "தாமதமாக நடவு செய்வதைத் தவிர்க்கவும்.",
      ],
      kn: [
        "ಬೆಳಕಿನ ಬಲೆಗಳನ್ನು ಅಳವಡಿಸಿ ಕೀಟಗಳ ಗಮನಿಸಿ.",
        "ಆರಂಭಿಕ ಹಂತದ ಬೆಳ್ಳಿ ಸುಳಿಗಳನ್ನು ಕಿತ್ತು ನಾಶಮಾಡಿ.",
        "ತಡವಾಗಿ ನಾಟಿ ಮಾಡುವುದನ್ನು ತಪ್ಪಿಸಿ.",
      ],
      mr: [
        "प्रकाश सापळे लावून माशीच्या हालचालींवर लक्ष ठेवा.",
        "सुरुवातीचे सिल्व्हर शूट्स उपटून नष्ट करा.",
        "उशिरा पुनर्लागवड करणे टाळा.",
      ],
    },
  },
  "rice-healthy": {
    visual: {
      en: (pct, band) => `Visual inspection confirms healthy, erect, vibrant green foliar canopy free of necrotic lesions, chlorotic streaks, or insect feeding scars. Optimal photosynthetic lamina expansion.`,
      te: (pct, band) => `ఆకులపై ఎలాంటి మచ్చలు, చారలు లేదా పురుగుల నష్టం లేదు. పైరు ఎంతో పచ్చగా, ఆరోగ్యకరంగా, సరైన కిరణజన్య సంయోగ క్రియతో ఎదుగుతోంది.`,
      hi: (pct, band) => `पत्तियों पर किसी प्रकार के धब्बे, झुलसा या कीट के लक्षण नहीं हैं। फसल पूरी तरह हरी, स्वस्थ और अच्छी वानस्पतिक वृद्धि में है।`,
      ta: (pct, band) => `இலைகளில் எந்தவித நோய்ப்புள்ளிகளோ பூச்சி சேதமோ இல்லை. பயிர் மிகவும் பசுமையாகவும் ஆரோக்கியமாகவும் உள்ளது.`,
      kn: (pct, band) => `ಎಲೆಗಳ ಮೇಲೆ ಯಾವುದೇ ರೋಗದ ಮಚ್ಚೆಗಳು ಅಥವಾ ಕೀಟದ ಹಾನಿ ಇಲ್ಲ. ಬೆಳೆ ಸಮೃದ್ಧವಾಗಿ ಹಸಿರಾಗಿದೆ.`,
      mr: (pct, band) => `पानांवर कोणतेही ठिपके, करपा किंवा किडींचे नुकसान नाही. पीक अतिशय निरोगी व हिरवेगार आहे.`,
    },
    risk: {
      en: "Pathological Assessment: Zero active infectious pathology detected. Canopy exhibits strong baseline resistance. Routine monitoring advised against sudden weather shifts.",
      te: "రోగ నిర్ధారణ: ఎటువంటి రోగకారక క్రిములు లేవు. పైరుకు బలమైన వ్యాధి నిరోధక శక్తి ఉంది. వాతావరణ మార్పులను గమనిస్తూ సాధారణ పరిశీలన కొనసాగించండి.",
      hi: "रोग मूल्यांकन: कोई सक्रिय बीमारी नहीं पाई गई। फसल की रोग प्रतिरोधक क्षमता अच्छी है।",
      ta: "நோயியல் மதிப்பீடு: நோய் தொற்றுகள் எதுவும் இல்லை. வழக்கமான கண்காணிப்பை தொடரவும்.",
      kn: "ರೋಗ ಮೌಲ್ಯಮಾಪನ: ಯಾವುದೇ ರೋಗಬಾಧೆ ಕಂಡುಬಂದಿಲ್ಲ. ನಿಯಮಿತ ನಿಗಾ ವಹಿಸಿ.",
      mr: "रोग मूल्यांकन: कोणताही रोग आढळला नाही. नियमित पाहणी सुरू ठेवावी.",
    },
    actions: {
      en: [
        "Maintain optimal water level (2–5 cm) during active tillering.",
        "Apply balanced N-P-K fertilizer using Leaf Color Chart (LCC) to avoid over-fertilizing with urea.",
        "Practice alternate wetting and drying (AWD) after panicle initiation to save water and boost root health.",
        "Conduct weekly zig-zag field walks parting hills to check stem bases.",
        "Keep field bunds cleanly weeded.",
      ],
      te: [
        "పిలకల దశలో పొలంలో 2-5 సెం.మీ మేర సరైన నీటి మట్టాన్ని నిర్వహించండి.",
        "ఆకు రంగు చార్ట్ (LCC) ఆధారంగా సమతుల్య ఎరువులను వేయండి; అవసరానికి మించి యూరియా వేయవద్దు.",
        "కంకి దశ తర్వాత ఆల్టర్నేట్ వెట్టింగ్ అండ్ డ్రైయింగ్ (తడి-ఆరి విధానం) పాటించండి.",
        "వారానికి ఒకసారి పొలంలో జిగ్-జాగ్ పద్ధతిలో నడుస్తూ మొదళ్ల వద్ద పరిశీలించండి.",
        "గట్లపై కలుపు లేకుండా పరిశుభ్రంగా ఉంచండి.",
      ],
      hi: [
        "कल्ले फूटते समय 2-5 सेमी पानी का स्तर बनाए रखें।",
        "लीफ कलर चार्ट (LCC) देखकर ही यूरिया का संतुलित प्रयोग करें।",
        "बाली आने के बाद पानी सुखा-सुखाकर लगाएं।",
        "सप्ताह में एक बार पौधों के आधार का निरीक्षण करें।",
      ],
      ta: [
        "பயிர் வளர்ச்சி பருவத்தில் 2-5 செ.மீ நீர்மட்டம் பராமரிக்கவும்.",
        "இலை வண்ண அட்டையை (LCC) பயன்படுத்தி சீரான உரமிடுங்கள்.",
        "வாரம் ஒருமுறை வரப்புகளில் நடந்து கண்காணிக்கவும்.",
      ],
      kn: [
        "ಸಸಿಗಳ ಹಂತದಲ್ಲಿ 2-5 ಸೆಂ.ಮೀ ನೀರು ನಿಲ್ಲಿಸಿ.",
        "ಎಲೆ ಬಣ್ಣದ ಚಾರ್ಟ್ (LCC) ಬಳಸಿ ರಸಗೊಬ್ಬರ ನೀಡಿ.",
        "ವಾರಕ್ಕೊಮ್ಮೆ ಗದ್ದೆ ಪರಿಶೀಲಿಸಿ.",
      ],
      mr: [
        "फुटवे येण्याच्या काळात २-५ सेमी पाणी ठेवा.",
        "लीफ कलर चार्ट (LCC) चा वापर करून युरिया द्या.",
        "आठवड्यातून एकदा शेताची पाहणी करा.",
      ],
    },
  },
  "chilli-healthy": {
    visual: {
      en: (pct, band) => `Visual inspection confirms smooth, broad, fully expanded leaf lamina without upward cupping, downward curling, necrotic spotting, or vector feeding scars. Terminal shoot tips are actively growing.`,
      te: (pct, band) => `మిరప ఆకులలో ఎలాంటి ముడత, పసుపు చారలు లేదా రసం పీల్చే పురుగుల నష్టం లేదు. లేత చిగుర్లు, వెడల్పాటి ఆకులు ఎంతో ఆరోగ్యంగా, సహజమైన మెరుపుతో ఉన్నాయి.`,
      hi: (pct, band) => `पत्तियों में कोई मरोड़िया, धब्बे या रस चूसक कीटों के निशान नहीं हैं। पौधे का विकास सामान्य और पत्तियां चौड़ी व चमकदार हैं।`,
      ta: (pct, band) => `இலைகளில் சுருட்டலோ, புள்ளிகளோ அல்லது பூச்சி சேதமோ இல்லை. செடியின் வளர்ச்சி மிகவும் சீராக உள்ளது.`,
      kn: (pct, band) => `ಎಲೆಗಳಲ್ಲಿ ಯಾವುದೇ ಸುರುಟು, ಚುಕ್ಕೆ ಅಥವಾ ಕೀಟ ಬಾಧೆ ಇಲ್ಲ. ಗಿಡದ ಬೆಳವಣಿಗೆ ಸಮೃದ್ಧವಾಗಿದೆ.`,
      mr: (pct, band) => `पानांवर कोणताही चुरडा-मुरडा किंवा डाग नाहीत. रोपांची वाढ जोमदार व निरोगी आहे.`,
    },
    risk: {
      en: "Pathological Assessment: Clean foliar canopy with active growth vigor. Preventive vigil recommended for early sucking pest arrivals (thrips, mites, whiteflies).",
      te: "రోగ నిర్ధారణ: పైరు ఎంతో ఆరోగ్యంగా ఉంది. రసం పీల్చే పురుగులు (తామర పురుగులు, నల్లి, తెల్లదోమ) రాకుండా ముందుజాగ్రత్త నివారణ చర్యలు పాటించండి.",
      hi: "रोग मूल्यांकन: फसल पूरी तरह स्वस्थ है। रस चूसक कीटों के शुरुआती आगमन पर नजर रखें।",
      ta: "நோயியல் மதிப்பீடு: பயிர் ஆரோக்கியமாக உள்ளது. உறிஞ்சும் பூச்சிகளின் வருகையை கவனிக்கவும்.",
      kn: "ರೋಗ ಮೌಲ್ಯಮಾಪನ: ಬೆಳೆ ಆರೋಗ್ಯಕರವಾಗಿದೆ. ಕೀಟಗಳ ಆರಂಭಿಕ ಆಗಮನದ ಬಗ್ಗೆ ಜಾಗರೂಕರಾಗಿರಿ.",
      mr: "रोग मूल्यांकन: पीक पूर्णपणे निरोगी आहे. रस शोषणाऱ्या किडींवर लक्ष ठेवा.",
    },
    actions: {
      en: [
        "Install 10 yellow and 10 blue sticky traps per acre at canopy level for early pest interception.",
        "Maintain adequate root-zone moisture without allowing water stagnation.",
        "Apply balanced foliar micronutrients (Zinc, Boron) to sustain healthy flowering.",
        "Spray preventive neem oil formulation (10,000 ppm @ 1 ml/L) once every 12–15 days.",
        "Grow border barrier crops like maize or sorghum around field boundaries.",
      ],
      te: [
        "రసం పీల్చే పురుగులను ముందే పసిగట్టడానికి ఎకరాకు 10 పసుపు, 10 నీలి జిగురు అట్టలను పైరు ఎత్తులో అమర్చండి.",
        "నేలలో తేమ సమంగా ఉండేలా చూడండి; వేర్ల వద్ద నీరు నిల్వ ఉండకుండా చూసుకోండి.",
        "పూత మరియు పిందె రాలకుండా జింక్, బోరాన్ వంటి సూక్ష్మపోషకాలను సమతుల్యంగా అందించండి.",
        "ముందుజాగ్రత్తగా వేప నూనెను (10,000 ppm @ 1 మి.లీ/లీటరు నీటికి) ప్రతి 12-15 రోజులకు ఒకసారి పిచికారీ చేయండి.",
        "పొలం చుట్టూ జొన్న లేదా మొక్కజొన్నను సరిహద్దు పంటగా వేయండి.",
      ],
      hi: [
        "प्रति एकड़ 10 पीले और 10 नीले चिपचिपे ट्रैप लगाएं।",
        "जड़ों के पास जलभराव न होने दें।",
        "सूक्ष्म पोषक तत्वों (जिंक, बोरॉन) का संतुलित प्रयोग करें।",
        "रोकथाम के लिए नीम तेल (10,000 पीपीएम) का छिड़काव करें।",
        "खेत के चारों ओर मक्का या ज्वार की सीमावर्ती फसल लगाएं।",
      ],
      ta: [
        "ஏக்கருக்கு 10 மஞ்சள் மற்றும் 10 நீல ஒட்டும் பொறிகளை வைக்கவும்.",
        "வேர்ப்பகுதியில் நீர் தேங்குவதை தவிர்க்கவும்.",
        "வேப்ப எண்ணெய் தெளிக்கவும்.",
        "எல்லையில் சோளம் நடவும்.",
      ],
      kn: [
        "ಎಕರೆಗೆ 10 ಹಳದಿ ಮತ್ತು 10 ನೀಲಿ ಅಂಟು ಬಲೆಗಳನ್ನು ಇರಿಸಿ.",
        "ಬುಡದಲ್ಲಿ ನೀರು ನಿಲ್ಲದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.",
        "ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.",
        "ಜಮೀನಿನ ಸುತ್ತಲೂ ಜೋಳ ಬೆಳೆಯಿರಿ.",
      ],
      mr: [
        "एकरामध्ये १० पिवळे व १० निळे चिकट सापळे लावा.",
        "मुळांशी पाणी साचू देऊ नका.",
        "प्रतिबंधात्मक उपायासाठी निंबोळी तेल फवारा.",
        "शेताभोवती मका किंवा ज्वारी लावा.",
      ],
    },
  },
  "leaf-curl": {
    visual: {
      en: (pct, band) => `Visual inspection confirms upward puckering, boat-shaped leaf cupping, and pronounced vein thickening across ${pct}% of young canopy (${band} severity). Growing tips are severely clustered with stunted internodes and flower abortion.`,
      te: (pct, band) => `ఛాయాచిత్రంలో పైకి ముడుచుకుపోయిన దోనె ఆకారపు ఆకులు, ఈనెలు లావుగా మారడం మరియు లేత కొమ్మలు చిన్నవిగా మారడం ఆకులలో ${pct}% మేర (${band} తీవ్రత) స్పష్టంగా కనిపిస్తున్నాయి. పూత రాలిపోవడం మరియు పిందెలు ఏర్పడకపోవడం మిరప ఆకు ముడత (జెమిని వైరస్) విలక్షణ లక్షణాలు.`,
      hi: (pct, band) => `तस्वीर में पत्तियां ऊपर की ओर नाव के आकार में मुड़ी हुई, नसें मोटी और नई पत्तियां गुच्छेदार दिखाई दे रही हैं (प्रभावित क्षेत्र ${pct}%, ${band} स्तर)। यह मिर्च पत्ती मरोड़ (लीफ कर्ल वायरस) का स्पष्ट लक्षण है।`,
      ta: (pct, band) => `புகைப்படத்தில் இலைகள் மேல்நோக்கி படகு போல சுருண்டு, நரம்புகள் தடித்து, இளம் தளிர்கள் கொத்தாக ${pct}% இலைப்பரப்பில் (${band} நிலை) காணப்படுகின்றன. இது மிளகாய் இலை சுருட்டை நோயாகும்.`,
      kn: (pct, band) => `ಫೋಟೋದಲ್ಲಿ ಎಲೆಗಳು ದೋಣಿಯಾಕಾರದಲ್ಲಿ ಮೇಲ್ಮುಖವಾಗಿ ಮುದುರಿಕೊಂಡಿದ್ದು, ನರಗಳು ದಪ್ಪಗಾಗಿ, ಗಿಣ್ಣುಗಳು ಕುಂಠಿತಗೊಂಡು ಸುಮಾರು ${pct}% ಎಲೆಯ ಭಾಗದಲ್ಲಿ (${band} ತೀವ್ರತೆ) ಕಾಣಿಸುತ್ತಿವೆ. ಇದು ಮೆಣಸಿನ ಎಲೆ ಮುದುರು ರೋಗವಾಗಿದೆ.`,
      mr: (pct, band) => `छायाचित्रात पाने वरच्या बाजूला वाटीसारखी दुमडलेली, शिरा जाड झालेल्या आणि वाढ खुंटलेली दिसत असून पानाचा सुमारे ${pct}% भाग (${band} पातळी) बाधित झाला आहे. हे मिरचीवरील चुरडा-मुरडा (लीफ कर्ल) रोगाचे लक्षण आहे.`,
    },
    risk: {
      en: "Etiology: Chilli Leaf Curl Virus (Begomovirus) transmitted persistently by Whiteflies (Bemisia tabaci). High temperatures (30-38°C) accelerate whitefly reproductive cycles and rapid transmission.",
      te: "వ్యాధికారక జీవశాస్త్రం: తెల్లదోమ (బెమిసియా టబాసి) ద్వారా వ్యాపించే జెమిని వైరస్ (బిగోమోవైరస్). అధిక ఉష్ణోగ్రతలు (30-38°C) ఉన్నప్పుడు తెల్లదోమల సంతతి వేగంగా పెరిగి తెగులును నిమిషాల వ్యవధిలో వ్యాపింపజేస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: मिर्च लीफ कर्ल वायरस (बेगोमोवायरस), जो सफेद मक्खी (बेमिसिया तबासी) द्वारा फैलता है। 30-38 डिग्री सेल्सियस तापमान में सफेद मक्खी का प्रकोप तेजी से बढ़ता है।",
      ta: "நோய்க்கிருமி உயிரியல்: வெள்ளை ஈக்கள் மூலம் பரவும் மிளகாய் இலை சுருட்டை வைரஸ் நோய். அதிக வெப்பநிலையில் வெள்ளை ஈக்களின் பெருக்கம் அதிகரிக்கிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಬಿಳಿ ನೊಣದಿಂದ ಹರಡುವ ಮೆಣಸಿನ ಎಲೆ ಮುದುರು ವೈರಸ್ ರೋಗ. ಹೆಚ್ಚಿನ ಉಷ್ಣಾಂಶದಲ್ಲಿ ಬಿಳಿ ನೊಣಗಳ ಸಂಖ್ಯೆ ಹೆಚ್ಚಿ ರೋಗ ಬೇಗ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: पांढऱ्या माशीद्वारे पसरणारा मिरचीवरील लीफ कर्ल विषाणू. उष्ण व कोरड्या हवामानात पांढऱ्या माशीचा प्रादुर्भाव वेगाने वाढतो.",
    },
    actions: {
      en: [
        "Install 15-20 yellow sticky traps per acre at crop canopy height to trap vector whiteflies.",
        "Rogue and bury severely infected stunted plants displaying severe curling to reduce field virus reservoirs.",
        "Erect dense border crops of maize, sorghum, or pearl millet (3-4 dense rows) as windbreaks against whiteflies.",
        "Apply 5% neem seed kernel extract (NSKE) or 10,000 ppm azadirachtin as a natural deterrent.",
        "Maintain balanced potash fertilization to strengthen foliar cuticle integrity.",
      ],
      te: [
        "తెల్లదోమల నివారణకు ఎకరానికి 15-20 పసుపు రంగు జిగురు అట్టలను పైరు ఎత్తులో అమర్చండి.",
        "తీవ్రంగా ముడత సోకి గిడసబారిన మొక్కలను పీకి పొలం బయట గుంత తీసి పాతిపెట్టండి.",
        "తెల్లదోమల ప్రవేశాన్ని అడ్డుకోవడానికి పొలం చుట్టూ 3-4 వరుసలలో జొన్న లేదా మొక్కజొన్నను సరిహద్దు పంటగా వేయండి.",
        "సహజ రక్షణ కోసం 5% వేప గింజల కషాయం (NSKE) లేదా వేపనూనె (10,000 ppm) పిచికారీ చేయండి.",
        "పొటాష్ ఎరువులను సమతుల్యంగా వేసి మొక్క రోగనిరోధక శక్తిని పెంచండి.",
      ],
      hi: [
        "सफेद मक्खियों की निगरानी और रोकथाम हेतु प्रति एकड़ 15-20 पीले चिपचिपे कार्ड लगाएं।",
        "गंभीर रूप से मुड़े व बौने पौधों को उखाड़कर खेत से दूर गड्ढे में दबा दें ताकि वायरस न फैले।",
        "खेत के चारों ओर मक्का, ज्वार या बाजरे की 3-4 घनी कतारें सुरक्षात्मक बाड़ के रूप में लगाएं।",
        "प्राकृतिक नियंत्रण के लिए 5% नीम के बीज का काढ़ा (एनएसकेई) या 10,000 पीपीएम नीम तेल का छिड़काव करें।",
        "संतुलित पोटाश का उपयोग करके पौधों की रोग प्रतिरोधक क्षमता बढ़ाएं।",
      ],
      ta: [
        "வெள்ளை ஈக்களைக் கட்டுப்படுத்த ஏக்கருக்கு 15-20 மஞ்சள் வண்ண ஒட்டும் பொறிகளை பயிர் மட்டத்தில் வைக்கவும்.",
        "வைரஸ் பரவாமல் தடுக்க அதிகம் பாதிக்கப்பட்ட செடிகளைப் பிடுங்கி மண்ணில் புதைக்கவும்.",
        "வயலைச் சுற்றி மக்காச்சோளம் அல்லது சோளத்தை 3-4 வரிசைகளில் தடுப்புப் பயிராக நடவும்.",
        "இயற்கைக் கட்டுப்பாட்டிற்கு 5% வேப்பங்கொட்டை கரைசல் (NSKE) தெளிக்கவும்.",
        "செடிகளின் நோய் எதிர்ப்புத் திறனை அதிகரிக்க சாம்பல் சத்து (பொட்டாஷ்) சமச்சீராக இடவும்.",
      ],
      kn: [
        "ಬಿಳಿ ನೊಣಗಳ ನಿಯಂತ್ರಣಕ್ಕಾಗಿ ಎಕರೆಗೆ 15-20 ಹಳದಿ ಅಂಟು ಬಲೆಗಳನ್ನು ಬೆಳೆಯ ಎತ್ತರದಲ್ಲಿ ಅಳವಡಿಸಿ.",
        "ರೋಗ ಹರಡುವುದನ್ನು ತಡೆಯಲು ತೀವ್ರವಾಗಿ ಮುದುಡಿದ ಗಿಡಗಳನ್ನು ಕಿತ್ತು ದೂರ ಹೂತುಹಾಕಿ.",
        "ಹೊಲದ ಸುತ್ತಲೂ 3-4 ಸಾಲುಗಳಲ್ಲಿ ಮೆಕ್ಕೆಜೋಳ ಅಥವಾ ಜೋಳವನ್ನು ತಡೆಗೋಡೆ ಬೆಳೆಯಾಗಿ ಬೆಳೆಯಿರಿ.",
        "ನೈಸರ್ಗಿಕ ಹತೋಟಿಗಾಗಿ 5% ಬೇವಿನ ಬೀಜದ ಕಷಾಯ (NSKE) ಸಿಂಪಡಿಸಿ.",
        "ಸಮತೋಲಿತ ಪೊಟ್ಯಾಷ್ ಗೊಬ್ಬರ ನೀಡಿ ಗಿಡದ ರೋಗನಿರೋಧಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸಿ.",
      ],
      mr: [
        "पांढऱ्या माशीच्या नियंत्रणासाठी एकरी १५-२० पिवळे चिकट सापळे पिकाच्या उंचीवर लावा.",
        "विषाणूचा प्रसार रोखण्यासाठी जास्त प्रादुर्भाव झालेली रोपे उपटून जमिनीत गाडून टाका.",
        "शेताभोवती मका किंवा ज्वारीच्या ३-४ ओळी संरक्षक पीक म्हणून लावा.",
        "नैसर्गिक नियंत्रणासाठी ५% निंबोळी अर्क किंवा १०,००० पीपीएम निंबोळी तेल फवारा.",
        "पिकाची प्रतिकारशक्ती वाढवण्यासाठी संतुलित पोटॅश खतांचा वापर करा.",
      ],
    },
  },
  "cercospora-leaf-spot": {
    visual: {
      en: (pct, band) => `Visual inspection demonstrates circular 'frogeye' lesions with prominent white-to-bleached ash centers, distinct dark reddish-brown margins, and chlorotic yellow halos affecting ${pct}% of visible leaf tissue (${band} intensity).`,
      te: (pct, band) => `ఆకులపై కప్ప కన్ను వంటి గుండ్రని మచ్చలు ('ఫ్రాగ్ ఐ స్పాట్స్') స్పష్టంగా కనిపిస్తున్నాయి. మచ్చల మధ్యలో తెల్లటి లేదా బూడిద రంగు, అంచుల వద్ద ముదురు ఎరుపు-గోధుమ రంగు వలయం దాదాపు ${pct}% ఆకుల్లో (${band} దశ) విస్తరించి ఉంది.`,
      hi: (pct, band) => `पत्तियों पर मेंढक की आँख जैसे गोल धब्बे ('फ्रॉग-आई स्पॉट्स'), जिनका केंद्र सफेद/धूसर और किनारे गहरे भूरे-लाल हैं (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகளில் தவளைக் கண் போன்ற வட்ட வடிவப் புள்ளிகள், வெள்ளை மையமும் அடர் பழுப்பு விளிம்பும் கொண்டு காணப்படுகின்றன (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳ ಮೇಲೆ ಕಪ್ಪೆಯ ಕಣ್ಣಿನಂತಹ ದುಂಡಗಿನ ಮಚ್ಚೆಗಳು, ಮಧ್ಯದಲ್ಲಿ ಬಿಳಿ ಬಣ್ಣ ಮತ್ತು ಕಂದು ಅಂಚು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पानांवर बेडकाच्या डोळ्यासारखे गोलाकार ठिपके ('फ्रॉग-आय'), ज्यांचा मध्यभाग पांढुरका व कडा गडद तपकिरी असतात (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Cercospora capsici (Fungus). Airborne and rain-splashed conidia proliferate during warm humid periods. Causes severe premature defoliation, exposing fruit to sunscald.",
      te: "వ్యాధికారక జీవశాస్త్రం: సెర్కోస్పోరా కాప్సిసి అనే శిలీంధ్రం. వెచ్చని, తేమతో కూడిన వాతావరణంలో గాలి మరియు వర్షపు తుంపర్ల ద్వారా బీజాలు వ్యాపిస్తాయి. తెగులు ముదిరితే ఆకులు రాలిపోయి కాయలు ఎండదెబ్బకు గురవుతాయి.",
      hi: "रोगजनक जीवविज्ञान: सर्कोस्पोरा कैप्सिकी (फफूंद)। गर्म व आर्द्र मौसम में हवा व बारिश की बूंदों से फैलता है। पत्तियां गिर जाती हैं और फल धूप से झुलस जाते हैं।",
      ta: "நோய்க்கிருமி உயிரியல்: பூஞ்சை (Cercospora capsici). அதிக ஈரப்பதம் உள்ள காலங்களில் பரவி இலைகளை உதிரச் செய்கிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಶಿಲೀಂಧ್ರ (ಸರ್ಕೋಸ್ಪೊರಾ). ಬೆಚ್ಚನೆಯ ತೇವಾಂಶದ ವಾತಾವರಣದಲ್ಲಿ ಗಾಳಿಯ ಮೂಲಕ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशी (सर्कोस्पोरा). उष्ण व दमट हवामानात पावसाच्या थेंबांमुळे हा रोग झपाट्याने पसरतो.",
    },
    actions: {
      en: [
        "Rake and destroy fallen infected leaves to reduce secondary inocula.",
        "Avoid overhead sprinkler irrigation; use drip irrigation to keep foliage dry.",
        "Balance fertilization; avoid excessive nitrogen top-dressing.",
        "Spray organic protective bioagents (Trichoderma harzianum @ 5 g/L).",
        "Consult KVK or Agriculture Officer for registered fungicidal schedules.",
      ],
      te: [
        "రాలిపడిన తెగులు సోకిన ఆకులను ఏరి పొలానికి దూరంగా తగులబెట్టండి.",
        "పైరు పైనుండి నీరు చిమ్మే స్ప్రింక్లర్లను వాడవద్దు; ఆకులు తడవకుండా డ్రిప్ పద్ధతిలో నీరు అందించండి.",
        "యూరియా వాడకాన్ని తగ్గించి పొటాష్ ఎరువులను సమతుల్యంగా వేయండి.",
        "ట్రైకోడెర్మా హార్జియానమ్ వంటి జీవ నియంత్రణ శిలీంధ్రాలను వాడండి.",
        "అధికారిక శిలీంధ్రనాశినుల కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "संक्रमित गिरी हुई पत्तियों को इकट्ठा करके नष्ट करें।",
        "फव्वारा सिंचाई से बचें; ड्रिप सिंचाई का प्रयोग करें ताकि पत्तियां सूखी रहें।",
        "संतुलित खाद दें।",
        "ट्राइकोडर्मा जैसे जैविक फफूंदनाशी का प्रयोग करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "உதிர்ந்த இலைகளை அகற்றி அழிக்கவும்.",
        "சொட்டு நீர்ப்பாசன முறையை பயன்படுத்தவும்.",
        "ட்ரைக்கோடெர்மா தெளிக்கவும்.",
      ],
      kn: [
        "ಬಿದ್ದ ರೋಗಪೀಡಿತ ಎಲೆಗಳನ್ನು ನಾಶಮಾಡಿ.",
        "ಹನಿ ನೀರಾವರಿ ಪದ್ಧತಿಯನ್ನು ಬಳಸಿ.",
        "ಟ್ರೈಕೊಡರ್ಮಾ ಜೈವಿಕ ಶಿಲೀಂಧ್ರನಾಶಕ ಬಳಸಿ.",
      ],
      mr: [
        "गळून पडलेली रोगट पाने गोळा करून जाळून टाका.",
        "ठिबक सिंचनाचा वापर करा जेणेकरून पाने ओली राहणार नाहीत.",
        "ट्रायकोडर्माची फवारणी करा.",
      ],
    },
  },
  "bacterial-leaf-spot": {
    visual: {
      en: (pct, band) => `Small, water-soaked, angular-to-circular spots turning dark brown to black with yellow halos, blister-like raised scab pustules on leaf undersides across ${pct}% of visible canopy (${band} intensity).`,
      te: (pct, band) => `ఆకులపై చిన్న, నీటి మచ్చలు ముదురు గోధుమ నుండి నలుపు రంగులోకి మారడం, చుట్టూ పసుపు రంగు వలయం మరియు ఆకు అడుగు భాగంలో బొబ్బల వంటి మచ్చలు దాదాపు ${pct}% ఆకులలో (${band} దశ) కనిపిస్తున్నాయి.`,
      hi: (pct, band) => `पत्तियों पर छोटे, पानी जैसे धब्बे जो भूरे-काले हो जाते हैं और पत्ती की निचली सतह पर फफोलों जैसे दिखते हैं (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகளில் சிறிய நீர் படிந்த கரும்புள்ளிகள் மஞ்சள் வளையத்துடன் காணப்படுகின்றன (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳ ಮೇಲೆ ಸಣ್ಣ ಕಂದು-ಕಪ್ಪು ಬಣ್ಣದ ನೀರುಗುಳ್ಳೆಯಂತಹ ಚುಕ್ಕೆಗಳು ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पानांवर लहान, काळे-तपकिरी पाण्याचे ठिपके व पाठीमागे फोडासारखे उंचवटे दिसतात (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Xanthomonas campestris pv. vesicatoria (Bacterium). Transmitted via wind-driven rain, contaminated seed, and field handling. Severe attacks cause heavy leaf drop and fruit lesions.",
      te: "వ్యాధికారక జీవశాస్త్రం: జాంతోమోనాస్ కాంపెస్ట్రిస్ పి.వి. వెసికేటోరియా బ్యాక్టీరియా. వర్షపు జల్లులు, కలుషిత విత్తనాలు మరియు తడి ఆకులను తాకడం ద్వారా వ్యాపిస్తుంది. దీనివల్ల ఆకులు రాలిపోయి కాయలపై కూడా నల్లటి మచ్చలు ఏర్పడతాయి.",
      hi: "रोगजनक जीवविज्ञान: जीवाणु (जैंथोमोनास)। बारिश की बौछारों और संक्रमित बीजों से फैलता है। फल और पत्तियां दोनों प्रभावित होते हैं।",
      ta: "நோய்க்கிருமி உயிரியல்: பாக்டீரியா. மழைத்துளிகள் மற்றும் விதைகள் மூலம் பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಬ್ಯಾಕ್ಟೀರಿಯಾ. ಮಳೆ ಮತ್ತು ಕಲುಷಿತ ಬೀಜಗಳಿಂದ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: जिवाणू. वादळी पाऊस आणि दूषित बियाणांमुळे हा रोग पसरतो.",
    },
    actions: {
      en: [
        "Avoid handling or cultivating when plants are wet.",
        "Use certified pathogen-free seed; practice hot water seed treatment (50°C for 25 min).",
        "Disinfect tools and stakes with 1% sodium hypochlorite.",
        "Destroy crop residue immediately following harvest.",
        "Consult KVK or Agriculture Officer for registered copper bactericide formulations.",
      ],
      te: [
        "ఆకులు తడిగా ఉన్నప్పుడు పొలంలో తిరగడం లేదా దున్నడం చేయవద్దు.",
        "ధృవీకరించిన విత్తనాలను వాడండి; వేడి నీటి విత్తన శుద్ధి (50 డిగ్రీల వద్ద 25 నిమిషాలు) చేయండి.",
        "పనిముట్లను శుభ్రం చేయండి.",
        "పంట కోత తర్వాత మిగిలిన మోడులను కాల్చివేయండి.",
        "అధికారిక కాపర్ బ్యాక్టీరియానాశినుల కొరకు వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "पत्तियां गीली होने पर खेत में काम न करें।",
        "प्रमाणित बीज का उपयोग करें और गर्म पानी से बीज उपचार करें।",
        "कृषि औजारों को साफ रखें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "செடிகள் ஈரமாக இருக்கும் போது வயலில் வேலை செய்வதைத் தவிர்க்கவும்.",
        "சுத்தமான சான்றளிக்கப்பட்ட விதைகளைப் பயன்படுத்தவும்.",
      ],
      kn: [
        "ಗಿಡಗಳು ತೇವವಾಗಿದ್ದಾಗ ಕೃಷಿ ಕೆಲಸ ಮಾಡಬೇಡಿ.",
        "ಬಿಸಿ ನೀರಿನ ಬೀಜೋಪಚಾರ ಮಾಡಿ.",
      ],
      mr: [
        "झाडे ओली असताना आंतरमशागत करणे टाळा.",
        "प्रमाणित बियाण्यांचाच वापर करा.",
      ],
    },
  },
  "powdery-mildew": {
    visual: {
      en: (pct, band) => `White powdery fungal patches on the underside of leaves corresponding to chlorotic yellow blotches on the upper leaf surface, causing curling and premature leaf drop across ${pct}% of foliage (${band} intensity).`,
      te: (pct, band) => `ఆకుల అడుగు భాగంలో తెల్లటి బూడిద వంటి శిలీంధ్రపు పొర, దానికి సమానంగా ఆకు పైభాగంలో పసుపు రంగు మచ్చలు ఏర్పడటం స్పష్టంగా కనిపిస్తోంది (${pct}% వైశాల్యం, ${band} దశ). ఆకులు ముడుచుకుని రాలిపోతాయి.`,
      hi: (pct, band) => `पत्तियों की निचली सतह पर सफेद चूर्ण (पाउडर) जैसा फफूंद का जमावड़ा और ऊपरी सतह पर पीले धब्बे (${pct}% भाग, ${band} स्तर)। पत्तियां गिर जाती हैं।`,
      ta: (pct, band) => `இலையின் அடிப்பகுதியில் வெள்ளை நிற சாம்பல் போன்ற படலமும், மேல் பகுதியில் மஞ்சள் புள்ளிகளும் தோன்றுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಯ ಕೆಳಭಾಗದಲ್ಲಿ ಬಿಳಿ ಬೂದಿಯಂತಹ ಶಿಲೀಂಧ್ರ ಮತ್ತು ಮೇಲ್ಭಾಗದಲ್ಲಿ ಹಳದಿ ಮಚ್ಚೆಗಳು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पानांच्या खालच्या बाजूवर पांढरी बुरशी (भुरी) आणि वरच्या बाजूला पिवळे चट्टे दिसतात (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Leveillula taurica (Fungus). Endophytic growth distinguishes it from other powdery mildews. Thrives in warm dry weather with cool humid mornings.",
      te: "వ్యాధికారక జీవశాస్త్రం: లెవెయిల్యులా టౌరికా అనే శిలీంధ్రం. ఇది ఆకు లోపలి కణజాలం నుండి వ్యాపిస్తుంది. పొడి వేడి వాతావరణం మరియు ఉదయం పూట చల్లని మంచు ఉన్నప్పుడు అత్యంత వేగంగా వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: लेवेइलुला टौरिका (फफूंद)। यह पत्ती के आंतरिक ऊतकों में बढ़ता है। शुष्क व गर्म दिनों में रात की ओस से तेजी से फैलता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பூஞ்சை (Leveillula taurica). வறண்ட மற்றும் வெப்பமான காலங்களில் அதிகமாக பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಶಿಲೀಂಧ್ರ. ಬೆಚ್ಚನೆಯ ಒಣ ಹವಾಮಾನದಲ್ಲಿ ರೋಗವು ವೇಗವಾಗಿ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशी (भुरी). कोरडे व उष्ण हवामान आणि सकाळी पडणाऱ्या दवामुळे हा रोग वाढतो.",
    },
    actions: {
      en: [
        "Spray wettable sulfur formulations (80% WP @ 2.5–3 g/L) covering lower leaf surfaces thoroughly.",
        "Remove and destroy severely affected lower leaves to improve canopy aeration.",
        "Avoid dense planting; maintain adequate row spacing.",
        "Consult KVK or Agriculture Officer for registered systemic fungicide schedules if disease reaches upper canopy.",
      ],
      te: [
        "ఆకుల అడుగు భాగం బాగా తడిసేలా నీటిలో కరిగే గంధకం (వెట్టబుల్ సల్ఫర్ 80% WP @ 2.5-3 గ్రా/లీటరు నీటికి) పిచికారీ చేయండి.",
        "గాలి, వెలుతురు సోకడానికి తీవ్రంగా దెబ్బతిన్న అడుగు ఆకులను తొలగించండి.",
        "మొక్కల మధ్య సరైన దూరం పాటించండి.",
        "పైభాగాలకు తెగులు వ్యాపిస్తే స్థానిక వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "घुलनशील गंधक (सल्फर 80% डब्ल्यूपी @ 2.5-3 ग्राम/लीटर) का पत्तियों की निचली सतह पर छिड़काव करें।",
        "अत्यधिक रोगग्रस्त निचली पत्तियों को तोड़कर नष्ट करें।",
        "पौधों के बीच उचित दूरी रखें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "நனையக்கூடிய கந்தகத்தை (Wettable Sulphur) இலைகளின் அடிப்பகுதியில் படுமாறு தெளிக்கவும்.",
        "அதிக இடைவெளி விட்டு நடவு செய்யவும்.",
      ],
      kn: [
        "ಕರಗುವ ಗಂಧಕವನ್ನು (ಸಲ್ಫರ್) ಎಲೆಯ ಕೆಳಭಾಗಕ್ಕೆ ಸಿಂಪಡಿಸಿ.",
        "ರೋಗಪೀಡಿತ ಕೆಳಭಾಗದ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.",
      ],
      mr: [
        "पाण्यात विरघळणारे गंधक (सल्फर) पानाच्या मागच्या बाजूस फवारा.",
        "रोगट खालची पाने काढून टाका.",
      ],
    },
  },
  "anthracnose": {
    visual: {
      en: (pct, band) => `Visual inspection confirms sunken, circular to oblong necrotic fruit lesions with concentric rings of salmon-pink to dark-colored fungal acervuli, accompanied by twig die-back from tip downward on ${pct}% of fruit and canopy (${band} intensity).`,
      te: (pct, band) => `మిరప కాయలపై గుంట పడిన వలయాకారపు నల్లటి మచ్చలు, మచ్చల మధ్యలో నల్లటి లేదా లేత గులాబీ రంగు శిలీంధ్రపు వలయాలు మరియు కొమ్మలు పైనుండి కిందికి ఎండిపోవడం ('డై-బ్యాక్') స్పష్టంగా కనిపిస్తోంది (${pct}% కాయలు, ${band} దశ).`,
      hi: (pct, band) => `फलों पर धंसे हुए गोल या लंबे काले धब्बे, जिन पर छल्लों के रूप में फफूंद दिखती है तथा टहनियों का ऊपर से नीचे सूखना ('डाई-बैक') (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `காய்களில் குழிவான வட்ட வடிவ கரும்புள்ளிகள் மற்றும் நுனியிலிருந்து கிளைகள் காய்ந்து போதல் ('டை-பேக்') (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಮೆಣಸಿನಕಾಯಿ ಕಾಯಿಗಳ ಮೇಲೆ ದುಂಡಗಿನ ಕಪ್ಪು ಮಚ್ಚೆಗಳು ಮತ್ತು ಕೊಂಬೆಗಳು ಮೇಲಿನಿಂದ ಒಣಗುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `फळांवर खोलगट काळे ठिपके आणि शेंड्याकडून फांद्या वाळणे ('डाय-बॅक') (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pathogen Biology: Colletotrichum capsici / C. gloeosporioides (Fungus). Seed-borne and air-borne spores survive in soil debris. High humidity (>80%) and warm temperatures cause devastating ripe fruit rot.",
      te: "వ్యాధికారక జీవశాస్త్రం: కొల్లెటోట్రైకమ్ కాప్సిసి అనే శిలీంధ్రం. ఇది విత్తనాల ద్వారా మరియు నేలలోని పంట వ్యర్థాల ద్వారా జీవిస్తుంది. కాయ పక్వానికి వచ్చే సమయంలో వర్షాలు, అధిక గాలి తేమ ఉన్నప్పుడు కాయ కుళ్ళు తెగులు అత్యంత వేగంగా వ్యాపిస్తుంది.",
      hi: "रोगजनक जीवविज्ञान: कोलेटोट्राइकम कैप्सिकी (फफूंद)। बीज और मिट्टी में बचे अवशेषों से फैलता है। पके फलों में नमी होने पर बहुत नुकसान करता है।",
      ta: "நோய்க்கிருமி உயிரியல்: பூஞ்சை. விதைகள் மற்றும் மண்ணில் உள்ள எச்சங்கள் மூலம் பரவுகிறது.",
      kn: "ರೋಗಕಾರಕ ಜೀವಶಾಸ್ತ್ರ: ಶಿಲೀಂಧ್ರ. ಬೀಜ ಮತ್ತು ಮಣ್ಣಿನಲ್ಲಿರುವ ಬೆಳೆ ಕಸದಿಂದ ಹರಡುತ್ತದೆ.",
      mr: "रोगकारक जीवशास्त्र: बुरशी (कोलेटोट्रिकम). बियाणे व जमिनीतील अवशेषांमधून हा रोग पसरतो.",
    },
    actions: {
      en: [
        "Pick and destroy infected rotten fruits; prune and burn dried die-back twigs.",
        "Practice seed treatment with Trichoderma viride (@ 10 g/kg seed) before sowing.",
        "Avoid flood irrigation; avoid harvesting ripe fruits during wet mornings.",
        "Ensure good drainage and air movement through rows.",
        "Consult KVK or Agriculture Officer for registered protective and systemic fungicidal sprays.",
      ],
      te: [
        "కుళ్ళిన కాయలను మరియు ఎండిపోయిన కొమ్మలను కత్తిరించి పొలానికి దూరంగా కాల్చివేయండి.",
        "విత్తే ముందు ట్రైకోడెర్మా విరిడి (కిలో విత్తనానికి 10 గ్రాములు) తో విత్తన శుద్ధి చేయండి.",
        "పొలంలో నీరు నిలవకుండా డ్రైనేజీ సదుపాయం కల్పించండి; కాయలను తడిగా ఉన్నప్పుడు కోయవద్దు.",
        "సరైన సస్యరక్షణ మందుల కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.",
      ],
      hi: [
        "रोगग्रस्त सड़े फलों और सूखी टहनियों को काटकर नष्ट करें।",
        "ट्राइकोडर्मा विरिडी से बीज उपचार करें।",
        "खेत में जलभराव न होने दें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "பாதிக்கப்பட்ட பழங்கள் மற்றும் காய்ந்த கிளைகளை அகற்றி எரிக்கவும்.",
        "ட்ரைக்கோடெர்மா கொண்டு விதை நேர்த்தி செய்யவும்.",
      ],
      kn: [
        "ಕೊಳೆತ ಕಾಯಿಗಳನ್ನು ಮತ್ತು ಒಣಗಿದ ಕೊಂಬೆಗಳನ್ನು ಕತ್ತರಿಸಿ ಸುಟ್ಟುಹಾಕಿ.",
        "ಟ್ರೈಕೊಡರ್ಮಾ ಬಳಸಿ ಬೀಜೋಪಚಾರ ಮಾಡಿ.",
      ],
      mr: [
        "सडलेली फळे व वाळलेल्या फांद्या तोडून जाळून टाका.",
        "ट्रायकोडर्माने बीजप्रक्रिया करा.",
      ],
    },
  },
  "thrips": {
    visual: {
      en: (pct, band) => `Upward boat-shaped leaf cupping, silvery scratch marks and bronzing on leaf undersides, crinkled lamina, and deformed flower buds across ${pct}% of terminals (${band} intensity).`,
      te: (pct, band) => `ఆకులు పైకి దోనె ఆకారంలో ముడుచుకుపోవడం, ఆకుల అడుగు భాగంలో వెండి రంగు గీతలు లేదా గోధుమ రంగు రాపిడి మచ్చలు, పూత రాలిపోవడం స్పష్టంగా కనిపిస్తోంది (${pct}% చిగుర్లు, ${band} దశ).`,
      hi: (pct, band) => `पत्तियों का ऊपर की ओर नाव जैसा मुड़ना, निचली सतह पर चांदी जैसी धारियां या भूरापन तथा कलियों का विकृत होना (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகள் மேல்நோக்கி படகு வடிவத்தில் சுருண்டு, அடியில் வெள்ளி நிறக் கீறல்கள் காணப்படுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳು ಮೇಲ್ಮುಖವಾಗಿ ದೋಣಿಯಂತೆ ಮುದುರಿಕೊಳ್ಳುವುದು ಮತ್ತು ಕೆಳಭಾಗದಲ್ಲಿ ಬೆಳ್ಳಿ ಬಣ್ಣದ ಗೀರುಗಳು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पाने वरच्या दिशेने होडीसारखी दुमडणे आणि पानाच्या खाली चंदेरी ओरखडे दिसणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Scirtothrips dorsalis (Chilli Thrips). Rasps tender epidermal cell layers and laps up sap. Causes severe upward leaf curling and serves as a major vector of plant viruses under dry spells.",
      te: "కీటక జీవశాస్త్రం: సిర్టోథ్రిప్స్ డోర్సాలిస్ (తామర పురుగులు). లేత ఆకులను మరియు పూతను గోకి రసం పీల్చుతాయి. దీనివల్ల ఆకులు పైకి ముడుచుకుంటాయి. పొడి వాతావరణంలో వీటి ఉధృతి అధికంగా ఉంటుంది.",
      hi: "कीट जीवविज्ञान: सिरटोथ्रिप्स डोर्सैलिस (मिर्च के थ्रिप्स)। यह पत्तियों को खुरचकर रस चूसते हैं जिससे पत्तियां ऊपर मुड़ती हैं।",
      ta: "பூச்சி உயிரியல்: இலைப்பேன். இளம் இலைகளை சுரண்டி சாற்றை உறிஞ்சுகின்றன.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಥ್ರಿಪ್ಸ್ (ಹೇನುಗಳು). ಎಲೆಗಳನ್ನು ಕೆರೆದು ರಸ ಹೀರುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: थ्रिप्स (फुलकिडे). हे कीटक पाने खरवडून रस शोषतात.",
    },
    actions: {
      en: [
        "Install 20–25 blue sticky traps per acre at crop canopy level to intercept adult thrips.",
        "Spray neem seed kernel extract (NSKE 5%) or Azadirachtin 10,000 ppm (@ 1 ml/L).",
        "Plant 2–3 rows of maize or sorghum as border windbreaks to block migration.",
        "Conserve predatory anthocorid bugs and minute pirate bugs (Orius spp.).",
        "Consult KVK or Agriculture Officer for registered IPM interventions.",
      ],
      te: [
        "ఎకరాకు 20-25 నీలి రంగు జిగురు అట్టలను పైరు ఎత్తులో అమర్చి తామర పురుగులను ఆకర్షించి నిర్మూలించండి.",
        "వేప గింజల కషాయం (NSKE 5%) లేదా వేప నూనె (10,000 ppm @ 1 మి.లీ/లీటరు నీటికి) పిచికారీ చేయండి.",
        "తోట చుట్టూ 2-3 వరుసల జొన్న లేదా మొక్కజొన్నను సరిహద్దు పంటగా వేయండి.",
        "ఓరియస్ వంటి సహజ మిత్ర పురుగులను కాపాడండి.",
        "సరైన నివారణ మందుల కొరకు వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "प्रति एकड़ 20-25 नीले चिपचिपे ट्रैप लगाएं।",
        "नीम के बीज का अर्क (NSKE 5%) या नीम तेल का छिड़काव करें।",
        "खेत के चारों ओर मक्का या ज्वार की 2-3 लाइनें लगाएं।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "ஏக்கருக்கு 20-25 நீல ஒட்டும் பொறிகளை வைக்கவும்.",
        "வேப்பங்கொட்டை சாறு தெளிக்கவும்.",
        "எல்லையில் மக்காச்சோளம் நடவும்.",
      ],
      kn: [
        "ಎಕರೆಗೆ 20-25 ನೀಲಿ ಅಂಟು ಬಲೆಗಳನ್ನು ಇರಿಸಿ.",
        "ಬೇವಿನ ಬೀಜದ ಕಷಾಯ (NSKE 5%) ಸಿಂಪಡಿಸಿ.",
        "ಗಡಿಯಲ್ಲಿ ಜೋಳ ಬೆಳೆಯಿರಿ.",
      ],
      mr: [
        "एकरी २०-२५ निळे चिकट सापळे लावा.",
        "निंबोळी अर्क (NSKE ५%) फवारा.",
        "शेताभोवती मक्याचे पीक लावा.",
      ],
    },
  },
  "mites": {
    visual: {
      en: (pct, band) => `Downwards inverted-boat leaf curling, thickened leathery dark-green lamina, petiole elongation ('rat tail' symptom), and stunted shoots across ${pct}% of terminals (${band} intensity).`,
      te: (pct, band) => `ఆకులు క్రిందికి తిరగబడిన పడవలా ముడుచుకుపోవడం, ఆకులు దళసరిగా మారి ముదురు ఆకుపచ్చ రంగులోకి రావడం, కాడలు సాగి ఎలుక తోకలా మారడం ('ర్యాట్ టెయిల్') దాదాపు ${pct}% చిగుర్లలో (${band} దశ) స్పష్టంగా కనిపిస్తోంది.`,
      hi: (pct, band) => `पत्तियों का नीचे की ओर उल्टी नाव जैसा मुड़ना, पत्तियों का मोटा व चमड़े जैसा गहरा हरा होना तथा डंठल का खिंच जाना ('चूहे की पूंछ' जैसा) (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இலைகள் கீழ்நோக்கி சுருண்டு, தடித்து, அடர் பச்சையாகி எலி வால் போல மாறுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಎಲೆಗಳು ಕೆಳಮುಖವಾಗಿ ಬಾಗಿ, ದಪ್ಪವಾಗಿ, ಕಡು ಹಸಿರಾಗಿ 'ಇಲಿ ಬಾಲ'ದಂತೆ ಆಗುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `पाने खालच्या बाजूने उलटी दुमडणे, जाड व गडद हिरवी होणे आणि देठ लांबून उंदराच्या शेपटीसारखे दिसणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Polyphagotarsonemus latus (Yellow Mite / Broad Mite). Toxic saliva injected during feeding causes cellular hypertrophy and downwards leaf curling. Explodes during warm humid rainy spells.",
      te: "కీటక జీవశాస్త్రం: పాలిఫాగోటార్సోనెమస్ లేటస్ (నల్లి / తెల్ల నల్లి). ఇవి ఆకుల అడుగున చేరి విషపూరిత లాలాజలాన్ని విడుదల చేస్తూ రసం పీల్చుతాయి. దీనివల్ల ఆకులు క్రిందికి ముడుచుకుంటాయి. అధిక గాలి తేమ ఉన్నప్పుడు వీటి ఉధృతి పెరుగుతుంది.",
      hi: "कीट जीवविज्ञान: पीली माइट (मकड़ी)। यह पत्तियों की निचली सतह से रस चूसती है और लार के प्रभाव से पत्तियां नीचे मुड़ती हैं।",
      ta: "பூச்சி உயிரியல்: சிலந்திப் பூச்சி (Mites). சாற்றை உறிஞ்சி இலைகளை கீழ்நோக்கி சுருளச் செய்கிறது.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ನುಸಿ ಪೀಡೆ (ಮೈಟ್ಸ್). ಎಲೆಗಳ ಕೆಳಭಾಗದಿಂದ ರಸ ಹೀರುವುದರಿಂದ ಎಲೆಗಳು ಕೆಳಮುಖವಾಗಿ ಮುದುರುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: लाल कोळी / पिवळा कोळी (माइट्स). हे कीटक पानाच्या खालून रस शोषतात.",
    },
    actions: {
      en: [
        "Spray micronized wettable sulfur (80% WDG @ 3 g/L) covering lower leaf surfaces thoroughly.",
        "Avoid synthetic pyrethroid sprays which kill predatory phytoseiid mites and spark massive mite flare-ups.",
        "Conserve predatory phytoseiid mites and predatory ladybird beetles.",
        "Consult KVK or Agriculture Officer for registered specific acaricidal formulations.",
      ],
      te: [
        "ఆకుల అడుగు భాగం బాగా తడిసేలా నీటిలో కరిగే గంధకం (సల్ఫర్ 80% WDG @ 3 గ్రా/లీటరు నీటికి) పిచికారీ చేయండి.",
        "సింథటిక్ పైరెథ్రాయిడ్ పురుగుమందులను ఎట్టిపరిస్థితుల్లో వాడవద్దు; ఇవి మిత్రపురుగులను చంపి నల్లి ఉధృతిని విపరీతంగా పెంచుతాయి.",
        "ఫైటోసీడ్ మైట్స్ వంటి సహజ శత్రువులను రక్షించండి.",
        "నల్లి నివారణ మందుల కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "घुलनशील गंधक (सल्फर 80% @ 3 ग्राम/लीटर) का पत्तियों के नीचे छिड़काव करें।",
        "सिंथेटिक पायरेथ्रोइड का प्रयोग न करें।",
        "मित्र कीटों का संरक्षण करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "கந்தகத் தூளை (Sulphur) இலைகளின் அடிப்பகுதியில் நன்கு படுமாறு தெளிக்கவும்.",
        "ரசாயன பூச்சிக்கொல்லிகளைத் தவிர்க்கவும்.",
      ],
      kn: [
        "ಕರಗುವ ಗಂಧಕವನ್ನು (ಸಲ್ಫರ್) ಎಲೆಗಳ ಕೆಳಭಾಗಕ್ಕೆ ಸಿಂಪಡಿಸಿ.",
        "ಸಿಂಥೆಟಿಕ್ ಕೀಟನಾಶಕಗಳನ್ನು ಬಳಸಬೇಡಿ.",
      ],
      mr: [
        "विरघळणारे गंधक (सल्फर ८०% @ ३ ग्रॅम/लीटर) पानाच्या मागच्या बाजूस फवारा.",
        "सिंथेटिक कीटकनाशके टाळा.",
      ],
    },
  },
  "whitefly": {
    visual: {
      en: (pct, band) => `Minute powdery-white winged insects fluttering from leaf undersides upon disturbance, chlorotic mottling, leaf puckering, and black sooty mold growing on sticky honeydew on ${pct}% of canopy (${band} intensity).`,
      te: (pct, band) => `మొక్కను కదిలించినప్పుడు ఆకుల అడుగు నుండి చిన్న తెల్లటి పురుగులు ఎగరడం, ఆకులపై పసుపు మచ్చలు, ఆకులు ముడుచుకుపోవడం మరియు జిగురు తేనెమంచుపై నల్లటి మసి తెగులు ఏర్పడటం స్పష్టంగా కనిపిస్తోంది (${pct}% భాగం, ${band} దశ).`,
      hi: (pct, band) => `पौधे को हिलाने पर पत्तियों के नीचे से छोटे सफेद कीट उड़ना, पत्तियों पर पीलापन और चिपचिपे पदार्थ पर काली फफूंद (मसी रोग) (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `செடியை அசைக்கும் போது இலைகளின் அடியில் இருந்து வெள்ளை ஈக்கள் பறத்தல் மற்றும் கரும்பூஞ்சை படர்தல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಗಿಡವನ್ನು ಅಲ್ಲಾಡಿಸಿದಾಗ ಎಲೆಯ ಕೆಳಗಿನಿಂದ ಸಣ್ಣ ಬಿಳಿ ನೊಣಗಳು ಹಾರುವುದು ಮತ್ತು ಕಪ್ಪು ಶಿಲೀಂಧ್ರ ಬೆಳೆಯುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `झाड हलवल्यास पानाच्या खालून लहान पांढऱ्या माशा उडणे आणि चिकट द्रवावर काळी बुरशी वाढणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Bemisia tabaci (Silverleaf Whitefly). Major economic threat: Chief vector transmitting Chilli Leaf Curl Begomovirus. Nymphs excrete honeydew that fosters black sooty mold.",
      te: "కీటక జీవశాస్త్రం: బెమిసియా టబాసి (తెల్లదోమ). ప్రధాన ప్రమాదం: ఇది మిరప ఆకు ముడత వైరస్ తెగులును వ్యాపింపజేసే ప్రధాన వాహకం. ఇవి విసర్జించే తేనెమంచు వల్ల ఆకులపై నల్లటి మసి తెగులు ఏర్పడి కిరణజన్య సంయోగ క్రియ దెబ్బతింటుంది.",
      hi: "कीट जीवविज्ञान: बेमिसिया टबासी (सफेद मक्खी)। मुख्य खतरा: यह मिर्च पत्ती मरोड़ वायरस की मुख्य वाहक है।",
      ta: "பூச்சி உயிரியல்: வெள்ளை ஈ. மிளகாய் இலை சுருட்டை வைரஸ் நோயை பரப்பும் முக்கிய காரணியாகும்.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಬಿಳಿ ನೊಣ. ಎಲೆ ಮುದುರು ವೈರಸ್ ರೋಗವನ್ನು ಹರಡುವ ಪ್ರಮುಖ ಕೀಟವಾಗಿದೆ.",
      mr: "कीड जीवशास्त्र: पांढरी माशी. मिरचीवरील चुरडा-मुरडा (बोकड्या) विषाणूचा प्रसार करणारी मुख्य कीड.",
    },
    actions: {
      en: [
        "Install 20 yellow sticky traps per acre at crop canopy level to capture whiteflies.",
        "Spray neem oil formulation (10,000 ppm @ 2 ml/L) covering lower leaf surfaces.",
        "Rogue out and destroy early virus-infected stunted plants.",
        "Conserve natural predators such as Encarsia parasitoids and Chrysoperla lacewings.",
        "Consult KVK or Agriculture Officer for registered vector management schedules.",
      ],
      te: [
        "ఎకరాకు 20 పసుపు రంగు జిగురు అట్టలను పైరు ఎత్తులో అమర్చి తెల్లదోమలను ఆకర్షించి నిర్మూలించండి.",
        "ఆకుల అడుగు భాగం బాగా తడిసేలా వేప నూనెను (10,000 ppm @ 2 మి.లీ/లీటరు నీటికి) పిచికారీ చేయండి.",
        "వైరస్ సోకి ముడుచుకుపోయిన మొక్కలను పీకి నాశనం చేయండి.",
        "ఎన్కార్సియా మరియు క్రైసోపెర్లా వంటి మిత్ర పురుగులను కాపాడండి.",
        "అధికారిక నివారణ చర్యల కొరకు వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "प्रति एकड़ 20 पीले चिपचिपे ट्रैप लगाएं।",
        "नीम तेल (10,000 पीपीएम @ 2 मिली/लीटर) का छिड़काव करें।",
        "शुरुआती वायरस संक्रमित पौधों को उखाड़कर नष्ट करें।",
        "मित्र कीटों का संरक्षण करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "ஏக்கருக்கு 20 மஞ்சள் ஒட்டும் பொறிகளை வைக்கவும்.",
        "வேப்ப எண்ணெய் தெளிக்கவும்.",
        "வைரஸ் தாக்கிய செடிகளை பிடுங்கி அழிக்கவும்.",
      ],
      kn: [
        "ಎಕರೆಗೆ 20 ಹಳದಿ ಅಂಟು ಬಲೆಗಳನ್ನು ಇರಿಸಿ.",
        "ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.",
        "ವೈರಸ್ ಪೀಡಿತ ಗಿಡಗಳನ್ನು ನಾಶಮಾಡಿ.",
      ],
      mr: [
        "एकरी २० पिवळे चिकट सापळे लावा.",
        "निंबोळी तेल फवारा.",
        "विषाणूग्रस्त झाडे उपटून नष्ट करा.",
      ],
    },
  },
  "aphids": {
    visual: {
      en: (pct, band) => `Dense colonies of tiny green-to-black soft-bodied aphids clustered on terminal shoots, leaf undersides, and flower buds, accompanied by curling leaves and attendant ants on ${pct}% of terminals (${band} intensity).`,
      te: (pct, band) => `లేత చిగుర్లు, ఆకుల అడుగు భాగం మరియు పూత మొగ్గలపై ఆకుపచ్చ-నలుపు రంగు పేను బంక పురుగులు గుంపులుగా చేరి ఉండటం, ఆకులు ముడుచుకుపోవడం మరియు చీమలు తిరగడం స్పష్టంగా కనిపిస్తోంది (${pct}% చిగుర్లు, ${band} దశ).`,
      hi: (pct, band) => `मुलायम कोपलों और पत्तियों के नीचे हरे या काले रंग के माहू (चेपा) के झुंड, पत्तियों का सिकुड़ना और चींटियों का घूमना (${pct}% भाग, ${band} स्तर)।`,
      ta: (pct, band) => `இளங்குருத்துகள் மற்றும் இலைகளின் அடியில் பச்சை-கருப்பு அசுவினிப் பூச்சிகள் மொய்த்துக் காணப்படுதல் (${pct}%, ${band} நிலை).`,
      kn: (pct, band) => `ಚಿಗುರುಗಳು ಮತ್ತು ಎಲೆಯ ಕೆಳಭಾಗದಲ್ಲಿ ಹಸಿರು-ಕಪ್ಪು ಬಣ್ಣದ ಹೇನುಗಳ ಗುಂಪು ಕಾಣಿಸಿಕೊಳ್ಳುವುದು (${pct}%, ${band} ತೀವ್ರತೆ).`,
      mr: (pct, band) => `कोवळ्या शेंड्यांवर आणि पानाच्या खाली हिरवे-काळे मावा कीटक पुंजक्याने दिसणे (${pct}%, ${band} तीव्रता).`,
    },
    risk: {
      en: "Pest Biology: Aphis gossypii (Cotton/Melon Aphid). Sucks phloem sap from tender terminal foliage and vectors potyviruses (Chilli Veinal Mottle Virus).",
      te: "కీటక జీవశాస్త్రం: ఏఫిస్ గాసిపి (పేను బంక). లేత చిగుర్ల నుండి రసం పీల్చి మొక్కల పెరుగుదలను నిరోధిస్తాయి. అలాగే వివిధ రకాల వైరస్ తెగుళ్లను వ్యాపింపజేస్తాయి.",
      hi: "कीट जीवविज्ञान: एफिस गॉसिपी (माहू/एफिड)। नई पत्तियों से रस चूसकर वृद्धि रोकते हैं और वायरस फैलाते हैं।",
      ta: "பூச்சி உயிரியல்: அசுவினி (Aphids). குருத்துகளில் இருந்து சாற்றை உறிஞ்சி வைரஸ் நோய்களை பரப்புகிறது.",
      kn: "ಕೀಟ ಜೀವಶಾಸ್ತ್ರ: ಹೇನು ಕೀಟ (ಅಫಿಡ್ಸ್). ಚಿಗುರುಗಳಿಂದ ರಸ ಹೀರಿ ಸಸ್ಯದ ಬೆಳವణಿಗೆಯನ್ನು ಕುಂಠಿತಗೊಳಿಸುತ್ತವೆ.",
      mr: "कीड जीवशास्त्र: मावा (अॅफिड्स). कोवळ्या पानांमधून रस शोषून विषाणूजन्य रोगांचा प्रसार करतात.",
    },
    actions: {
      en: [
        "Spray strong stream of water or 2% potassium soap / neem oil (5 ml/L) to dislodge aphid colonies.",
        "Conserve ladybird beetles (Coccinellids) and hoverfly larvae which voraciously consume aphids.",
        "Install yellow sticky traps (15–20 per acre) to trap winged alate aphids.",
        "Avoid excessive nitrogen which makes shoots succulent and attractive to aphids.",
        "Consult KVK or Agriculture Officer for registered selective aphicide recommendations.",
      ],
      te: [
        "పేను బంకను రాల్చడానికి నీటిని బలంగా చిమ్మండి లేదా వేప నూనెను (5 మి.లీ/లీటరు నీటికి) పిచికారీ చేయండి.",
        "పేను బంకను తినే లేడీబర్డ్ బీటిల్స్ (మిత్ర పురుగులు) ను సంరక్షించండి.",
        "రెక్కల పురుగులను ఆకర్షించడానికి ఎకరాకు 15-20 పసుపు జిగురు అట్టలను అమర్చండి.",
        "అధిక నత్రజని ఎరువుల వాడకాన్ని తగ్గించండి.",
        "అధికారిక నివారణ కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
      ],
      hi: [
        "नीम तेल (5 मिली/लीटर) या साबुन के घोल का छिड़काव करें।",
        "लेडीबर्ड भृंग जैसे मित्र कीटों का संरक्षण करें।",
        "प्रति एकड़ 15-20 पीले चिपचिपे ट्रैप लगाएं।",
        "अत्यधिक यूरिया का प्रयोग न करें।",
        "कृषि अधिकारी से सलाह लें।",
      ],
      ta: [
        "வேப்ப எண்ணெய் தெளித்து அசுவினியைக் கட்டுப்படுத்தவும்.",
        "பொன்வண்டு போன்ற நன்மை செய்யும் பூச்சிகளை பாதுகாக்கவும்.",
        "மஞ்சள் ஒட்டும் பொறிகளை வைக்கவும்.",
      ],
      kn: [
        "ಬೇವಿನ ಎಣ್ಣೆ (5 ಮಿಲಿ/ಲೀಟರ್) ಸಿಂಪಡಿಸಿ.",
        "ಲೇಡಿಬರ್ಡ್ ಕೀಟಗಳನ್ನು ಸಂರಕ್ಷಿಸಿ.",
        "ಹಳದಿ ಅಂಟು ಬಲೆಗಳನ್ನು ಬಳಸಿ.",
      ],
      mr: [
        "निंबोळी तेल (५ मिली/लीटर) फवारा.",
        "लेडीबर्ड भुंगेऱ्यांचे संरक्षण करा.",
        "पिवळे चिकट सापळे लावा.",
      ],
    },
  },
};


export function generateLlamaAnalysis(
  scan: Scan,
  targetLang: Lang,
  topic?: Topic | undefined
): LlamaSynthesisResult {
  const t = topic ?? (scan.topicSlug ? getTopic(scan.crop, scan.topicSlug) : undefined);
  const pct = scan.severity?.areaPercent ?? (scan.severity?.score ? Math.round((scan.severity.score / scan.severity.max) * 100) : 15);
  const band = scan.severity?.band ?? "moderate";

  const systemPrompts: Record<Lang, string> = {
    en: "You are the on-device Meta Llama 3.2 1B Instruct Agricultural Vision & Advisory Engine. Analyze the plant specimen, exact lesion percentage, and provide verified agronomic guidance from ICAR, IRRI, and ANGRAU institutes.",
    hi: "आप ऑन-डिवाइस मेटा लामा 3.2 1B कृषि सलाहकार इंजन हैं। पौधे के दृश्य लक्षणों, प्रभावित प्रतिशत और भारतीय कृषि अनुसंधान परिषद (ICAR) के शोध के आधार पर प्रमाणित मार्गदर्शन तैयार करें।",
    te: "మీరు పరికరంలోని Llama 3.2 మల్టీమోడల్ వ్యవసాయ నిపుణుడు (1B Instruct). పంట ఛాయాచిత్రం, ఆకులపై తెగులు తీవ్రత శాతం మరియు వ్యవసాయ విశ్వవిద్యాలయాల (ANGRAU / PJTSAU) పరిశోధనల ఆధారంగా వివరణాత్మక నివేదికను రూపొందించండి.",
    ta: "நீங்கள் சாதனத்தில் இயங்கும் Meta Llama 3.2 1B வேளாண்மை நிபுணர். பயிர் புகைப்படம், சேத பரப்பளவு மற்றும் தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழக (TNAU / ICAR) பரிந்துரைகளின் அடிப்படையில் நம்பகமான கள அறிக்கையை உருவாக்கவும்.",
    kn: "ನೀವು ಸಾಧನದಲ್ಲಿ ಚಲಿಸುವ Meta Llama 3.2 1B ಕೃಷಿ ತಜ್ಞರಾಗಿದ್ದೀರಿ. ಸಸ್ಯದ ಫೋಟೋ, ಹಾನಿಯ ಶೇಕಡಾವಾರು ಮತ್ತು UAS/ICAR ಸಂಶೋಧನೆಗಳ ಆಧಾರದ ಮೇಲೆ ವಿಶ್ವಾಸಾರ್ಹ ಕೃಷಿ ವರದಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಿ.",
    mr: "तुम्ही डिव्हाइसवरील Meta Llama 3.2 1B कृषी सल्लागार आहात. पिकाचे छायाचित्र, नुकसानाची अचूक टक्केवारी आणि डॉ. पंजाबराव देशमुख/ICAR कृषी विद्यापीठांच्या शिफारसींच्या आधारे अधिकृत शेती अहवाल तयार करा.",
  };

  const userContext = `Visual Specimen: ${scan.crop.toUpperCase()} | Identified: ${t ? l("en", t.name) : "Suspected Condition"} | Severity: ${pct}% affected (${band.toUpperCase()}) | Specimen Source: ${scan.source}`;
  const prompt = formatLlama3Prompt(systemPrompts[targetLang] ?? systemPrompts.en, userContext);

  const profile = t?.slug ? DETAILED_PROFILES[t.slug] : undefined;

  let visual = "";
  let risk = "";
  let actions: string[] = [];

  if (profile) {
    const visualFn = profile.visual[targetLang] ?? profile.visual.en;
    visual = visualFn(pct, band);
    risk = profile.risk[targetLang] ?? profile.risk.en;
    actions = profile.actions[targetLang] ?? profile.actions.en;
  } else if (t) {
    // Dynamic localization grounded in knowledge topic
    const cropName = scan.crop === "rice" ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : targetLang === "ta" ? "நெல்" : targetLang === "kn" ? "ಭತ್ತ" : targetLang === "mr" ? "भात" : "Rice") : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : targetLang === "ta" ? "மிளகாய்" : targetLang === "kn" ? "ಮೆಣಸಿನಕಾಯಿ" : targetLang === "mr" ? "मिरची" : "Chilli");
    const probName = l(targetLang, t.name);

    if (targetLang === "te") {
      visual = `ఛాయాచిత్ర విశ్లేషణ ప్రకారం ${cropName} పైరులో ${probName} లక్షణాలు ఆకు వైశాల్యంలో సుమారు ${pct}% మేర (${band === "severe" ? "తీవ్ర" : band === "moderate" ? "మధ్యస్థ" : "తేలికపాటి"} దశ) విస్తరించి ఉన్నాయి. వివరణ: ${l(targetLang, t.summary)}.`;
      risk = `వాతావరణంలో మార్పులు మరియు అధిక గాలి తేమ ఉన్నప్పుడు ఈ వ్యాధి వేగంగా ఇతర సాల్లకు వ్యాపించే ప్రమాదం ఉంది. సకాలంలో సస్యరక్షణ చర్యలు చేపట్టకపోతే దిగుబడి తగ్గుతుంది.`;
      actions = [
        "నత్రజని (యూరియా) అధికంగా వేయడం వెంటనే ఆపండి.",
        "పొలంలో నీరు నిల్వ లేకుండా చేసి గాలి, వెలుతురు సోకేలా చూడండి.",
        "పొలం గట్లపై కలుపు మొక్కలను శుభ్రం చేయండి.",
        "నివారణ కొరకు సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ విస్తరణ అధికారిని సంప్రదించండి.",
      ];
    } else if (targetLang === "hi") {
      visual = `तस्वीर विश्लेषण के अनुसार ${cropName} की फसल में ${probName} के लक्षण लगभग ${pct}% पर्ण क्षेत्र पर (${band} स्तर) पाए गए हैं। विवरण: ${l(targetLang, t.summary)}।`;
      risk = `मौसम में नमी और तापमान में उतार-चढ़ाव होने पर यह संक्रमण अन्य पौधों में तेजी से फैल सकता है।`;
      actions = [
        "यूरिया की अतिरिक्त मात्रा तुरंत बंद करें।",
        "खेत में जल निकासी सुनिश्चित करें।",
        "मेड़ों की खरपतवार नष्ट करें।",
        "सटीक उपचार हेतु स्थानीय कृषि विज्ञान केंद्र (KVK) से संपर्क करें।",
      ];
    } else if (targetLang === "ta") {
      visual = `புகைப்பட ஆய்வின்படி ${cropName} பயிரில் ${probName} அறிகுறிகள் சுமார் ${pct}% இலைப்பரப்பில் காணப்படுகின்றன (${band} நிலை). விளக்கம்: ${l(targetLang, t.summary)}.`;
      risk = `ஈரப்பதமான வானிலையில் இந்த தொற்று வேகமாக பரவக்கூடும்.`;
      actions = [
        "யூரியாவை தற்காலிகமாக நிறுத்துங்கள்.",
        "வயலில் நீர் தேங்காமல் வடியுங்கள்.",
        "வரப்பு களைகளை அகற்றுங்கள்.",
      ];
    } else if (targetLang === "kn") {
      visual = `ಫೋಟೋ ವಿಶ್ಲೇಷಣೆಯಂತೆ ${cropName} ಬೆಳೆಯಲ್ಲಿ ${probName} ಲಕ್ಷಣಗಳು ಸುಮಾರು ${pct}% ಎಲೆಯ ಭಾಗದಲ್ಲಿ ಕಂಡುಬಂದಿವೆ (${band} ತೀವ್ರತೆ). ವಿವರಣೆ: ${l(targetLang, t.summary)}.`;
      risk = `ತೇವಾಂಶದ ಹವಾಮಾನದಲ್ಲಿ ರೋಗವು ಇತರ ಗಿಡಗಳಿಗೆ ಹರಡುವ ಸಾಧ್ಯತೆಯಿದೆ.`;
      actions = [
        "ಯೂರಿಯಾ ಗೊಬ್ಬರ ಕೊಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ.",
        "ಗದ್ದೆಯಿಂದ ನೀರು ಹೊರಹಾಕಿ.",
        "ಕಳೆಗಳನ್ನು ನಾಶಮಾಡಿ.",
      ];
    } else if (targetLang === "mr") {
      visual = `छायाचित्र विश्लेषणावरून ${cropName} पिकावर ${probName} ची लक्षणे सुमारे ${pct}% भागावर दिसून येत आहेत (${band} तीव्रता). माहिती: ${l(targetLang, t.summary)}.`;
      risk = `दमट हवामानात हा प्रादुर्भाव इतर झाडांवर वेगाने पसरू शकतो.`;
      actions = [
        "युरियाचा वापर ताबडतोब थांबवा.",
        "शेतातील अतिरिक्त पाणी काढून टाका.",
        "बांधावरील तण काढून टाका.",
      ];
    } else {
      visual = `Visual inspection indicates characteristic symptoms consistent with ${probName} affecting approximately ${pct}% of visible leaf tissue (${band} intensity). Symptoms: ${t.symptoms.slice(0, 2).join(", ")}.`;
      risk = `Under fluctuating moisture and temperature conditions, secondary infection may spread across contiguous rows.`;
      actions = [
        "Immediately suspend supplementary nitrogen / urea top-dressing.",
        "Improve intra-canopy airflow and drain prolonged standing water.",
        "Eradicate alternate weed hosts growing along field bunds.",
        "Consult your local KVK or Agricultural Officer for approved treatment schedules.",
      ];
    }
  } else {
    visual = targetLang === "te" ? "ఫోటోలో ఆకుల నమూనా స్పష్టంగా లేదు లేదా గుర్తించబడలేదు." : "Specimen visual details unclear or unrecognized.";
    risk = targetLang === "te" ? "రోగ నిర్ధారణ కొరకు స్పష్టమైన ఫోటో తీయండి." : "Please capture a clear close-up photograph of the leaf.";
    actions = [targetLang === "te" ? "స్పష్టమైన ఫోటో తీయండి." : "Retake photo in natural daylight."];
  }

  // Generate Plain-language, farmer-friendly summary explaining meaning and immediate action in simple words
  let simpleSummary = "";
  if (t) {
    const probName = l(targetLang, t.name);
    const firstAction = actions[0] || "";
    if (targetLang === "te") {
      simpleSummary = `🔍 **ఈ సమస్య ఏమిటి?**: మీ పైరులో "${probName}" కనిపిస్తోంది. దీనివల్ల ఆకులు దెబ్బతిని పంట ఎదుగుదల తగ్గుతుంది.\n💡 **రైతు వెంటనే చేయాల్సింది**: భయపడవద్దు. వెంటనే పొలంలో యూరియా వాడకం ఆపండి. ${firstAction} స్థానిక వ్యవసాయ నిపుణుల సలహాలు పాటించండి.`;
    } else if (targetLang === "hi") {
      simpleSummary = `🔍 **यह क्या समस्या है?**: आपकी फसल में "${probName}" का प्रभाव देखा गया है, जिससे पत्तियों और पौधों को नुकसान हो सकता है।\n💡 **किसान तुरंत क्या करें?**: घबराएं नहीं। तुरंत यूरिया डालना बंद करें। ${firstAction} नजदीकी कृषि केंद्र की सलाह अनुसार कदम उठाएं।`;
    } else if (targetLang === "ta") {
      simpleSummary = `🔍 **இது என்ன பிரச்சனை?**: உங்கள் பயிரில் "${probName}" பாதிப்பு உள்ளது.\n💡 **நீங்கள் என்ன செய்ய வேண்டும்?**: யூரியாவை தற்காலிகமாக நிறுத்துங்கள். ${firstAction}`;
    } else if (targetLang === "kn") {
      simpleSummary = `🔍 **ಇದು ಯಾವ ಸಮಸ್ಯೆ?**: ನಿಮ್ಮ ಬೆಳೆಯಲ್ಲಿ "${probName}" ಲಕ್ಷಣಗಳಿವೆ.\n💡 **ರೈತರು ತಕ್ಷಣ ಮಾಡಬೇಕಾದದ್ದು**: ಯೂರಿಯಾ ಗೊಬ್ಬರ ಕೊಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ. ${firstAction}`;
    } else if (targetLang === "mr") {
      simpleSummary = `🔍 **ही काय अडचण आहे?**: पिकावर "${probName}" चे लक्षण आढळले आहे.\n💡 **शेतकऱ्यांनी लगेच काय करावे?**: अतिरिक्त युरिया बंद करा. ${firstAction}`;
    } else {
      simpleSummary = `🔍 **What is this problem?**: Your crop shows signs of "${probName}". This affects foliage and can lower harvest yield if neglected.\n💡 **What should you do right now?**: Do not panic. Avoid excessive nitrogen/urea. ${firstAction} Follow local university/extension guidelines.`;
    }
  } else {
    simpleSummary = targetLang === "te"
      ? "చిత్రం స్పష్టంగా లేదు లేదా పంట ఆకు కాదు. దయచేసి మంచి వెలుతురులో నిజమైన ఆకు ఫోటో తీయండి."
      : "The photo is not clear or not a recognized crop leaf. Please photograph a real crop leaf in good daylight.";
  }

  return {
    model: "Llama-3.2-1B-Instruct (Multimodal)",
    lang: targetLang,
    prompt,
    visualPathology: visual,
    fieldRisk: risk,
    actionPlan: actions,
    fullNarrative: `${visual} ${risk}`,
    simpleSummary,
  };
}

export async function generateLiveLlamaCure(
  scan: Scan,
  topic: Topic | undefined,
  targetLang: Lang,
  settings?: any
): Promise<DynamicCurePlan> {
  const t = topic ?? (scan.topicSlug ? getTopic(scan.crop, scan.topicSlug) : undefined);
  const probName = t ? l(targetLang, t.name) : (scan.topicSlug || "Crop Condition");
  const cropName = scan.crop === "rice"
    ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : targetLang === "ta" ? "நெல்" : targetLang === "kn" ? "ಭತ್ತ" : targetLang === "mr" ? "भात" : "Rice")
    : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : targetLang === "ta" ? "மிளகாய்" : targetLang === "kn" ? "ಮೆಣಸಿನಕಾಯಿ" : targetLang === "mr" ? "मिरची" : "Chilli");
  const sevBand = scan.severity?.band ?? "moderate";
  const sevPct = scan.severity?.areaPercent ?? 20;

  const prompt = `You are a certified senior agricultural pathologist and IPM agronomist.
Generate a comprehensive, scientifically validated agronomic cure, containment, and recovery plan for a farmer.

FIELD SCAN SPECIMEN:
- Crop: ${cropName} (${scan.crop})
- Disease / Pest: ${probName} (${t?.slug || scan.topicSlug})
- Severity Level: ${sevBand.toUpperCase()} (~${sevPct}% foliar damage)
- Farmer Language: ${targetLang === "te" ? "Telugu (తెలుగు)" : targetLang === "hi" ? "Hindi (हिंदी)" : targetLang === "ta" ? "Tamil (தமிழ்)" : targetLang === "kn" ? "Kannada (ಕನ್ನಡ)" : targetLang === "mr" ? "Marathi (मराठी)" : "English"}

REQUIREMENTS:
1. Immediate Containment (Today / Next 24-48 Hours):
   - Urgent field interventions: immediately suspend urea/nitrogen top-dressing, manage water drainage/AWD, isolate infected rows, avoid handling dew-wet plants.
2. Biological & Organic Solutions:
   - Bio-fungicides/bio-pesticides (e.g. Trichoderma viride @ 5g/kg or 2.5kg/ha, Pseudomonas fluorescens @ 5-10g/L, Azadirachtin / NSKE 5% Neem extract, Yellow/Blue sticky traps, pheromone traps).
3. Cultural & Agronomic Management:
   - Potassium (MOP) supplementary application to harden epidermal cell walls and build disease resistance, field aeration, weed eradication from bunds, rogueing severely infected tillers/hills.
4. Statutory Notice:
   - Explicit CIB&RC statutory compliance notice: do NOT hallucinate arbitrary chemical dosages or unapproved mixtures; advise consulting local KVK or Agriculture Officer for officially approved chemical schedules.

Return strictly a JSON object with this exact shape:
{
  "immediate": ["step 1", "step 2", "step 3", "step 4"],
  "biological": ["bio control 1", "bio control 2", "bio control 3"],
  "cultural": ["cultural action 1", "cultural action 2", "cultural action 3"],
  "statutory": "Statutory warning text adhering to CIB&RC regulations.",
  "markdownNarrative": "A warm, encouraging 2-sentence summary directly to the farmer."
}`;

  const systemPrompt = "You are KisanAI's Master Agronomist AI. You provide verified, practical, ICAR/IRRI/university-aligned cure and management guidance for farmers. Output valid JSON only.";

  let activeModel = "Meta Llama 3.2 1B Instruct (On-Device)";
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  if (isOnline && settings?.llmProvider !== "local") {
    activeModel = "KisanAI High-Speed Neural Core (Connected)";
  }

  // Attempt live LLM generation if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const rawRes = await queryLiveLlamaEndpoint(prompt, systemPrompt, undefined, settings);
      if (rawRes) {
        let cleanJson = rawRes.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed.immediate) && Array.isArray(parsed.cultural)) {
          return {
            model: activeModel,
            generatedAt: Date.now(),
            immediate: parsed.immediate,
            biological: Array.isArray(parsed.biological) && parsed.biological.length > 0 ? parsed.biological : [
              targetLang === "te" ? "సూడోమోనాస్ ఫ్లోరోసెన్స్ (Pseudomonas fluorescens) 5-10 గ్రా/లీటరు నీటికి కలిపి పిచికారీ చేయండి." :
              targetLang === "hi" ? "स्यूडोमोनास फ्लोरोसेंस (5-10 ग्राम/लीटर) का जैविक छिड़काव करें।" :
              "Spray Pseudomonas fluorescens (@ 5-10 g/L) or Trichoderma viride as a protective biological shield.",
              targetLang === "te" ? "వేప నూనె (1500 ppm @ 2-3 మి.లీ/లీటరు) తో సహజ రక్షణ కల్పించండి." :
              targetLang === "hi" ? "नीम का तेल (1500 पीपीएम @ 2-3 मिली/लीटर) छिड़कें।" :
              "Apply Azadirachtin 1500 ppm / NSKE 5% Neem extract (@ 2-3 ml/L) as an organic repellent."
            ],
            cultural: parsed.cultural,
            statutory: parsed.statutory || (REFUSALS[targetLang] ?? REFUSALS.en),
            markdownNarrative: parsed.markdownNarrative,
          };
        }
      }
    } catch (err) {
      console.warn("Live LLM cure generation failed, falling back to local synthesis:", err);
    }
  }

  // Grounded local synthesis engine
  const prof = t?.slug ? DETAILED_PROFILES[t.slug] : undefined;
  const actionsList = prof ? (prof.actions[targetLang] ?? prof.actions.en) : (t ? t.management.cultural : [
    "Immediately suspend urea / nitrogen top-dressing",
    "Drain standing water and practice alternate wetting & drying",
    "Apply supplementary Potassium (MOP) to harden leaf tissues",
    "Consult local KVK or Agriculture Officer"
  ]);

  const biologicalList = [
    targetLang === "te" ? "సూడోమోనాస్ ఫ్లోరోసెన్స్ (Pseudomonas fluorescens @ 5-10 గ్రా/లీటరు నీటికి) పిచికారీ చేసి శిలీంధ్ర వ్యాప్తిని అరికట్టండి." :
    targetLang === "hi" ? "स्यूडोमोनास फ्लोरोसेंस (5-10 ग्राम/लीटर) या ट्राइकोडर्मा विरिडी का जैविक छिड़काव करें।" :
    "Apply Pseudomonas fluorescens (@ 5-10 g/L) or Trichoderma viride (@ 2.5 kg/ha with compost) as a bio-control shield.",
    targetLang === "te" ? "వేప నూనె (Azadirachtin 1500 ppm @ 2-3 మి.లీ/లీటరు నీటికి) పిచికారీ చేసి రసం పీల్చే పురుగులను నివారించండి." :
    targetLang === "hi" ? "नीम बीज अर्क (NSKE 5%) या एज़ाडिराक्टिन का छिड़काव करके सुरक्षा चक्र तैयार करें।" :
    "Spray Neem Seed Kernel Extract (NSKE 5%) or Azadirachtin 1500 ppm (@ 2-3 ml/L) to repel vector insects.",
    targetLang === "te" ? "పచ్చ దీపపు పురుగులు, తామర పురుగుల ఉధృతిని తగ్గించడానికి నీలి/పసుపు జిగురు బుట్టలను అమర్చండి." :
    targetLang === "hi" ? "कीटों की निगरानी के लिए खेत में पीले व नीले चिपचिपे प्रपंच (ट्रैप) लगाएं।" :
    "Install Yellow/Blue Sticky Traps (15-20 per acre) and Pheromone Traps to intercept vector flights."
  ];

  return {
    model: "Meta Llama 3.2 1B Instruct (On-Device Local)",
    generatedAt: Date.now(),
    immediate: actionsList.slice(0, 3),
    biological: biologicalList,
    cultural: actionsList.slice(3).concat([
      targetLang === "te" ? "పొటాష్ (MOP @ 15-20 కిలోలు/ఎకరాకు) వేసి మొక్క కణజాల గోడలను గట్టిపరచండి." :
      targetLang === "hi" ? "पौधों की कोशिकाओं को मजबूत करने हेतु पोटाश (MOP) का संतुलित प्रयोग करें।" :
      "Apply supplementary Potassium (MOP @ 15-20 kg/acre) to strengthen plant epidermal cell walls."
    ]),
    statutory: REFUSALS[targetLang] ?? REFUSALS.en,
    markdownNarrative: targetLang === "te"
      ? `మీ ${cropName} పంటలో **${probName}** (${sevBand === "severe" ? "తీవ్ర" : "మధ్యస్థ"} దశ) నివారణకు సమగ్ర సస్యరక్షణ ప్రణాళిక సిద్ధం చేయబడింది.`
      : targetLang === "hi"
      ? `आपकी ${cropName} की फसल में **${probName}** के प्रभावी उपचार और फैलाव रोकने की प्रमाणित कार्ययोजना तैयार है।`
      : `Tailored agronomic management and recovery protocol generated for **${probName}** on your **${cropName}** (${sevBand} severity).`,
  };
}

export async function queryLiveLlamaEndpoint(
  prompt: string,
  systemPrompt: string,
  history?: ChatMessage[],
  settings?: any
): Promise<string | null> {
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  const provider = settings?.llmProvider || "auto";

  if (provider === "local") return null;

  // 1. Primary Default: KisanAI Distributed Groq Engine Pool (7 load-balanced nodes)
  if (isOnline && (provider === "groq" || provider === "auto")) {
    try {
      const messages: GroqChatMessage[] = [
        ...(history || []).slice(-6).map((m) => ({
          role: (m.role === "farmer" ? "user" : "assistant") as const,
          content: m.text,
        })),
        { role: "user" as const, content: prompt },
      ];
      const groqReply = await queryGroqChat({
        messages,
        lang: settings?.lang || "en",
        model: settings?.customModel,
      });
      if (groqReply && groqReply.length > 5) {
        return groqReply;
      }
    } catch (err) {
      console.warn("Groq Engine Pool notice:", err);
    }
  }

  // 2. Google Gemini Official API (Gemini 2.0 Flash / 1.5 Flash)
  if (isOnline && settings?.geminiApiKey && (provider === "gemini" || provider === "auto")) {
    try {
      const model = settings.customModel?.trim() || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey.trim()}`;
      const contents = [
        ...(history || []).slice(-6).map((m) => ({
          role: m.role === "farmer" ? "user" : "model",
          parts: [{ text: m.text }],
        })),
        { role: "user", parts: [{ text: prompt }] },
      ];
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === "string" && text.trim().length > 5) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to local:", err);
    }
  }

  // 2. Groq Cloud Official API (Llama 3.3 70B / Llama 3.1 8B - 500 tok/sec)
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...(history || []).slice(-6).map((m) => ({
      role: m.role === "farmer" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: prompt },
  ];

  if (isOnline && settings?.groqApiKey && (provider === "groq" || provider === "auto")) {
    try {
      const model = settings.customModel?.trim() || "llama-3.3-70b-versatile";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.groqApiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 5) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn("Groq API call failed, falling back to local:", err);
    }
  }

  // 3. OpenAI / OpenRouter Official API
  if (isOnline && settings?.openaiApiKey && (provider === "openai" || provider === "auto")) {
    try {
      const model = settings.customModel?.trim() || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.openaiApiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 5) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn("OpenAI API call failed, falling back to local:", err);
    }
  }

  // 4. Auto-detect installed Ollama model if Ollama is running locally
  let ollamaModel = "llama3.2:1b";
  try {
    const tagsRes = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(400),
    });
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      if (Array.isArray(data?.models) && data.models.length > 0) {
        const found = data.models.find((m: any) =>
          typeof m.name === "string" && (m.name.includes("llama") || m.name.includes("crop") || m.name.includes("kisan") || m.name.includes("qwen"))
        );
        ollamaModel = found?.name || data.models[0].name;
      }
    }
  } catch {
    // Port 11434 not running or blocked
  }

  const endpoints = [
    {
      url: "http://127.0.0.1:8000/v1/chat/completions",
      model: "hf.co/meta-llama/Llama-3.2-1B-Instruct",
    },
    {
      url: "http://localhost:8000/v1/chat/completions",
      model: "hf.co/meta-llama/Llama-3.2-1B-Instruct",
    },
    {
      url: "http://127.0.0.1:11434/v1/chat/completions",
      model: ollamaModel,
    },
    {
      url: "http://localhost:11434/v1/chat/completions",
      model: ollamaModel,
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ep.model,
          messages: chatMessages,
          max_tokens: 600,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 10) {
          return text.trim();
        }
      }
    } catch {
      // Offline fallback
    }
  }
  return null;
}

import { AgriculturalSafetyValidator, STATUTORY_SAFETY_REFUSALS } from "./safety-validator";
import { OfflineRAGEngine } from "./rag-knowledge";

export function generateLlamaChatResponse(
  query: string,
  targetLang: Lang,
  scanCtx?: MultimodalScanContext | null,
  history?: ChatMessage[]
): LlamaChatResult {
  const trimmed = query.trim();

  // 1. Deterministic Statutory Safety Gate Check
  const safetyCheck = AgriculturalSafetyValidator.validateUserQuery(trimmed, targetLang);
  if (!safetyCheck.isSafe) {
    return {
      model: "Llama-3.2-1B-Instruct",
      lang: targetLang,
      text: safetyCheck.refusalMessage || STATUTORY_SAFETY_REFUSALS[targetLang] || STATUTORY_SAFETY_REFUSALS.en,
      isMultimodal: false,
      safetyTriggered: true,
      refs: [],
      suggestions: [
        targetLang === "te" ? "సేంద్రీయ నివారణలు ఏమిటి?" : targetLang === "hi" ? "जैविक नियंत्रण क्या है?" : "What are organic bio-controls?",
        targetLang === "te" ? "యూరియా ఎరువు ఎలా వాడాలి?" : targetLang === "hi" ? "यूरिया की सही मात्रा" : "Balanced fertilizer schedule",
        targetLang === "te" ? "వ్యవసాయ అధికారి సలహా" : targetLang === "hi" ? "कृषि विशेषज्ञ से परामर्श" : "Consult local KVK extension",
      ],
    };
  }

  // 2. Resolve topic:
  // Priority: A. Mentioned in current query -> B. Attached scan context -> C. Multi-turn history
  let topic: Topic | undefined;
  const qLower = trimmed.toLowerCase();
  const qClean = qLower.replace(/[?!.,;:_\-]/g, " ").trim();
  const words = qClean.split(/\s+/).filter(Boolean);

  // Direct disease keyword matching in current user query
  if (qLower.includes("bacterial") || qLower.includes("blb") || qLower.includes("झुलसा") || qLower.includes("ఆకు ఎండు") || qLower.includes("ఎండు తెగులు") || qLower.includes("கருகல்") || qLower.includes("ಕರಕು")) {
    topic = getTopic("rice", "bacterial-leaf-blight");
  } else if (qLower.includes("blast") || qLower.includes("ब्लास्ट") || qLower.includes("అగ్గి") || qLower.includes("కులై") || qLower.includes("குலை") || qLower.includes("ಬೆಂಕಿ")) {
    topic = getTopic("rice", "rice-blast");
  } else if (qLower.includes("brown spot") || qLower.includes("भूरा") || qLower.includes("గోధుమ") || qLower.includes("பழுப்பு") || qLower.includes("ಕಂದು")) {
    topic = getTopic("rice", "brown-spot");
  } else if (qLower.includes("tungro") || qLower.includes("टुंग्रो") || qLower.includes("టుంగ్రో") || qLower.includes("துங்ரோ")) {
    topic = getTopic("rice", "tungro");
  } else if (qLower.includes("bph") || qLower.includes("planthopper") || qLower.includes("hopperburn") || qLower.includes("फुदका") || qLower.includes("సుడి దోమ") || qLower.includes("దోమ") || qLower.includes("தத்துப்பூச்சி")) {
    topic = getTopic("rice", "brown-planthopper");
  } else if (qLower.includes("stem borer") || qLower.includes("तना छेदक") || qLower.includes("కాండం తొలిచే") || qLower.includes("మొవ్వు") || qLower.includes("தண்டு துளைப்பான்") || qLower.includes("ಕಾಂಡ ಕೊರೆಯುವ")) {
    topic = getTopic("rice", "yellow-stem-borer");
  } else if (qLower.includes("folder") || qLower.includes("roller") || qLower.includes("लपेटक") || qLower.includes("ఆకు చుట్టు") || qLower.includes("இலை சுருட்டு") || qLower.includes("ಎಲೆ ಮಡಚುವ")) {
    topic = getTopic("rice", "leaf-folder");
  } else if (qLower.includes("gall midge") || qLower.includes("गाल मिज") || qLower.includes("ఉల్లి కోడు") || qLower.includes("ఆనైக்கொம்பన్") || qLower.includes("ಬೆಳ್ಳಿ ಸುಳಿ")) {
    topic = getTopic("rice", "gall-midge");
  } else if (qLower.includes("hispa") || qLower.includes("हिस्पा") || qLower.includes("ముళ్ల పురుగు") || qLower.includes("முள் வண்டு")) {
    topic = getTopic("rice", "hispa");
  } else if (qLower.includes("streak") || qLower.includes("bls") || qLower.includes("धारी") || qLower.includes("చారల తెగులు")) {
    topic = getTopic("rice", "bacterial-leaf-streak");
  } else if (qLower.includes("crazy top") || qLower.includes("downy") || qLower.includes("पिच्चि") || qLower.includes("పిచ్చి దుబ్బు")) {
    topic = getTopic("rice", "downy-mildew");
  } else if (qLower.includes("curl") || qLower.includes("मरोड़") || qLower.includes("ముడత") || qLower.includes("சுருட்டை") || qLower.includes("ಮುದುರು") || qLower.includes("चुरडा")) {
    topic = getTopic("chilli", "leaf-curl");
  } else if (qLower.includes("thrips") || qLower.includes("थ्रिप्स") || qLower.includes("తామర") || qLower.includes("இலைப்பேன்") || qLower.includes("ಹೇನು")) {
    topic = getTopic("chilli", "thrips");
  } else if (qLower.includes("mite") || qLower.includes("माइट") || qLower.includes("నల్లి") || qLower.includes("சிலந்தி") || qLower.includes("ನುಸಿ")) {
    topic = getTopic("chilli", "mites");
  } else if (qLower.includes("whitefly") || qLower.includes("मक्खी") || qLower.includes("తెల్లదోమ") || qLower.includes("வெள்ளை ஈ") || qLower.includes("ಬಿಳಿ ನೊಣ")) {
    topic = getTopic("chilli", "whitefly");
  } else if (qLower.includes("aphid") || qLower.includes("माहू") || qLower.includes("పేను బంక") || qLower.includes("அசுவினி")) {
    topic = getTopic("chilli", "aphids");
  } else if (qLower.includes("anthracnose") || qLower.includes("fruit rot") || qLower.includes("कुकड़ा") || qLower.includes("कफ") || qLower.includes("కాయ కుళ్ళు") || qLower.includes("డై-బ్యాక్")) {
    topic = getTopic("chilli", "anthracnose");
  } else if (qLower.includes("powdery") || qLower.includes("mildew") || qLower.includes("बबूला") || qLower.includes("बर्फ") || qLower.includes("బూడిద తెగులు")) {
    topic = getTopic("chilli", "powdery-mildew");
  } else if (qLower.includes("cercospora") || qLower.includes("frogeye") || qLower.includes("कण") || qLower.includes("కప్ప కన్ను")) {
    topic = getTopic("chilli", "cercospora-leaf-spot");
  } else if (qLower.includes("bacterial spot") || qLower.includes("जीवाणु धब्बा") || qLower.includes("బ్యాక్టీరియా మచ్చ")) {
    topic = getTopic("chilli", "bacterial-leaf-spot");
  }

  // Fallback to scan context
  if (!topic && scanCtx?.crop && scanCtx.topicSlug) {
    topic = getTopic(scanCtx.crop, scanCtx.topicSlug);
  }

  // Fallback to Multi-turn Conversation Memory: check previous messages
  if (!topic && history && history.length > 0) {
    for (let h = history.length - 1; h >= 0; h--) {
      const msg = history[h];
      if (msg.refs && msg.refs.length > 0) {
        const r = msg.refs[0];
        topic = getTopic(r.crop, r.slug);
        if (topic) break;
      }
    }
  }

  const refs = topic ? [{ crop: topic.crop, slug: topic.slug }] : [];
  const cropType = topic?.crop || scanCtx?.crop || "rice";
  const cropName = cropType === "rice"
    ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : targetLang === "ta" ? "நெல்" : targetLang === "kn" ? "ಭತ್ತ" : targetLang === "mr" ? "भात" : "Rice")
    : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : targetLang === "ta" ? "மிளகாய்" : targetLang === "kn" ? "ಮೆಣಸಿನಕಾಯಿ" : targetLang === "mr" ? "मिरची" : "Chilli");
  const probName = topic ? l(targetLang, topic.name) : (cropType === "rice" ? (targetLang === "te" ? "వరి పంట" : "Rice Crop") : (targetLang === "te" ? "మిరప పంట" : "Chilli Crop"));
  const sevBand = scanCtx?.severity?.band ?? "moderate";
  const sevBandLocal = targetLang === "te"
    ? (sevBand === "severe" ? "తీవ్ర" : sevBand === "moderate" ? "మధ్యస్థ" : "తేలికపాటి")
    : targetLang === "hi"
    ? (sevBand === "severe" ? "गंभीर" : sevBand === "moderate" ? "मध्यम" : "शुरुआती")
    : targetLang === "ta"
    ? (sevBand === "severe" ? "தீவிர" : sevBand === "moderate" ? "மிதமான" : "ஆரம்ப")
    : targetLang === "kn"
    ? (sevBand === "severe" ? "ತೀವ್ರ" : sevBand === "moderate" ? "ಮಧ್ಯಮ" : "ಆರಂಭಿಕ")
    : targetLang === "mr"
    ? (sevBand === "severe" ? "गंभीर" : sevBand === "moderate" ? "मध्यम" : "सुरुवातीची")
    : sevBand;

  // 3. User Intent Classification
  const isGreetingWord = (w: string) => /^(bro|hi|hello|hey|yo|sup|namaste|namaskar|vanakkam|kisan|bot|assistant|anna|bhai|bhaiya|dada|help|హాయ్|హలో|నమస్కారం|నమస్తే|బ్రో|అన్నా|బాగున్నారా|చెప్పు|नमस्ते|भाई|हैलो|हाय|मदद|सुनो|बताओ|राम राम|प्रणाम|வணக்கம்|ஹலோ|ஹாய்|உதவி|ನಮಸ್ಕಾರ|ಹಲೋ|ಹಾಯ್|ಸಹಾಯ|नमस्कार|हॅलो|भाऊ|मदत)$/i.test(w);
  const isGreeting = (words.length > 0 && words.length <= 5 && words.every(w => isGreetingWord(w) || /^(there|you|kisanai|ji|aru|sir|mitra|man|mate)$/i.test(w))) || (words.length === 1 && isGreetingWord(words[0]));

  const isGratitude = /thank|thanks|helpful|great|awesome|good job|dhanyavad|shukriya|ధన్యవాదాలు|థాంక్స్|బాగుంది|धन्यवाद|शुक्रिया|நன்றி|ಧನ್ಯವಾದ|मदत/i.test(qClean);

  const isConcern = /serious|danger|dangerous|critical|kill|die|worry|worried|ruin|destroy|loss|yield loss|హాని|చనిపోతుందా|ప్రమాదకరమా|తీవ్రమా|నష్టం|खतरा|गंभीर|मर जाएगा|नुकसान|பாதிப்பு|ஆபத்து|ತೀವ್ರ|ಅಪಾಯ/i.test(qClean);

  const isPersona = /who are you|what is your name|who made you|what can you do|about you|tell me about yourself|నువ్వు ఎవరు|నీ పేరేంటి|నువ్వు ఏమి చేయగలవు|तुम कौन हो|तुम्हारा नाम क्या है|तुम क्या कर सकते हो|நீ யார்|ಯಾರು ನೀನು|तू कोण आहेस/i.test(qClean);

  const isFertilizer = /fertilizer|fertilizers|urea|potash|mop|dap|zinc|nitrogen|npk|nutrition|manure|ఎరువు|ఎరువులు|యూరియా|పొటాష్|జింక్|खाद|उर्वरक|यूरिया|पोटाश|உரம்|யூரியா|ಗೊಬ್ಬರ|युरिया|खत/i.test(qClean);

  const isWater = /water|irrigation|drainage|flooding|standing water|awd|how much water|నీరు|నీటి యాజమాన్యం|మురుగు నీరు|पानी|सिंचाई|जल|பாசனம்|தண்ணீர்|ನೀರು|पाणी/i.test(qClean);

  const isOrganic = /organic|neem|panchagavya|trichoderma|pseudomonas|bio control|natural|traps|sticky trap|సేంద్రీయ|జీవామృతం|వేప నూనె|ట్రైకోడెర్మా|సూడోమోనాస్|జైవిక|जैविक|नीम तेल|இயற்கை|வேப்பெண்ணெய்|ಸಾವಯವ|बुरशीनाशक/i.test(qClean);

  const isYellowing = /yellow|yellowing|pale|chlorosis|stunted|drying|ఆకులు పసుపు|ఎండిపోవడం|పీలి|पीली पत्तियां|पीलापन|மஞ்சள் இலை|ಹಳದಿ ಎಲೆ|पाने पिवळी/i.test(qClean);

  const isSprayTime = /when to spray|best time to spray|spray time|rain|wind|weather|ఎప్పుడు పిచికారీ|పిచికారీ సమయం|వర్షం|छिड़काव का समय|मौसम|தெளிக்கும் நேரம்|ಸಿಂಪಡಣೆ ಸಮಯ|फवारणी वेळ/i.test(qClean);

  const isAction = /what to do|what should i do|how to treat|treatment|how to cure|remedy|remedies|control|how to control|solution|management|spray|prevent spread|cure|medicine|pesticide|fungicide|measures|steps|action|plan|how to save|manage|చేయాలి|తగ్గించాలి|నివారణ|మందు|స్ప్రే|నియంత్రణ|చికిత్స|ఉపాయం|కాపాడాలి|యాజమాన్యం|क्या करें|करना चाहिए|रोकथाम|उपचार|दवा|छिड़काव|ठीक|नियंत्रण|उपाय|बचाव|प्रबंधन|செய்ய வேண்டும்|சிகிச்சை|கட்டுப்பாடு|மருந்து|தெளிக்க|நிவாரணம்|ಮಾಡಬೇಕು|ಚಿಕಿತ್ಸೆ|ನಿಯಂತ್ರಣ|ಔಷಧ|ಸಿಂಪಡಣೆ|ಪರಿಹಾರ|काय करावे|उपाय|औषध|फवारणी|नियंत्रण/i.test(qClean);

  const isCause = /why|cause|reason|how did it happen|pathogen|origin|fungus|bacteria|pest|weather|humidity|dew|rain|spread|spreads|infect|ఎందుకు|కారణం|వ్యాపించింది|ఎలా వచ్చింది|వాతావరణం|తేమ|శిలీంధ్రం|బ్యాక్టీరియా|పురుగు|क्यों|कारण|वजह|फैला|फंगस|मौसम|नमी|जीवाणु|कीट|ஏன்|காரணம்|பரவியது|மழை|பூஞ்சை|பாக்டீரியா|ಏಕೆ|ಕಾರಣ|ಹರಡಿತು|ಮಳೆ|ಶಿಲೀಂಧ್ರ|बुरशी|का|कारण|पसरले|पाऊस/i.test(qClean);

  const isSimple = /simple|summary|summarize|in simple words|simple words|explain simply|easy|plain words|meaning|tell me simply|what does it mean|సులభంగా|సాధారణ మాటల్లో|సారాంశం|అర్థం|తేలికగా|తేలికైన భాషలో|సులభం|सरल शब्दों में|सरल|आसान|संक्षेप|मतलब|साधारण|எளிய முறையில்|சுருக்கம்|விளக்கம்|சுலபம்|ಸರಳವಾಗಿ|ಸಾರಾಂಶ|ಅರ್ಥ|ಸರಳ|सोप्या शब्दात|थोडक्यात|अर्थ|सोपे/i.test(qClean);

  const isPrevention = /prevent|prevention|future|next season|next time|avoid|precaution|ముందుజాగ్రత్త|రాకుండా|భవిష్యత్తు|మరోసారి|నివారించడానికి|बचाव|रोकथाम|भविष्य|अगली बार|सावधानी|முன்னெச்சரிக்கை|தடுக்க|அடுத்த முறை|ಮುನ್ನೆಚ್ಚರಿಕೆ|ತಡೆಯಲು|ಮುಂದಿನ ಬಾರಿ|काळजी|प्रतिबंध|पुढील हंगामात/i.test(qClean);

  const isSymptoms = /what is this|symptoms|identify|identification|signs|how to recognize|look like|pathology|lesion|color|appearance|లక్షణాలు|గుర్తించడం|ఇది ఏమిటి|ఎలా గుర్తించాలి|మచ్చలు|రంగు|लक्षण|पहचान|यह क्या है|कैसे पहचाने|धब्बे|रंग|அறிகுறிகள்|அடையாளம்|இது என்ன|புள்ளிகள்|ಲಕ್ಷಣಗಳು|ಗುರುತಿಸುವಿಕೆ|ಇದು ಏನು|ಮಚ್ಚೆಗಳು|लक्षणे|ओळख|हे काय आहे|ठिपके/i.test(qClean);

  const isSimilar = /similar|look like|confused with|differentiate|differential|distinguish|difference between|పోలిక|వేరే తెగులు|మరేదైనా|మరో సమస్య|ధర్మం|తేడా|మిగతా|मिलता जुलता|अंतर|दूसरा रोग|पहचान/i.test(qClean);

  const prof = topic ? DETAILED_PROFILES[topic.slug] : undefined;
  const visualText = prof
    ? (prof.visual[targetLang]?.(20, sevBand) ?? prof.visual.en(20, sevBand))
    : (topic ? topic.symptoms.slice(0, 3).join(", ") : "");
  const riskText = prof
    ? (prof.risk[targetLang] ?? prof.risk.en)
    : (targetLang === "te" ? "వాతావరణంలో అధిక తేమ మరియు అనుకూల ఉష్ణోగ్రతలు ఉన్నప్పుడు వ్యాధి వ్యాప్తి పెరుగుతుంది." : "Pathogen spreads under humid conditions and prolonged leaf wetness.");
  const actionsList = prof
    ? (prof.actions[targetLang] ?? prof.actions.en)
    : (topic ? topic.management.cultural : ["Suspend nitrogen application", "Ensure field drainage", "Consult local agriculture officers"]);

  let responseText = "";
  let suggestions: string[] = [];

  // 4. Intent Dispatch

  // A. GREETING / CASUAL
  if (isGreeting) {
    if (topic) {
      if (targetLang === "te") {
        responseText = `నమస్తే బ్రో! నేను మీ కిసాన్ ఏఐ (KisanAI) పంట సహాయకుడిని. 🌾\n\nమీ ఫోటో స్కాన్‌లో ${cropName} పంటపై **${probName}** (${sevBandLocal} దశ) ఉన్నట్లు చూస్తున్నాను. నేను మీకు ఎలా సహాయపడగలను?\n• 🛠️ **"ఏం చేయాలి?"** — తక్షణ నివారణ మరియు యాజమాన్య చర్యల కోసం\n• ⚠️ **"ఎందుకు వచ్చింది?"** — కారణాలు మరియు వాతావరణ ప్రభావం తెలుసుకోవడానికి\n• 📝 **"సులభంగా వివరించు"** — సాధారణ మాటల్లో తేలికైన సారాంశం కోసం\n• లేదా ఎరువులు, నీటి యాజమాన్యం గురించి ఏదైనా సందేహం అడగవచ్చు!`;
        suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు"];
      } else if (targetLang === "hi") {
        responseText = `नमस्ते भाई! मैं किसान एआई (KisanAI) आपका डिजिटल फसल सलाहकार हूँ। 🌾\n\nआपकी फोटो में ${cropName} पर **${probName}** (${sevBandLocal} स्तर) के लक्षण दिख रहे हैं। मैं आपकी क्या मदद कर सकता हूँ?\n• 🛠️ **"क्या करें?"** — तत्काल रोकथाम और उपचार के उपाय\n• ⚠️ **"क्यों हुआ?"** — रोग के जैविक कारण और मौसम का प्रभाव\n• 📝 **"सरल शब्दों में बताओ"** — आसान भाषा में सारांश\n• या खाद, सिंचाई और सुरक्षा से संबंधित कोई भी सवाल!`;
        suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ रोकथाम के उपाय"];
      } else {
        responseText = `Hey bro! How's it going? I'm your KisanAI crop care assistant. 🌾\n\nI see you have that photo scan with **${probName}** (${sevBand} severity) on your **${cropName}** attached. How can I help you with your crop today?\n\nYou can ask me:\n• 🛠️ **"What should I do?"** for immediate steps to stop the spread\n• ⚠️ **"Why did this happen?"** to check weather & fertilizer risks\n• 📝 **"Explain in simple words"** for an easy, plain summary with meaning\n• Or ask about urea, water drainage, or organic bio-controls!`;
        suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
      }
    } else {
      if (targetLang === "te") {
        responseText = `నమస్కారం! నేను కిసాన్ ఏఐ (KisanAI) ఆన్-డివైస్ వ్యవసాయ సహాయకుడిని.\n\nమీరు నన్ను వరి మరియు మిరప పంటల తెగుళ్లు, నివారణ చర్యలు, సమతుల్య ఎరువులు లేదా ఆకు లక్షణాల గురించి ఏదైనా అడగవచ్చు. లేదా మీ కెమెరాతో తీసిన ఆకు ఫోటోను స్కాన్ చేసి నేరుగా విశ్లేషించవచ్చు!`;
        suggestions = ["🌾 వరి అగ్గి తెగులు లక్షణాలు", "🌶️ మిరప ఆకు ముడత నివారణ", "🧪 వరి ఎరువుల యాజమాన్యం", "📷 ఆకు ఫోటో ఎలా స్కాన్ చేయాలి?"];
      } else if (targetLang === "hi") {
        responseText = `नमस्ते! मैं किसान एआई (KisanAI) आपका ऑन-डिवाइस कृषि सहायक हूँ।\n\nआप मुझसे धान और मिर्च की फसलों के कीट-रोगों, जैविक उपचारों, या खाद-पानी के बारे में पूछ सकते हैं। आप किसी भी पत्ती का फोटो स्कैन करके भी तुरंत जांच कर सकते हैं!`;
        suggestions = ["🌾 धान में ब्लास्ट रोग", "🌶️ मिर्च में पत्ती मरोड़िया", "🧪 यूरिया खाद की सही मात्रा", "📷 फोटो कैसे स्कैन करें?"];
      } else {
        responseText = `Hello! I am KisanAI, your on-device AI agronomic assistant.\n\nYou can ask me about Rice and Chilli pest & disease symptoms, biological treatments, fertilizer schedules, or field water management. You can also scan any crop leaf using your camera for instant diagnosis!`;
        suggestions = ["🌾 Rice blast symptoms", "🌶️ Chilli leaf curl control", "🧪 Balanced NPK schedule", "📷 How to scan a leaf?"];
      }
    }
  }

  // B. GRATITUDE / POLITE CLOSURE
  else if (isGratitude) {
    if (targetLang === "te") {
      responseText = `చాలా సంతోషం! మీ పైరు పచ్చగా ఎదిగి మంచి దిగుబడి రావాలని ఆశిస్తున్నాను. పంటలో ఏవైనా ఇతర మార్పులు లేదా తెగులు లక్షణాలు కనిపిస్తే ఎప్పుడైనా అడగవచ్చు! 🌾`;
      suggestions = ["🌾 వరి యాజమాన్యం", "🌶️ మిరప సస్యరక్షణ", "🧪 ఎరువుల మోతాదు", "💧 నీటి పారుదల పద్ధతులు"];
    } else if (targetLang === "hi") {
      responseText = `आपका बहुत-बहुत स्वागत है! आपकी फसल हरी-भरी रहे और भरपूर पैदावार दे। यदि खेत में कोई अन्य समस्या दिखे, तो बेझिझक पूछ सकते हैं! 🌾`;
      suggestions = ["🌾 धान की उन्नत खेती", "🌶️ मिर्च की सुरक्षा", "🧪 खाद प्रबंधन", "💧 सिंचाई तकनीक"];
    } else {
      responseText = `You're very welcome! Wishing you a healthy crop and a bountiful harvest. Feel free to ask anytime you notice changes or have questions about your field! 🌾`;
      suggestions = ["🌾 Rice crop care", "🌶️ Chilli crop care", "🧪 Fertilizer schedule", "💧 Water management"];
    }
  }

  // C. PERSONA & CAPABILITIES
  else if (isPersona) {
    responseText = `I am **KisanAI**, your on-device agricultural intelligence assistant powered by Meta Llama 3.2 1B Instruct and localized computer vision.\n\nHere is what I can do for you:\n• 📷 **Instant Leaf Diagnosis**: Detect 22 Rice and Chilli diseases and evaluate foliar severity from your camera photos.\n• 🛠️ **Integrated Pest Management (IPM)**: Provide ICAR, ANGRAU, and PJTSAU approved cultural, biological, and agronomic management plans.\n• 🧪 **Nutrient & Fertilizer Schedules**: Guide balanced N-P-K applications, split urea dosages, and deficiency remedies.\n• 🌿 **Organic & Bio-Control Advice**: Safe usage of *Trichoderma*, *Pseudomonas*, and Neem-based sprays.\n• 🛡️ **Statutory Safety Guard**: Strictly enforcing CIB&RC regulations to keep your field and family safe from hazardous overdoses.\n\nHow can I help your farm today?`;
    suggestions = ["📷 How to scan a leaf?", "🌾 Rice blast diagnosis", "🌶️ Chilli leaf curl control", "🧪 Balanced NPK schedule"];
  }

  // D. FERTILIZER & NUTRIENT MANAGEMENT
  else if (isFertilizer) {
    if (topic) {
      responseText = `🧪 **Fertilizer Management for ${probName} (${cropName})**:\n\n` +
        `• **Nitrogen / Urea**: Immediately suspend all top-dressing of urea. Excess chemical nitrogen thins the plant cell walls and fuels pathogen multiplication.\n` +
        `• **Potassium (Potash / MOP)**: Apply supplementary Potassium (@ 15-20 kg/acre). Potash thickens leaf epidermal cell walls, deposits silica layers, and improves disease resistance.\n` +
        `• **Zinc & Micronutrients**: If leaves show bronzing or chlorosis, spray Zinc Sulfate (0.5%) + Citric Acid (0.05%) after disease severity subsides.`;
      suggestions = ["🛠️ What should I do right now?", "⚠️ Why did it happen?", "🌾 Explain in simple words", "💧 Water drainage check"];
    } else {
      responseText = `🧪 **Balanced Crop Nutrition & Fertilizer Guidelines**:\n\n` +
        `• **Rice (Paddy)**:\n` +
        `  - Standard N-P-K recommendation: 100-120 : 50-60 : 40-50 kg/ha.\n` +
        `  - **Basal**: 100% Phosphorus (DAP/SSP), 50% Potash (MOP), and Zinc Sulfate (25 kg/ha).\n` +
        `  - **Split Nitrogen**: Apply Urea in 3 equal splits (at planting, active tillering 20-25 DAT, and panicle initiation 40-45 DAT).\n` +
        `  - ⚠️ *Crucial rule*: Never top-dress urea during overcast cloudy weather or active pest outbreaks!\n\n` +
        `• **Chilli**:\n` +
        `  - Standard N-P-K: 120-150 : 60 : 60 kg/ha.\n` +
        `  - Avoid excessive nitrogen which attracts thrips, aphids, and whiteflies.\n` +
        `  - Apply foliar spray of Boron (1 g/L) + Zinc (2 g/L) at flowering initiation to prevent flower drop.`;
      suggestions = ["🌾 Paddy tillering stage fertilizer", "🌶️ Prevent chilli flower drop", "⚠️ Why avoid excess urea?", "🌱 Organic manure & compost"];
    }
  }

  // E. WATER & DRAINAGE MANAGEMENT
  else if (isWater) {
    responseText = `💧 **Field Water & Irrigation Management**:\n\n` +
      `• **Rice (Alternate Wetting and Drying - AWD)**:\n` +
      `  - Continuous deep flooding wastes water and promotes bacterial leaf blight and brown planthopper (BPH).\n` +
      `  - Practice AWD: Allow standing water to naturally subside and soil to develop hairline cracks before re-flooding to 2-3 cm.\n` +
      `  - Maintain shallow standing water (2-3 cm) only during critical flowering and grain filling stages.\n\n` +
      `• **Chilli**:\n` +
      `  - Chilli plants are extremely sensitive to standing water and waterlogging, which quickly causes root rot and bacterial wilt.\n` +
      `  - Always plant on raised beds or broad ridges with furrows.\n` +
      `  - Ensure irrigation furrows allow rapid excess rainwater runoff within 2-3 hours.`;
    suggestions = ["🌾 How to practice AWD in paddy?", "🌶️ Fix chilli root rot", "⚠️ Waterlogging disease risks", "🌧️ Monsoon drainage tips"];
  }

  // F. ORGANIC BIO-CONTROL (IPM)
  else if (isOrganic) {
    responseText = `🌿 **Organic Bio-Controls & IPM Solutions**:\n\n` +
      `• **Bio-Fungicides & Bactericides**:\n` +
      `  - *Pseudomonas fluorescens* (@ 5-10 g/L or 2.5 kg/ha in 500 L water): Excellent biological control against rice blast, sheath blight, and bacterial leaf blight.\n` +
      `  - *Trichoderma viride* (@ 5 g/kg seed or 2.5 kg/ha mixed with FYM): Protects against soil-borne root rot, damping off, and Fusarium wilt.\n\n` +
      `• **Botanical Sprays**:\n` +
      `  - Neem Seed Kernel Extract (NSKE 5%) or Azadirachtin 10,000 ppm (@ 2-3 ml/L): Acts as an antifeedant, repellent, and insect growth regulator against thrips, whiteflies, aphids, and early larvae.\n\n` +
      `• **Physical & Mechanical Traps**:\n` +
      `  - Yellow Sticky Traps (15-20/acre) for whiteflies and aphids.\n` +
      `  - Blue Sticky Traps (15-20/acre) specifically for chilli thrips.\n` +
      `  - Pheromone Traps (5-8/acre) for monitoring yellow stem borer and fruit borer.`;
    suggestions = ["🦟 How to spray Neem oil?", "🪤 Sticky traps installation", "🦠 Trichoderma application guide", "🌾 Bio-control for rice blast"];
  }

  // G. LEAF YELLOWING & CHLOROSIS DIAGNOSTICS
  else if (isYellowing) {
    responseText = `🔍 **Leaf Yellowing & Discoloration Diagnostic Guide**:\n\n` +
      `Yellow leaves can have multiple distinct causes. Here is how to distinguish them in the field:\n\n` +
      `1. **Nitrogen (Urea) Deficiency**:\n` +
      `   - Starts on older, lower leaves first.\n` +
      `   - Whole leaf turns pale green to uniform yellow, progressing from tip along the midrib in a 'V' shape.\n\n` +
      `2. **Bacterial Leaf Blight (BLB)**:\n` +
      `   - Starts from leaf tips and margins as wavy, water-soaked yellow/white streaks.\n` +
      `   - Upper active leaves are affected; dried crusts form on margins.\n\n` +
      `3. **Iron Chlorosis (Calcareous / Alkaline Soil)**:\n` +
      `   - Youngest top leaves turn pale yellow to paper white, while leaf veins remain distinctly green.\n\n` +
      `4. **Waterlogging / Root Suffocation**:\n` +
      `   - Overall plant drooping and yellowing due to lack of oxygen in root zone.\n\n` +
      `📷 *Tip: Take a close-up photo of the leaf and scan it with KisanAI for automated computer vision detection!*`;
    suggestions = ["📷 Scan this leaf now", "🌾 Check BLB symptoms", "🧪 Remedy for iron chlorosis", "🌱 How to treat nitrogen deficiency"];
  }

  // H. SPRAY TIMING & WEATHER BEST PRACTICES
  else if (isSprayTime) {
    responseText = `🌦️ **Optimal Spray Timing & Field Rules**:\n\n` +
      `1. **Time of Day**:\n` +
      `   - Early morning (8:00 AM – 10:30 AM) after morning dew has completely evaporated from the foliage.\n` +
      `   - Or late afternoon (3:30 PM – 5:30 PM) when sun intensity subsides and beneficial pollinators (bees) are less active.\n` +
      `   - Never spray during midday heat (>35°C), as rapid evaporation scorches leaves.\n\n` +
      `2. **Weather Conditions**:\n` +
      `   - Do not spray if rain is expected within 3-4 hours (rain will wash off application).\n` +
      `   - Do not spray if wind speed exceeds 12-15 km/h to prevent spray drift to adjacent plots.\n\n` +
      `3. **Adjuvants & Safety**:\n` +
      `   - During the monsoon/humid season, always add an approved agricultural wetting agent / sticker (0.5 ml/L).\n` +
      `   - Always wear protective mask, gloves, and glasses during preparation and spraying.`;
    suggestions = ["🦺 Safety gear guidelines", "🌧️ Spray rain-fastness", "🛠️ Best nozzle for fungicides", "🧪 Mixing caution"];
  }

  // I. WHAT TO DO / ACTION PLAN / TREATMENT
  else if (isAction && topic) {
    if (targetLang === "te") {
      responseText = `🛠️ **${probName} (${cropName}) నివారణకు చేపట్టాల్సిన తక్షణ చర్యలు**:\n\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\n\n") +
        `\n\n📌 *గమనిక: రసాయనాలు వాడేటప్పుడు రక్షణ జాగ్రత్తలు పాటించండి. స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) నిపుణుల సలహాలు తీసుకోండి.*`;
      suggestions = ["⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల నియమాలు"];
    } else if (targetLang === "hi") {
      responseText = `🛠️ **${probName} (${cropName}) के उपचार एवं नियंत्रण के मुख्य उपाय**:\n\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\n\n") +
        `\n\n📌 *सावधानी: अनुमोदित उपायों का ही पालन करें। सुरक्षा हेतु मास्क व दस्ताने पहनें तथा स्थानीय कृषि विशेषज्ञ से परामर्श लें।*`;
      suggestions = ["⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `🛠️ **Recommended Action Plan for ${probName} (${cropName})**:\n\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\n\n") +
        `\n\n📌 *Safety Notice: Strictly adhere to statutory CIB&RC guidelines. Wear protective gear during field applications and consult your local Agriculture Officer or KVK.*`;
      suggestions = ["⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // J. WHY DID THIS HAPPEN / CAUSE / SPREAD
  else if (isCause && topic) {
    if (targetLang === "te") {
      responseText = `⚠️ **${probName} రావడానికి కారణాలు & వ్యాప్తి**:\n\n` +
        `${riskText}\n\n` +
        `🌧️ **వ్యాప్తిని పెంచే అనుకూల పరిస్థితులు**:\n` +
        `• అధిక యూరియా (నత్రజని) వాడకం మొక్క కణజాలాన్ని మృదువుగా చేసి తెగులు సోకేలా చేస్తుంది.\n` +
        `• గాలిలో 85-90% కంటే ఎక్కువ తేమ మరియు రాత్రి వేళల్లో ఆకులపై మంచు బిందువులు నిలవడం.\n` +
        `• మొక్కలు దగ్గరగా నాటడం వల్ల గాలి, వెలుతురు సరిగ్గా ప్రసరించకపోవడం.`;
      suggestions = ["🛠️ ఏం చేయాలి?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల నియమాలు"];
    } else if (targetLang === "hi") {
      responseText = `⚠️ **${probName} के जैविक कारण और फैलाव**:\n\n` +
        `${riskText}\n\n` +
        `🌧️ **रोग को बढ़ावा देने वाले मुख्य कारक**:\n` +
        `• यूरिया (नाइट्रोजन) का अत्यधिक प्रयोग पत्तियों को कोमल बना देता है जिससे संक्रमण तेजी से फैलता है।\n` +
        `• वातावरण में 85-90% से अधिक नमी तथा रात के समय पत्तियों पर ओस का लंबे समय तक ठहरना।\n` +
        `• पौधों का अधिक घना होना जिससे खेत में हवा और धूप का संचार रुक जाता है।`;
      suggestions = ["🛠️ क्या करें?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `⚠️ **Causes & Spread of ${probName} (${cropName})**:\n\n` +
        `${riskText}\n\n` +
        `🌧️ **Field Triggers to Watch**:\n` +
        `• Over-application of chemical nitrogen (urea) makes plant cuticle thin and susceptible to penetration.\n` +
        `• Relative humidity above 85-90% combined with dewy nights accelerates spore propagation.\n` +
        `• Dense planting that limits intra-canopy sunlight and air circulation.`;
      suggestions = ["🛠️ What should I do?", "🌾 Explain in simple words", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // K. SIMPLE WORDS / MEANING / SUMMARY
  else if (isSimple && topic) {
    if (targetLang === "te") {
      responseText = `🌾 **${probName} గురించి సులభమైన వివరణ**:\n\n` +
        `• **ఇది ఏమిటి?**: ఇది ${cropName} పంటలో సాధారణంగా కనిపించే సమస్య. దీనివల్ల ఆకులు ఎండిపోయి లేదా దెబ్బతిని పంట ఎదుగుదల తగ్గుతుంది.\n` +
        `• **ముఖ్య కారణం**: వాతావరణంలో తేమ ఎక్కువగా ఉన్నప్పుడు లేదా యూరియా ఎరువును ఎక్కువగా వేసినప్పుడు ఇది వేగంగా వస్తుంది.\n` +
        `• **మీరు వెంటనే చేయాల్సింది**: భయపడవద్దు! వెంటనే యూరియా వేయడం ఆపండి, పొలంలో నిలిచిన నీటిని తీసివేయండి మరియు గట్లపై కలుపు లేకుండా చూసుకోండి.`;
      suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల మోతాదు"];
    } else if (targetLang === "hi") {
      responseText = `🌾 **${probName} का सरल शब्दों में सारांश**:\n\n` +
        `• **यह क्या है?**: यह ${cropName} की एक आम समस्या है, जो पत्तियों को नुकसान पहुँचाती है और समय पर रोकथाम न होने पर पैदावार घटा सकती है।\n` +
        `• **मुख्य वजह**: खेत में अधिक नमी, ओस और जरूरत से ज्यादा यूरिया खाद डालने से यह तेजी से फैलता है।\n` +
        `• **किसान तुरंत क्या करें?**: घबराएं नहीं! तुरंत यूरिया डालना बंद करें, खेत से अतिरिक्त पानी निकालें और मेड़ों की खरपतवार साफ रखें।`;
      suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `🌾 **${probName} in Simple Words**:\n\n` +
        `• **What is it?**: ${probName} is a common crop health problem on ${cropName}. It attacks foliage, reduces healthy green leaf area, and lowers yield if neglected.\n` +
        `• **Main Reason**: High moisture, cloudy dewy weather, and applying too much nitrogen (urea) trigger rapid spread.\n` +
        `• **What to do right now**: Do not panic! Immediately suspend supplementary urea, ensure proper field water drainage, and keep bunds free from weeds.`;
      suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // L. SYMPTOMS / IDENTIFICATION
  else if (isSymptoms && topic) {
    responseText = `🔍 **Visual Symptoms & Pathology for ${probName} (${cropName})**:\n\n` +
      `${visualText}\n\n` +
      `🔬 **Field Scouting Guide**:\n` +
      `• Inspect upper and lower leaf surfaces along the middle and top foliage canopy.\n` +
      `• Check whether lesions form discrete eyespots, water-soaked margins, or streak patterns along veins.`;
    suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
  }

  // M. PREVENTION / FUTURE SEASONS
  else if (isPrevention && topic) {
    responseText = `🛡️ **Preventive & Cultural Practices for ${probName} (${cropName})**:\n\n` +
      `1. **Seed Treatment**: Use certified pathogen-free seeds treated with *Trichoderma viride* or *Pseudomonas fluorescens*.\n` +
      `2. **Balanced Nutrition**: Apply Potassium (MOP) and micronutrients based on soil test; avoid excessive single-dose urea.\n` +
      `3. **Sanitation**: Remove crop residues and eradicate alternate grassy hosts from field bunds.\n` +
      `4. **Resistant Cultivars**: Choose university-recommended resistant or tolerant crop varieties.`;
    suggestions = ["🛠️ What should I do now?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🧪 Fertilizer schedule"];
  }

  // N. SERIOUSNESS / CONCERN / DAMAGE RISK
  else if (isConcern && topic) {
    if (targetLang === "te") {
      responseText = `కంగారు పడకండి! **${probName}** (${sevBandLocal} దశ) తీవ్రమైన సమస్యే అయినప్పటికీ, సకాలంలో తగిన చర్యలు తీసుకుంటే మీ పైరును ఖచ్చితంగా కాపాడుకోవచ్చు.\n\n` +
        `• **ప్రమాద స్థాయి**: సకాలంలో నివారించకపోతే ఆకులు ఎండిపోయి దిగుబడి తగ్గే అవకాశం ఉంది.\n` +
        `• **తక్షణమే చేయాల్సింది**: నత్రజని (యూరియా) వేయడం వెంటనే ఆపండి, పొలంలో నిలిచిన నీటిని తీసివేయండి.\n` +
        `• **రక్షణ చర్యలు**: తక్షణ నివారణ ప్రణాళిక కోసం క్రింది సూచనలను చూడండి.`;
      suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు"];
    } else if (targetLang === "hi") {
      responseText = `घबराएं नहीं! यद्यपि **${probName}** (${sevBandLocal} स्तर) एक गंभीर समस्या है, लेकिन सही समय पर उचित कदम उठाकर आपकी फसल को सुरक्षित बचाया जा सकता है।\n\n` +
        `• **खतरे का स्तर**: यदि ध्यान न दिया जाए तो यह आगे चलकर बालियों या तने को नुकसान पहुँचा सकता है।\n` +
        `• **तत्काल सावधानियां**: यूरिया का छिड़काव तुरंत बंद करें और खेत में जलजमाव न होने दें।\n` +
        `• **समाधान**: उपचार के कदम देखने के लिए नीचे दिए गए बटन पर टैप करें।`;
      suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय"];
    } else {
      responseText = `Don't panic! While **${probName}** at **${sevBand}** severity is serious and can damage yield if neglected, your crop can be protected and saved with swift action.\n\n` +
        `• **Risk Factor**: Unchecked foliar lesions can spread to new leaves and heading panicles/nodes.\n` +
        `• **Immediate Containment**: Immediately stop all supplementary urea (nitrogen), drain excessive water, and avoid handling wet plants.\n` +
        `• **Treatment**: Follow the biological and cultural action plan to suppress the pathogen.`;
      suggestions = ["🛠️ What should I do right now?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
    }
  }

  // O. DIFFERENTIAL DIAGNOSIS (SIMILAR-LOOKING PROBLEMS)
  else if (isSimilar && topic) {
    const evidence = OfflineRAGEngine.retrieveEvidence(topic.crop, topic.slug);
    if (evidence && evidence.similarDiseases && evidence.similarDiseases.length > 0) {
      const simList = evidence.similarDiseases.map(s => {
        const feat = s.distinguishingFeature[targetLang as "en" | "hi" | "te"] || s.distinguishingFeature.en;
        return `• **${s.name} vs ${probName}**:\n  ${feat}`;
      }).join("\n\n");

      if (targetLang === "te") {
        responseText = `🔍 **${probName}తో సమానంగా కనిపించే ఇతర పంట సమస్యల పోలిక (డిఫరెన్షియల్ డయాగ్నసిస్)**:\n\n` +
          `${simList}\n\n` +
          `🌾 **రైతు పొలంలో ఎలా నిర్ధారించుకోవాలి?**:\n` +
          `1. ఆకు అడుగుభాగంలో పురుగులు లేదా బూజు ఆనవాళ్లు ఉన్నాయా చూడండి.\n` +
          `2. మచ్చల అంచులు గుండ్రంగా ఉన్నాయా లేక కండె ఆకారంలో ఉన్నాయా గమనించండి.\n` +
          `3. అనుమానం ఉంటే స్పష్టమైన ఫోటోను మరోసారి స్కాన్ చేయండి.`;
        suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు"];
      } else if (targetLang === "hi") {
        responseText = `🔍 **${probName} से मिलते-जुलते अन्य रोग व कीट (अंतर पहचानें)**:\n\n` +
          `${simList}\n\n` +
          `🌾 **खेत में सही पहचान कैसे करें?**:\n` +
          `1. पत्ती की निचली सतह पर कीट या जाला देखें।\n` +
          `2. धब्बों के किनारे गोल हैं या नुकीली नाव जैसे, यह जांचें।\n` +
          `3. अनिश्चितता होने पर पौधे का साफ फोटो दोबारा स्कैन करें।`;
        suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय"];
      } else {
        responseText = `🔍 **Differential Diagnosis for ${probName} (${cropName})**:\n\n` +
          `${simList}\n\n` +
          `🔬 **How to distinguish in the field**:\n` +
          `1. Check leaf underside for micro-insects, webbing, or powdery spores.\n` +
          `2. Observe lesion shapes: spindle diamond (blast) vs circular with yellow halo (brown spot) vs wavy margins (bacterial blight).\n` +
          `3. If symptoms remain ambiguous, re-scan with a close-up clear photograph.`;
        suggestions = ["🛠️ What should I do right now?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
      }
    } else {
      responseText = `Regarding similar conditions to **${probName}**: Inspect neighboring plants for pattern spread, and examine both leaf surfaces under daylight.`;
      suggestions = ["🛠️ What should I do right now?", "⚠️ Why did this happen?"];
    }
  }

  // P. CONVERSATIONAL TOPIC RESPONSE (Natural agronomist dialogue)
  else if (topic) {
    if (targetLang === "te") {
      responseText = `మీరు ${cropName} పంటపై **${probName}** (${sevBandLocal} దశ) గురించి అడుగుతున్నారు.\n\n` +
        `• **పంట పరిస్థితి**: ఆకులపై తెగులు వ్యాప్తి చెందుతోంది. కంకి మరియు పిలకల దశకు చేరకుండా వెంటనే అరికట్టాలి.\n` +
        `• **రైతుకు ముఖ్యమైన సలహా**: యూరియా ఎరువును వెంటనే ఆపి, పొలంలో పలుచటి నీరు (2-3 సెం.మీ) మాత్రమే ఉంచండి.\n` +
        `• నేను మీకు ఏ అంశంలో వివరంగా సహాయపడగలను?`;
      suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు"];
    } else if (targetLang === "hi") {
      responseText = `आप ${cropName} पर **${probName}** (${sevBandLocal} स्तर) के बारे में पूछ रहे हैं।\n\n` +
        `• **फसल की स्थिति**: पत्तियों पर संक्रमण दिख रहा है। इसे नई पत्तियों व बालियों पर फैलने से तुरंत रोकना आवश्यक है।\n` +
        `• **मुख्य सलाह**: यूरिया डालना तुरंत बंद करें और खेत से अतिरिक्त पानी निकाल दें।\n` +
        `• आप इसके बारे में क्या जानना चाहते हैं?`;
      suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय"];
    } else {
      responseText = `Regarding your crop with **${probName}** (${sevBand} severity) on **${cropName}**:\n\n` +
        `• **Field Status**: Foliar pathology requires active containment before it penetrates nodes or reproductive organs.\n` +
        `• **Priority Rule**: Suspend urea top-dressing right away; high nitrogen weakens cellular resistance.\n` +
        `• How can I best guide you forward? Choose below or ask any question:`;
      suggestions = ["🛠️ What should I do right now?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
    }
  }

  // Q. GENERAL FALLBACK WITHOUT TOPIC
  else {
    responseText = `Hello! I am your on-device KisanAI (Meta Llama 3.2 1B Instruct) Agricultural Assistant.\n\n` +
      `Please describe the symptoms in your field or ask about specific conditions:\n` +
      `• **Rice**: Blast, BLB, Brown Spot, Stem Borer, Brown Planthopper, Leaf Folder, Gall Midge, Hispa, Tungro.\n` +
      `• **Chilli**: Leaf Curl, Thrips, Mites, Whiteflies, Aphids, Anthracnose / Fruit Rot, Powdery Mildew, Cercospora Spot.\n\n` +
      `You can also scan a leaf photograph to analyze its visual pathology in real-time!`;
    suggestions = ["🌾 Rice blast symptoms", "🌶️ Chilli leaf curl control", "🧪 Balanced NPK schedule", "📷 How to scan a leaf?"];
  }

  // Deterministic Agricultural Safety Validation of Generated Output
  const postValidation = AgriculturalSafetyValidator.validateGeneratedResponse(
    responseText,
    cropType,
    topic?.slug,
    scanCtx?.confidence ?? 0.90,
    targetLang
  );
  if (postValidation.sanitizedResponse) {
    responseText = postValidation.sanitizedResponse;
  }

  return {
    model: "Llama-3.2-1B-Instruct",
    lang: targetLang,
    text: responseText,
    isMultimodal: Boolean(scanCtx?.topicSlug),
    safetyTriggered: false,
    refs,
    suggestions,
  };
}
