import type { EnSceneTranslation } from "./en-scenes-types";

/** Tradução inglesa (`en`) completa para `magellan-1519` (D42). */
export const EN_SCENE_MAGELLAN: EnSceneTranslation = {
  title: "First Circumnavigation of the Earth (Magellan–Elcano)",
  summary:
    "An armada of five ships sails from Sanlúcar de Barrameda under Ferdinand Magellan, completing the first global voyage in human history.",
  subtitle: "The Odyssey of the Maluku Armada under Ferdinand Magellan and Juan Sebastián Elcano",
  sourceLabels: {
    "Arquivo Geral das Índias / Antonio Pigafetta":
      "General Archive of the Indies / Antonio Pigafetta",
    "Zweig, Stefan — Magalhães: O Homem e o Seu Feito":
      "Zweig, Stefan — Conqueror of the Seas: The Story of Magellan",
  },
  trajectoryLabel: "Armada of the Moluccas",
  participants: [
    {
      role: "Flagship carrack (nao)",
      description:
        "Damaged at Tidore (Moluccas). Attempted to return east across the Pacific under Gonzalo Gómez de Espinosa, but was captured and dismantled by the Portuguese at Ternate; only 4 men survived.",
    },
    {
      role: "Carrack (nao)",
      description:
        "Mutinied inside the Strait of Magellan in November 1520 under pilot Esteban Gómez, deserted the armada, and returned to Spain in May 1521.",
    },
    {
      role: "Carrack (nao)",
      description:
        "Deliberately scuttled and burned off Bohol (Philippines) after the Battle of Mactan due to insufficient crew to sail three ships.",
    },
    {
      role: "Carrack (nao)",
      description:
        "The sole ship to complete the circumnavigation of the globe. Returned to Sanlúcar de Barrameda on September 6, 1522 under Juan Sebastián Elcano with 18 survivors aboard.",
    },
    {
      role: "Caravel",
      description:
        "Wrecked in May 1520 during coastal reconnaissance at the Santa Cruz River (Patagonia); the entire crew survived and was rescued.",
    },
  ],
  chronicle: [
    {
      place: "Sanlúcar de Barrameda",
      text: "Five ships and ~270 crewmen set sail under the imperial banner of Charles V.",
      quote: {
        text: "We weighed anchor and put out into the Ocean Sea under favorable winds.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Guanabara Bay, Brazil",
      text: "First extended South American landfall and provisioning with tropical fruits.",
      quote: {
        text: "For a single fishhook they gave us five or six hens and sweet potatoes.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Puerto San Julián, Patagonia",
      text: "Armed mutiny of Castilian captains suppressed by Magellan during winter quarters.",
      quote: {
        text: "Magellan's resolve saved the armada from total anarchy.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Strait of Magellan",
      text: "Emergence into the Pacific Ocean after 38 days navigating glacial channels.",
      quote: {
        text: "The captain-general wept for joy upon beholding the South Sea.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Mactan, Philippines",
      text: "Fateful battle against Lapu-Lapu and death in combat of Ferdinand Magellan.",
      quote: {
        text: "Thus they slew our mirror, our light, and our true guide.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Tidore, Moluccas",
      text: "Arrival at the Spice Islands and loading of precious cloves.",
      quote: {
        text: "We reached the goal of our long and painful crossing.",
        source: "Antonio Pigafetta",
      },
    },
    {
      place: "Sanlúcar de Barrameda",
      text: "Return of Juan Sebastián Elcano and 18 survivors aboard the Nao Victoria.",
      quote: {
        text: "We completed the first circuit around the entire circumference of the Earth.",
        source: "Antonio Pigafetta",
      },
    },
  ],
  points: {
    SANLUCAR_DEPARTURE: {
      name: "Sanlúcar de Barrameda / Seville",
      description:
        "The Maluku Armada — five carracks and roughly 270 multinational crewmen — sails from the mouth of the Guadalquivir into the unknown.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Spain",
        pigafettaDiary:
          "We descended the Guadalquivir River to Sanlúcar... Finally, on September 20, 1519, we weighed anchor and put out into the Ocean Sea under favorable winds.",
      },
      quote: {
        text: "We descended the Guadalquivir to Sanlúcar, where we stayed several days provisioning the ships. Finally, on September 20, 1519, we weighed anchor and put out into the Ocean Sea.",
        source: "Antonio Pigafetta",
      },
    },
    CANARY_ISLANDS: {
      name: "Santa Cruz de Tenerife (Canary Islands)",
      description:
        "First stopover to take on fresh water, pitch for caulking hulls, and fresh provisions prior to the Atlantic crossing.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Spain (Canaries)",
        pigafettaDiary:
          "On September 26 we arrived at Tenerife, where we paused to take on fresh water, firewood, and pitch for the ships.",
      },
      quote: {
        text: "On September 26 we reached an island of the Grand Canary called Tenerife, where we stayed three and a half days taking on water and wood.",
        source: "Antonio Pigafetta",
      },
    },
    CAPE_VERDE_OUTBOUND: {
      name: "Cape Verde Archipelago",
      description:
        "Sailing off West Africa and passing southwest of Cape Verde through equatorial doldrums and fierce squalls.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Cape Verde",
        pigafettaDiary:
          "During the tempests, St. Elmo's fire appeared several times atop the mainmast, relieving the terror of the sailors.",
      },
      quote: {
        text: "During those storms the body of St. Anselm appeared to us several times on dark nights atop the mainmast, bringing immense solace to the mariners.",
        source: "Antonio Pigafetta",
      },
    },
    GUANABARA_BAY: {
      name: "Guanabara Bay (Rio de Janeiro)",
      description:
        "Landfall on Saint Lucy's Day. A peaceful 14-day stay among the Tupinambá, replenishing cassava, fresh fish, and tropical fruit.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Brazil",
        pigafettaDiary:
          "In this place we had an abundance of refreshments such as fowls, sweet potatoes, and pineapples... For a single mirror they gave us five or six hens.",
      },
      quote: {
        text: "Here we found abundant refreshments — fowls, sweet potatoes, and a fruit shaped like a pine cone yet extraordinarily sweet called pineapple... For a mirror they gave us five or six hens.",
        source: "Antonio Pigafetta",
      },
    },
    RIO_DE_LA_PLATA: {
      name: "Río de la Plata Estuary",
      description:
        "Thorough exploration of the vast estuary in search of the interoceanic strait; fresh water and shoals prove it to be a mighty river.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Uruguay / Argentina",
        pigafettaDiary:
          "We entered a great mouth of water thought to be a strait; upon sounding it, we found the water to be fresh.",
      },
      quote: {
        text: "We entered a great mouth of water once thought to be a strait; having sent the Santiago ahead to sound it, we verified that it was fresh water.",
        source: "Antonio Pigafetta",
      },
    },
    PUERTO_SAN_JULIAN: {
      name: "Puerto San Julián (Patagonia)",
      description:
        "Five-month winter quarters in subpolar Patagonia. Magellan decisively quells an armed mutiny and meets the Tehuelche ('Patagonians').",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Argentina",
        pigafettaDiary:
          "We spent two months in this bay. One day we saw a man of giant stature singing and dancing... The captain-general named these people Patagonians.",
      },
      quote: {
        text: "We remained two whole months in this harbor without seeing a soul. One day we suddenly beheld a man of giant stature on the shore, singing and casting dust upon his head...",
        source: "Antonio Pigafetta",
      },
    },
    STRAIT_OF_MAGELLAN: {
      name: "Strait of All Saints (Strait of Magellan)",
      description:
        "After 38 days threading 570 km of labyrinthine channels and glacial fjords, the fleet rounds Cape Pilar into the South Sea. The San Antonio deserts.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Chile",
        pigafettaDiary:
          "Wednesday, November 28, 1520, we cleared the strait we named All Saints and entered the vast sea to which we gave the name Pacific, for during three months and twenty days we suffered no storm.",
      },
      quote: {
        text: "Wednesday, November 28, 1520, we emerged from the strait and entered the great sea, which we named the Pacific.",
        source: "Antonio Pigafetta",
      },
    },
    PACIFIC_CROSSING_MID: {
      name: "South Pacific Ocean Crossing",
      description:
        "Harrowing voyage of nearly four months across Earth's widest ocean expanse without fresh food, enduring starvation and deadly scurvy.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "International Waters (Pacific Ocean)",
        pigafettaDiary:
          "We sailed three months and twenty days without fresh food. We ate biscuit reduced to worm-ridden powder and drank putrid yellow water, soaking ox-hide from the yards in seawater to eat.",
      },
      quote: {
        text: "We sailed three months and twenty days without tasting any fresh food. The biscuit we ate was no longer bread, but powder swarming with worms and foul from rats.",
        source: "Antonio Pigafetta",
      },
    },
    GUAM_MARIANAS: {
      name: "Guam (Mariana Islands)",
      description:
        "First inhabited landfall after crossing the Pacific. Tense encounter with the Chamorro people and vital resupply of fresh water and coconuts.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Guam (United States)",
        pigafettaDiary:
          "On March 6 we sighted inhabited islands... Islanders came out in swift outriggers bringing fresh water and coconuts.",
      },
      quote: {
        text: "On March 6 we sighted a small island to the northwest and two others to the southwest... The inhabitants came out in swift proas.",
        source: "Antonio Pigafetta",
      },
    },
    HOMONHON_ISLAND: {
      name: "Homonhon Island (Philippines)",
      description:
        "Arrival in the Philippine archipelago. Tents are pitched ashore to nurse scurvy-stricken sailors back to health amid peaceful local trade.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Philippines",
        pigafettaDiary:
          "On Saturday, March 16, 1521, at dawn we sighted high land... We pitched two tents ashore to care for the sick.",
      },
      quote: {
        text: "On Saturday, March 16, 1521, at daybreak we came upon high land covered with trees... The captain-general had two tents pitched for the sick.",
        source: "Antonio Pigafetta",
      },
    },
    CEBU_ISLAND: {
      name: "Cebu Island",
      description:
        "Ceremonial entry into Cebu harbor. Magellan seals a blood compact with Rajah Humabon, holding mass baptisms and raising Magellan's Cross.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Philippines",
        pigafettaDiary:
          "Hundreds were baptized in the port of Cebu and the local ruler swore allegiance to Emperor Charles.",
      },
      quote: {
        text: "On Sunday, April 14, more than eight hundred souls — men, women, and children — were baptized.",
        source: "Antonio Pigafetta",
      },
    },
    MACTAN_BATTLE: {
      name: "Mactan Island (Death of Magellan)",
      description:
        "Landing with 49 armored men against over a thousand warriors led by Datu Lapu-Lapu. Magellan is struck down in the shallows; the fleet retreats.",
      facts: {
        vessel: "Nao Trinidad",
        commander: "Ferdinand Magellan",
        modernCountry: "Philippines",
        pigafettaDiary:
          "Recognizing the captain, so many hurled themselves upon him that they knocked his helmet off... Thus they slew our mirror, our light, our comfort, and our true guide.",
      },
      quote: {
        text: "Recognizing the captain, so many assailed him that twice they knocked his helmet from his head... Thus they slew our mirror, our light, our comfort, and our true guide.",
        source: "Antonio Pigafetta",
      },
    },
    TIDORE_MOLUCCAS: {
      name: "Tidore Island (Moluccas)",
      description:
        "Triumphant arrival at the Spice Islands. Holds are laden with cloves and nutmeg; Juan Sebastián Elcano takes command of the Victoria for the westward return.",
      facts: {
        vessel: "Nao Victoria",
        commander: "Juan Sebastián Elcano",
        modernCountry: "Indonesia",
        pigafettaDiary:
          "Friday, November 8, 1521, we entered the harbor of Tidore and loaded the Victoria with tons of precious cloves.",
      },
      quote: {
        text: "Friday, November 8, 1521, we entered the port of Tidore... Three hours before sunset we fired all artillery, having reached our goal after twenty-seven months.",
        source: "Antonio Pigafetta",
      },
    },
    TIMOR_DEPARTURE: {
      name: "Timor Island",
      description:
        "Final provisioning stop in the Malay Archipelago before striking out nonstop across the stormy southern Indian Ocean.",
      facts: {
        vessel: "Nao Victoria",
        commander: "Juan Sebastián Elcano",
        modernCountry: "Timor-Leste / Indonesia",
        pigafettaDiary:
          "We left the island of Timor and steered out into the great Indian Sea to evade Portuguese patrols.",
      },
      quote: {
        text: "We departed the island of Timor and put out into the great Indian Sea to avoid the caravels of the King of Portugal.",
        source: "Antonio Pigafetta",
      },
    },
    INDIAN_OCEAN_CROSSING: {
      name: "Southern Indian Ocean Crossing",
      description:
        "Elcano steers through high southern latitudes (down to 42°S) in icy sub-Antarctic gales to avoid Portuguese patrol lanes.",
      facts: {
        vessel: "Nao Victoria",
        commander: "Juan Sebastián Elcano",
        modernCountry: "International Waters (Indian Ocean)",
        pigafettaDiary:
          "We sailed weeks on end across the open sea without touching land, enduring furious gales and dwindling bread.",
      },
      quote: {
        text: "We sailed nine consecutive weeks without touching land anywhere, enduring furious winds and bitter cold.",
        source: "Antonio Pigafetta",
      },
    },
    CAPE_OF_GOOD_HOPE: {
      name: "Cape of Good Hope (South Africa)",
      description:
        "After nearly two months battling fierce headwinds, the leaking Victoria rounds the Cape of Storms into the South Atlantic.",
      facts: {
        vessel: "Nao Victoria",
        commander: "Juan Sebastián Elcano",
        modernCountry: "South Africa",
        pigafettaDiary:
          "We doubled that cape with the greatest toil, for the winds were contrary and the ship leaked in many places.",
      },
      quote: {
        text: "We rounded that cape on May 19 with immense hardship, for the winds were dead against us and the ship took water badly.",
        source: "Antonio Pigafetta",
      },
    },
    SANLUCAR_RETURN: {
      name: "Sanlúcar de Barrameda / Seville (Return)",
      description:
        "The Nao Victoria anchors at Sanlúcar with eighteen gaunt survivors; three days later they reach Seville, empirically proving the Earth's circumnavigability.",
      facts: {
        vessel: "Nao Victoria",
        commander: "Juan Sebastián Elcano",
        modernCountry: "Spain",
        pigafettaDiary:
          "On Saturday, September 6, 1522, we entered the bay of Sanlúcar with only eighteen men aboard the Victoria. Thanks to Divine Providence, we had sailed around the entire world.",
      },
      quote: {
        text: "On Saturday, September 6, 1522, we entered the bay of Sanlúcar with only eighteen men, most of them sick, out of the sixty who had left the Moluccas... We had sailed completely around the world.",
        source: "Antonio Pigafetta",
      },
    },
  },
  dossierMarkdown:
    "## The First Circumnavigation of the Earth (1519–1522)\n\n### 1. The Enterprise and the Treaty of Tordesillas\nIn the early sixteenth century, Southeast Asian spices — above all cloves and nutmeg — commanded prices exceeding their weight in gold across Europe. Under the **Treaty of Tordesillas (1494)**, the eastern route around Africa belonged exclusively to Portugal.\n\nPortuguese navigator **Ferdinand Magellan**, convinced that the Moluccas lay within the Castilian hemisphere and that an interoceanic strait linked the Atlantic to the South Sea, presented his plan to King Charles I of Spain (later Emperor Charles V), who financed the five-ship **Armada of the Moluccas**.\n\n### 2. Crossing Uncharted Seas\nThe voyage tested every physical and psychological limit:\n- **The Patagonian Labyrinth**: In October–November 1520 Magellan navigated the 570 km subpolar strait that bears his name.\n- **The Vastness of the Pacific**: Three months and twenty days of uninterrupted open-ocean sailing brought devastating scurvy.\n- **The Battle of Mactan**: In the Philippines, Magellan fell in combat against Datu Lapu-Lapu's warriors.\n\n### 3. Elcano's Return\nUnder **Juan Sebastián Elcano**, the lone *Nao Victoria* loaded cloves at Tidore and crossed the southern Indian Ocean far south of Portuguese patrols, returning to Spain with eighteen survivors after nearly three years at sea.",
  hud: {
    badge: "CIRCUMNAVIGATION",
    subtitle: "Nautical telemetry & shipboard log",
    period: "1519–1522",
    startLabel: "Sanlúcar (1519)",
    endLabel: "Return (1522)",
    progressLabel: "Progress of the Magellan–Elcano circumnavigation",
    quoteTitle: "Shipboard Journal — Antonio Pigafetta (1524)",
    stepStats: {
      vessel: { label: "Active vessel", note: "Maluku Armada" },
      commander: { label: "Commander", note: "Crown of Castile" },
      leaguesNavigated: { label: "Leagues sailed", unit: "leagues" },
      daysAtSea: { label: "Days at sea", unit: "days", note: "of 1,082 total days" },
    },
  },
};
