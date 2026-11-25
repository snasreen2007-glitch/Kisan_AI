"""
Database Generation Script for AI Crop Disease & Pest Assistant
Populates knowledge/database/crop_care.db with verified agricultural data from
ICAR, IIRR, ANGRAU, PJTSAU, and CIB&RC.
"""

import json
import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "..", "schema", "schema.sql")
DB_PATH = os.path.join(BASE_DIR, "crop_care.db")

CROPS_DATA = [
    ("rice", "Rice / धान / వరి", "Oryza sativa"),
    ("chilli", "Chilli / मिर्च / మిరప", "Capsicum annuum"),
]

PROBLEMS_DATA = [
    # --- RICE DISEASES ---
    (
        "rice-blast",
        "rice",
        "Rice Blast",
        "Magnaporthe oryzae (Pyricularia oryzae)",
        "disease",
        "Spindle or eye-shaped leaf lesions with greyish centres and brown margins; rot of neck and panicle node; blank panicles.",
        "Airborne fungal spores favoured by high relative humidity (>90%), cool night temperatures (18-24°C), and excessive nitrogen application.",
        "Leaves, collar, node, panicle neck",
    ),
    (
        "brown-spot",
        "rice",
        "Brown Spot",
        "Bipolaris oryzae (Cochliobolus miyabeanus)",
        "disease",
        "Circular to oval dark brown spots on foliage with yellow halos; discoloured grains with dark velvety fungal growth.",
        "Fungal pathogen prevalent in nutrient-deficient soils (particularly potassium, nitrogen, or silicon deficiency) and drought stress.",
        "Leaves, leaf sheaths, grain",
    ),
    (
        "bacterial-leaf-blight",
        "rice",
        "Bacterial Leaf Blight",
        "Xanthomonas oryzae pv. oryzae",
        "disease",
        "Water-soaked lesions beginning at leaf margins and tips, turning wavy yellow-white with bacterial ooze beads in early morning.",
        "Bacterial infection entering through hydathodes or wounds, accelerated by tropical storms, typhoons, and deep standing water.",
        "Leaves, seedlings (Kresek phase)",
    ),
    (
        "tungro",
        "rice",
        "Rice Tungro Virus",
        "Rice tungro bacilliform virus (RTBV) & spherical virus (RTSV)",
        "disease",
        "Distinctive yellow-orange leaf discolouration starting from tips; stunted plant growth; delayed flowering; empty grains.",
        "Transmitted non-persistently by green leafhoppers (Nephotettix virescens) feeding on infected tillers.",
        "Leaves, whole plant stature",
    ),
    # --- RICE PESTS ---
    (
        "brown-planthopper",
        "rice",
        "Brown Planthopper",
        "Nilaparvata lugens",
        "pest",
        "Circular patches of lodging and drying tillers known as 'hopperburn'; honeydew deposits and sooty mould near base.",
        "Sap-feeding delphacid insects aggregating in dense colonies at the base of the canopy near water level.",
        "Base of tillers, plant crown",
    ),
    (
        "yellow-stem-borer",
        "rice",
        "Yellow Stem Borer",
        "Scirpophaga incertulas",
        "pest",
        "Drying of central emerging shoots ('dead heart') during vegetative stage; erect white, chaffy empty panicles ('white ear') at heading.",
        "Lepidopteran larvae boring directly into the internodes and severing the vascular bundles of the central shoot.",
        "Internal stem, central shoot, panicle base",
    ),
    (
        "leaf-folder",
        "rice",
        "Rice Leaf Folder",
        "Cnaphalocrocis medinalis",
        "pest",
        "Longitudinally folded leaves stitched with silk threads; transparent papery white streaks where green chlorophyll is scraped away.",
        "Larval feeding inside rolled leaves, aggravated by high shady humidity and excessive urea applications.",
        "Leaves",
    ),
    (
        "gall-midge",
        "rice",
        "Rice Gall Midge",
        "Orseolia oryzae",
        "pest",
        "Transformation of apical shoot into an elongated, hollow, silver-white cylindrical gall resembling an onion leaf ('silver shoot'); absence of panicle.",
        "Maggot feeding on the growing tip of the tiller, arresting normal leaf blade development.",
        "Growing shoot apical meristem",
    ),
    # --- CHILLI DISEASES ---
    (
        "leaf-curl",
        "chilli",
        "Chilli Leaf Curl Virus",
        "Chilli leaf curl virus (ChiLCV)",
        "disease",
        "Upward leaf curling, puckering, reduced leaf lamina size, thickening of veins, severely stunted internodes and flower drop.",
        "Geminivirus transmitted persistently by the whitefly (Bemisia tabaci); favoured by warm, dry weather.",
        "Leaves, apical shoots, flowers",
    ),
    (
        "cercospora-leaf-spot",
        "chilli",
        "Cercospora Leaf Spot (Frogeye Spot)",
        "Cercospora capsici",
        "disease",
        "Circular to oblong spots with pale ash-white centres and prominent dark brown to reddish margins; premature leaf shedding.",
        "Fungal pathogen surviving on crop debris, spread by wind and water splash during humid weather.",
        "Leaves, petioles, stems",
    ),
    (
        "bacterial-leaf-spot",
        "chilli",
        "Bacterial Leaf Spot",
        "Xanthomonas campestris pv. vesicatoria",
        "disease",
        "Small, dark, greasy water-soaked spots that become brown, angular, and sunken on leaves and raised blister-like scabs on fruit.",
        "Seed-borne and debris-borne bacteria entering via stomata during warm, rainy or sprinkler-irrigated periods.",
        "Leaves, green and ripe fruit",
    ),
    (
        "powdery-mildew",
        "chilli",
        "Powdery Mildew",
        "Leveillula taurica",
        "disease",
        "White powdery fungal patches on leaf undersides with corresponding chlorotic yellow patches on upper leaf surfaces; heavy defoliation.",
        "Endophytic fungus favored by warm dry days and humid nights, common in winter (Rabi) season in southern India.",
        "Leaves",
    ),
    (
        "anthracnose",
        "chilli",
        "Anthracnose / Fruit Rot / Die-back",
        "Colletotrichum capsici",
        "disease",
        "Sunken circular lesions with concentric rings of black acervuli on mature fruits; drying of twigs from top downwards (die-back).",
        "Fungus spread by rainfall splash and infected seed; severe in humid monsoonal (Kharif) conditions.",
        "Ripe fruit, tender branches, twigs",
    ),
    # --- CHILLI PESTS ---
    (
        "thrips",
        "chilli",
        "Chilli Thrips",
        "Scirtothrips dorsalis",
        "pest",
        "Upward curling of leaf margins, crinkling, bronze or silvery sheen on leaf undersides; boat-shaped leaves; flower drop.",
        "Tiny slender insects with fringed wings that lacerate epidermal tissues and suck oozing sap.",
        "Tender shoots, leaf undersides, floral buds",
    ),
    (
        "mites",
        "chilli",
        "Yellow Mite / Broad Mite",
        "Polyphagotarsonemus latus",
        "pest",
        "Downwards curling of leaves ('inverted boat' shape), elongation of petioles ('rat-tail' appearance), dark bronze leathery texture.",
        "Microscopic arachnids feeding on growing tips and lower leaf surfaces in warm, humid weather.",
        "Terminal shoots, young foliage",
    ),
    (
        "whitefly",
        "chilli",
        "Whitefly",
        "Bemisia tabaci",
        "pest",
        "Chlorotic mottling, premature leaf drop, sticky honeydew accumulation with black sooty mould, vector of ChiLCV.",
        "Small white-winged insects clustering on the underside of leaves; heavy reproduction in dry, rain-free spells.",
        "Underside of leaves",
    ),
    (
        "aphids",
        "chilli",
        "Aphids",
        "Aphis gossypii / Myzus persicae",
        "pest",
        "Yellowing, crinkling of leaves, stunted shoots, sticky honeydew attracting sooty mould and black ants.",
        "Soft-bodied pear-shaped insects reproducing rapidly by parthenogenesis in cool, dry conditions.",
        "Tender shoots, leaf undersides, flower stalks",
    ),
    (
        "bacterial-leaf-streak",
        "rice",
        "Bacterial Leaf Streak",
        "Xanthomonas oryzae pv. oryzicola",
        "disease",
        "Narrow, water-soaked, translucent interveinal streaks turning yellowish-brown with tiny amber bacterial beads.",
        "Foliar bacterium entering through stomata or mechanical abrasions, favoured by high rainfall, warm humid days, and strong winds.",
        "Leaf blades",
    ),
    (
        "hispa",
        "rice",
        "Rice Hispa",
        "Dicladispa armigera",
        "pest",
        "Characteristic white parallel streaks on leaf surface where green epidermal parenchyma is scraped off; blister mines in leaf blades.",
        "Spiny black chrysomelid beetles scraping chlorophyll and larvae mining inside leaf tissues in humid monsoon weather.",
        "Leaf blades, young tillers",
    ),
    (
        "downy-mildew",
        "rice",
        "Downy Mildew (Crazy Top)",
        "Sclerophthora macrospora",
        "disease",
        "Excessive stunted tillering, leafy distorted proliferation of floral heads ('crazy top'), chlorotic leaf mottling.",
        "Soil and water-borne oomycete pathogen attacking seedlings during nursery submergence and prolonged flash floods.",
        "Tillers, flag leaves, panicles",
    ),
    (
        "rice-healthy",
        "rice",
        "Healthy Rice Foliage",
        "Oryza sativa",
        "disease",
        "Clean, deep green erect foliage with no visible chlorotic lesions, necroses, or pest damage.",
        "Optimal agronomic care, balanced nitrogen-potassium ratio, and proper water management.",
        "Whole plant",
    ),
    (
        "chilli-healthy",
        "chilli",
        "Healthy Chilli Plant",
        "Capsicum annuum",
        "disease",
        "Vibrant green smooth leaves, healthy apical shoots, upright flowers, and clean fruits free from curling or spots.",
        "Proper IPM sanitation, clean barrier borders, balanced nutrition, and timely irrigation.",
        "Whole plant",
    ),
]

ADVISORIES_DATA = [
    # (problem_id, region, season, lang, immediate, preventive, monitoring)
    (
        "rice-blast",
        "Andhra Pradesh",
        "kharif",
        "en",
        "Withhold nitrogen top-dressing immediately. Maintain standing water of 2-3 cm to mitigate drought-induced blast severity. Rogue severely blighted nursery beds.",
        "Seed treatment with certified fungicides prior to sowing; adopt blast-resistant cultivars (e.g., MTU 1010, NLR 34449); split nitrogen into 3 equal splits; eliminate grassy weeds on bunds.",
        "Scout weekly from tillering through panicle emergence. Inspect 10 hills across a 'W' field transect for diamond-shaped lesions.",
    ),
    (
        "rice-blast",
        "Telangana",
        "kharif",
        "te",
        "నత్రజని ఎరువుల వాడకాన్ని వెంటనే నిలిపివేయండి. పొలంలో 2-3 సెం.మీ నీటి మట్టాన్ని నిరంతరం ఉంచండి. తీవ్రంగా సోకిన పిలకలను తొలగించండి.",
        "విత్తన శుద్ధి తప్పనిసరిగా చేయాలి. తెగులును తట్టుకునే రకాలను (ఉదా. RNR 15048) సాగు చేయండి. సిఫార్సు చేసిన మోతాదులోనే నత్రజనిని వాడండి. గట్లపై కలుపు మొక్కలను నివారించండి.",
        "పిలక దశ నుండి కంకి దశ వరకు వారానికి ఒకసారి పొలంలో 'W' ఆకారంలో నడుస్తూ 10 దుబ్బులను పరిశీలించండి.",
    ),
    (
        "rice-blast",
        "All",
        "All",
        "hi",
        "नाइट्रोजन (यूरिया) का छिड़काव तुरंत रोक दें। खेत में 2-3 सेमी पानी बनाए रखें ताकि पौधों पर तनाव कम हो।",
        "प्रमाणित फफूंदनाशी से बीज उपचार करें; प्रतिरोधी किस्मों की बुवाई करें; संतुलित मात्रा में फास्फोरस व पोटाश दें; मेड़ों की घास साफ रखें।",
        "कल्ले निकलने की अवस्था से बाली निकलने तक प्रति सप्ताह 10 पौधों के झुंडों की जाँच करें।",
    ),
    (
        "leaf-curl",
        "Andhra Pradesh",
        "kharif",
        "en",
        "Uproot and burn virus-infected stunted plants immediately to reduce inoculum. Install yellow sticky traps (15-20 traps/acre) at canopy height to capture adult whiteflies.",
        "Grow nursery under 40-mesh insect-proof nylon net. Spray neem seed kernel extract (NSKE 5%) or neem oil (10,000 ppm) as an oviposition deterrent. Maintain clean field borders.",
        "Inspect leaf undersides on 20 plants across 5 spots weekly for whitefly nymphs and adults.",
    ),
    (
        "leaf-curl",
        "Telangana",
        "rabi",
        "te",
        "ముడత సోకిన మొక్కలను పీకి నాశనం చేయండి. తెల్లదోమల నివారణకు ఎకరాకు 15-20 పసుపు రంగు జిగురు అట్టలను పైరు ఎత్తులో అమర్చండి.",
        "నారుమడి దశలో 40 మెష్ నైలాన్ నెట్ వాడండి. వేప నూనె 5 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి. పొలం చుట్టూ జొన్న లేదా మొక్కజొన్నను రక్షణ పంటగా వేయండి.",
        "ప్రతి వారం 20 మొక్కల ఆకుల అడుగు భాగాన్ని తెల్లదోమ ఉనికి కోసం నిశితంగా పరిశీలించండి.",
    ),
    (
        "leaf-curl",
        "All",
        "All",
        "hi",
        "विषाणु से ग्रसित पौधों को तुरंत उखाड़कर नष्ट करें। खेत में प्रति एकड़ 15-20 पीले चिपचिपे कार्ड लगाएं।",
        "नर्सरी को नायलॉन नेट से ढकें; नीम तेल (5 मिली/लीटर) का छिड़काव करें; खेत के चारों ओर मक्का या ज्वार की 2-3 कतारें लगाएं।",
        "सप्ताह में एक बार पत्तियों की निचली सतह पर सफेद मक्खी की निगरानी करें।",
    ),
    (
        "bacterial-leaf-streak",
        "All",
        "All",
        "en",
        "Suspend urea top-dressing. Keep water shallow (2-3 cm). Avoid handling wet foliage during mornings.",
        "Seed treatment with certified bactericide; field drainage; balanced potassium application.",
        "Inspect leaf blades for translucent brown streaks restricted between veins.",
    ),
    (
        "bacterial-leaf-streak",
        "Andhra Pradesh",
        "kharif",
        "te",
        "యూరియా వాడకాన్ని ఆపండి. పొలంలో నీటిని తగ్గించండి. ఉదయం వేళల్లో ఆకులను తాకవద్దు.",
        "విత్తన శుద్ధి చేయండి. పొటాష్ ఎరువును వేయండి. గట్లపై కలుపు లేకుండా చూసుకోండి.",
        "ఆకు ఈనెల మధ్య నిలువు చారల కోసం ప్రతి వారం పరిశీలించండి.",
    ),
    (
        "hispa",
        "All",
        "All",
        "en",
        "Clip and destroy infested leaf tips prior to transplanting. Drag wet gunny bags treated with kerosene to dislodge beetles.",
        "Sweep-netting adults in morning; apply neem oil; avoid excessive nitrogen.",
        "Count adult spiny beetles and blister leaf mines on 20 hills.",
    ),
    (
        "hispa",
        "Telangana",
        "kharif",
        "te",
        "నాట్లు వేసేటప్పుడు పురుగు ఉన్న ఆకు కొనలను తుంచి నాశనం చేయండి. దుబ్బులపై తిరుగుతున్న ముళ్ల పురుగులను వలలతో పట్టుకోండి.",
        "వేప నూనెను పిచికారీ చేయండి. సమతుల్య ఎరువులను వాడండి.",
        "ఆకులపై తెల్లటి గీతలు మరియు ముళ్ల పురుగుల కోసం గమనించండి.",
    ),
    (
        "downy-mildew",
        "All",
        "All",
        "en",
        "Drain flash-flooded nursery beds immediately. Rogue out crazy-top tillers.",
        "Ensure field drainage channels are clear; avoid low-lying waterlogged plots for nursery.",
        "Check tillering hills for stunted twisted leaf proliferation.",
    ),
    (
        "rice-healthy",
        "All",
        "All",
        "en",
        "No chemical or therapeutic spray is warranted. Maintain normal shallow irrigation (2-3 cm).",
        "Follow balanced NPK recommendation based on soil testing. Alternate wetting and drying.",
        "Conduct routine weekly scouting across 10 random hills.",
    ),
    (
        "rice-healthy",
        "Andhra Pradesh",
        "kharif",
        "te",
        "ఎటువంటి రసాయన పిచికారీ అవసరం లేదు. పొలంలో 2-3 సెం.మీ పలుచటి నీరు ఉంచండి.",
        "సమతుల్య నత్రజని, భాస్వరం మరియు పొటాష్ ఎరువులను సిఫార్సు మేరకు వాడండి.",
        "వారానికి ఒకసారి పొలంలో పైరు ఎదుగుదలను సాధారణంగా గమనించండి.",
    ),
    (
        "chilli-healthy",
        "All",
        "All",
        "en",
        "No chemical spray required. Maintain regular border trap monitoring.",
        "Clean border rows with barrier crops (Maize/Sorghum). Balanced drip fertigation.",
        "Inspect 15 plants weekly to catch sucking pests early.",
    ),
    (
        "chilli-healthy",
        "Andhra Pradesh",
        "kharif",
        "te",
        "ఎటువంటి పురుగుమందుల పిచికారీ అవసరం లేదు. పసుపు, నీలి జిగురు అట్టలను గమనించండి.",
        "పొలం చుట్టూ జొన్న లేదా మొక్కజొన్న సరిహద్దు పంటను కాపాడండి.",
        "వారానికి ఒకసారి ఆకుల కింద రసం పీల్చే పురుగుల ఆనవాళ్లు ఉన్నాయా పరిశీలించండి.",
    ),
]

TREATMENTS_DATA = [
    # (problem_id, treatment_type, product_or_method, approved_dose, app_method, waiting_days, precautions, reference, region, status)
    (
        "rice-blast",
        "cultural",
        "Balanced Nitrogen Application & Water Management",
        "Apply urea in 3 split doses (basal, tillering, panicle initiation)",
        "Soil broadcasting",
        0,
        "Never apply entire nitrogen quota in a single heavy dose. Maintain 2-5 cm standing water.",
        "ANGRAU Vyavasaya Panchangam 2024",
        "Andhra Pradesh",
        "verified",
    ),
    (
        "rice-blast",
        "biological",
        "Pseudomonas fluorescens (1% WP)",
        "10 g/kg seed treatment or 2.5 kg/ha soil application",
        "Seed coating and foliar spray",
        0,
        "Store in cool, dry location away from chemical fungicides. Apply during evening hours.",
        "ICAR-IIRR Technical Bulletin No. 88",
        "All",
        "verified",
    ),
    (
        "leaf-curl",
        "cultural",
        "Yellow Sticky Traps & Border Barrier Crops",
        "15 to 20 traps per acre; 2-3 border rows of sorghum/maize",
        "Field installation at crop canopy height",
        0,
        "Clean and replace sticky sheets once saturated with whiteflies. Ensure barrier crop is sown 15 days before chilli transplanting.",
        "PJTSAU Package of Practices for Chilli 2024",
        "Telangana",
        "verified",
    ),
    (
        "leaf-curl",
        "biological",
        "Neem Seed Kernel Extract (NSKE 5%)",
        "50 g powdered seed kernel per litre of water",
        "High-volume foliar spray to leaf undersides",
        3,
        "Use freshly prepared aqueous extract. Spray during early morning or late afternoon.",
        "CIB&RC Non-Chemical Botanical Guidelines",
        "All",
        "verified",
    ),
    (
        "brown-planthopper",
        "cultural",
        "Alternate Wetting and Drying (AWD) & Alley Formation",
        "Provide 30 cm alleys every 2 metres of rice planting",
        "Cultural practice during transplanting and irrigation",
        0,
        "Drain field water for 3 to 4 days during severe infestation to alter microclimate and reduce nymph survival.",
        "ICAR-IIRR IPM Guidelines",
        "All",
        "verified",
    ),
    (
        "anthracnose",
        "cultural",
        "Removal of Diseased Twigs & Seed Sanitation",
        "Pruning twigs 5 cm below infected tissue; clean seed",
        "Manual sanitation and field hygiene",
        0,
        "Disinfect pruning shears with 70% alcohol between cuts. Burn pruned twigs.",
        "ICAR-IIHR Chilli Production Guide",
        "All",
        "verified",
    ),
]

SOURCES_DATA = [
    (
        "src-iirr-01",
        "rice-blast",
        "ICAR - Indian Institute of Rice Research (IIRR), Hyderabad",
        "Disease Management in Rice: Technical Compendium & Integrated Pest Management Package",
        "2023-08-15",
        "https://www.icar-iirr.org",
        "Pages 24-31 (Rice Blast Management)",
        "verified",
        "2024-10-12",
    ),
    (
        "src-angrau-02",
        "rice-blast",
        "Acharya N. G. Ranga Agricultural University (ANGRAU), Guntur",
        "Vyavasaya Panchangam (Agricultural Almanac for Andhra Pradesh)",
        "2024-05-20",
        "https://angrau.ac.in",
        "Crop Protection Section: Paddy Diseases, pp. 62-67",
        "verified",
        "2024-09-01",
    ),
    (
        "src-pjtsau-03",
        "leaf-curl",
        "Prof. Jayashankar Telangana State Agricultural University (PJTSAU)",
        "Package of Practices for Commercial Horticultural Crops in Telangana",
        "2024-04-10",
        "https://pjtsau.edu.in",
        "Chilli Pest and Vector Management, pp. 112-118",
        "verified",
        "2024-10-05",
    ),
    (
        "src-cibrc-04",
        "leaf-curl",
        "Central Insecticide Board & Registration Committee (CIB&RC), Directorate of Plant Protection",
        "Major Uses of Pesticides Registered Under the Insecticides Act, 1968",
        "2024-01-31",
        "https://cibrc.gov.in",
        "Chilli and Rice Approved Usages & Waiting Periods",
        "verified",
        "2024-11-01",
    ),
]

KNOWLEDGE_VERSIONS_DATA = [
    (
        "v0.3-prod",
        "0.3.0",
        "2024-11-14T11:55:00Z",
        "Agronomic Review Board (ICAR/ANGRAU/PJTSAU Aligned)",
    )
]


def build_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Load and execute schema
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())

    # Insert crops
    cursor.executemany(
        "INSERT INTO crops (crop_id, crop_name, scientific_name) VALUES (?, ?, ?)",
        CROPS_DATA,
    )

    # Insert problems
    cursor.executemany(
        """INSERT INTO problems 
           (problem_id, crop_id, problem_name, scientific_name, problem_type, symptoms, causes, affected_parts)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        PROBLEMS_DATA,
    )

    # Insert advisories
    cursor.executemany(
        """INSERT INTO advisory_records
           (advisory_id, problem_id, region, season, language, immediate_actions, preventive_actions, monitoring_guidance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (f"adv-{idx:03d}", *item)
            for idx, item in enumerate(ADVISORIES_DATA, start=1)
        ],
    )

    # Insert treatments
    cursor.executemany(
        """INSERT INTO treatments
           (treatment_id, problem_id, treatment_type, product_or_method, approved_dose, application_method, waiting_period_days, safety_precautions, registration_reference, region, validity_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (f"trt-{idx:03d}", *item)
            for idx, item in enumerate(TREATMENTS_DATA, start=1)
        ],
    )

    # Insert sources
    cursor.executemany(
        """INSERT INTO sources
           (source_id, problem_id, institution, document_title, publication_date, url, page_or_section, verification_status, last_reviewed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        SOURCES_DATA,
    )

    # Insert version
    cursor.executemany(
        "INSERT INTO knowledge_versions (version_id, release_version, created_at, reviewed_by) VALUES (?, ?, ?, ?)",
        KNOWLEDGE_VERSIONS_DATA,
    )

    conn.commit()

    # Sanity checks
    cursor.execute("SELECT COUNT(*) FROM crops")
    n_crops = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM problems")
    n_probs = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM advisory_records")
    n_adv = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM treatments")
    n_trt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sources")
    n_src = cursor.fetchone()[0]

    conn.close()

    db_size = os.path.getsize(DB_PATH)
    print(f"Knowledge database created successfully at {DB_PATH}")
    print(f"Summary: {n_crops} crops, {n_probs} problems, {n_adv} advisories, {n_trt} treatments, {n_src} sources.")
    print(f"Database file size: {db_size} bytes (~{db_size // 1024} KB).")


if __name__ == "__main__":
    build_database()

