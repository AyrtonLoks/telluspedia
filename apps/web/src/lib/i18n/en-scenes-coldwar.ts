import type { EnSceneTranslation } from "./en-scenes-types";

/** Traduções inglesas (`en`) para `glo-1969` e `glo-1989` (D42). */
export const EN_SCENES_COLDWAR: Record<string, EnSceneTranslation> = {
  "glo-1969": {
    title: "Apollo 11: First Human Moon Landing",
    summary: "Neil Armstrong and Buzz Aldrin become the first humans to walk on the Moon.",
    launchSiteName: "Cape Canaveral — Launch Complex 39A (KSC)",
    landingSiteName: "Tranquility Base — Mare Tranquillitatis",
    phases: {
      launch: {
        label: "Saturn V Launch & Earth Parking Orbit (EPO)",
        description:
          "Liftoff from Kennedy Space Center (LC-39A) and insertion into 185 km low Earth parking orbit.",
        facts: { code: "PHASE 1 — LAUNCH", historicalDate: "Jul 16, 1969 · 13:32 UTC" },
      },
      "translunar-injection": {
        label: "Translunar Injection (TLI) & Cislunar Coast",
        description:
          "Re-ignition of the S-IVB third stage reaching ~39,240 km/h to depart Earth's gravity well.",
        facts: { code: "PHASE 2 — TRANSLUNAR INJECTION", historicalDate: "Jul 16, 1969 · 16:22 UTC" },
      },
      "lunar-orbit-insertion": {
        label: "Lunar Orbit Insertion (CSM Columbia)",
        description:
          "Retrograde burn of Columbia's SPS engine and circularization roughly 110 km above the lunar surface.",
        facts: { code: "PHASE 3 — LUNAR ORBIT", historicalDate: "Jul 19, 1969 · 17:28 UTC" },
      },
      landing: {
        label: "Lunar Module Eagle Touchdown at Sea of Tranquility",
        description:
          "Powered Descent Initiation (PDI) and lunar landing: 'Houston, Tranquility Base here. The Eagle has landed.'",
        facts: { code: "PHASE 4 — LUNAR LANDING", historicalDate: "Jul 20, 1969 · 20:17 UTC" },
      },
    },
    participants: [
      {
        role: "Commander",
        description: "First human to step onto the lunar surface on July 21, 1969 at 02:56:15 UTC.",
      },
      {
        role: "Lunar Module Pilot",
        description: "Joined Armstrong on the lunar surface roughly 19 minutes later.",
      },
      {
        role: "Command Module Pilot",
        description: "Remained in solo lunar orbit aboard Columbia throughout the surface EVA.",
      },
      {
        role: "Command and Service Module",
        description: "Carried the crew to lunar orbit and safely back to Earth — the only module to return.",
      },
      {
        role: "Lunar Module",
        description: "Landed in the Sea of Tranquility; its descent stage remains on the Moon.",
      },
      {
        role: "Launch vehicle",
        description: "Launched the mission from Pad 39A at Kennedy Space Center.",
      },
      {
        name: "Mission Control (Houston)",
        role: "Flight control center",
        description:
          "During final descent, Flight Director Gene Kranz and CAPCOM Charlie Duke cleared Eagle to land through 1201 and 1202 guidance alarms.",
      },
    ],
    chronicle: [
      { place: "Kennedy Space Center, LC-39A", text: "Liftoff at 13:32 UTC." },
      { place: "Earth orbit", text: "Translunar injection burn at 16:22 UTC (GET 002:50:13)." },
      { place: "Lunar orbit", text: "Lunar orbit insertion at 17:21 UTC (GET 075:49:50)." },
      { place: "Lunar orbit", text: "Eagle undocks from Columbia at 17:44 UTC." },
      {
        place: "Sea of Tranquility",
        text: "Powered descent begins at 20:05 UTC; touchdown at 20:17:39 UTC.",
        quote: {
          text: "Houston, Tranquility Base here. The Eagle has landed.",
          source: "Neil Armstrong, GET 102:45:58",
        },
      },
      {
        place: "Tranquility Base",
        text: "Hatch opened at 02:39 UTC; first human step on the Moon at 02:56:15 UTC.",
        quote: {
          text: "That's one small step for (a) man; one giant leap for mankind.",
          source: "Neil Armstrong, GET 109:24:48 (Apollo Lunar Surface Journal)",
        },
      },
      {
        place: "Tranquility Base",
        text: "Eagle ascent stage lifts off at 17:54 UTC and docks with Columbia at 21:35 UTC.",
      },
      { place: "Lunar orbit", text: "Transearth injection burn at 04:55 UTC." },
      {
        place: "Pacific Ocean",
        text: "Splashdown at 16:50:35 UTC; crew recovered aboard aircraft carrier USS Hornet.",
      },
    ],
    hud: {
      badge: "APOLLO 11",
      subtitle: "NASA Spaceflight Telemetry",
      period: "Jul 16–20, 1969",
      startLabel: "0% (Canaveral)",
      endLabel: "100% (Tranquility)",
      progressLabel: "Apollo 11 mission progress",
      stepStats: {
        badge: { label: "Phase" },
        historicalGET: { label: "Phase historical GET", unit: "HHH:MM:SS" },
      },
      cameras: ["Wide view", "Canaveral", "Moon"],
    },
  },

  "glo-1989": {
    title: "Fall of the Berlin Wall",
    summary:
      "Opening of border checkpoints between East and West Berlin, heralding the end of the Cold War.",
    subtitle: "From the Hungarian border to German reunification (1989–1990)",
    sourceLabels: {
      "Bundesregierung — Transcrição da coletiva de Günter Schabowski (9 nov. 1989)":
        "Federal Government — Transcript of Günter Schabowski's press conference (Nov 9, 1989)",
    },
    trajectoryLabel: "From the Hungarian border to reunification",
    participants: [
      {
        name: "East German demonstrators",
        role: "Peaceful Revolution",
        description: "Nonviolent marches in Leipzig, Berlin, and across the GDR pressured the regime into opening.",
      },
      {
        role: "SED Politburo spokesman",
        description: "Mistakenly announced on live television that the new travel rules applied immediately.",
      },
      {
        role: "Bornholmer Straße border officer",
        description: "Ordered the barrier raised on the night of November 9 without waiting for higher orders.",
      },
      { role: "SED General Secretary (October–December 1989)" },
      {
        role: "Leader of the Soviet Union",
        description: "His policy of non-intervention removed the backing of Soviet tanks from Eastern Bloc regimes.",
      },
      { role: "West German Foreign Minister" },
      {
        role: "Chancellor of West Germany",
        description: "Steered the diplomatic path to German reunification in 1990.",
      },
    ],
    chronicle: [
      { place: "Sopron", text: "Pan-European Picnic: hundreds of East Germans cross into Austria." },
      { place: "Hungary", text: "Hungary formally opens its Austrian border to GDR citizens." },
      { place: "East Berlin", text: "40th anniversary of the GDR attended by Gorbachev amid suppressed protests." },
      {
        place: "Leipzig",
        text: "Roughly 70,000 march peacefully; security forces stand down.",
        quote: { text: "We are the people!", source: "Monday demonstrations slogan ('Wir sind das Volk!')" },
      },
      { place: "East Berlin", text: "Erich Honecker is replaced by Egon Krenz." },
      { place: "Alexanderplatz", text: "Largest pro-democracy demonstration in GDR history." },
      {
        place: "Berlin",
        text: "Schabowski's press conference triggers the overnight opening of Berlin border crossings.",
        quote: { text: "Immediately, without delay.", source: "Günter Schabowski, November 9, 1989" },
      },
      { place: "Brandenburg Gate", text: "Ceremonial reopening of the Brandenburg Gate." },
      { place: "East Germany", text: "First free parliamentary elections in the GDR." },
      { place: "Berlin", text: "Formal reunification of Germany." },
    ],
    points: {
      SOPRON: {
        name: "Sopron — Pan-European Picnic",
        description:
          "During a peace demonstration on the Austro-Hungarian frontier, a border gate is opened for several hours and roughly 600 East Germans cross to the West.",
        facts: { place: "Hungary–Austria border", actor: "Pan-European Union & Hungarian opposition" },
      },
      HEGYESHALOM: {
        name: "Hegyeshalom — Hungary opens the border",
        description:
          "Hungary allows GDR citizens to cross freely into Austria; tens of thousands leave within weeks.",
        facts: { place: "Hungary–Austria border", actor: "Hungarian government" },
      },
      PRAGA: {
        name: "West German Embassy in Prague",
        description:
          "From the embassy balcony, Foreign Minister Hans-Dietrich Genscher announces to thousands of East German refugees camped in the garden that their departure to the West has been approved.",
        facts: { place: "Prague, Czechoslovakia", actor: "Hans-Dietrich Genscher" },
      },
      LEIPZIG: {
        name: "Leipzig — Monday Demonstration",
        description:
          "Around 70,000 citizens march peacefully along Leipzig's ring road without armed intervention, spreading the chant 'Wir sind das Volk' ('We are the people') across East Germany.",
        facts: { place: "Leipzig, GDR", actor: "Civic demonstrators" },
        quote: {
          text: "We are the people!",
          source: "Slogan of the Leipzig Monday demonstrations, autumn 1989",
        },
      },
      ALEXANDERPLATZ: {
        name: "Alexanderplatz, East Berlin",
        description:
          "Hundreds of thousands gather in the largest demonstration in GDR history demanding freedom of the press, assembly, and travel.",
        facts: { place: "East Berlin", actor: "Artists & civic movements" },
      },
      COLETIVA: {
        name: "International Press Center — Schabowski's briefing",
        description:
          "Near the close of a live press conference, Politburo spokesman Günter Schabowski reads out new travel regulations and, asked when they take effect, replies: immediately.",
        facts: { place: "East Berlin", actor: "Günter Schabowski" },
        quote: {
          text: "That enters into force, according to my information… immediately, without delay.",
          source: "Günter Schabowski, press conference, November 9, 1989",
        },
      },
      BORNHOLMER: {
        name: "Bornholmer Straße Border Crossing",
        description:
          "Facing tens of thousands of Berliners and lacking instructions from above, officer Harald Jäger orders the barrier opened at 23:30; checkpoints across Berlin follow within hours.",
        facts: { place: "Berlin", actor: "Harald Jäger & Berlin crowd" },
      },
      BRANDEMBURGO: {
        name: "Brandenburg Gate",
        description:
          "Closed since 1961, the Brandenburg Gate reopens to pedestrians in a ceremony attended by Chancellor Helmut Kohl and GDR Premier Hans Modrow.",
        facts: { place: "Berlin", actor: "Helmut Kohl & Hans Modrow" },
      },
      REICHSTAG: {
        name: "Reichstag — German Reunification",
        description:
          "At midnight on October 3, 1990, the GDR ceases to exist as its reconstituted states accede to the Federal Republic of Germany.",
        facts: { place: "Berlin", actor: "East & West Germany" },
      },
    },
    hud: {
      badge: "BERLIN WALL",
      subtitle: "The Peaceful Revolution of 1989",
      period: "1989–1990",
      startLabel: "Sopron (Aug 1989)",
      endLabel: "Reunification (Oct 1990)",
      progressLabel: "Progress of the fall of the Berlin Wall",
      quoteTitle: "Voices of 1989",
      stepStats: {
        place: { label: "Where" },
        actor: { label: "Key actors" },
      },
      cameras: ["Central Europe", "Berlin"],
    },
  },
};
