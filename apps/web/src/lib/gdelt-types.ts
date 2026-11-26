import type { ObservatoryEnvelope } from "./observatory-source";

export interface GdeltNewsArticle {
  id: string;
  title: string;
  url: string;
  domain: string;
  seenAt: string;
  language?: string;
  sourceCountry?: string;
}

export interface CountryNewsPayload {
  isoCode: string;
  countryName: string;
  query: string;
  gdeltPortalUrl: string;
  articles: GdeltNewsArticle[];
}

export type CountryNewsEnvelope = ObservatoryEnvelope<CountryNewsPayload>;
