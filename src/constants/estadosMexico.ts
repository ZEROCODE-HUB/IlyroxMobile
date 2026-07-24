/**
 * estadosMexico.ts
 *
 * @deprecated Estos datos se migraron a la capa de ubicación por país.
 * Importa desde `@/lib/location/countries/mx` o usa `getCountryConfig(...)`.
 * Este archivo se mantiene como re-export temporal para no romper imports.
 */

import {
  ESTADOS_MX,
  COORDENADAS_ESTADO_MX,
} from "@/lib/location/countries/mx";

export const ESTADOS_MEXICO = ESTADOS_MX;
export type EstadoMexico = (typeof ESTADOS_MX)[number];
export const COORDENADAS_ESTADO = COORDENADAS_ESTADO_MX;
