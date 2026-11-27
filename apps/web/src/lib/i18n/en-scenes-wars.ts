import type { EnSceneTranslation } from "./en-scenes-types";

/** Traduções inglesas (`en`) para `glo-1914` e `glo-1939` (D42). */
export const EN_SCENES_WARS: Record<string, EnSceneTranslation> = {
  "glo-1914": {
    title: "Outbreak of World War I",
    summary:
      "The assassination of Archduke Franz Ferdinand in Sarajevo sparks the first industrial conflict on a global scale.",
    subtitle: "World War I (1914–1918)",
    sourceLabels: {
      "Terms of the Armistice with Germany, 11 nov. 1918 (FRUS, Paris Peace Conference, vol. II)":
        "Terms of the Armistice with Germany, Nov 11, 1918 (FRUS, Paris Peace Conference, vol. II)",
    },
    trajectoryLabel: "Major fronts and decisive battles",
    participants: [
      {
        name: "Allies (Triple Entente)",
        role: "Coalition",
        description:
          "France, the British Empire, and Russia (until 1917), joined by Serbia, Belgium, Japan, Italy (from 1915), Romania (from 1916), and the United States (from 1917, as Associated Power), among others.",
      },
      {
        name: "Central Powers",
        role: "Coalition",
        description:
          "Germany, Austria-Hungary, the Ottoman Empire (from late 1914), and Bulgaria (from 1915).",
      },
      {
        name: "Franz Ferdinand",
        role: "Archduke of Austria",
        description: "Heir presumptive to the Austro-Hungarian throne, assassinated in Sarajevo on June 28, 1914.",
      },
      {
        role: "Assailant",
        description: "Bosnian Serb member of Young Bosnia supported by officers linked to the Black Hand.",
      },
      {
        name: "Paul von Hindenburg & Erich Ludendorff",
        role: "German High Command",
        description: "Victors at Tannenberg; directed the German war effort from 1916 onward.",
      },
      {
        role: "Supreme Allied Commander (1918)",
        description: "Coordinated the final Allied offensives and received the German delegation at Compiègne.",
      },
    ],
    chronicle: [
      { place: "Sarajevo", text: "Assassination of Archduke Franz Ferdinand." },
      { place: "Vienna", text: "Austria-Hungary declares war on Serbia." },
      {
        place: "London",
        text: "The United Kingdom declares war on Germany following the invasion of Belgium.",
        quote: { text: "The lamps are going out all over Europe.", source: "Edward Grey (memoirs, 1925)" },
      },
      { place: "Marne", text: "End of the First Battle of the Marne; trench warfare sets in." },
      { place: "Rome", text: "Italy enters the war alongside the Allies." },
      { place: "Verdun", text: "End of the ten-month Battle of Verdun." },
      { place: "Washington", text: "The United States declares war on Germany." },
      { place: "Brest-Litovsk", text: "Separate peace treaty between Soviet Russia and the Central Powers." },
      {
        place: "Compiègne",
        text: "Armistice signed: hostilities cease at 11:00 a.m.",
        quote: {
          text: "Cessation of hostilities by land and in the air six hours after the signing of the Armistice.",
          source: "Armistice with Germany, Clause I",
        },
      },
      {
        place: "Versailles",
        text: "Signing of the Treaty of Versailles, exactly five years after the Sarajevo assassination.",
      },
    ],
    points: {
      SARAJEVO: {
        name: "Sarajevo",
        description:
          "Gavrilo Princip assassinates Archduke Franz Ferdinand, heir to Austria-Hungary, and his wife Sophie. A month of ultimatums and mobilizations turns the attack into a continental war.",
        facts: { front: "Balkans", phase: "July Crisis" },
      },
      BELGRADO: {
        name: "Belgrade",
        description:
          "One day after Austria-Hungary declares war on Serbia, Belgrade is shelled. Russia, Germany, France, and Britain enter the conflict over the next week.",
        facts: { front: "Balkans", phase: "Outbreak" },
      },
      LIEGE: {
        name: "Liège",
        description:
          "Germany invades neutral Belgium to outflank France (Schlieffen Plan) and assaults the forts of Liège; violating Belgian neutrality brings Britain into the war on August 4.",
        facts: { front: "Western", phase: "War of movement" },
        quote: {
          text: "The lamps are going out all over Europe; we shall not see them lit again in our life-time.",
          source: "Sir Edward Grey, British Foreign Secretary, August 3, 1914 (memoirs, 1925)",
        },
      },
      TANNENBERG: {
        name: "Tannenberg (East Prussia)",
        description:
          "In four days, Hindenburg and Ludendorff's German 8th Army encircles and destroys the Russian 2nd Army.",
        facts: { front: "Eastern", phase: "War of movement" },
      },
      MARNE: {
        name: "Marne River",
        description:
          "A Franco-British counteroffensive halts the German advance just outside Paris. Both sides dig continuous trenches from the North Sea to Switzerland.",
        facts: { front: "Western", phase: "End of mobile war" },
      },
      GALLIPOLI: {
        name: "Gallipoli (Anzac Cove)",
        description:
          "British, French, Australian, and New Zealand troops land to force the Dardanelles and knock the Ottoman Empire out of the war; the campaign fails and evacuates in January 1916.",
        facts: { front: "Dardanelles", phase: "Trench warfare" },
      },
      VERDUN: {
        name: "Verdun",
        description:
          "Germany's offensive against the fortress ring of Verdun opens the longest battle of the war through December 1916, costing hundreds of thousands of lives.",
        facts: { front: "Western", phase: "War of attrition" },
      },
      JUTLANDIA: {
        name: "North Sea — Jutland",
        description:
          "The war's largest dreadnought clash: Germany sinks more tonnage, but the Royal Navy preserves its North Sea blockade.",
        facts: { front: "North Sea", phase: "Naval war" },
      },
      BRUSILOV: {
        name: "Lutsk — Brusilov Offensive",
        description:
          "General Brusilov's Russian offensive shatters Austro-Hungarian lines in Galicia and Volhynia in one of the Entente's major victories.",
        facts: { front: "Eastern", phase: "War of attrition" },
      },
      SOMME: {
        name: "Somme River",
        description:
          "On the opening day of the Somme offensive, the British Army suffers roughly 57,000 casualties — nearly 20,000 killed — the bloodiest day in its history.",
        facts: { front: "Western", phase: "War of attrition" },
      },
      PETROGRADO: {
        name: "Petrograd",
        description:
          "The October Revolution brings the Bolsheviks to power in Russia, months after the United States entered the war against Germany in April 1917.",
        facts: { front: "Eastern", phase: "1917: revolutions & U.S. entry" },
      },
      BREST_LITOVSK: {
        name: "Brest-Litovsk",
        description:
          "Soviet Russia signs a separate peace ceding vast western territories; Germany shifts divisions to the Western Front.",
        facts: { front: "Eastern", phase: "Russian exit" },
      },
      SAINT_QUENTIN: {
        name: "Saint-Quentin — Spring Offensive",
        description:
          "Germany launches its final major offensive, gaining ground before exhausting itself ahead of massive American troop arrivals.",
        facts: { front: "Western", phase: "Final offensives" },
      },
      AMIENS: {
        name: "Amiens",
        description:
          "The Allied offensive at Amiens opens the Hundred Days that drive the German Army back toward the frontier.",
        facts: { front: "Western", phase: "Hundred Days Offensive" },
      },
      COMPIEGNE: {
        name: "Glade of the Armistice, Compiègne",
        description:
          "Signed at 5:00 a.m. in Marshal Foch's railway carriage, the Armistice takes effect at 11:00 a.m., followed by the Treaty of Versailles in June 1919.",
        facts: { front: "Western", phase: "Armistice" },
        quote: {
          text: "Cessation of hostilities by land and in the air six hours after the signing of the Armistice.",
          source: "Armistice with Germany, Clause I (November 11, 1918)",
        },
      },
    },
    hud: {
      badge: "GREAT WAR",
      subtitle: "Fronts & decisive battles",
      period: "1914–1918",
      startLabel: "Sarajevo (1914)",
      endLabel: "Armistice (1918)",
      progressLabel: "Progress of World War I",
      quoteTitle: "War documents",
      stepStats: {
        front: { label: "Front" },
        phase: { label: "Phase" },
        warDay: { label: "Day of war", unit: "days", note: "since Jul 28, 1914" },
      },
      cameras: ["Europe", "Western Front", "Eastern Front"],
    },
  },

  "glo-1939": {
    title: "Outbreak of World War II",
    summary: "Nazi Germany's invasion of Poland triggers World War II in Europe.",
    subtitle: "World War II (1939–1945)",
    sourceLabels: {
      "National Diet Library — Instrument of Surrender (Tóquio, 2 set. 1945)":
        "National Diet Library — Instrument of Surrender (Tokyo, Sep 2, 1945)",
      "Franklin D. Roosevelt, discurso ao Congresso (8 dez. 1941)":
        "Franklin D. Roosevelt, Address to Congress (Dec 8, 1941)",
    },
    trajectoryLabel: "Major theaters and decisive battles",
    participants: [
      {
        name: "Allies",
        role: "Coalition",
        description:
          "United Kingdom and Commonwealth, France (and Free France), the Soviet Union (from 1941), the United States (from December 1941), China, and many others.",
      },
      {
        name: "Axis Powers",
        role: "Coalition",
        description:
          "Germany, Italy (until 1943), and Japan, alongside co-belligerents including Hungary, Romania, and Bulgaria.",
      },
      { role: "British Prime Minister (1940–1945)" },
      { name: "Joseph Stalin", role: "Leader of the Soviet Union" },
      { role: "President of the United States (1933–1945)" },
      {
        role: "Dictator of Nazi Germany",
        description:
          "Initiated the war of aggression and the Holocaust, in which the Nazi regime murdered roughly six million Jews.",
      },
    ],
    chronicle: [
      { place: "Poland", text: "Germany invades Poland." },
      { place: "London and Paris", text: "The United Kingdom and France declare war on Germany." },
      { place: "Compiègne", text: "Franco-German Armistice signed." },
      { place: "Soviet border", text: "Operation Barbarossa begins." },
      {
        place: "Pearl Harbor",
        text: "Japanese carrier strike brings the United States into the war.",
        quote: { text: "A date which will live in infamy.", source: "Franklin D. Roosevelt, December 8, 1941" },
      },
      { place: "Wannsee, Berlin", text: "Senior Nazi officials coordinate the deportation and murder of European Jews." },
      { place: "Stalingrad", text: "Surrender of the German 6th Army." },
      { place: "Normandy", text: "D-Day Allied amphibious landings." },
      { place: "Auschwitz", text: "The Red Army liberates the Auschwitz-Birkenau extermination camp." },
      { place: "Berlin-Karlshorst", text: "Unconditional surrender of Germany." },
      { place: "Hiroshima", text: "First atomic bomb used in warfare." },
      {
        place: "Tokyo Bay",
        text: "Japan signs the Instrument of Surrender.",
        quote: {
          text: "We hereby proclaim the unconditional surrender to the Allied Powers…",
          source: "Japanese Instrument of Surrender",
        },
      },
    ],
    points: {
      WESTERPLATTE: {
        name: "Westerplatte, Danzig (Gdańsk)",
        description:
          "The German battleship Schleswig-Holstein opens fire on the Polish garrison at Westerplatte as the Wehrmacht invades Poland. Britain and France declare war on September 3; the USSR invades eastern Poland on September 17.",
        facts: { theater: "Europe", phase: "Invasion of Poland" },
      },
      DUNQUERQUE: {
        name: "Dunkirk",
        description:
          "Cut off after Germany's thrust through the Ardennes, Allied troops are evacuated across the Channel: roughly 338,000 reach Britain by June 4.",
        facts: { theater: "Europe", phase: "Fall of France" },
      },
      COMPIEGNE_1940: {
        name: "Glade of the Armistice, Compiègne",
        description:
          "Hitler imposes an armistice on France in the very same railway carriage used in 1918; northern and Atlantic France are occupied while Vichy governs the south.",
        facts: { theater: "Europe", phase: "Fall of France" },
      },
      LONDRES: {
        name: "London — Battle of Britain",
        description:
          "The Luftwaffe bids for air superiority ahead of a planned invasion. The RAF holds firm, postponing invasion as night bombings of the Blitz begin in September.",
        facts: { theater: "Europe", phase: "Air war" },
      },
      BREST: {
        name: "Brest Fortress — Operation Barbarossa",
        description:
          "Germany invades the Soviet Union with over three million troops, opening the deadliest theater of the war.",
        facts: { theater: "Eastern Front", phase: "Barbarossa" },
      },
      MOSCOU: {
        name: "Moscow",
        description:
          "The Red Army counterattacks before Moscow, driving German forces back from the capital and shattering the blitzkrieg in the East.",
        facts: { theater: "Eastern Front", phase: "Barbarossa" },
      },
      PEARL_HARBOR: {
        name: "Pearl Harbor, Hawaii",
        description:
          "Japan's carrier air strike against the U.S. Pacific Fleet brings the United States into the war; Germany and Italy declare war on the U.S. four days later.",
        facts: { theater: "Pacific", phase: "Global war" },
        quote: {
          text: "Yesterday, December 7, 1941 — a date which will live in infamy…",
          source: "Franklin D. Roosevelt, Address to Congress, December 8, 1941",
        },
      },
      MIDWAY: {
        name: "Midway Atoll",
        description:
          "The U.S. Navy sinks four Japanese fleet carriers, decisively shifting the balance of naval power in the Pacific.",
        facts: { theater: "Pacific", phase: "Turning point" },
      },
      EL_ALAMEIN: {
        name: "El Alamein",
        description:
          "Montgomery's British Eighth Army defeats Rommel's Axis forces, ending the threat to Egypt and the Suez Canal.",
        facts: { theater: "North Africa", phase: "Turning point" },
      },
      STALINGRADO: {
        name: "Stalingrad",
        description:
          "Operation Uranus encircles the German 6th Army inside the ruined city; its surviving troops surrender on February 2, 1943.",
        facts: { theater: "Eastern Front", phase: "Turning point" },
      },
      KURSK: {
        name: "Kursk",
        description:
          "Germany's last major eastern offensive fails in history's largest armored battle, passing strategic initiative permanently to the Red Army.",
        facts: { theater: "Eastern Front", phase: "Allied advance" },
      },
      NORMANDIA: {
        name: "Normandy — Omaha Beach",
        description:
          "On D-Day roughly 156,000 Allied troops land across five Normandy beaches, opening the Western Front; Paris is liberated in August.",
        facts: { theater: "Europe", phase: "Allied advance" },
      },
      BERLIM: {
        name: "Berlin — Reichstag",
        description:
          "Berlin falls to the Red Army two days after Hitler's suicide; Germany signs unconditional surrender at Reims (May 7) and Berlin-Karlshorst (May 8).",
        facts: { theater: "Europe", phase: "End in Europe" },
      },
      HIROSHIMA: {
        name: "Hiroshima",
        description:
          "First atomic bomb dropped in combat; Nagasaki follows on August 9 as the USSR enters Manchuria, leading Japan to announce surrender on August 15.",
        facts: { theater: "Pacific", phase: "End in the Pacific" },
      },
      BAIA_DE_TOQUIO: {
        name: "Tokyo Bay — USS Missouri",
        description:
          "Foreign Minister Mamoru Shigemitsu signs the Instrument of Surrender aboard the battleship USS Missouri, ending World War II.",
        facts: { theater: "Pacific", phase: "Surrender of Japan" },
        quote: {
          text: "We hereby proclaim the unconditional surrender to the Allied Powers…",
          source: "Japanese Instrument of Surrender, September 2, 1945",
        },
      },
    },
    hud: {
      badge: "WORLD WAR II",
      subtitle: "Theaters & decisive battles",
      period: "1939–1945",
      startLabel: "Poland (1939)",
      endLabel: "Tokyo (1945)",
      progressLabel: "Progress of World War II",
      quoteTitle: "War documents",
      stepStats: {
        theater: { label: "Theater" },
        phase: { label: "Phase" },
        warDay: { label: "Day of war", unit: "days", note: "since Sep 1, 1939" },
      },
      cameras: ["Wide view", "Europe", "Pacific"],
    },
  },
};
