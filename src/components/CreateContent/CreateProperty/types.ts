// ============================================
// CreateProperty - Types
// ============================================

import type { CountryCode } from "@/lib/location/types";
import type { GeoBounds } from "@/lib/geocodingService";

export type TipoOperacion = "venta" | "renta" | "ambas";
export type MonedaType = "MXN" | "USD";
export type SiNo = "No" | "Sí";
export type AmuebladoType = "No" | "Sí" | "Parcial";
export type ComisionTipo = "porcentaje" | "monto";

export interface ContractData {
  tipo_contrato: "venta" | "renta";
  moneda: "USD" | "MXN";
  precio: number;
}

export interface UbicacionData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  /** Código de país ISO detectado de la ubicación (default: MX). */
  pais?: CountryCode;
  latitud?: number;
  longitud?: number;
  /** Bounds (área) del lugar elegido en Google Places. Se usa para validar que
   *  el PIN marcado caiga dentro de la zona escrita. */
  bounds?: GeoBounds;
  /** Nivel del lugar elegido (estado/municipio/colonia). */
  placeType?: "estado" | "municipio" | "colonia";
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface ComisionValues {
  comparte: SiNo;
  tipo: ComisionTipo;
  valor: string;
  compartidaTipo: ComisionTipo;
  compartidaValor: string;
  condiciones: string;
}

export interface ComisionSetters {
  setComparte: (val: SiNo) => void;
  setTipo: (val: ComisionTipo) => void;
  setValor: (val: string) => void;
  setCompartidaTipo: (val: ComisionTipo) => void;
  setCompartidaValor: (val: string) => void;
  setCondiciones: (val: string) => void;
}

export interface NumberInputConfig {
  title: string;
  onSave: (val: string) => void;
}

export interface CreatePropertyProps {
  onBack: (shouldRefresh?: boolean) => void;
  propertyId?: string;
}

// Estado completo del formulario
export interface PropertyFormState {
  // Imágenes
  images: string[];

  // Información básica
  descripcion: string;
  // "" = sin seleccionar todavía (el usuario debe elegir; se valida).
  tipoOperacion: TipoOperacion | "";
  precioVenta: string;
  precioRenta: string;
  moneda: MonedaType;
  tipoPrincipal: string;
  subtipo: string;
  status: string;
  originalStatus: string;

  // Ubicación
  pais: string;
  ubicacionData: UbicacionData;
  calle: string;
  numeroExterior: string;
  numeroInterior: string;
  codigoPostal: string;
  location: LocationCoords;
  mapCenter: MapCenter | null;

  // Características físicas
  recamaras: string;
  banosCompletos: string;
  mediosBanos: string;
  estacionamientos: string;
  m2Construccion: string;
  m2Terreno: string;
  anchoTerreno: string;
  largoTerreno: string;
  niveles: string;
  antiguedad: string;
  // "" = sin seleccionar todavía (se valida cuando el campo es visible).
  amueblado: AmuebladoType | "";
  petFriendly: SiNo | "";
  costoMantenimiento: string;

  // Amenidades
  amenidadesSeleccionadas: string[];

  // Comisión Venta
  comparteComision: SiNo;
  comisionTipo: ComisionTipo;
  comisionValor: string;
  comisionCompartidaTipo: ComisionTipo;
  comisionCompartidaValor: string;
  condicionesComision: string;

  // Comisión Renta (para operación "ambas")
  comparteComisionRenta: SiNo;
  comisionTipoRenta: ComisionTipo;
  comisionValorRenta: string;
  comisionCompartidaTipoRenta: ComisionTipo;
  comisionCompartidaValorRenta: string;
  condicionesComisionRenta: string;

  // Gravamen
  tieneGravamen: SiNo | "";
  institucionGravamen: string[];
  // Monto opcional por institución: { [nombreInstitucion]: monto formateado }
  montosGravamen: Record<string, string>;

  // Financiamiento
  aceptaFinanciamiento: SiNo | "";
  tiposFinanciamientoSeleccionados: string[];

  // Propietario
  nombreCompletoPropietario: string;
  emailPropietario: string;
  telefonoPropietario: string;

  // Contract data (venta/renta)
  contractData: ContractData | null;

  // EasyBroker
  sinComision: boolean;

  // Campos especializados — Agrícola
  tiposAgua: string[];
  concesionAgua: boolean;
  usoTerreno: string[];
  tipoRiego: string[];
  infraElectricidad: boolean;
  infraCaminoAcceso: boolean;
  infraCercado: boolean;
  accesoCarretera: boolean;
  accesoCamiones: boolean;

  // Campos especializados — Comercial
  tipoUbicacionComercial: string;
  frenteMetros: string;
  nivelPiso: string;
  sobreAvenidaPrincipal: boolean;
  enEsquina: boolean;
  altaVisibilidad: boolean;
  altoFlujoVehicular: boolean;

  // Campos especializados — Industrial
  ubicacionIndustrial: string;
  alturaLibreM: string;
  tipoEnergiaKva: string[];
  areaOficinas: string;
  patioManiobras: string;

  // Errores
  errors: Record<string, string>;
}

// Estado de la publicación
export interface PublishState {
  uploading: boolean;
  uploadProgress: number;
  uploadStage: string;
  error: string | null;
  canCancel: boolean;
}

export const INITIAL_PUBLISH_STATE: PublishState = {
  uploading: false,
  uploadProgress: 0,
  uploadStage: "",
  error: null,
  canCancel: true,
};
