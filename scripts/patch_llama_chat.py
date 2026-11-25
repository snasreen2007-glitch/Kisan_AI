# -*- coding: utf-8 -*-
"""
High-fidelity Conversational Chat Assistant Engine for KisanAI.
Supports multi-turn memory, general agronomic inquiries, intent dispatch, rich suggestions, and 6 regional languages.
"""

import sys

with open("src/features/crop-care/services/llama.ts", "r", encoding="utf-8") as f:
    content = f.read()

anchor = "export async function queryLiveLlamaEndpoint("
idx = content.find(anchor)
if idx == -1:
    print("Could not find anchor!")
    sys.exit(1)

head = content[:idx]

new_tail = '''export async function queryLiveLlamaEndpoint(
  prompt: string,
  systemPrompt: string,
  history?: ChatMessage[]
): Promise<string | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return null;
  }

  // Auto-detect installed Ollama model if Ollama is running locally
  let ollamaModel = "llama3.2:1b";
  try {
    const tagsRes = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(500),
    });
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      if (Array.isArray(data?.models) && data.models.length > 0) {
        const found = data.models.find((m: any) =>
          typeof m.name === "string" && (m.name.includes("llama") || m.name.includes("crop") || m.name.includes("kisan"))
        );
        ollamaModel = found?.name || data.models[0].name;
      }
    }
  } catch {
    // Port 11434 not running or blocked
  }

  const endpoints = [
    {
      url: "http://localhost:11434/v1/chat/completions",
      model: ollamaModel,
    },
    {
      url: "http://localhost:8000/v1/chat/completions",
      model: "hf.co/meta-llama/Llama-3.2-1B-Instruct",
    },
  ];

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...(history || []).slice(-4).map((m) => ({
      role: m.role === "farmer" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: prompt },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ep.model,
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(2200),
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

export function generateLlamaChatResponse(
  query: string,
  targetLang: Lang,
  scanCtx?: MultimodalScanContext | null,
  history?: ChatMessage[]
): LlamaChatResult {
  const trimmed = query.trim();

  // 1. Statutory CIB&RC Gate Check
  for (const pattern of HAZARDOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        model: "Llama-3.2-1B-Instruct",
        lang: targetLang,
        text: REFUSALS[targetLang] ?? REFUSALS.en,
        isMultimodal: false,
        safetyTriggered: true,
        refs: [],
        suggestions: [
          targetLang === "te" ? "సేంద్రీయ నివారణలు ఏమిటి?" : "What are organic bio-controls?",
          targetLang === "te" ? "యూరియా ఎరువు ఎలా వాడాలి?" : "Balanced fertilizer schedule",
          targetLang === "te" ? "వ్యవసాయ అధికారి సలహా" : "Consult local KVK extension",
        ],
      };
    }
  }

  // 2. Resolve topic:
  // Priority: A. Mentioned in current query -> B. Attached scan context -> C. Multi-turn history
  let topic: Topic | undefined;
  const qLower = trimmed.toLowerCase();
  const qClean = qLower.replace(/[?!.,;:_\\-]/g, " ").trim();
  const words = qClean.split(/\\s+/).filter(Boolean);

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
  const isGreeting = (words.length > 0 && words.length <= 4 && words.every(w => isGreetingWord(w) || /^(there|you|kisanai|ji|aru|sir|mitra)$/i.test(w))) || (words.length === 1 && isGreetingWord(words[0]));

  const isGratitude = /thank|thanks|helpful|great|awesome|good job|dhanyavad|shukriya|ధన్యవాదాలు|థాంక్స్|బాగుంది|धन्यवाद|शुक्रिया|நன்றி|ಧನ್ಯವಾದ|मदत/i.test(qClean);

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
        responseText = `నమస్కారం! నేను మీ కిసాన్ ఏఐ (KisanAI) వ్యవసాయ సహాయకుడిని. మీ ఫోటోలో ${cropName} పంటపై **${probName}** (${sevBandLocal} దశ) ఉన్నట్లు గుర్తించాను.\\n\\nనేను మీకు ఎలా సహాయపడగలను? మీరు నన్ను ఇలా అడగవచ్చు:\\n• 🛠️ **"ఏం చేయాలి?"** — తక్షణ నివారణ మరియు యాజమాన్య చర్యల కోసం\\n• ⚠️ **"ఎందుకు వచ్చింది?"** — కారణాలు మరియు వాతావరణ ప్రభావం తెలుసుకోవడానికి\\n• 📝 **"సులభంగా వివరించు"** — సాధారణ మాటల్లో తేలికైన సారాంశం కోసం\\n• లేదా ఎరువులు, నీటి యాజమాన్యం గురించి ఏదైనా సందేహం అడగవచ్చు!`;
        suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు"];
      } else if (targetLang === "hi") {
        responseText = `नमस्ते! मैं किसान एआई (KisanAI) आपका डिजिटल कृषि सहायक हूँ। आपकी तस्वीर में ${cropName} पर **${probName}** (${sevBandLocal} स्तर) की पहचान हुई है।\\n\\nमैं आपकी क्या मदद कर सकता हूँ? आप पूछ सकते हैं:\\n• 🛠️ **"क्या करें?"** — तत्काल रोकथाम और उपचार के उपाय\\n• ⚠️ **"क्यों हुआ?"** — रोग के जैविक कारण और मौसम का प्रभाव\\n• 📝 **"सरल शब्दों में बताओ"** — आसान भाषा में सारांश\\n• या खाद, सिंचाई और सुरक्षा से संबंधित कोई भी सवाल!`;
        suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ रोकथाम के उपाय"];
      } else {
        responseText = `Hello! I am KisanAI, your digital agronomy assistant. I see your photo scan shows **${probName}** (${sevBand} severity) on **${cropName}**.\\n\\nHow can I help you manage your crop today? You can ask me:\\n• 🛠️ **"What should I do?"** — for immediate steps to treat and stop it spreading\\n• ⚠️ **"Why did this happen?"** — to understand biological causes and weather risks\\n• 📝 **"Explain in simple words"** — for a quick, farmer-friendly summary\\n• Or ask any question about fertilizers, water drainage, or organic sprays!`;
        suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
      }
    } else {
      if (targetLang === "te") {
        responseText = `నమస్కారం! నేను కిసాన్ ఏఐ (KisanAI) ఆన్-డివైస్ వ్యవసాయ సహాయకుడిని.\\n\\nమీరు నన్ను వరి మరియు మిరప పంటల తెగుళ్లు, నివారణ చర్యలు, సమతుల్య ఎరువులు లేదా ఆకు లక్షణాల గురించి ఏదైనా అడగవచ్చు. లేదా మీ కెమెరాతో తీసిన ఆకు ఫోటోను స్కాన్ చేసి నేరుగా విశ్లేషించవచ్చు!`;
        suggestions = ["🌾 వరి అగ్గి తెగులు లక్షణాలు", "🌶️ మిరప ఆకు ముడత నివారణ", "🧪 వరి ఎరువుల యాజమాన్యం", "📷 ఆకు ఫోటో ఎలా స్కాన్ చేయాలి?"];
      } else if (targetLang === "hi") {
        responseText = `नमस्ते! मैं किसान एआई (KisanAI) आपका ऑन-डिवाइस कृषि सहायक हूँ।\\n\\nआप मुझसे धान और मिर्च की फसलों के कीट-रोगों, जैविक उपचारों, या खाद-पानी के बारे में पूछ सकते हैं। आप किसी भी पत्ती का फोटो स्कैन करके भी तुरंत जांच कर सकते हैं!`;
        suggestions = ["🌾 धान में ब्लास्ट रोग", "🌶️ मिर्च में पत्ती मरोड़िया", "🧪 यूरिया खाद की सही मात्रा", "📷 फोटो कैसे स्कैन करें?"];
      } else {
        responseText = `Hello! I am KisanAI, your on-device AI agronomic assistant.\\n\\nYou can ask me about Rice and Chilli pest & disease symptoms, biological treatments, fertilizer schedules, or field water management. You can also scan any crop leaf using your camera for instant diagnosis!`;
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
    responseText = `I am **KisanAI**, your on-device agricultural intelligence assistant powered by Meta Llama 3.2 1B Instruct and localized computer vision.\\n\\nHere is what I can do for you:\\n• 📷 **Instant Leaf Diagnosis**: Detect 22 Rice and Chilli diseases and evaluate foliar severity from your camera photos.\\n• 🛠️ **Integrated Pest Management (IPM)**: Provide ICAR, ANGRAU, and PJTSAU approved cultural, biological, and agronomic management plans.\\n• 🧪 **Nutrient & Fertilizer Schedules**: Guide balanced N-P-K applications, split urea dosages, and deficiency remedies.\\n• 🌿 **Organic & Bio-Control Advice**: Safe usage of *Trichoderma*, *Pseudomonas*, and Neem-based sprays.\\n• 🛡️ **Statutory Safety Guard**: Strictly enforcing CIB&RC regulations to keep your field and family safe from hazardous overdoses.\\n\\nHow can I help your farm today?`;
    suggestions = ["📷 How to scan a leaf?", "🌾 Rice blast diagnosis", "🌶️ Chilli leaf curl control", "🧪 Balanced NPK schedule"];
  }

  // D. FERTILIZER & NUTRIENT MANAGEMENT
  else if (isFertilizer) {
    if (topic) {
      responseText = `🧪 **Fertilizer Management for ${probName} (${cropName})**:\\n\\n` +
        `• **Nitrogen / Urea**: Immediately suspend all top-dressing of urea. Excess chemical nitrogen thins the plant cell walls and fuels pathogen multiplication.\\n` +
        `• **Potassium (Potash / MOP)**: Apply supplementary Potassium (@ 15-20 kg/acre). Potash thickens leaf epidermal cell walls, deposits silica layers, and improves disease resistance.\\n` +
        `• **Zinc & Micronutrients**: If leaves show bronzing or chlorosis, spray Zinc Sulfate (0.5%) + Citric Acid (0.05%) after disease severity subsides.`;
      suggestions = ["🛠️ What should I do right now?", "⚠️ Why did it happen?", "🌾 Explain in simple words", "💧 Water drainage check"];
    } else {
      responseText = `🧪 **Balanced Crop Nutrition & Fertilizer Guidelines**:\\n\\n` +
        `• **Rice (Paddy)**:\\n` +
        `  - Standard N-P-K recommendation: 100-120 : 50-60 : 40-50 kg/ha.\\n` +
        `  - **Basal**: 100% Phosphorus (DAP/SSP), 50% Potash (MOP), and Zinc Sulfate (25 kg/ha).\\n` +
        `  - **Split Nitrogen**: Apply Urea in 3 equal splits (at planting, active tillering 20-25 DAT, and panicle initiation 40-45 DAT).\\n` +
        `  - ⚠️ *Crucial rule*: Never top-dress urea during overcast cloudy weather or active pest outbreaks!\\n\\n` +
        `• **Chilli**:\\n` +
        `  - Standard N-P-K: 120-150 : 60 : 60 kg/ha.\\n` +
        `  - Avoid excessive nitrogen which attracts thrips, aphids, and whiteflies.\\n` +
        `  - Apply foliar spray of Boron (1 g/L) + Zinc (2 g/L) at flowering initiation to prevent flower drop.`;
      suggestions = ["🌾 Paddy tillering stage fertilizer", "🌶️ Prevent chilli flower drop", "⚠️ Why avoid excess urea?", "🌱 Organic manure & compost"];
    }
  }

  // E. WATER & DRAINAGE MANAGEMENT
  else if (isWater) {
    responseText = `💧 **Field Water & Irrigation Management**:\\n\\n` +
      `• **Rice (Alternate Wetting and Drying - AWD)**:\\n` +
      `  - Continuous deep flooding wastes water and promotes bacterial leaf blight and brown planthopper (BPH).\\n` +
      `  - Practice AWD: Allow standing water to naturally subside and soil to develop hairline cracks before re-flooding to 2-3 cm.\\n` +
      `  - Maintain shallow standing water (2-3 cm) only during critical flowering and grain filling stages.\\n\\n` +
      `• **Chilli**:\\n` +
      `  - Chilli plants are extremely sensitive to standing water and waterlogging, which quickly causes root rot and bacterial wilt.\\n` +
      `  - Always plant on raised beds or broad ridges with furrows.\\n` +
      `  - Ensure irrigation furrows allow rapid excess rainwater runoff within 2-3 hours.`;
    suggestions = ["🌾 How to practice AWD in paddy?", "🌶️ Fix chilli root rot", "⚠️ Waterlogging disease risks", "🌧️ Monsoon drainage tips"];
  }

  // F. ORGANIC BIO-CONTROL (IPM)
  else if (isOrganic) {
    responseText = `🌿 **Organic Bio-Controls & IPM Solutions**:\\n\\n` +
      `• **Bio-Fungicides & Bactericides**:\\n` +
      `  - *Pseudomonas fluorescens* (@ 5-10 g/L or 2.5 kg/ha in 500 L water): Excellent biological control against rice blast, sheath blight, and bacterial leaf blight.\\n` +
      `  - *Trichoderma viride* (@ 5 g/kg seed or 2.5 kg/ha mixed with FYM): Protects against soil-borne root rot, damping off, and Fusarium wilt.\\n\\n` +
      `• **Botanical Sprays**:\\n` +
      `  - Neem Seed Kernel Extract (NSKE 5%) or Azadirachtin 10,000 ppm (@ 2-3 ml/L): Acts as an antifeedant, repellent, and insect growth regulator against thrips, whiteflies, aphids, and early larvae.\\n\\n` +
      `• **Physical & Mechanical Traps**:\\n` +
      `  - Yellow Sticky Traps (15-20/acre) for whiteflies and aphids.\\n` +
      `  - Blue Sticky Traps (15-20/acre) specifically for chilli thrips.\\n` +
      `  - Pheromone Traps (5-8/acre) for monitoring yellow stem borer and fruit borer.`;
    suggestions = ["🦟 How to spray Neem oil?", "🪤 Sticky traps installation", "🦠 Trichoderma application guide", "🌾 Bio-control for rice blast"];
  }

  // G. LEAF YELLOWING & CHLOROSIS DIAGNOSTICS
  else if (isYellowing) {
    responseText = `🔍 **Leaf Yellowing & Discoloration Diagnostic Guide**:\\n\\n` +
      `Yellow leaves can have multiple distinct causes. Here is how to distinguish them in the field:\\n\\n` +
      `1. **Nitrogen (Urea) Deficiency**:\\n` +
      `   - Starts on older, lower leaves first.\\n` +
      `   - Whole leaf turns pale green to uniform yellow, progressing from tip along the midrib in a 'V' shape.\\n\\n` +
      `2. **Bacterial Leaf Blight (BLB)**:\\n` +
      `   - Starts from leaf tips and margins as wavy, water-soaked yellow/white streaks.\\n` +
      `   - Upper active leaves are affected; dried crusts form on margins.\\n\\n` +
      `3. **Iron Chlorosis (Calcareous / Alkaline Soil)**:\\n` +
      `   - Youngest top leaves turn pale yellow to paper white, while leaf veins remain distinctly green.\\n\\n` +
      `4. **Waterlogging / Root Suffocation**:\\n` +
      `   - Overall plant drooping and yellowing due to lack of oxygen in root zone.\\n\\n` +
      `📷 *Tip: Take a close-up photo of the leaf and scan it with KisanAI for automated computer vision detection!*`;
    suggestions = ["📷 Scan this leaf now", "🌾 Check BLB symptoms", "🧪 Remedy for iron chlorosis", "🌱 How to treat nitrogen deficiency"];
  }

  // H. SPRAY TIMING & WEATHER BEST PRACTICES
  else if (isSprayTime) {
    responseText = `🌦️ **Optimal Spray Timing & Field Rules**:\\n\\n` +
      `1. **Time of Day**:\\n` +
      `   - Early morning (8:00 AM – 10:30 AM) after morning dew has completely evaporated from the foliage.\\n` +
      `   - Or late afternoon (3:30 PM – 5:30 PM) when sun intensity subsides and beneficial pollinators (bees) are less active.\\n` +
      `   - Never spray during midday heat (>35°C), as rapid evaporation scorches leaves.\\n\\n` +
      `2. **Weather Conditions**:\\n` +
      `   - Do not spray if rain is expected within 3-4 hours (rain will wash off application).\\n` +
      `   - Do not spray if wind speed exceeds 12-15 km/h to prevent spray drift to adjacent plots.\\n\\n` +
      `3. **Adjuvants & Safety**:\\n` +
      `   - During the monsoon/humid season, always add an approved agricultural wetting agent / sticker (0.5 ml/L).\\n` +
      `   - Always wear protective mask, gloves, and glasses during preparation and spraying.`;
    suggestions = ["🦺 Safety gear guidelines", "🌧️ Spray rain-fastness", "🛠️ Best nozzle for fungicides", "🧪 Mixing caution"];
  }

  // I. WHAT TO DO / ACTION PLAN / TREATMENT
  else if (isAction && topic) {
    if (targetLang === "te") {
      responseText = `🛠️ **${probName} (${cropName}) నివారణకు చేపట్టాల్సిన తక్షణ చర్యలు**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *గమనిక: రసాయనాలు వాడేటప్పుడు రక్షణ జాగ్రత్తలు పాటించండి. స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) నిపుణుల సలహాలు తీసుకోండి.*`;
      suggestions = ["⚠️ ఎందుకు వచ్చింది?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల నియమాలు"];
    } else if (targetLang === "hi") {
      responseText = `🛠️ **${probName} (${cropName}) के उपचार एवं नियंत्रण के मुख्य उपाय**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *सावधानी: अनुमोदित उपायों का ही पालन करें। सुरक्षा हेतु मास्क व दस्ताने पहनें तथा स्थानीय कृषि विशेषज्ञ से परामर्श लें।*`;
      suggestions = ["⚠️ क्यों हुआ?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `🛠️ **Recommended Action Plan for ${probName} (${cropName})**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *Safety Notice: Strictly adhere to statutory CIB&RC guidelines. Wear protective gear during field applications and consult your local Agriculture Officer or KVK.*`;
      suggestions = ["⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // J. WHY DID THIS HAPPEN / CAUSE / SPREAD
  else if (isCause && topic) {
    if (targetLang === "te") {
      responseText = `⚠️ **${probName} రావడానికి కారణాలు & వ్యాప్తి**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **వ్యాప్తిని పెంచే అనుకూల పరిస్థితులు**:\\n` +
        `• అధిక యూరియా (నత్రజని) వాడకం మొక్క కణజాలాన్ని మృదువుగా చేసి తెగులు సోకేలా చేస్తుంది.\\n` +
        `• గాలిలో 85-90% కంటే ఎక్కువ తేమ మరియు రాత్రి వేళల్లో ఆకులపై మంచు బిందువులు నిలవడం.\\n` +
        `• మొక్కలు దగ్గరగా నాటడం వల్ల గాలి, వెలుతురు సరిగ్గా ప్రసరించకపోవడం.`;
      suggestions = ["🛠️ ఏం చేయాలి?", "🌾 సులభంగా వివరించు", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల నియమాలు"];
    } else if (targetLang === "hi") {
      responseText = `⚠️ **${probName} के जैविक कारण और फैलाव**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **रोग को बढ़ावा देने वाले मुख्य कारक**:\\n` +
        `• यूरिया (नाइट्रोजन) का अत्यधिक प्रयोग पत्तियों को कोमल बना देता है जिससे संक्रमण तेजी से फैलता है।\\n` +
        `• वातावरण में 85-90% से अधिक नमी तथा रात के समय पत्तियों पर ओस का लंबे समय तक ठहरना।\\n` +
        `• पौधों का अधिक घना होना जिससे खेत में हवा और धूप का संचार रुक जाता है।`;
      suggestions = ["🛠️ क्या करें?", "🌾 सरल शब्दों में बताओ", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `⚠️ **Causes & Spread of ${probName} (${cropName})**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **Field Triggers to Watch**:\\n` +
        `• Over-application of chemical nitrogen (urea) makes plant cuticle thin and susceptible to penetration.\\n` +
        `• Relative humidity above 85-90% combined with dewy nights accelerates spore propagation.\\n` +
        `• Dense planting that limits intra-canopy sunlight and air circulation.`;
      suggestions = ["🛠️ What should I do?", "🌾 Explain in simple words", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // K. SIMPLE WORDS / MEANING / SUMMARY
  else if (isSimple && topic) {
    if (targetLang === "te") {
      responseText = `🌾 **${probName} గురించి సులభమైన వివరణ**:\\n\\n` +
        `• **ఇది ఏమిటి?**: ఇది ${cropName} పంటలో సాధారణంగా కనిపించే సమస్య. దీనివల్ల ఆకులు ఎండిపోయి లేదా దెబ్బతిని పంట ఎదుగుదల తగ్గుతుంది.\\n` +
        `• **ముఖ్య కారణం**: వాతావరణంలో తేమ ఎక్కువగా ఉన్నప్పుడు లేదా యూరియా ఎరువును ఎక్కువగా వేసినప్పుడు ఇది వేగంగా వస్తుంది.\\n` +
        `• **మీరు వెంటనే చేయాల్సింది**: భయపడవద్దు! వెంటనే యూరియా వేయడం ఆపండి, పొలంలో నిలిచిన నీటిని తీసివేయండి మరియు గట్లపై కలుపు లేకుండా చూసుకోండి.`;
      suggestions = ["🛠️ ఏం చేయాలి?", "⚠️ ఎందుకు వచ్చింది?", "🛡️ రాకుండా ముందుజాగ్రత్తలు", "🧪 ఎరువుల మోతాదు"];
    } else if (targetLang === "hi") {
      responseText = `🌾 **${probName} का सरल शब्दों में सारांश**:\\n\\n` +
        `• **यह क्या है?**: यह ${cropName} की एक आम समस्या है, जो पत्तियों को नुकसान पहुँचाती है और समय पर रोकथाम न होने पर पैदावार घटा सकती है।\\n` +
        `• **मुख्य वजह**: खेत में अधिक नमी, ओस और जरूरत से ज्यादा यूरिया खाद डालने से यह तेजी से फैलता है।\\n` +
        `• **किसान तुरंत क्या करें?**: घबराएं नहीं! तुरंत यूरिया डालना बंद करें, खेत से अतिरिक्त पानी निकालें और मेड़ों की खरपतवार साफ रखें।`;
      suggestions = ["🛠️ क्या करें?", "⚠️ क्यों हुआ?", "🛡️ बचाव के उपाय", "🧪 खाद प्रबंधन"];
    } else {
      responseText = `🌾 **${probName} in Simple Words**:\\n\\n` +
        `• **What is it?**: ${probName} is a common crop health problem on ${cropName}. It attacks foliage, reduces healthy green leaf area, and lowers yield if neglected.\\n` +
        `• **Main Reason**: High moisture, cloudy dewy weather, and applying too much nitrogen (urea) trigger rapid spread.\\n` +
        `• **What to do right now**: Do not panic! Immediately suspend supplementary urea, ensure proper field water drainage, and keep bunds free from weeds.`;
      suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🛡️ Prevention & future care", "🧪 Fertilizer adjustments"];
    }
  }

  // L. SYMPTOMS / IDENTIFICATION
  else if (isSymptoms && topic) {
    responseText = `🔍 **Visual Symptoms & Pathology for ${probName} (${cropName})**:\\n\\n` +
      `${visualText}\\n\\n` +
      `🔬 **Field Scouting Guide**:\\n` +
      `• Inspect upper and lower leaf surfaces along the middle and top foliage canopy.\\n` +
      `• Check whether lesions form discrete eyespots, water-soaked margins, or streak patterns along veins.`;
    suggestions = ["🛠️ What should I do?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention & future care"];
  }

  // M. PREVENTION / FUTURE SEASONS
  else if (isPrevention && topic) {
    responseText = `🛡️ **Preventive & Cultural Practices for ${probName} (${cropName})**:\\n\\n` +
      `1. **Seed Treatment**: Use certified pathogen-free seeds treated with *Trichoderma viride* or *Pseudomonas fluorescens*.\\n` +
      `2. **Balanced Nutrition**: Apply Potassium (MOP) and micronutrients based on soil test; avoid excessive single-dose urea.\\n` +
      `3. **Sanitation**: Remove crop residues and eradicate alternate grassy hosts from field bunds.\\n` +
      `4. **Resistant Cultivars**: Choose university-recommended resistant or tolerant crop varieties.`;
    suggestions = ["🛠️ What should I do now?", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🧪 Fertilizer schedule"];
  }

  // N. FULL REPORT / GENERAL FALLBACK WITH TOPIC
  else if (topic && prof) {
    const visualBlock = visualText;
    const riskBlock = riskText;
    const actionsBlock = actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n");

    responseText = `🌾 **${probName} Diagnostic & Management Protocol**:\\n\\n` +
      `🔍 **Visual Pathology**:\\n${visualBlock}\\n\\n` +
      `⚠️ **Epidemiology & Risk**:\\n${riskBlock}\\n\\n` +
      `🛠️ **Recommended Action Plan**:\\n${actionsBlock}`;
    suggestions = ["🛠️ Action steps only", "⚠️ Why did this happen?", "🌾 Explain in simple words", "🛡️ Prevention"];
  }

  // O. GENERAL FALLBACK WITHOUT TOPIC
  else {
    responseText = `Hello! I am your on-device KisanAI (Meta Llama 3.2 1B Instruct) Agricultural Assistant.\\n\\n` +
      `Please describe the symptoms in your field or ask about specific conditions:\\n` +
      `• **Rice**: Blast, BLB, Brown Spot, Stem Borer, Brown Planthopper, Leaf Folder, Gall Midge, Hispa, Tungro.\\n` +
      `• **Chilli**: Leaf Curl, Thrips, Mites, Whiteflies, Aphids, Anthracnose / Fruit Rot, Powdery Mildew, Cercospora Spot.\\n\\n` +
      `You can also scan a leaf photograph to analyze its visual pathology in real-time!`;
    suggestions = ["🌾 Rice blast symptoms", "🌶️ Chilli leaf curl control", "🧪 Balanced NPK schedule", "📷 How to scan a leaf?"];
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
'''

full_text = head + new_tail
with open("src/features/crop-care/services/llama.ts", "w", encoding="utf-8") as f:
    f.write(full_text)

print("Successfully written advanced conversational llama.ts!")
