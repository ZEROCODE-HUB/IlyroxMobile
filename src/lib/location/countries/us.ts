/**
 * src/lib/location/countries/us.ts
 *
 * PLANTILLA DE EJEMPLO — Estados Unidos. NO está activada (ver registry.ts:
 * no aparece en SUPPORTED_COUNTRIES). Existe para demostrar que añadir un país
 * es solo crear una CountryConfig nueva, sin tocar la lógica central.
 *
 * La jerarquía administrativa de US mapea a los niveles neutrales así:
 *   level1 → state        (administrative_area_level_1, abreviado: CA, NY…)
 *   level2 → county/city  (administrative_area_level_2 o locality)
 *   level3 → neighborhood (neighborhood / sublocality)
 */

import type {
  CountryConfig,
  GoogleAddressComponent,
  MappedComponents,
} from "../types";

// Subconjunto de ejemplo; al activar el país se completaría con los 50 estados.
const US_STATES = ["California", "New York", "Texas", "Florida"] as const;

function normalizeLevel1(name: string): string {
  // En US no se aplica normalización especial por ahora (identidad).
  return name;
}

function mapGoogleComponents(
  components: GoogleAddressComponent[],
): MappedComponents {
  let state = "";
  let county = "";
  let city = "";
  let neighborhood = "";
  let postalCode = "";

  for (const comp of components) {
    const t = comp.types;
    if (t.includes("administrative_area_level_1")) state = comp.long_name;
    if (t.includes("administrative_area_level_2")) county = comp.long_name;
    if (t.includes("locality")) city = comp.long_name;
    if (
      (t.includes("neighborhood") || t.includes("sublocality")) &&
      !neighborhood
    ) {
      neighborhood = comp.long_name;
    }
    if (t.includes("postal_code")) postalCode = comp.long_name;
  }

  return {
    level1: state,
    level2: county || city, // county si existe, si no la ciudad
    level3: neighborhood,
    city,
    postalCode,
  };
}

export const US_CONFIG: CountryConfig = {
  code: "US",
  name: "United States",
  placesComponents: "country:us",
  region: "us",
  countrySuffixes: ["USA", "United States"],
  labels: { level1: "State", level2: "County", level3: "Neighborhood" },
  center: { lat: 39.8283, lng: -98.5795 },
  level1Options: US_STATES,
  level1Coords: {},
  normalizeLevel1,
  mapGoogleComponents,
};
