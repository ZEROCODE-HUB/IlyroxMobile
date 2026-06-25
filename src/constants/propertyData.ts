/**
 * Catálogos de datos para propiedades inmobiliarias
 * Reutilizable en toda la app
 */

// ============================================
// TIPOS DE PROPIEDAD
// ============================================
export const PROPERTY_TYPES = {
  habitacional: [
    "Casa (Fracc. Abierto)",
    "Casa en Condominio",
    "Casa de campo/descanso/cabaña",
    "Departamento",
    "Penthouse",
    "Loft",
    "Terreno (Fracc. abierto)",
    "Terreno en Condominio",
  ],
  comercial: [
    "Local",
    "Oficina",
    "Plaza",
    "Bodega",
    "Edificio",
    "Terreno Comercial",
    "Casa con local/casa con uso comercial",
  ],
  industrial: ["Bodega", "Nave", "Terreno para nave o bodega"],
  agricola: ["Rancho / Finca", "Terreno Rural"],
} as const;

export type TipoPrincipal = keyof typeof PROPERTY_TYPES;

// ============================================
// CARACTERÍSTICAS NUMÉRICAS
// ============================================
export const RECAMARAS = ["0", "1", "2", "3", "4", "5", "Más"] as const;
export const BANOS = ["1", "2", "3", "4", "5", "Más"] as const;
export const MEDIOS_BANOS = ["0", "1", "2", "3", "4", "Más"] as const;
export const ESTACIONAMIENTOS = ["0", "1", "2", "3", "4", "5", "Más"] as const;
export const NIVELES = ["1", "2", "3", "4", "Más"] as const;

/**
 * Formatea una opción de niveles para mostrar la unidad solo cuando el valor es 1
 * (cubre "1" y "1+"), como pista de que se trata de plantas. El valor crudo no
 * cambia: en BD/estado se sigue guardando solo el número.
 */
export const formatNivelLabel = (value: string): string => {
  const n = parseInt(value, 10);
  return n === 1 ? `${value} planta` : value;
};

// ============================================
// AMENIDADES
// ============================================
export const AMENIDADES = [
  "Alberca",
  "Jardín",
  "Terraza",
  "Roof garden",
  "Gym",
  "Salón de eventos",
  "Cancha deportiva",
  "Cancha de pádel",
  "Área de juegos infantiles",
  "Seguridad 24/7",
  "Pet Park",
  "Área para yoga",
  "Lago artificial",
  "Trotapista",
  "Campo de golf",
] as const;

// ============================================
// INSTITUCIONES FINANCIERAS (Gravamen)
// ============================================
export const INSTITUCIONES_GRAVAMEN = [
  "BBVA México",
  "Santander",
  "Banorte",
  "HSBC",
  "Scotiabank",
  "Citibanamex",
  "Afirme",
  "Banco del Bajío",
  "Banregio",
  "Crédito Inmobiliario",
  "Inmobiliaria del Sur",
  "Infonavit",
  "Fovissste",
  "Particular",
  "Otro",
] as const;

// ============================================
// TIPOS DE FINANCIAMIENTO
// ============================================
export const TIPOS_FINANCIAMIENTO = [
  "Crédito bancario",
  "Infonavit",
  "Fovissste",
  "Cofinavit",
  "Arrendamiento financiero",
  "Crédito puente",
  "Desarrollador",
  "Pago de contado",
] as const;

// ============================================
// OPCIONES GENERALES
// ============================================
export const MONEDAS = ["MXN", "USD"] as const;
export const TIPOS_OPERACION = ["venta", "renta", "ambas"] as const;
export const OPCIONES_AMUEBLADO = ["No", "Sí", "Parcial"] as const;
export const OPCIONES_SI_NO = ["Sí", "No"] as const;

// ============================================
// HELPERS PARA LÓGICA DE VISUALIZACIÓN
// ============================================

/**
 * Verifica si el subtipo es un terreno
 */
export const esTerreno = (subtipo: string | string[]): boolean => {
  if (!subtipo) return false;
  if (Array.isArray(subtipo)) {
    return (
      subtipo.length > 0 &&
      subtipo.every((s) => s.toLowerCase().includes("terreno"))
    );
  }
  return subtipo.toLowerCase().includes("terreno");
};

/**
 * Verifica si el subtipo es un departamento
 */
export const esDepartamento = (subtipo: string | string[]): boolean => {
  if (!subtipo) return false;
  if (Array.isArray(subtipo)) {
    return (
      subtipo.length > 0 &&
      subtipo.every((s) => s.toLowerCase() === "departamento")
    );
  }
  return subtipo.toLowerCase() === "departamento";
};

/**
 * Verifica si el subtipo es una "Casa" (cualquier subtipo cuyo nombre empieza
 * con "casa": Casa Fracc. Abierto, Casa en Condominio, Casa de campo/cabaña, etc.).
 * Se usa para mostrar las dimensiones Ancho/Largo del terreno también en casas.
 */
export const esCasa = (subtipo: string | string[]): boolean => {
  if (!subtipo) return false;
  if (Array.isArray(subtipo)) {
    return (
      subtipo.length > 0 &&
      subtipo.every((s) => s.trim().toLowerCase().startsWith("casa"))
    );
  }
  return subtipo.trim().toLowerCase().startsWith("casa");
};

/**
 * Verifica si el subtipo es "Rancho / Finca" (agrícola). A diferencia de
 * "Terreno Rural", una finca tiene casa habitación, por lo que aplica recámaras
 * y baños. Con array exige que TODOS los subtipos sean rancho/finca (consistente
 * con esTerreno/esDepartamento). Se usa "rancho" como marcador para no depender
 * del formato exacto "Rancho / Finca".
 */
export const esRanchoFinca = (subtipo: string | string[]): boolean => {
  if (!subtipo) return false;
  if (Array.isArray(subtipo)) {
    return (
      subtipo.length > 0 &&
      subtipo.every((s) => s.toLowerCase().includes("rancho"))
    );
  }
  return subtipo.toLowerCase().includes("rancho");
};

/**
 * Verifica si es propiedad comercial o industrial
 */
export const esComercialIndustrial = (
  tipoPrincipal: TipoPrincipal,
): boolean => {
  return tipoPrincipal === "comercial" || tipoPrincipal === "industrial";
};

/**
 * Obtiene el label para recámaras según tipo de propiedad
 */
export const getLabelRecamaras = (tipoPrincipal: TipoPrincipal): string => {
  return esComercialIndustrial(tipoPrincipal) ? "Espacios" : "Recámaras";
};

// ============================================
// CAMPOS ESPECIALIZADOS POR TIPO
// ============================================
export const TIPOS_AGUA = ['Pozo', 'Presa', 'Canal', 'Otro'] as const;
export const USOS_TERRENO = ['Agrícola', 'Ganadero'] as const;
export const TIPOS_RIEGO = ['Temporal', 'Sistema de riego'] as const;
export const TIPOS_UBICACION_COMERCIAL = ['Dentro de plaza', 'Fuera de plaza'] as const;
export const TIPOS_UBICACION_INDUSTRIAL = ['Dentro de parque', 'Fuera de parque'] as const;
export const ALTURAS_LIBRES = ['4-6m', '6-8m', '8-10m', '10-12m', '+12m'] as const;
export const TIPOS_ENERGIA_KVA = ['Monofásica: hasta 25 kVA', 'Trifásica: 25 a 45 kVA', 'Industrial: 45 a 150 kVA', 'Alta capacidad: más de 150 kVA'] as const;

/**
 * Define qué campos mostrar según el subtipo y tipo principal
 */
export const getCamposVisibles = (subtipo: string | string[], tipoPrincipal?: TipoPrincipal) => {
  const isTerreno = esTerreno(subtipo);
  const isDepartamento = esDepartamento(subtipo);
  const isIndustrial = tipoPrincipal === "industrial";
  const isComercial = tipoPrincipal === "comercial";
  const isAgricola = tipoPrincipal === "agricola";
  // Excepción: una finca/rancho agrícola tiene casa, así que sí aplica recámaras y baños.
  const isRanchoFinca = isAgricola && esRanchoFinca(subtipo);

  return {
    // Características numéricas
    recamaras: (!isTerreno && !isIndustrial && !isComercial && !isAgricola) || isRanchoFinca,
    banos: (!isTerreno && !isAgricola) || isRanchoFinca,
    mediosBanos: !isTerreno && !isAgricola,
    estacionamientos: !isTerreno && !isAgricola,
    niveles: !isTerreno && !isDepartamento && !isComercial && !isAgricola,
    antiguedad: !isTerreno && !isAgricola,

    // Superficies
    m2Construccion: !isTerreno,
    m2Terreno: !isDepartamento,

    // Mantenimiento mensual: todas las propiedades excepto agrícola
    mantenimiento: !isAgricola,

    // Características adicionales
    amueblado: !isTerreno && !isIndustrial && !isAgricola,
    // Mascotas es un campo residencial: solo habitacional (no terreno/comercial/industrial/agrícola)
    petFriendly: !isTerreno && !isIndustrial && !isComercial && !isAgricola,

    // Secciones completas
    amenidades: !isTerreno && !isAgricola,
    gravamen: true,
    financiamiento: true,
  };
};
