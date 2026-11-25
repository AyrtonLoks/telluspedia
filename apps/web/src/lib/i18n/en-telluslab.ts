import type { MessageDictionary } from "./types";

/**
 * Dicionário inglês (`en`) do TellusLab Hub, Dossiês, Eras Históricas e telas de erro (D28b).
 * Carregado sob demanda via `en.ts` (sem impacto no First Load JS de `/` em `pt-BR`).
 */
export const EN_TELLUSLAB_MESSAGES = {
  // Eras históricas (HistoricalEraBadge & Galeria /studies)
  "era.CONTEMPORARY.label": "Contemporary Era",
  "era.COLD_WAR_1969.label": "Cold War & Space Race (1969)",
  "era.WW2_1939.label": "World War II (1939)",
  "era.WW1_1914.label": "World War I (1914)",
  "era.PRUSSIA_1870.label": "German Unification & Kingdom of Prussia (1870)",

  // TellusLab Hub (/telluslab) e ponte TellusBridge
  "telluslab.backToGlobe": "← TellusPedia Globe",
  "telluslab.domains": "domains",
  "telluslab.works": "works",
  "telluslab.macrotopics": "macro-topics",
  "telluslab.progressTitle": "Progress by complexity",
  "telluslab.updatedOn": "Updated on",
  "telluslab.importLabel": "Import JSON snapshot",
  "telluslab.chooseFile": "Choose JSON file",
  "telluslab.noFileSelected": "No file selected",
  "telluslab.importHintUpdate": "Export an update in TellusLab to refresh this dashboard.",
  "telluslab.importHintEmpty": "Import the global file exported by TellusLab to track your studies.",
  "telluslab.errExceedsLimit": "The snapshot exceeds 10 MiB.",
  "telluslab.errImportFailed": "Could not import the snapshot.",
  "telluslab.statusNewerExists": "Imported. This browser already received a more recent update from TellusLab.",
  "telluslab.statusPersistent": "Progress imported in this browser.",
  "telluslab.statusSession": "Progress imported for this session.",
  "telluslab.overdueTitle": "Overdue reviews (S6)",
  "telluslab.cards": "cards",
  "telluslab.overdueEmptySnapshot": "No overdue reviews in snapshot.",
  "telluslab.overdueEmptyNoSnapshot": "Import your progress to inspect the review queue.",
  "telluslab.dossiersHeading": "Dossiers & historical figures",
  "telluslab.originAria": "Study origin",
  "telluslab.returnToNode": "← Return to node",

  // 8 Domínios do TellusLab
  "telluslab.domain.DOM-MATH": "Mathematics",
  "telluslab.domain.DOM-PROG": "Programming & Computer Science",
  "telluslab.domain.DOM-ECON": "Economics & Finance",
  "telluslab.domain.DOM-PHYS": "Physics & Optics",
  "telluslab.domain.DOM-ENG": "Engineering",
  "telluslab.domain.DOM-HUM": "Humanities, History, Philosophy, Social Sciences & Metacognition",
  "telluslab.domain.DOM-LANG": "Languages",
  "telluslab.domain.DOM-LIT": "Literature",

  // 39 Trilhas do TellusLab
  "telluslab.track.TRL-00": "Transversal Foundations",
  "telluslab.track.TRL-01": "Continuous & Analytical",
  "telluslab.track.TRL-02": "Algebraic & Geometric",
  "telluslab.track.TRL-03": "Discrete & Algorithmic",
  "telluslab.track.TRL-04": "Stochastic & Quantitative",
  "telluslab.track.TRL-PROG-00": "Programming Foundations, Memory & Paradigms",
  "telluslab.track.TRL-PROG-01": "Algorithms, Data Structures & Mathematical Analysis",
  "telluslab.track.TRL-PROG-02": "Code Craftsmanship, Tactical Design & DDD",
  "telluslab.track.TRL-PROG-03": "Software Architecture, Distributed Systems & Data at Scale",
  "telluslab.track.TRL-PROG-04": "Software Engineering, Technical Management & DevOps",
  "telluslab.track.TRL-ECON-00": "Quantitative Foundations, Financial Math & Ethics",
  "telluslab.track.TRL-ECON-01": "Applied Economics & Classical Political Economy",
  "telluslab.track.TRL-ECON-02": "Financial Accounting, Corporate Finance, Equity & Alternatives",
  "telluslab.track.TRL-ECON-03": "Financial System, Central Banks, Derivatives & Risk Management",
  "telluslab.track.TRL-ECON-04": "Specialization in Fixed Income, Structured Credit & Securitization",
  "telluslab.track.TRL-PHYS-00": "Mechanical, Vector & Experimental Foundations",
  "telluslab.track.TRL-PHYS-01": "Rigid Bodies, Elasticity, Gravitation & Fluids",
  "telluslab.track.TRL-PHYS-02": "Oscillations, Mechanical Waves & Classical Thermodynamics",
  "telluslab.track.TRL-PHYS-03": "Classical Electromagnetism & Circuits",
  "telluslab.track.TRL-PHYS-04": "Introductory Modern Physics",
  "telluslab.track.TRL-PHYS-05": "Specialization in Physical Optics, Wave Optics & Optical Systems",
  "telluslab.track.TRL-ENG-00": "Engineering Fundamentals, Materials & Solid Mechanics",
  "telluslab.track.TRL-ENG-01": "Applied Thermofluids & Power Systems",
  "telluslab.track.TRL-ENG-02": "Automotive Engineering, Vehicle Dynamics & Propulsion",
  "telluslab.track.TRL-ENG-03": "Electrical & Electronic Engineering, Instrumentation, Control & Mechatronics",
  "telluslab.track.TRL-ENG-04": "Optomechanical Engineering, Manufacturing & Precision Metrology",
  "telluslab.track.TRL-HUM-00": "Metacognition, Learning, Heuristics & Scientific Method",
  "telluslab.track.TRL-HUM-01": "History of Philosophy, Epistemology, Metaphysics & Ethics",
  "telluslab.track.TRL-HUM-02": "Political Philosophy, Strategy, Power & Freedom",
  "telluslab.track.TRL-HUM-03": "Social Sciences: Sociology, Anthropology, Race & Critical Pedagogy",
  "telluslab.track.TRL-HUM-04": "Macro-History, Information Networks & Critique of Modernity",
  "telluslab.track.TRL-HUM-05": "Nonviolent Communication, Empathy & Relational Psychology",
  "telluslab.track.TRL-LANG-EN": "Structured English — Beginner to Advanced & Technical English",
  "telluslab.track.TRL-LANG-JP": "Japanese Language — Writing & Kanji System",
  "telluslab.track.TRL-LANG-PT": "Instrumental Portuguese & Lexical Precision",
  "telluslab.track.TRL-LIT-00": "Epic, Lyric Poetry & Contemporary Urban Poetics",
  "telluslab.track.TRL-LIT-01": "Portuguese & European Prose — 19th Century",
  "telluslab.track.TRL-LIT-02": "Formation of the Brazilian Novel & Short Story",
  "telluslab.track.TRL-LIT-03": "Brazilian Drama & African Lusophone Literature",

  // 14 Dossiês e figuras históricas
  "telluslab.link.dossier:astronomia-optica": "Astronomy, optics & telescopes",
  "telluslab.link.dossier:industria-energia-transporte": "Industrial Revolution, energy & transport",
  "telluslab.link.dossier:sistemas-monetarios": "Monetary systems, crises & fixed income",
  "telluslab.link.dossier:computacao": "Computing, algorithms, distributed systems & AI",
  "telluslab.link.dossier:historia-e-filosofia": "History, philosophy & social sciences",
  "telluslab.link.dossier:literaturas": "Brazilian, Portuguese, French & Mozambican literatures",
  "telluslab.link.dossier:idiomas": "English, Japanese writing & instrumental Portuguese",
  "telluslab.link.figure:dom-pedro-ii": "Dom Pedro II",
  "telluslab.link.figure:luis-de-camoes": "Luís de Camões",
  "telluslab.link.dossier:fundamentos-da-matematica": "Foundations of mathematics, linear algebra, calculus & analysis",
  "telluslab.link.dossier:mecanica-eletromagnetismo-quantica": "Classical mechanics, electromagnetism, relativity & quantum physics",
  "telluslab.link.dossier:mercados-financas-corporativas": "Capital markets, corporate finance, derivatives & risk management",
  "telluslab.link.figure:isaac-newton": "Isaac Newton",
  "telluslab.link.figure:albert-einstein": "Albert Einstein",
  "telluslab.link.figure:milton-santos": "Milton Santos — Critical Geography (1926–2026)",

  // Error boundaries (error.tsx & GlobalErrorView.tsx)
  "error.runtimeTag": "Runtime error",
  "error.runtimeTitle": "Could not load this view",
  "error.runtimeBody": "An unexpected error occurred while rendering. You can try again or continue navigating the other modules of TellusPedia.",
  "error.reference": "Reference",
  "error.retry": "Try again",
  "error.backToGlobe": "Back to globe",
  "error.recoveryAria": "Recovery shortcuts",
  "error.comparator": "Country comparator",
  "error.telluslab": "Dossiers & TellusLab",
  "error.criticalTag": "Critical application error",
  "error.criticalTitle": "The interface had to be interrupted",
  "error.criticalBody": "We detected a failure in the main TellusPedia shell. Try restoring the session or reload the home page.",
  "error.reloadHome": "Reload home",
} as const satisfies MessageDictionary;

/** Introduções em inglês dos 14 dossiês publicados (uso SSR em `/dossies/[slug]`). */
export const DOSSIER_INTRODUCTIONS_EN: Readonly<Record<string, string>> = {
  "astronomia-optica":
    "Observing the sky spans two scales. Celestial mechanics describes the motion of bodies, while optics explains how the instrument forms an image. Compare the effects of aperture, diffraction, and aberrations when reading an astronomical observation.",
  "industria-energia-transporte":
    "Industrialization can be studied through the chains that convert heat, motion, and electricity into work. Connect steam cycles to industrial production and investigate how propulsion, transmission, and control shape modern transport alternatives.",
  "sistemas-monetarios":
    "A monetary policy decision shapes credit through interest rates, bank balance sheets, and expectations. Compare those channels with the mechanics of a financial crisis and examine how bond maturities alter interest-rate exposure.",
  computacao:
    "From proving an algorithm to deploying a distributed system, engineering depends on assumptions about resources and failures. Compare operation costs, the impact of replication on data consistency, and the role of statistical inference in AI systems.",
  "historia-e-filosofia":
    "Examine concepts such as sovereignty, emancipation, and power in the historical context in which they were formulated. Compare primary sources, period vocabulary, and later interpretations before linking philosophical or political traditions.",
  literaturas:
    "Explore forms such as the epic, the realist novel, and urban poetry across Portuguese- and French-language works. Start your comparison with narrative voice, the structure of time, and the interplay between orality and writing.",
  idiomas:
    "Compare formal and informal register in English, lexicographic references in Portuguese, and reading systems for Japanese characters. Use contextual examples to spot false cognates and cross-language interference.",
  "dom-pedro-ii":
    "The Second Reign offers a lens to study the relationship between the Brazilian monarchy, slavery, and the formation of national institutions. Novels of the period let you compare projects of national identity and narrative perspectives on imperial society.",
  "luis-de-camoes":
    "In The Lusiads, the maritime voyage structures an epic blending historical memory, classical tradition, and authorial commentary. A close reading can begin with the narrator's voice and the shifts across historical, mythological, and lyric registers.",
  "fundamentos-da-matematica":
    "From elementary logic and Euclidean geometry to linear algebra, multivariable calculus, and real analysis in metric spaces, mathematics provides the structural grammar of quantitative sciences. Connect classical geometric constructions to rigorous proofs of convergence and differentiability.",
  "mecanica-eletromagnetismo-quantica":
    "Physics weaves conservation laws, electromagnetic fields, special relativity, and quantum mechanics across scales from the atomic nucleus to orbital dynamics. Compare the role of symmetry and variational principles in formulating experimental models.",
  "mercados-financas-corporativas":
    "Financial statements, cost of capital, no-arbitrage pricing, and portfolio management connect corporate decisions to systemic risk in global markets. Examine how accounting standards (IFRS and US GAAP), derivatives, and convexity shape financial stability.",
  "isaac-newton":
    "In the Principia and Opticks, Isaac Newton unified terrestrial mechanics and celestial gravitation through differential and integral calculus. Investigate how the laws of motion and ordinary differential equations transformed astronomical prediction and modern engineering.",
  "albert-einstein":
    "From the 1905 papers on the photoelectric effect and special relativity to relativistic gravitation, Albert Einstein redefined space, time, energy, and radiation. Compare invariance postulates with the experimental foundations of quantum and nuclear physics.",
  "milton-santos":
    "Brazilian geographer and 1994 Vautrin Lud Prize laureate, Milton Santos (1926–2001) developed a critical theory of geographic space centered on used territory, the technical-scientific-informational milieu, verticalities and horizontalities, and the Four Brazils regionalization.",
};
