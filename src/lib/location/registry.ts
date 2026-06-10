/**
 * src/lib/location/registry.ts
 *
 * Punto de entrada de la capa de ubicación: resuelve la CountryConfig de cada
 * país y detecta el país a partir de un Google Place.
 */

import type { CountryCode, CountryConfig, GoogleAddressComponent } from "./types";
import { MX_CONFIG } from "./countries/mx";
import { US_CONFIG } from "./countries/us";

/** País por defecto cuando no se especifica o no se reconoce. */
export const DEFAULT_COUNTRY: CountryCode = "MX";

const CONFIGS: Record<CountryCode, CountryConfig> = {
  MX: MX_CONFIG,
  US: US_CONFIG,
};

/**
 * Países activos en la app (los que se ofrecen en selectores y se filtran).
 * US existe como plantilla pero NO se activa hasta tener datos reales.
 */
export const SUPPORTED_COUNTRIES: CountryCode[] = ["MX"];

/** Resuelve la configuración de un país; cae a DEFAULT_COUNTRY si no se reconoce. */
export function getCountryConfig(
  code?: CountryCode | string | null,
): CountryConfig {
  if (code) {
    const upper = code.toUpperCase();
    if (upper in CONFIGS) return CONFIGS[upper as CountryCode];
  }
  return CONFIGS[DEFAULT_COUNTRY];
}

/** Normaliza una cadena de país a un CountryCode soportado (o DEFAULT_COUNTRY). */
export function toCountryCode(code?: string | null): CountryCode {
  const upper = code?.toUpperCase();
  if (upper && upper in CONFIGS) return upper as CountryCode;
  return DEFAULT_COUNTRY;
}

/** Detecta el CountryCode a partir de los address_components de un Google Place. */
export function detectCountryFromPlace(
  components: GoogleAddressComponent[] | undefined | null,
): CountryCode {
  const countryComp = components?.find((c) => c.types.includes("country"));
  return toCountryCode(countryComp?.short_name);
}
