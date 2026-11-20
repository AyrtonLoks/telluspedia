/**
 * País (ISO 3166-1 alfa-3) de uma coordenada, pelo mesmo índice which-polygon do picking do
 * globo (Natural Earth 110m, zero-padding dos códigos numéricos). Usado no servidor para
 * contar focos do FIRMS por país (D05).
 */
import { getContemporarySpatialIndex } from "./historical-topology";
import { NAME_TO_ISO, NUMERIC_TO_ISO } from "./country-data";

export function createCountryLookup(): (lat: number, lng: number) => string | null {
  const index = getContemporarySpatialIndex();
  if (!index) return () => null;
  return (lat, lng) => {
    const props = index([lng, lat]);
    if (!props) return null;
    const rawId = props.id;
    const numeric = rawId !== undefined && rawId !== null ? String(rawId).padStart(3, "0") : "";
    return NUMERIC_TO_ISO[numeric] || (props.name ? NAME_TO_ISO[props.name] : undefined) || null;
  };
}
