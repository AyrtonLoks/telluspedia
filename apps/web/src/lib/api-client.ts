export interface CountrySummary {
  isoCode: string;
  iso2: string;
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent: string;
  region: string;
  population: string | number;
  areaKm2: number;
  latitude: number;
  longitude: number;
  timezone: string;
  flagSvgUrl?: string;
  currencyCode: string;
  governmentType: string;
  headOfState: string;
}

export interface CountryDossier extends CountrySummary {
  indicators: {
    indicatorCode: string;
    indicatorName: string;
    category: string;
    year: number;
    value: number;
    unit: string;
    sourcePrimary: string;
  }[];
  dossierSections: {
    dimension: string;
    title: string;
    contentMarkdown: string;
    estimatedReadMin: number;
    citationsJson: any;
  }[];
  milestones: {
    id: string;
    title: string;
    summary: string;
    year: number;
    category: string;
    exactDate?: string;
    sourcePrimary: string;
  }[];
}

export interface Milestone {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: "POLITICS_REGIMES" | "ECONOMY" | "WAR_MILITARY" | "SCIENCE_CULTURE" | "HEALTH_PANDEMICS";
  countryIso?: string;
  latitude?: number;
  longitude?: number;
  sourcePrimary: string;
  referenceUrl?: string;
}

export interface WeatherData {
  temperature: number | null;
  apparent_temperature: number | null;
  relative_humidity: number | null;
  precipitation: number | null;
  weather_code: number | null;
  wind_speed: number | null;
  reference_time?: number | null;
  cached?: boolean;
}

export async function fetchCountries(): Promise<CountrySummary[]> {
  try {
    const res = await fetch("/api/countries");
    if (!res.ok) throw new Error("Failed to fetch countries");
    return await res.json();
  } catch (err) {
    console.error("fetchCountries error:", err);
    return [];
  }
}

export async function fetchCountryByIso(iso: string): Promise<CountryDossier | null> {
  try {
    const res = await fetch(`/api/countries/${iso}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`fetchCountryByIso(${iso}) error:`, err);
    return null;
  }
}

export async function fetchMilestones(params?: {
  startYear?: number;
  endYear?: number;
  categories?: string[];
}): Promise<Milestone[]> {
  try {
    const query = new URLSearchParams();
    if (params?.startYear !== undefined) query.set("startYear", String(params.startYear));
    if (params?.endYear !== undefined) query.set("endYear", String(params.endYear));
    if (params?.categories && params.categories.length > 0) {
      query.set("categories", params.categories.join(","));
    }

    const res = await fetch(`/api/timeline?${query.toString()}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("fetchMilestones error:", err);
    return [];
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const res = await fetch(`/api/weather?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchWeather error:", err);
    return null;
  }
}
