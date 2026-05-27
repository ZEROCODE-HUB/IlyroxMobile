/**
 * estadosMexico.ts
 * Lista de los 32 estados de México y sus coordenadas centrales aproximadas.
 * Usado en formularios de auth/perfil y como fallback de centrado en el mapa.
 */

export const ESTADOS_MEXICO = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México (CDMX)",
  "Coahuila de Zaragoza",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán de Ocampo",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz de Ignacio de la Llave",
  "Yucatán",
  "Zacatecas",
] as const;

export type EstadoMexico = (typeof ESTADOS_MEXICO)[number];

/** Coordenadas del centro aproximado de cada estado — fallback para centrar el mapa */
export const COORDENADAS_ESTADO: Record<string, { lat: number; lng: number }> =
  {
    Aguascalientes: { lat: 21.8853, lng: -102.2916 },
    "Baja California": { lat: 30.8406, lng: -115.2838 },
    "Baja California Sur": { lat: 24.1426, lng: -110.3128 },
    Campeche: { lat: 19.8301, lng: -90.5349 },
    Chiapas: { lat: 16.7569, lng: -93.1292 },
    Chihuahua: { lat: 28.6329, lng: -106.0691 },
    "Ciudad de México (CDMX)": { lat: 19.4326, lng: -99.1332 },
    "Coahuila de Zaragoza": { lat: 27.0587, lng: -101.7068 },
    Colima: { lat: 19.2452, lng: -103.7241 },
    Durango: { lat: 24.5593, lng: -104.6588 },
    "Estado de México": { lat: 19.285, lng: -99.5496 },
    Guanajuato: { lat: 21.019, lng: -101.2574 },
    Guerrero: { lat: 17.4392, lng: -99.5451 },
    Hidalgo: { lat: 20.0911, lng: -98.7624 },
    Jalisco: { lat: 20.6597, lng: -103.3496 },
    "Michoacán de Ocampo": { lat: 19.5665, lng: -101.7068 },
    Morelos: { lat: 18.6813, lng: -99.1013 },
    Nayarit: { lat: 21.7514, lng: -104.8455 },
    "Nuevo León": { lat: 25.5922, lng: -99.9962 },
    Oaxaca: { lat: 17.0732, lng: -96.7266 },
    Puebla: { lat: 19.0414, lng: -98.2063 },
    Querétaro: { lat: 20.5888, lng: -100.3899 },
    "Quintana Roo": { lat: 19.1817, lng: -88.4791 },
    "San Luis Potosí": { lat: 22.1565, lng: -100.9855 },
    Sinaloa: { lat: 25.1721, lng: -107.4795 },
    Sonora: { lat: 29.2972, lng: -110.3309 },
    Tabasco: { lat: 17.8409, lng: -92.6189 },
    Tamaulipas: { lat: 24.2669, lng: -98.8363 },
    Tlaxcala: { lat: 19.3139, lng: -98.2404 },
    "Veracruz de Ignacio de la Llave": { lat: 19.1738, lng: -96.1342 },
    Yucatán: { lat: 20.7099, lng: -89.0943 },
    Zacatecas: { lat: 22.7709, lng: -102.5832 },
  };
