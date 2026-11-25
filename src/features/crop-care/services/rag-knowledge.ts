/**
 * KisanAI - Structured Offline Agricultural Knowledge Retrieval Engine (RAG)
 * Implements authoritative, verified multi-level retrieval covering:
 * Symptoms, Causes, Favouring Conditions, Differential Diagnosis (Similar Diseases),
 * Cultural, Mechanical, Biological, and Statutory Chemical Management.
 * 
 * Complies with ICAR, ANGRAU, PJTSAU, and CIB&RC documentation standards.
 */

import type { CropKey } from "../knowledge";

export interface VerifiedKnowledgeRecord {
  recordId: string;
  crop: CropKey;
  slug: string;
  commonName: { en: string; hi: string; te: string };
  scientificName: string;
  kind: "disease" | "pest" | "disorder";
  symptoms: { en: string[]; hi: string[]; te: string[] };
  causes: { en: string; hi: string; te: string };
  favouringConditions: { en: string[]; hi: string[]; te: string[] };
  similarDiseases: { slug: string; name: string; distinguishingFeature: { en: string; hi: string; te: string } }[];
  culturalManagement: { en: string[]; hi: string[]; te: string[] };
  mechanicalManagement: { en: string[]; hi: string[]; te: string[] };
  biologicalManagement: { en: string[]; hi: string[]; te: string[] };
  chemicalManagement: {
    activeIngredient: string;
    formulation: string;
    approvedDosePerLitre: string;
    phiDays: number;
    safetyPrecautions: { en: string; hi: string; te: string };
    cibrcReference: string;
  }[];
  regionApplicability: string[];
  seasonApplicability: ("kharif" | "rabi" | "all")[];
  sourceInstitution: string;
  sourceDocument: string;
  verificationStatus: "verified" | "provisional";
  lastVerifiedDate: string;
}

// Complete offline verified repository for Rice and Chilli
export const VERIFIED_AG_DATABASE: Record<string, VerifiedKnowledgeRecord> = {
  "rice:rice-blast": {
    recordId: "rec-rice-blast-01",
    crop: "rice",
    slug: "rice-blast",
    commonName: { en: "Rice Blast", hi: "धान का झुलसा / ब्लास्ट रोग", te: "వరి అగ్గి తెగులు" },
    scientificName: "Magnaporthe oryzae (Pyricularia oryzae)",
    kind: "disease",
    symptoms: {
      en: [
        "Spindle-shaped / diamond-shaped lesions with ash-grey or whitish centres and dark brown or reddish-brown margins on leaf blades",
        "Lesions coalesce, causing entire leaf blades to dry and take on a burnt or scorched appearance",
        "Neck rot causing blackening of panicle node and partial or complete grain chafing"
      ],
      hi: [
        "पत्तियों पर आंख या नाव के आकार के धब्बे जिनका केंद्र राख जैसे धूसर रंग का तथा किनारे कत्थई या भूरे होते हैं",
        "धब्बे आपस में मिलकर पूरी पत्ती को झुलसा देते हैं जिससे खेत जला हुआ दिखाई देता है",
        "गर्दन तोड़ (नेक ब्लास्ट) में बाली का आधार काला होकर सूख जाता है और दाने नहीं भरते"
      ],
      te: [
        "ఆకులపై నూలు కండె (కంటి) ఆకారంలో బూడిద రంగు కేంద్రం మరియు ముదురు గోధుమ రంగు అంచులతో కూడిన మచ్చలు",
        "మచ్చలు ఒకదానితో ఒకటి కలిసిపోయి ఆకులు ఎండిపోయి అగ్గి తగిలినట్లు కాలిపోతాయి",
        "కంకి మెడ భాగం నల్లబడి విరిగిపోవడం (మెడ విరుపు) వల్ల గింజలు తప్పలుగా మారతాయి"
      ]
    },
    causes: {
      en: "Fungal pathogen Magnaporthe oryzae. Favoured by excessive nitrogen fertilizer, high relative humidity (>90%), nighttime dew, and overcast cloudy weather.",
      hi: "मैग्नापोर्थे ओराइजी फफूंद। अत्यधिक यूरिया (नाइट्रोजन), 90% से अधिक हवा में नमी, रात की ओस और बादलयुक्त मौसम से तेजी से फैलता है।",
      te: "శిలీంద్రం (ఫంగస్) వలన వ్యాపిస్తుంది. అధిక మోతాదులో యూరియా వేయడం, గాలిలో 90% కంటే ఎక్కువ తేమ, రాత్రి వేళల్లో మంచు మరియు మబ్బులతో కూడిన వాతావరణం అనుకూలం."
    },
    favouringConditions: {
      en: ["Excessive chemical nitrogen (urea) top-dressing", "Relative humidity above 90% with dewy nights", "Temperatures between 20°C and 28°C", "Dense canopy with poor air circulation"],
      hi: ["यूरिया खाद का जरूरत से ज्यादा प्रयोग", "हवा में 90% से अधिक नमी और रात की ओस", "20 से 28 डिग्री सेल्सियस का तापमान", "घना पौधा जिससे हवा का संचार न हो"],
      te: ["అధిక యూరియా ఎరువు వాడకం", "90% కంటే ఎక్కువ గాలిలో తేమ మరియు రాత్రి మంచు బిందువులు", "20-28 డిగ్రీల ఉష్ణోగ్రత", "గాలి ప్రసరణ లేని దట్టమైన పైరు"]
    },
    similarDiseases: [
      {
        slug: "brown-spot",
        name: "Brown Spot",
        distinguishingFeature: {
          en: "Brown spot lesions are oval or circular with yellow halos, lacking the sharp spindle eye-shape and ash core of blast.",
          hi: "भूरे धब्बे गोल या अंडाकार होते हैं जिनके चारों ओर पीला छल्ला होता है, इनमें ब्लास्ट जैसी नाव का आकार या राख का केंद्र नहीं होता।",
          te: "బ్రౌన్ స్పాట్ మచ్చలు గుండ్రంగా ఉండి చుట్టూ పసుపు రంగు వలయం కలిగి ఉంటాయి; బ్లాస్ట్ లాగా కండె ఆకారపు బూడిద కేంద్రం ఉండదు."
        }
      },
      {
        slug: "bacterial-leaf-blight",
        name: "Bacterial Leaf Blight",
        distinguishingFeature: {
          en: "BLB shows wavy longitudinal lesions starting from leaf margins/tips, weeping bacterial oozes in morning dew.",
          hi: "बीएलबी रोग पत्ती के किनारों से शुरू होकर लहरदार सूखता है, इसमें सुबह के समय जीवाणु का चिपचिपा स्राव दिखता है।",
          te: "బాక్టీరియల్ ఆకు ఎండు తెగులు ఆకు అంచుల నుండి అలల మాదిరిగా నిలువుగా ఎండిపోతుంది; ఉదయం వేళల్లో జిగురు బిందువులు కనిపిస్తాయి."
        }
      }
    ],
    culturalManagement: {
      en: [
        "Immediately suspend nitrogen (urea) top-dressing to prevent succulent leaf growth",
        "Practice Alternate Wetting and Drying (AWD); keep water depth shallow (2–3 cm) instead of stagnant deep flooding",
        "Eradicate alternate grassy weed hosts from field bunds"
      ],
      hi: [
        "यूरिया खाद का छिड़काव तुरंत रोकें",
        "खेत में अधिक पानी न भरने दें; केवल 2-3 सेमी उथला पानी रखें",
        "खेत की मेड़ों से खरपतवार नष्ट करें"
      ],
      te: [
        "నత్రజని (యూరియా) ఎరువును వెంటనే నిలిపివేయండి",
        "పొలంలో లోతైన నీరు నిలవకుండా పలుచటి నీరు (2-3 సెం.మీ) మాత్రమే ఉంచండి",
        "గట్లపై ఉన్న కలుపు మొక్కలను తొలగించండి"
      ]
    },
    mechanicalManagement: {
      en: ["Avoid entering or dragging ropes through wet infected fields during early morning dew to prevent spore transport"],
      hi: ["सुबह ओस के समय संक्रमित खेत में न जाएं ताकि बीजाणु अन्य पौधों पर न फैलें"],
      te: ["ఉదయం మంచు ఉన్న సమయంలో పొలంలో తిరగడం లేదా తాడు లాగడం చేయవద్దు"]
    },
    biologicalManagement: {
      en: [
        "Foliar spray of Pseudomonas fluorescens (@ 10 g/L water) or Trichoderma viride (@ 5 g/L) at first symptom appearance",
        "Spray Neem Seed Kernel Extract (NSKE 5%) or Azadirachtin 1500 ppm (@ 2.5 ml/L) as an organic deterrent"
      ],
      hi: [
        "स्यूडोमोनास फ्लोरोसेंस (10 ग्राम/लीटर) या ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) का जैविक पर्णीय छिड़काव करें",
        "नीम तेल (1500 पीपीएम @ 2.5 मिली/लीटर) या नीम बीज अर्क (5%) का छिड़काव करें"
      ],
      te: [
        "సూడోమోనాస్ ఫ్లోరోసెన్స్ (10 గ్రా/లీటరు) లేదా ట్రైకోడెర్మా విరిడే (5 గ్రా/లీటరు) పిచికారీ చేయండి",
        "వేప గింజల కషాయం (NSKE 5%) లేదా వేప నూనె (1500 ppm @ 2.5 మి.లీ/లీటరు) పిచికారీ చేయండి"
      ]
    },
    chemicalManagement: [
      {
        activeIngredient: "Tricyclazole",
        formulation: "75% WP",
        approvedDosePerLitre: "0.6 g / L water",
        phiDays: 30,
        safetyPrecautions: {
          en: "Wear protective face mask and nitrile gloves. Do not spray against prevailing wind. Spray during calm morning or late afternoon.",
          hi: "मास्क और दस्ताने पहनें। हवा की विपरीत दिशा में छिड़काव न करें। शांत सुबह या शाम को छिड़कें।",
          te: "మాస్క్ మరియు గ్లౌవ్స్ ధరించండి. గాలికి ఎదురుగా పిచికారీ చేయవద్దు. ఉదయం లేదా సాయంత్రం వేళల్లో మాత్రమే పిచికారీ చేయండి."
        },
        cibrcReference: "CIB&RC Registered for Rice Blast / ICAR-NRRI Package of Practices"
      },
      {
        activeIngredient: "Isoprothiolane",
        formulation: "40% EC",
        approvedDosePerLitre: "1.5 ml / L water",
        phiDays: 30,
        safetyPrecautions: {
          en: "Ensure thorough coverage of both upper and lower foliage. Keep animals out of treated fields for 48 hours.",
          hi: "पत्तियों के दोनों ओर अच्छी तरह छिड़काव करें। 48 घंटे तक पशुओं को खेत में न जाने दें।",
          te: "ఆకుల పైభాగం మరియు అడుగుభాగం తడిసేలా పిచికారీ చేయండి. 48 గంటల వరకు పశువులను పొలంలోకి రానివ్వకండి."
        },
        cibrcReference: "CIB&RC Registered for Rice Blast / ANGRAU Vyavasaya Panchangam"
      }
    ],
    regionApplicability: ["Andhra Pradesh", "Telangana", "Tamil Nadu", "Karnataka", "Odisha", "All"],
    seasonApplicability: ["kharif", "rabi", "all"],
    sourceInstitution: "ICAR - National Rice Research Institute (NRRI) & ANGRAU",
    sourceDocument: "Integrated Pest and Disease Management in Rice (ANGRAU 2025/2026)",
    verificationStatus: "verified",
    lastVerifiedDate: "2026-01-15"
  },

  "rice:brown-spot": {
    recordId: "rec-rice-brown-spot-02",
    crop: "rice",
    slug: "brown-spot",
    commonName: { en: "Brown Spot", hi: "भूरा धब्बा रोग (ब्राउन स्पॉट)", te: "వరి బ్రౌన్ స్పాట్ (గోధుమ రంగు మచ్చ తెగులు)" },
    scientificName: "Bipolaris oryzae (Cochliobolus miyabeanus / Helminthosporium oryzae)",
    kind: "disease",
    symptoms: {
      en: [
        "Small circular to oval reddish-brown spots scattered across leaf blades with a bright yellow chlorotic halo",
        "Spots enlarge and develop grey or light brown centres with dark reddish margins",
        "Dark velvety brown discolouration on glumes causing poor grain filling and darkened rice kernels"
      ],
      hi: [
        "पत्तियों पर गोल से अंडाकार कत्थई-भूरे धब्बे जिनके चारों ओर पीला छल्ला होता है",
        "धब्बे बड़े होकर बीच में हल्के भूरे या धूसर तथा किनारों पर गहरे लाल-भूरे हो जाते हैं",
        "बालियों और दानों पर काले-भूरे धब्बे बनते हैं जिससे दाना कमजोर व बदरंग हो जाता है"
      ],
      te: [
        "ఆకులపై గుండ్రంగా లేదా అండాకారంలో గోధుమ రంగు మచ్చలు ఏర్పడి చుట్టూ పసుపు రంగు వలయం ఉంటుంది",
        "మచ్చల కేంద్రం బూడిద రంగులోకి మారి అంచులు ముదురు గోధుమ రంగులో ఉంటాయి",
        "గింజలపై కూడా నల్లటి మచ్చలు ఏర్పడి గింజ బరువు తగ్గుతుంది"
      ]
    },
    causes: {
      en: "Fungal pathogen Bipolaris oryzae. Strong indicator of nutrient stress (potassium, zinc, silica deficiency) or water deficit soils.",
      hi: "बाइपोलारिस ओराइजी फफूंद। यह मिट्टी में पोटाश, जिंक की कमी अथवा जल-तनाव (सूखे) का स्पष्ट संकेत है।",
      te: "శిలీంద్రం వలన వస్తుంది. నేలలో పొటాష్, జింక్ పోషక లోపం లేదా తీవ్రమైన నీటి ఎద్దడి ఉన్నప్పుడు ఎక్కువగా కనిపిస్తుంది."
    },
    favouringConditions: {
      en: ["Nutrient-deficient, light or unfertile soils lacking Potassium and Zinc", "Intermittent moisture stress followed by humid periods", "Relative humidity 85–95% with temperatures 25°C–32°C"],
      hi: ["पोटाश और जिंक की कमी वाली कमजोर मिट्टी", "पानी की कमी (सूखा) के बाद अचानक नमी बढ़ना", "25 से 32 डिग्री सेल्सियस तापमान"],
      te: ["పొటాష్ మరియు జింక్ లోపించిన తేలికపాటి నేలలు", "నీటి ఎద్దడి తరువాత అధిక తేమ రావడం", "25-32 డిగ్రీల ఉష్ణోగ్రత"]
    },
    similarDiseases: [
      {
        slug: "rice-blast",
        name: "Rice Blast",
        distinguishingFeature: {
          en: "Blast lesions have pointed spindle ends with ash-grey centres; brown spot lesions are rounded or oval with distinct yellow halos.",
          hi: "ब्लास्ट के धब्बे नुकीले नाव के आकार के होते हैं, जबकि ब्राउन स्पॉट के धब्बे गोल होते हैं और उनके चारों ओर पीला छल्ला होता है।",
          te: "బ్లాస్ట్ మచ్చలు కండె ఆకారపు కొనలు కలిగి ఉంటాయి; బ్రౌన్ స్పాట్ మచ్చలు గుండ్రంగా ఉండి పసుపు వలయం కలిగి ఉంటాయి."
        }
      }
    ],
    culturalManagement: {
      en: [
        "Apply Potassium (MOP @ 15–20 kg/acre) in split doses to reinforce plant cell wall silica layers",
        "Foliar spray of Zinc Sulfate (0.5%) + Citric Acid (0.05%) if zinc deficiency is confirmed",
        "Prevent drought stress; ensure consistent shallow standing water (2–3 cm)"
      ],
      hi: [
        "पोटाश (एमओपी @ 15-20 किग्रा/एकड़) की संतुलित मात्रा दें",
        "जिंक सल्फेट (0.5%) का छिड़काव करें",
        "खेत में सूखे की स्थिति न बनने दें, 2-3 सेमी पानी बनाए रखें"
      ],
      te: [
        "ఎకరాకు 15-20 కిలోల మ్యూరేట్ ఆఫ్ పొటాష్ (MOP) ఎరువును వేయండి",
        "జింక్ లోపం ఉంటే జింక్ సల్ఫేట్ (0.5%) ద్రావణాన్ని పిచికారీ చేయండి",
        "నీటి ఎద్దడి రాకుండా పలుచటి నీటి తడులు ఇవ్వండి"
      ]
    },
    mechanicalManagement: {
      en: ["Clean crop debris from previous harvest and deep-plough during summer to bury pathogen sclerotia"],
      hi: ["पिछली फसल के अवशेष नष्ट करें और गर्मियों में गहरी जुताई करें"],
      te: ["పంట వ్యర్థాలను శుభ్రం చేసి వేసవిలో లోతు దుక్కులు దున్నండి"]
    },
    biologicalManagement: {
      en: [
        "Spray Pseudomonas fluorescens (@ 10 g/L) or Trichoderma viride (@ 5 g/L)",
        "Seed treatment with Trichoderma viride @ 5–10 g/kg seed prior to nursery sowing"
      ],
      hi: [
        "स्यूडोमोनास फ्लोरोसेंस (10 ग्राम/लीटर) का छिड़काव करें",
        "बुवाई से पहले ट्राइकोडर्मा से बीज उपचार करें"
      ],
      te: [
        "సూడోమోనాస్ ఫ్లోరోసెన్స్ (10 గ్రా/లీటరు) పిచికారీ చేయండి",
        "విత్తేముందు ట్రైకోడెర్మా విరిడే (5-10 గ్రా/కిలో విత్తనానికి) తో విత్తన శుద్ధి చేయండి"
      ]
    },
    chemicalManagement: [
      {
        activeIngredient: "Propiconazole",
        formulation: "25% EC",
        approvedDosePerLitre: "1.0 ml / L water",
        phiDays: 25,
        safetyPrecautions: {
          en: "Spray when foliar lesions reach >10% leaf area at tillering or panicle emergence. Wear gloves and rubber boots.",
          hi: "जब धब्बे पत्ती के 10% से अधिक भाग पर फैलें तभी छिड़काव करें। सुरक्षा हेतु दस्ताने पहनें।",
          te: "మచ్చలు ఆకు విస్తీర్ణంలో 10% కంటే ఎక్కువ ఉన్నప్పుడు పిచికారీ చేయండి. రక్షణ తొడుగులు ధరించండి."
        },
        cibrcReference: "CIB&RC Registered for Brown Spot in Rice / ICAR Guide"
      },
      {
        activeIngredient: "Mancozeb",
        formulation: "75% WP",
        approvedDosePerLitre: "2.0 g / L water",
        phiDays: 25,
        safetyPrecautions: {
          en: "Ensure adequate water volume (200 L/acre). Avoid spraying during high midday temperatures.",
          hi: "पर्याप्त पानी (200 लीटर/एकड़) का प्रयोग करें। दोपहर की तेज धूप में छिड़काव न करें।",
          te: "ఎకరాకు తగినంత నీటిని (200 లీటర్లు) ఉపయోగించండి. మధ్యాహ్నం ఎండలో పిచికారీ చేయవద్దు."
        },
        cibrcReference: "CIB&RC Registered / ANGRAU Vyavasaya Panchangam"
      }
    ],
    regionApplicability: ["Andhra Pradesh", "Telangana", "All"],
    seasonApplicability: ["kharif", "rabi", "all"],
    sourceInstitution: "ICAR - NRRI & PJTSAU",
    sourceDocument: "Diagnostic and Management Protocol for Rice Diseases (PJTSAU 2025/2026)",
    verificationStatus: "verified",
    lastVerifiedDate: "2026-01-20"
  },

  "rice:bacterial-leaf-blight": {
    recordId: "rec-rice-blb-03",
    crop: "rice",
    slug: "bacterial-leaf-blight",
    commonName: { en: "Bacterial Leaf Blight (BLB)", hi: "जीवाणु पत्ती झुलसा (बीएलबी)", te: "వరి బాక్టీరియా ఆకు ఎండు తెగులు" },
    scientificName: "Xanthomonas oryzae pv. oryzae",
    kind: "disease",
    symptoms: {
      en: [
        "Water-soaked translucent stripes starting from leaf tips or margins, advancing down into wavy yellowish-white lesions",
        "In early morning dew, tiny milky or amber-coloured bacterial ooze droplets appear on young lesions",
        "Leaves dry out rapidly with wavy edges, curling longitudinally and giving the canopy a bleached straw-yellow look"
      ],
      hi: [
        "पत्तियों की नोक या किनारों से शुरू होकर नीचे की ओर बढ़ती हुई लहरदार पीली-सफेद धारियां",
        "सुबह की ओस में धब्बों पर दूधिया या बादामी रंग की चिपचिपी जीवाणु की बूंदें दिखती हैं",
        "पत्तियां तेजी से सूखकर भूसे जैसी सफेद हो जाती हैं (क्रेसेक अवस्था में पौधे मुरझा जाते हैं)"
      ],
      te: [
        "ఆకు కొనలు మరియు అంచుల నుండి ప్రారంభమై కిందకు అలల మాదిరిగా సాగే పసుపు-తెలుపు ఎండిన చారలు",
        "ఉదయం మంచు వేళల్లో ఆకులపై చిన్న జిగురు లేదా పాలు వంటి బాక్టీరియా బిందువులు కనిపిస్తాయి",
        "ఆకులు నిలువుగా చుట్టుకుని గడ్డి రంగులోకి మారి ఎండిపోతాయి"
      ]
    },
    causes: {
      en: "Bacterium Xanthomonas oryzae pv. oryzae. Penetrates through natural leaf hydathodes and clipping wounds. Rapidly propagated by heavy rainfall, windstorms, and deep flood water.",
      hi: "जैंथोमोनास ओराइजी जीवाणु। पत्तियों के छिद्रों और घावों से प्रवेश करता है। तेज बारिश, आंधी और गहरे पानी से तेजी से फैलता है।",
      te: "బాక్టీరియా వలన వ్యాపిస్తుంది. ఆకులలోని రంధ్రాలు మరియు గాయాల ద్వారా ప్రవేశిస్తుంది. భారీ వర్షాలు, ఈదురు గాలులు మరియు లోతైన నీటి నిల్వ అనుకూలం."
    },
    favouringConditions: {
      en: ["Over-application of urea", "Cyclonic rain, strong winds, and leaf abrasion", "Field inundation and stagnant standing water", "Temperatures between 25°C and 34°C with high humidity"],
      hi: ["यूरिया का अत्यधिक उपयोग", "तेज हवा, चक्रवाती बारिश और पत्तियों का आपस में रगड़ना", "खेत में लगातार पानी भरा रहना", "25 से 34 डिग्री तापमान"],
      te: ["అధిక యూరియా వాడకం", "తుఫాను వర్షాలు, ఈదురుగాలులు", "పొలంలో మురుగు నీరు నిల్వ ఉండటం", "25-34 డిగ్రీల ఉష్ణోగ్రత"]
    },
    similarDiseases: [
      {
        slug: "bacterial-leaf-streak",
        name: "Bacterial Leaf Streak",
        distinguishingFeature: {
          en: "Streak forms narrow interveinal brownish-yellow translucent streaks restricted between leaf veins, rather than broad wavy marginal blighting.",
          hi: "लीफ स्ट्रीक में पत्तियों की नसों के बीच पतली पारदर्शी धारियां बनती हैं, यह किनारों से पूरी पत्ती को नहीं झुलसाती।",
          te: "లీఫ్ స్ట్రీక్‌లో ఆకు ఈనెల మధ్య మాత్రమే సన్నని నిలువు చారలు ఏర్పడతాయి; అంచుల నుండి అలల మాదిరిగా విస్తరించదు."
        }
      }
    ],
    culturalManagement: {
      en: [
        "Completely drain field standing water for 3–4 days to aerate soil and restrict bacterial movement",
        "Suspend all nitrogen top-dressing immediately; apply Potassium (MOP @ 15 kg/acre) as a split dose",
        "Avoid clipping seedling leaf tips during transplanting as wounds are primary bacterial entry portals"
      ],
      hi: [
        "खेत से 3-4 दिन के लिए सारा पानी निकाल दें ताकि मिट्टी सूख सके",
        "यूरिया डालना तुरंत बंद करें और पोटाश (15 किग्रा/एकड़) डालें",
        "रोपाई के समय पौध की नोक न काटें क्योंकि घावों से जीवाणु अंदर घुसते हैं"
      ],
      te: [
        "పొలంలో ఉన్న మురుగు నీటిని 3-4 రోజుల పాటు పూర్తిగా తీసివేసి ఆరబెట్టండి",
        "యూరియా ఎరువును వెంటనే నిలిపివేసి ఎకరాకు 15 కిలోల పొటాష్ ఎరువును వేయండి",
        "నాట్లు వేసేటప్పుడు నారు కొనలను తుంచవద్దు (గాయాల ద్వారా తెగులు సోకుతుంది)"
      ]
    },
    mechanicalManagement: {
      en: ["Eradicate volunteer rice ratoon plants and weed hosts (Leersia hexandra) from field channels"],
      hi: ["मेड़ों और नालियों से जंगली घास नष्ट करें"],
      te: ["కాల్వలు మరియు గట్లపై ఉన్న తుంగ, గరిక కలుపు మొక్కలను తొలగించండి"]
    },
    biologicalManagement: {
      en: [
        "Foliar spray of Pseudomonas fluorescens (@ 10 g/L water) or plant-derived bleaching powder solution (100 g/acre in standing water)",
        "Fresh cow dung slurry filtrate (20%) foliar spray as a traditional microbial suppressor"
      ],
      hi: [
        "स्यूडोमोनास फ्लोरोसेंस (10 ग्राम/लीटर) का छिड़काव करें",
        "ताजे गोबर का घोल (20%) छानकर छिड़काव करना एक पारंपरिक जैविक उपाय है"
      ],
      te: [
        "సూడోమోనాస్ ఫ్లోరోసెన్స్ (10 గ్రా/లీటరు) పిచికారీ చేయండి",
        "తాజా ఆవు పేడ ద్రావణాన్ని (20%) వడకట్టి ఆకులపై పిచికారీ చేయండి"
      ]
    },
    chemicalManagement: [
      {
        activeIngredient: "Copper Oxychloride + Streptocycline",
        formulation: "50% WP (COC) + 90:10 (Streptocycline)",
        approvedDosePerLitre: "2.5 g COC + 0.1 g Streptocycline / L water",
        phiDays: 21,
        safetyPrecautions: {
          en: "Never mix with acidic chemicals. Wear protective rubber gloves and mask. Avoid spraying in rain.",
          hi: "अम्लीय दवाओं के साथ न मिलाएं। दस्ताने और मास्क पहनें। बारिश के समय न छिड़कें।",
          te: "ఆమ్ల లక్షణాలు ఉన్న మందులతో కలపవద్దు. రక్షణ మాస్క్ ధరించండి. వర్షం పడే సమయంలో పిచికారీ చేయవద్దు."
        },
        cibrcReference: "CIB&RC Label Claim for Bacterial Diseases in Paddy / ANGRAU Protocol"
      }
    ],
    regionApplicability: ["Andhra Pradesh", "Telangana", "All"],
    seasonApplicability: ["kharif", "rabi", "all"],
    sourceInstitution: "ICAR - Indian Institute of Rice Research (IIRR) & ANGRAU",
    sourceDocument: "Standard Operating Procedures for BLB Management (IIRR Hyderabad)",
    verificationStatus: "verified",
    lastVerifiedDate: "2026-01-25"
  },

  "chilli:leaf-curl": {
    recordId: "rec-chilli-leaf-curl-04",
    crop: "chilli",
    slug: "leaf-curl",
    commonName: { en: "Chilli Leaf Curl Virus", hi: "मिर्च का पर्ण कुंचन रोग (पत्ती मरोड़िया)", te: "మిరప ఆకు ముడత వైరస్ తెగులు" },
    scientificName: "Chilli leaf curl virus (ChiLCV) transmitted by Bemisia tabaci",
    kind: "disease",
    symptoms: {
      en: [
        "Upward curling, puckering, and crinkling of leaf margins accompanied by reduction in leaf size",
        "Thickening and swelling of leaf veins with interveinal chlorosis and shortened internodes, giving plants a stunted bushy appearance",
        "Severely affected plants produce no flowers or yield small, distorted, deformed fruits"
      ],
      hi: [
        "पत्तियों का ऊपर की ओर मुड़ना, सिकुड़ना और आकार में छोटा होना (नाव के आकार में मुड़ना)",
        "पत्तियों की नसें मोटी हो जाती हैं, पौधे का विकास रुक जाता है और वह झाड़ी जैसा दिखता है",
        "फूल झड़ने लगते हैं तथा फल छोटे, टेढ़े-मेढ़े और विकृत बनते हैं"
      ],
      te: [
        "ఆకులు పైకి దోనె ఆకారంలో ముడుచుకుపోయి చిన్నవిగా మారడం (పై ముడత)",
        "ఆకు ఈనెలు లావుగా మారి మొక్కలు గిడసబారి గుబురుగా తయారవుతాయి",
        "పూత, పిందె రాలిపోయి కాయలు చిన్నవిగా మరియు వంకరలు తిరిగి ఏర్పడతాయి"
      ]
    },
    causes: {
      en: "Begomovirus (ChiLCV) transmitted persistently by adult whiteflies (Bemisia tabaci). High temperatures (30–38°C) and dry spells accelerate whitefly breeding.",
      hi: "सफेद मक्खी (बेमिसिया तबासी) द्वारा फैलाया जाने वाला वायरस। अधिक तापमान (30-38 डिग्री) और शुष्क मौसम से सफेद मक्खी तेजी से बढ़ती है।",
      te: "వైరస్ వలన వస్తుంది. తెల్ల దోమ (వైట్‌ఫ్లై) దీనిని ఒక మొక్క నుండి మరొక మొక్కకు వ్యాపింపజేస్తుంది. పొడి వాతావరణం మరియు అధిక ఉష్ణోగ్రతలు దోమల పెరుగుదలకు అనుకూలం."
    },
    favouringConditions: {
      en: ["Dry and hot weather favoring whitefly population explosion", "Weed reservoirs near chilli plots (Parthenium, Croton)", "Continuous monocropping of solanaceous crops"],
      hi: ["गर्म और सूखा मौसम जिससे सफेद मक्खी की संख्या बढ़ती है", "खेत के पास गाजरघास और खरपतवार होना", "लगातार मिर्च, टमाटर या बैंगन की खेती"],
      te: ["పొడి మరియు వేడి వాతావరణం", "గట్లపై వయ్యారిభామ (పార్థీనియం) వంటి కలుపు మొక్కలు ఉండటం", "టమోటా, వంగ వంటి పంటలను వరుసగా సాగు చేయడం"]
    },
    similarDiseases: [
      {
        slug: "thrips",
        name: "Chilli Thrips",
        distinguishingFeature: {
          en: "Thrips cause leaves to cup UPWARD with silvery brown feeding scars on leaf underside; mites cause DOWNWARD leaf cupping with elongated brittle leaves.",
          hi: "थ्रिप्स में पत्तियां ऊपर की ओर मुड़ती हैं और नीचे चांदी जैसी धारियां दिखती हैं; माइट (मकड़ी) में पत्तियां नीचे की ओर मुड़ती हैं।",
          te: "తామర పురుగుల వల్ల ఆకులు పైకి ముడుచుకుని అడుగుభాగంలో గోధుమ రంగు గీతలు కనిపిస్తాయి; నల్లి వల్ల ఆకులు క్రిందికి ముడుచుకుంటాయి (క్రింది ముడత)."
        }
      },
      {
        slug: "mites",
        name: "Yellow Mites",
        distinguishingFeature: {
          en: "Mites cause downward curling (inverted boat shape) with glossy dark green brittle foliage and elongated petioles.",
          hi: "मकड़ी (माइट) में पत्तियां उल्टी नाव की तरह नीचे की ओर मुड़ती हैं और गहरे हरे रंग की कड़क हो जाती हैं।",
          te: "నల్లి ఆశించినప్పుడు ఆకులు క్రిందికి తిరగబడి ముడుచుకుంటాయి (బోర్లించిన దోనె ఆకారం); ఆకులు పెళుసుగా మారతాయి."
        }
      }
    ],
    culturalManagement: {
      en: [
        "Set up yellow sticky traps (15–20 per acre) at canopy level to continuously monitor and trap whitefly vectors",
        "Eradicate alternate weed hosts (Parthenium hysterophorus) from field surroundings",
        "Plant 2–3 border rows of tall barrier crops like Maize, Sorghum, or Pearl Millet 20 days prior to chilli transplanting"
      ],
      hi: [
        "सफेद मक्खी को फंसाने के लिए पीले चिपचिपे कार्ड (15-20 प्रति एकड़) लगाएं",
        "खेत के आसपास की गाजरघास व खरपतवार साफ करें",
        "खेत के चारों ओर मक्का या ज्वार की 2-3 पंक्तियों की अवरोधक बाड़ लगाएं"
      ],
      te: [
        "తెల్ల దోమల నివారణకు ఎకరాకు 15-20 పసుపు రంగు జిగురు అట్టలను అమర్చండి",
        "గట్లపై ఉన్న పార్థీనియం వంటి కలుపు మొక్కలను నాశనం చేయండి",
        "పొలం చుట్టూ రక్షణ పంటగా 2-3 వరుసల్లో జొన్న లేదా మొక్కజొన్నను నాటండి"
      ]
    },
    mechanicalManagement: {
      en: ["Rogue out and deeply bury severely stunted or virus-infected seedlings during the first 30 days after transplanting"],
      hi: ["शुरुआती 30 दिनों में अत्यधिक रोगग्रस्त पौधों को उखाड़कर जमीन में गाड़ दें"],
      te: ["నాటిన మొదటి 30 రోజుల్లో తెగులు సోకిన మొక్కలను పీకి భూమిలో పాతిపెట్టండి"]
    },
    biologicalManagement: {
      en: [
        "Spray Neem oil 1500 ppm (@ 3–5 ml/L water) or NSKE 5% to inhibit whitefly feeding and oviposition",
        "Foliar spray of entomopathogenic fungus Beauveria bassiana (@ 5 g/L) during high humidity evenings"
      ],
      hi: [
        "नीम तेल 1500 पीपीएम (3-5 मिली/लीटर) या नीम बीज अर्क (5%) का छिड़काव करें",
        "जैविक फफूंद ब्युवेरिया बासियाना (5 ग्राम/लीटर) का शाम के समय छिड़काव करें"
      ],
      te: [
        "వేప నూనె (1500 ppm @ 3-5 మి.లీ/లీటరు) లేదా వేప గింజల కషాయం (5%) పిచికారీ చేయండి",
        "సేంద్రీయ శిలీంద్రం బ్యూవేరియా బాసియానా (5 గ్రా/లీటరు) సాయంత్రం వేళల్లో పిచికారీ చేయండి"
      ]
    },
    chemicalManagement: [
      {
        activeIngredient: "Diafenthiuron",
        formulation: "50% WP",
        approvedDosePerLitre: "1.2 g / L water",
        phiDays: 15,
        safetyPrecautions: {
          en: "Targets the whitefly vector to break virus transmission. Spray in early morning. Wear protective clothing.",
          hi: "सफेद मक्खी की रोकथाम हेतु। सुबह के समय छिड़कें। सुरक्षात्मक कपड़े पहनें।",
          te: "వైరస్‌ను వ్యాపింపజేసే తెల్ల దోమల నివారణకు. ఉదయం వేళల్లో పిచికారీ చేయండి. రక్షణ దుస్తులు ధరించండి."
        },
        cibrcReference: "CIB&RC Registered for Chilli Sucking Pests / ANGRAU Guide"
      }
    ],
    regionApplicability: ["Andhra Pradesh", "Telangana", "Karnataka", "Maharashtra", "All"],
    seasonApplicability: ["kharif", "rabi", "all"],
    sourceInstitution: "ICAR - Indian Institute of Horticultural Research (IIHR) & ANGRAU",
    sourceDocument: "Integrated Pest and Disease Management in Chilli (IIHR Bengaluru / ANGRAU Guntur)",
    verificationStatus: "verified",
    lastVerifiedDate: "2026-01-30"
  },

  "chilli:thrips": {
    recordId: "rec-chilli-thrips-05",
    crop: "chilli",
    slug: "thrips",
    commonName: { en: "Chilli Thrips", hi: "मिर्च का थ्रिप्स (चुर्री-मुर्री कीट)", te: "మిరప తామర పురుగులు (పై ముడత)" },
    scientificName: "Scirtothrips dorsalis Hood",
    kind: "pest",
    symptoms: {
      en: [
        "Upward curling of leaf margins (boat-shaped cupping) with silvery white patches and brown necrotic streaks on leaf underside",
        "Leaves become thick, brittle, and leathery; buds become brittle and drop prematurely",
        "Scabby, corky brown scarring on fruit surfaces reducing commercial market value"
      ],
      hi: [
        "पत्तियां ऊपर की ओर मुड़कर नाव का आकार ले लेती हैं और निचली सतह पर चांदी जैसी चमक व भूरे निशान बनते हैं",
        "पत्तियां मोटी और कड़क हो जाती हैं, कलियां सूखकर गिर जाती हैं",
        "मिर्च के फलों पर खुरदरे भूरे निशान बन जाते हैं जिससे बाजार भाव घट जाता है"
      ],
      te: [
        "ఆకులు పైకి దోనె ఆకారంలో ముడుచుకుపోవడం (పై ముడత) మరియు ఆకుల అడుగుభాగంలో వెండి రంగు లేదా గోధుమ రంగు గీతలు",
        "ఆకులు దళసరిగా, పెళుసుగా మారి రాలిపోవడం; పూత పిందె రాలిపోవడం",
        "కాయల మీద గోధుమ రంగు గీతలు ఏర్పడి కాయ నాణ్యత దెబ్బతింటుంది"
      ]
    },
    causes: {
      en: "Slender micro-insects (Scirtothrips dorsalis) with fringed wings lacerating leaf epidermal tissues and sucking cell sap. Favoured by dry spells and warm temperatures.",
      hi: "छोटे सूक्ष्म कीट जो पत्तियों को खुरच कर रस चूसते हैं। गर्म और सूखे मौसम में इनका प्रकोप बहुत तेज होता है।",
      te: "సూక్ష్మ కీటకాలు ఆకులను గీకి రసాన్ని పీల్చుతాయి. వేడి మరియు పొడి వాతావరణం వీటి వ్యాప్తికి ఎంతో అనుకూలం."
    },
    favouringConditions: {
      en: ["Prolonged dry spells with low relative humidity and temperatures 28°C–36°C", "Excessive single-dose chemical nitrogen without adequate potassium"],
      hi: ["लंबे समय तक सूखा और 28 से 36 डिग्री तापमान", "पोटाश के बिना केवल यूरिया का अधिक प्रयोग"],
      te: ["వర్షాలు లేని పొడి వాతావరణం, 28-36 డిగ్రీల ఉష్ణోగ్రత", "పొటాష్ లేకుండా కేవలం యూరియా మాత్రమే వేయడం"]
    },
    similarDiseases: [
      {
        slug: "mites",
        name: "Yellow Mites",
        distinguishingFeature: {
          en: "Thrips cause UPWARD leaf cupping; mites cause DOWNWARD cupping (inverted boat) with shiny deep green leaves.",
          hi: "थ्रिप्स में पत्तियां ऊपर मुड़ती हैं; माइट में पत्तियां नीचे मुड़ती हैं और गहरी हरी हो जाती हैं।",
          te: "తామర పురుగుల్లో ఆకులు పైకి ముడుచుకుంటాయి; నల్లిలో ఆకులు క్రిందికి ముడుచుకుంటాయి."
        }
      }
    ],
    culturalManagement: {
      en: [
        "Install blue sticky traps (15–20 per acre) specifically attractive to thrips species",
        "Intercrop with Coriander, Cowpea, or Marigold to attract natural predatory ladybird beetles",
        "Overhead sprinkler irrigation during dry spells disrupts thrips nymphs and washes them off foliage"
      ],
      hi: [
        "थ्रिप्स को फंसाने के लिए नीले चिपचिपे कार्ड (15-20 प्रति एकड़) लगाएं",
        "धनिया, लोबिया या गेंदा की अंतरवर्तीय फसल लगाएं",
        "फव्वारा (स्प्रिंकलर) सिंचाई करने से थ्रिप्स पानी से धुल जाते हैं"
      ],
      te: [
        "తామర పురుగులను ఆకర్షించడానికి ఎకరాకు 15-20 నీలి రంగు జిగురు అట్టలను అమర్చండి",
        "మిరపలో అంతర పంటగా ధనియాలు, బంతి లేదా అలసందలను సాగు చేయండి",
        "స్ప్రింక్లర్లతో నీరు పెట్టడం వలన తామర పురుగులు నీటి తాకిడికి కొట్టుకుపోతాయి"
      ]
    },
    mechanicalManagement: {
      en: ["Use silver-black reflective plastic mulch (25 micron) to disorient flying thrips adults"],
      hi: ["सिल्वर-ब्लैक प्लास्टिक मल्चिंग का उपयोग करें जिससे कीट भ्रमित होते हैं"],
      te: ["సిల్వర్-బ్లాక్ ప్లాస్టిక్ మల్చింగ్ వాడటం వలన పురుగులు పంటపై వాలలేవు"]
    },
    biologicalManagement: {
      en: [
        "Foliar spray of Neem oil 1500 ppm (@ 3 ml/L) or NSKE 5% at early infestation",
        "Spray Lecanicillium lecanii (@ 5 g/L) or Beauveria bassiana during humid evenings"
      ],
      hi: [
        "नीम तेल (1500 पीपीएम @ 3 मिली/लीटर) या नीम अर्क (5%) छिड़कें",
        "लेकानीसीलियम या ब्युवेरिया (5 ग्राम/लीटर) का जैविक छिड़काव करें"
      ],
      te: [
        "వేప నూనె (1500 ppm @ 3 మి.లీ/లీటరు) లేదా NSKE 5% పిచికారీ చేయండి",
        "బ్యూవేరియా బాసియానా లేదా లెకానిసీలియం (5 గ్రా/లీటరు) సాయంత్రం వేళల్లో పిచికారీ చేయండి"
      ]
    },
    chemicalManagement: [
      {
        activeIngredient: "Fipronil",
        formulation: "5% SC",
        approvedDosePerLitre: "1.5 ml / L water",
        phiDays: 15,
        safetyPrecautions: {
          en: "Spray in calm morning hours. Toxic to honeybees; avoid spraying during active crop flowering bloom.",
          hi: "सुबह छिड़कें। मधुमक्खियों के लिए हानिकारक है, फूल खिलने के समय छिड़काव से बचें।",
          te: "ఉదయం వేళల్లో పిచికారీ చేయండి. తేనెటీగలకు హానికరం; పంట విరివిగా పూత దశలో ఉన్నప్పుడు పిచికారీ చేయవద్దు."
        },
        cibrcReference: "CIB&RC Registered for Chilli Thrips / ANGRAU Guidelines"
      }
    ],
    regionApplicability: ["Andhra Pradesh", "Telangana", "All"],
    seasonApplicability: ["kharif", "rabi", "all"],
    sourceInstitution: "ANGRAU - Horticultural Research Station Lam, Guntur & ICAR-IIHR",
    sourceDocument: "Chilli Pest Management Protocol (HRS Lam 2025/2026)",
    verificationStatus: "verified",
    lastVerifiedDate: "2026-02-01"
  }
};

export class OfflineRAGEngine {
  /**
   * Retrieves verified agricultural records matching the query, crop, condition, and region.
   */
  public static retrieveEvidence(
    crop: CropKey,
    problemSlug?: string,
    query?: string,
    region: string = "Andhra Pradesh",
    season: "kharif" | "rabi" | "all" = "all"
  ): VerifiedKnowledgeRecord | null {
    // 1. Exact match by crop & slug
    if (problemSlug) {
      const key = `${crop}:${problemSlug}`;
      if (VERIFIED_AG_DATABASE[key]) {
        return VERIFIED_AG_DATABASE[key];
      }
    }

    // 2. Search by keywords across database
    if (query) {
      const qLower = query.toLowerCase();
      for (const [key, rec] of Object.entries(VERIFIED_AG_DATABASE)) {
        if (key.startsWith(`${crop}:`)) {
          if (
            qLower.includes(rec.slug) ||
            qLower.includes(rec.commonName.en.toLowerCase()) ||
            qLower.includes(rec.commonName.te) ||
            qLower.includes(rec.commonName.hi) ||
            rec.symptoms.en.some(s => qLower.includes(s.toLowerCase().split(" ")[0]))
          ) {
            return rec;
          }
        }
      }
    }

    return null;
  }

  /**
   * Constructs strict RAG evidence text to inject into the Llama 3.2 1B Instruct system prompt.
   */
  public static buildRAGContext(rec: VerifiedKnowledgeRecord, lang: "en" | "hi" | "te" = "en"): string {
    const common = rec.commonName[lang] || rec.commonName.en;
    const symList = (rec.symptoms[lang] || rec.symptoms.en).map(s => `  • ${s}`).join("\n");
    const cultList = (rec.culturalManagement[lang] || rec.culturalManagement.en).map(c => `  • ${c}`).join("\n");
    const bioList = (rec.biologicalManagement[lang] || rec.biologicalManagement.en).map(b => `  • ${b}`).join("\n");
    const chemList = rec.chemicalManagement.map(
      c => `  • ${c.activeIngredient} ${c.formulation} (@ ${c.approvedDosePerLitre}, PHI: ${c.phiDays} days)`
    ).join("\n");
    const simList = rec.similarDiseases.map(
      s => `  • ${s.name}: ${s.distinguishingFeature[lang] || s.distinguishingFeature.en}`
    ).join("\n");

    return `
[VERIFIED AGRICULTURAL KNOWLEDGE BASE EVIDENCE]
- Source Institution: ${rec.sourceInstitution}
- Reference Document: ${rec.sourceDocument} (Verified: ${rec.lastVerifiedDate})
- Crop: ${rec.crop.toUpperCase()} | Identified Condition: ${common} (${rec.scientificName})
- Key Symptoms:
${symList}
- Biological Causes & Triggers: ${rec.causes[lang] || rec.causes.en}
- Differential Diagnosis (Similar Problems):
${simList || "  • None commonly confused in field."}
- Cultural & Water Practices:
${cultList}
- Safe Bio-Control Practices:
${bioList}
- Statutory Approved Chemicals (CIB&RC Registered):
${chemList || "  • None warranted for healthy condition."}
- Operational Rule: Do not invent any dosages or unlisted chemicals. Follow strict label advice.
`;
  }
}

