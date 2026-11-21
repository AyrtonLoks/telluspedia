/**
 * Catálogo leve dos 177 países (T35): ISO, nome, bandeira e coordenadas, para quem só precisa
 * identificar um país (URL, busca, linha do tempo). Dossiês e indicadores ficam em
 * `country-data.ts`, que re-exporta este catálogo.
 */
import worldCountriesDataset from "../../public/data/countries-ne-110m.json";

export interface WorldCountryCatalogEntry {
  isoCode: string;
  iso2: string;
  numericCode: string | null;
  nameCommon: string;
  nameNaturalEarth: string;
  latitude: number | null;
  longitude: number | null;
  flagSvgUrl: string;
}

export const WORLD_COUNTRIES_METADATA = worldCountriesDataset.metadata;
export const WORLD_COUNTRIES_CATALOG: Record<string, WorldCountryCatalogEntry> = worldCountriesDataset.countries;
