import type { EnSceneTranslation } from "./en-scenes-types";

/** Traduções inglesas (`en`) para `polo-1271` e `gama-1497` (D42). */
export const EN_SCENES_EARLY: Record<string, EnSceneTranslation> = {
  "polo-1271": {
    title: "Marco Polo on the Silk Road",
    summary:
      "The Polos' journey from Venice to Kublai Khan's court and their maritime return across the Indian Ocean, shaping Europe's view of Mongol Asia.",
    subtitle: "Venice → Khanbaliq → Venice (1271–1295)",
    sourceLabels: {
      "Marco Polo e Rustichello de Pisa, O Livro de Marco Polo (ed. Yule-Cordier, 1903)":
        "Marco Polo & Rustichello da Pisa, The Travels of Marco Polo (Yule-Cordier ed., 1903)",
      "Ed. Yule-Cordier, vol. 2": "Yule-Cordier ed., vol. 2",
    },
    trajectoryLabel: "Journey of the Polos",
    participants: [
      {
        role: "Traveler and narrator",
        description: "Venetian merchant (c. 1254–1324). Departed at age 17 and returned at 41.",
      },
      {
        role: "Merchant, Marco's father",
        description: "Had previously visited Kublai's court between c. 1260 and 1269 with his brother Maffeo.",
      },
      {
        role: "Merchant, Marco's uncle",
        description: "Niccolò's companion on both Asian journeys.",
      },
      {
        name: "Kublai Khan",
        role: "Great Khan of the Mongols and Yuan Emperor",
        description: "Grandson of Genghis Khan; reigned from 1260 to 1294 and welcomed the Polos at his court.",
      },
      {
        role: "Mongol princess",
        description: "Escorted by the Polos from China to Persia (1291–1293) to wed the Ilkhan.",
      },
      {
        name: "Rustichello da Pisa",
        role: "Romance writer, co-author of the Book",
        description: "Marco's fellow prisoner in Genoa, where he wrote down the account around 1298.",
      },
    ],
    chronicle: [
      { place: "Venice", text: "Departure of Marco, Niccolò, and Maffeo Polo." },
      { place: "Acre", text: "The Polos receive letters from Pope Gregory X addressed to the Great Khan." },
      { place: "Shangdu", text: "Arrival at the summer court of Kublai Khan." },
      { place: "Quanzhou", text: "Departure by sea escorting Princess Kököchin." },
      { place: "Persia", text: "Delivery of the princess to the court of the Ilkhanate." },
      { place: "Venice", text: "Return of the Polos after 24 years away." },
      {
        place: "Genoa",
        text: "Imprisoned by the Genoese, Marco dictates his account to Rustichello da Pisa.",
        quote: {
          text: "Great Princes, Emperors and Kings, Dukes and Marquises…",
          source: "The Travels of Marco Polo, Prologue",
        },
      },
    ],
    points: {
      VENEZA: {
        name: "Venice",
        description:
          "Seventeen-year-old Marco sets out with his father Niccolò and uncle Maffeo as they return to the Great Khan's court after an earlier journey.",
        facts: { stage: "Outbound", region: "Italy", dateNote: "approximate date" },
        quote: {
          text: "Great Princes, Emperors and Kings, Dukes and Marquises…",
          source: "The Travels of Marco Polo (Yule-Cordier ed.), Prologue",
        },
      },
      ACRE: {
        name: "Acre (Saint-Jean-d'Acre)",
        description:
          "The Polos receive letters from the newly elected Pope Gregory X for the Great Khan. Of the hundred learned men Kublai had requested, only two friars set out — and turn back shortly afterward.",
        facts: { stage: "Outbound", region: "Israel", dateNote: "approximate date" },
      },
      LAIAZZO: {
        name: "Ayas (Laiazzo), Cilician Armenia",
        description:
          "Port of the Armenian Kingdom of Cilicia and gateway for caravans heading into the Asian interior.",
        facts: { stage: "Outbound", region: "Türkiye", dateNote: "approximate date" },
      },
      TABRIZ: {
        name: "Tabriz",
        description:
          "Great emporium of the Mongol Ilkhanate of Persia where, according to the Book, silks and precious stones from many lands were traded.",
        facts: { stage: "Outbound", region: "Iran", dateNote: "approximate date" },
      },
      ORMUZ: {
        name: "Hormuz",
        description:
          "The Polos descend to the Persian Gulf, perhaps intending to sail onward, but turn back to the overland route after seeing ships stitched with coconut fiber rather than iron nails.",
        facts: { stage: "Outbound", region: "Iran", dateNote: "approximate date" },
      },
      BALKH: {
        name: "Balkh",
        description:
          "Ancient capital of Bactria, still bearing the scars of the Mongol conquest half a century earlier.",
        facts: { stage: "Outbound", region: "Afghanistan", dateNote: "approximate date" },
      },
      BADAKHSHAN: {
        name: "Badakhshan",
        description:
          "Marco falls ill and the family stays roughly a year in the mountains — famous for balas rubies and lapis lazuli — until he recovers.",
        facts: { stage: "Outbound", region: "Afghanistan", dateNote: "approximate date" },
      },
      PAMIR: {
        name: "Pamir Plateau",
        description:
          "Crossing the 'Roof of the World': the Book describes bitter cold, the absence of birds, and giant-horned wild sheep today named Ovis ammon polii.",
        facts: { stage: "Outbound", region: "Afghanistan / Tajikistan", dateNote: "approximate date" },
      },
      KASHGAR: {
        name: "Kashgar",
        description:
          "Oasis at the western edge of the Tarim Basin where northern and southern Silk Road tracks skirt the Taklamakan Desert.",
        facts: { stage: "Outbound", region: "China", dateNote: "approximate date" },
      },
      KHOTAN: {
        name: "Khotan (Hotan)",
        description: "Renowned jade oasis along the southern Tarim rim on the way toward the Lop Desert.",
        facts: { stage: "Outbound", region: "China", dateNote: "approximate date" },
      },
      SHAZHOU: {
        name: "Shazhou (Dunhuang)",
        description:
          "After roughly a month crossing the shifting sands of the Lop Desert, the caravan reaches the western gateway of China proper.",
        facts: { stage: "Outbound", region: "China", dateNote: "approximate date" },
      },
      GANZHOU: {
        name: "Ganzhou (Zhangye)",
        description:
          "According to the Book, the Polos spend a full year in this Hexi Corridor city attending to commercial affairs.",
        facts: { stage: "Outbound", region: "China", dateNote: "approximate date" },
      },
      SHANGDU: {
        name: "Shangdu (Xanadu)",
        description:
          "Arrival at Kublai Khan's summer capital roughly three and a half years after leaving Venice.",
        facts: { stage: "At the Great Khan's court", region: "China", dateNote: "approximate date" },
      },
      KHANBALIQ: {
        name: "Khanbaliq (Dadu, modern Beijing)",
        description:
          "For roughly 17 years Marco serves at the Yuan imperial court and, according to the Book, travels on diplomatic missions across the empire.",
        facts: { stage: "At the Great Khan's court", region: "China", dateNote: "approximate date" },
      },
      QUANZHOU: {
        name: "Zayton (Quanzhou)",
        description:
          "The Polos sail from China's busiest port in a fourteen-junk fleet escorting Princess Kököchin, betrothed to the Ilkhan of Persia.",
        facts: { stage: "Return by sea", region: "China", dateNote: "approximate date" },
      },
      SUMATRA: {
        name: "Samudra, Sumatra",
        description:
          "The fleet waits roughly five months on Sumatra's northern coast for favorable monsoon winds.",
        facts: { stage: "Return by sea", region: "Indonesia", dateNote: "approximate date" },
      },
      ORMUZ_VOLTA: {
        name: "Hormuz — arrival by sea",
        description:
          "After nearly two years at sea and heavy loss of life aboard the fleet, the princess reaches Persia; Ilkhan Arghun has died, and she weds his son Ghazan.",
        facts: { stage: "Return by sea", region: "Iran", dateNote: "approximate date" },
      },
      TREBIZONDA: {
        name: "Trebizond (Trabzon)",
        description: "Approaching the Black Sea coast, the travelers are robbed of part of their goods.",
        facts: { stage: "Return overland", region: "Türkiye", dateNote: "approximate date" },
      },
      CONSTANTINOPLA: {
        name: "Constantinople",
        description: "Final major stopover before sailing home to the Adriatic.",
        facts: { stage: "Return overland", region: "Türkiye", dateNote: "approximate date" },
      },
      VENEZA_VOLTA: {
        name: "Venice — homecoming",
        description:
          "The Polos return to Venice after 24 years. A few years later, captured in Genoa, Marco dictates his travels to Rustichello da Pisa.",
        facts: { stage: "Homecoming", region: "Italy", dateNote: "approximate date" },
      },
    },
    hud: {
      badge: "SILK ROAD",
      subtitle: "The Travels of Marco Polo",
      period: "1271–1295",
      startLabel: "Venice (1271)",
      endLabel: "Venice (1295)",
      progressLabel: "Progress of Marco Polo's journey",
      quoteTitle: "The Travels of Marco Polo (c. 1298)",
      stepStats: {
        stage: { label: "Leg" },
        yearsAway: { label: "Years away from Venice", unit: "years", note: "approximate dates" },
        region: { label: "Modern region" },
      },
      cameras: ["Wide view", "Pamir", "Khanbaliq"],
    },
  },

  "gama-1497": {
    title: "Vasco da Gama's Voyage to India",
    summary:
      "The first direct sea voyage from Europe to India around the Cape of Good Hope opens the Portuguese maritime spice route.",
    subtitle: "Lisbon → Calicut → Lisbon (1497–1499)",
    sourceLabels: {
      "Roteiro da viagem de Vasco da Gama (ed. Herculano e Paiva, 1861)":
        "Journal of the First Voyage of Vasco da Gama (Herculano & Paiva ed., 1861)",
      "Ravenstein (trad.), A Journal of the First Voyage of Vasco da Gama (Hakluyt Society, 1898)":
        "Ravenstein (trans.), A Journal of the First Voyage of Vasco da Gama (Hakluyt Society, 1898)",
      "Edição semidiplomática do manuscrito 804 da Biblioteca Pública Municipal do Porto":
        "Semi-diplomatic edition of MS 804, Municipal Public Library of Porto",
    },
    trajectoryLabel: "Armada of Vasco da Gama",
    participants: [
      {
        role: "Flagship carrack",
        description:
          "Commanded by Vasco da Gama with pilot Pêro de Alenquer, who had previously sailed with Bartolomeu Dias.",
      },
      {
        role: "Carrack",
        description:
          "Commanded by Paulo da Gama, the captain-major's brother. Burned in January 1499 for lack of crew.",
      },
      {
        role: "Caravel",
        description: "Commanded by Nicolau Coelho; the first vessel to reach Lisbon in July 1499.",
      },
      {
        name: "Supply vessel",
        role: "Storeship",
        description: "Commanded by Gonçalo Nunes; broken up and burned at Mossel Bay in November 1497.",
      },
      {
        role: "Captain-Major",
        description:
          "Nobleman of King Manuel I's household; returned to India in 1502 and died in Cochin in 1524 as Viceroy.",
      },
      {
        name: "Expedition crew",
        role: "Roughly 170 men",
        description:
          "Sailors, soldiers, interpreters, and convict-envoys. Only around 55 returned alive according to Ravenstein (1898).",
      },
    ],
    chronicle: [
      { place: "Restelo, Lisbon", text: "Departure of the four-ship armada." },
      { place: "Santiago, Cape Verde", text: "Beginning of the wide South Atlantic sweep far offshore." },
      { place: "Coast of modern South Africa", text: "Land sighted after roughly three months on the open ocean." },
      { place: "Cape of Good Hope", text: "The fleet rounds the Cape." },
      { place: "Malindi", text: "Departure across the Indian Ocean with a pilot provided by the ruler of Malindi." },
      {
        place: "Calicut",
        text: "Arrival off the Malabar Coast.",
        quote: {
          text: "We came in search of Christians and spices.",
          source: "Roteiro (Journal), May 21, 1498",
        },
      },
      { place: "Calicut", text: "Vasco da Gama is received in audience by the Zamorin." },
      { place: "Calicut", text: "Homeward departure carrying spices and several Malabar hostages." },
      {
        place: "Malindi",
        text: "End of the harrowing counter-monsoon crossing of the Indian Ocean, with dozens lost to scurvy.",
      },
      { place: "Cape of Good Hope", text: "The Cape is rounded on the homeward leg." },
      { place: "Lisbon", text: "The Bérrio reaches Lisbon bearing news of the sea route to India." },
    ],
    points: {
      LISBOA: {
        name: "Lisbon — Restelo Beach",
        description:
          "The armada sails from Restelo outside Lisbon with four ships and roughly 170 men under Captain-Major Vasco da Gama.",
        facts: { fleet: "4 ships", region: "Portugal" },
        quote: {
          text: "In the name of God, Amen. In the year 1497 King Dom Manuel dispatched an expedition of discovery…",
          source: "Journal of the First Voyage (attr. Álvaro Velho), opening",
        },
      },
      CANARIAS: {
        name: "Canary Islands",
        description: "The fleet sights the Canaries one week out of Lisbon and continues southward along West Africa.",
        facts: { fleet: "4 ships", region: "Atlantic — Canaries" },
      },
      CABO_VERDE: {
        name: "Santiago Island (Cape Verde)",
        description:
          "Scattered in fog, the vessels reunite and resupply at Santiago before striking out on August 3 into a wide South Atlantic gyre.",
        facts: { fleet: "4 ships", region: "Cape Verde" },
      },
      SANTA_HELENA: {
        name: "Saint Helena Bay",
        description:
          "After roughly three months out of sight of land — the longest open-ocean passage yet made by Europeans — the fleet anchors off modern South Africa.",
        facts: { fleet: "4 ships", region: "South Africa" },
      },
      BOA_ESPERANCA: {
        name: "Cape of Good Hope",
        description:
          "With a following wind the fleet rounds the Cape ten years after Bartolomeu Dias first opened the passage.",
        facts: { fleet: "4 ships", region: "South Africa" },
      },
      SAO_BRAS: {
        name: "Angra de São Brás (Mossel Bay)",
        description:
          "The supply ship is broken up and burned, its stores transferred to the remaining three vessels. Barter and a clash occur with Khoikhoi herders; a stone padrão is erected.",
        facts: { fleet: "3 ships", region: "South Africa" },
      },
      NATAL: {
        name: "Coast of Natal",
        description: "On Christmas Day the squadron sails past a lush coastline they name Terra do Natal.",
        facts: { fleet: "3 ships", region: "South Africa" },
      },
      MOCAMBIQUE: {
        name: "Island of Mozambique",
        description:
          "First contact with Indian Ocean trade networks: Muslim merchants, gold, silver, spices, and oceangoing dhows. Relations sour once the Portuguese are recognized as Christians.",
        facts: { fleet: "3 ships", region: "Mozambique" },
      },
      MOMBACA: {
        name: "Mombasa",
        description:
          "Greeted with suspicion, the Portuguese foil an attempt to seize their vessels and sail northward.",
        facts: { fleet: "3 ships", region: "Kenya" },
      },
      MELINDE: {
        name: "Malindi",
        description:
          "The ruler of Malindi, rival of Mombasa, allies with Vasco da Gama and provides an experienced Indian Ocean pilot. The fleet departs for India on April 24.",
        facts: { fleet: "3 ships", region: "Kenya" },
      },
      CALECUTE: {
        name: "Calicut (Kozhikode)",
        description:
          "The fleet anchors off the Malabar Coast. Asked what brought them so far, an ashore envoy replies with the famous phrase summing up the enterprise. Gama meets the Zamorin on May 28, though modest gifts limit trade.",
        facts: { fleet: "3 ships", region: "India" },
        quote: {
          text: "We came in search of Christians and spices.",
          source: "Journal of the First Voyage (attr. Álvaro Velho), May 21, 1498",
        },
      },
      ANGEDIVA: {
        name: "Anjediva Islands",
        description:
          "Having left Calicut on August 29, the squadron careens and waters at these islands off western India before attempting the Indian Ocean against the monsoon.",
        facts: { fleet: "3 ships", region: "India" },
      },
      MELINDE_RETORNO: {
        name: "Malindi — return",
        description:
          "The grueling return crossing takes nearly three months and scurvy claims roughly thirty men. Short-handed, the crew burns the São Rafael near Mombasa.",
        facts: { fleet: "2 ships", region: "Kenya" },
      },
      BOA_ESPERANCA_RETORNO: {
        name: "Cape of Good Hope — return",
        description: "São Gabriel and Bérrio round the Cape back into the Atlantic Ocean.",
        facts: { fleet: "2 ships", region: "South Africa" },
      },
      RIO_GRANDE: {
        name: "Rio Grande (Guinea-Bissau)",
        description:
          "Here the surviving manuscript of the Journal abruptly ends off the Guinea coast. The two ships soon separate in a storm.",
        facts: { fleet: "2 ships", region: "Guinea-Bissau" },
      },
      LISBOA_RETORNO: {
        name: "Lisbon — homecoming",
        description:
          "Nicolau Coelho aboard the Bérrio reaches Lisbon first. Vasco da Gama, delayed at Terceira Island tending his dying brother Paulo, arrives weeks later in late summer 1499.",
        facts: { fleet: "Bérrio", region: "Portugal" },
      },
    },
    hud: {
      badge: "SEA ROUTE TO INDIA",
      subtitle: "Journal of the First Voyage",
      period: "1497–1499",
      startLabel: "Lisbon (1497)",
      endLabel: "Lisbon (1499)",
      progressLabel: "Progress of Vasco da Gama's voyage",
      quoteTitle: "Journal of the First Voyage (1497–1499)",
      stepStats: {
        dayOfVoyage: { label: "Day of voyage", unit: "days" },
        fleet: { label: "Fleet" },
        region: { label: "Modern region" },
      },
      cameras: ["Wide view", "Cape", "Malabar"],
    },
  },
};
