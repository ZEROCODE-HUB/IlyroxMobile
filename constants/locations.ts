/**
 * Catálogo de ubicaciones de México (En cascada)
 * Estado → Ciudad → Municipio → Colonia
 */

export const ESTADOS_MEXICO = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
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
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

export type EstadoMexico = typeof ESTADOS_MEXICO[number];

// ============================================
// ESTRUCTURA: Estado → Ciudades
// ============================================
export const CIUDADES_POR_ESTADO: Record<string, string[]> = {
  "Aguascalientes": ["Aguascalientes", "Calvillo"],
  "Baja California": ["Tijuana", "Mexicali"],
  "Baja California Sur": ["La Paz", "Los Cabos"],
  "Campeche": ["Campeche", "Ciudad del Carmen"],
  "Chiapas": ["Tuxtla Gutiérrez", "San Cristóbal de las Casas"],
  "Chihuahua": ["Chihuahua", "Ciudad Juárez"],
  "Coahuila": ["Saltillo", "Torreón"],
  "Colima": ["Colima", "Manzanillo"],
  "Durango": ["Durango", "Gómez Palacio"],
  "Estado de México": ["Toluca", "Naucalpan"],
  "Guanajuato": ["León", "Guanajuato"],
  "Guerrero": ["Acapulco", "Chilpancingo"],
  "Hidalgo": ["Pachuca", "Tulancingo"],
  "Jalisco": ["Guadalajara", "Zapopan"],
  "Michoacán": ["Morelia", "Uruapan"],
  "Morelos": ["Cuernavaca", "Jiutepec"],
  "Nayarit": ["Tepic", "Bahía de Banderas"],
  "Nuevo León": ["Monterrey", "San Pedro Garza García"],
  "Oaxaca": ["Oaxaca de Juárez", "Salina Cruz"],
  "Puebla": ["Puebla", "Tehuacán"],
  "Querétaro": ["Querétaro", "San Juan del Río"],
  "Quintana Roo": ["Cancún", "Playa del Carmen"],
  "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez"],
  "Sinaloa": ["Culiacán", "Mazatlán"],
  "Sonora": ["Hermosillo", "Ciudad Obregón"],
  "Tabasco": ["Villahermosa", "Cárdenas"],
  "Tamaulipas": ["Ciudad Victoria", "Tampico"],
  "Tlaxcala": ["Tlaxcala", "Apizaco"],
  "Veracruz": ["Veracruz", "Xalapa"],
  "Yucatán": ["Mérida", "Valladolid"],
  "Zacatecas": ["Zacatecas", "Fresnillo"],
};

// ============================================
// ESTRUCTURA: Ciudad → Municipios
// ============================================
export const MUNICIPIOS_POR_CIUDAD: Record<string, string[]> = {
  // Aguascalientes
  "Aguascalientes": ["Aguascalientes", "Jesús María"],
  "Calvillo": ["Calvillo", "Rincón de Romos"],
  
  // Baja California
  "Tijuana": ["Tijuana", "Playas de Rosarito"],
  "Mexicali": ["Mexicali", "Tecate"],
  
  // Baja California Sur
  "La Paz": ["La Paz", "Los Cabos"],
  "Los Cabos": ["Los Cabos", "Comondú"],
  
  // Campeche
  "Campeche": ["Campeche", "Champotón"],
  "Ciudad del Carmen": ["Carmen", "Palizada"],
  
  // Chiapas
  "Tuxtla Gutiérrez": ["Tuxtla Gutiérrez", "Chiapa de Corzo"],
  "San Cristóbal de las Casas": ["San Cristóbal", "Teopisca"],
  
  // Chihuahua
  "Chihuahua": ["Chihuahua", "Aquiles Serdán"],
  "Ciudad Juárez": ["Juárez", "Guadalupe"],
  
  // Coahuila
  "Saltillo": ["Saltillo", "Arteaga"],
  "Torreón": ["Torreón", "Matamoros"],
  
  // Colima
  "Colima": ["Colima", "Villa de Álvarez"],
  "Manzanillo": ["Manzanillo", "Armería"],
  
  // Durango
  "Durango": ["Durango", "Pueblo Nuevo"],
  "Gómez Palacio": ["Gómez Palacio", "Lerdo"],
  
  // Estado de México
  "Toluca": ["Toluca", "Metepec"],
  "Naucalpan": ["Naucalpan", "Tlalnepantla"],
  
  // Guanajuato
  "León": ["León", "San Francisco del Rincón"],
  "Guanajuato": ["Guanajuato", "Silao"],
  
  // Guerrero
  "Acapulco": ["Acapulco", "Coyuca de Benítez"],
  "Chilpancingo": ["Chilpancingo", "Eduardo Neri"],
  
  // Hidalgo
  "Pachuca": ["Pachuca", "Mineral de la Reforma"],
  "Tulancingo": ["Tulancingo", "Cuautepec"],
  
  // Jalisco
  "Guadalajara": ["Guadalajara", "Tlaquepaque"],
  "Zapopan": ["Zapopan", "Tonalá"],
  
  // Michoacán
  "Morelia": ["Morelia", "Tarímbaro"],
  "Uruapan": ["Uruapan", "Tingambato"],
  
  // Morelos
  "Cuernavaca": ["Cuernavaca", "Temixco"],
  "Jiutepec": ["Jiutepec", "Emiliano Zapata"],
  
  // Nayarit
  "Tepic": ["Tepic", "Xalisco"],
  "Bahía de Banderas": ["Bahía de Banderas", "Compostela"],
  
  // Nuevo León
  "Monterrey": ["Monterrey", "Guadalupe"],
  "San Pedro Garza García": ["San Pedro Garza García", "Santa Catarina"],
  
  // Oaxaca
  "Oaxaca de Juárez": ["Oaxaca de Juárez", "Santa Cruz Xoxocotlán"],
  "Salina Cruz": ["Salina Cruz", "Tehuantepec"],
  
  // Puebla
  "Puebla": ["Puebla", "San Andrés Cholula"],
  "Tehuacán": ["Tehuacán", "Ajalpan"],
  
  // Querétaro
  "Querétaro": ["Querétaro", "Corregidora"],
  "San Juan del Río": ["San Juan del Río", "Tequisquiapan"],
  
  // Quintana Roo
  "Cancún": ["Benito Juárez", "Isla Mujeres"],
  "Playa del Carmen": ["Solidaridad", "Tulum"],
  
  // San Luis Potosí
  "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez"],
  "Soledad de Graciano Sánchez": ["Soledad de Graciano Sánchez", "Cerro de San Pedro"],
  
  // Sinaloa
  "Culiacán": ["Culiacán", "Navolato"],
  "Mazatlán": ["Mazatlán", "Concordia"],
  
  // Sonora
  "Hermosillo": ["Hermosillo", "Carbó"],
  "Ciudad Obregón": ["Cajeme", "Bacum"],
  
  // Tabasco
  "Villahermosa": ["Centro", "Nacajuca"],
  "Cárdenas": ["Cárdenas", "Huimanguillo"],
  
  // Tamaulipas
  "Ciudad Victoria": ["Victoria", "Soto la Marina"],
  "Tampico": ["Tampico", "Madero"],
  
  // Tlaxcala
  "Tlaxcala": ["Tlaxcala", "Chiautempan"],
  "Apizaco": ["Apizaco", "Tzompantepec"],
  
  // Veracruz
  "Veracruz": ["Veracruz", "Boca del Río"],
  "Xalapa": ["Xalapa", "Coatepec"],
  
  // Yucatán
  "Mérida": ["Mérida", "Umán"],
  "Valladolid": ["Valladolid", "Tizimín"],
  
  // Zacatecas
  "Zacatecas": ["Zacatecas", "Guadalupe"],
  "Fresnillo": ["Fresnillo", "Valparaíso"],
};

// ============================================
// ESTRUCTURA: Municipio → Colonias
// ============================================
export const COLONIAS_POR_MUNICIPIO: Record<string, string[]> = {
  // Nuevo León - Monterrey
  "Monterrey": ["Centro", "Del Valle"],
  "Guadalupe": ["Contry", "Valle de Infonavit"],
  
  // Nuevo León - San Pedro
  "San Pedro Garza García": ["Del Valle", "Fuentes del Valle"],
  "Santa Catarina": ["Colinas de San Jerónimo", "Valle de San Ángel"],
  
  // Jalisco - Guadalajara
  "Guadalajara": ["Centro", "Providencia"],
  "Tlaquepaque": ["Centro", "La Cofradía"],
  
  // Jalisco - Zapopan
  "Zapopan": ["Chapalita", "Zapopan Centro"],
  "Tonalá": ["Centro", "La Punta"],
  
  // Puebla
  "Puebla": ["Centro Histórico", "Angelópolis"],
  "San Andrés Cholula": ["San Andrés", "La Paz"],
  
  // Querétaro
  "Querétaro": ["Centro", "Juriquilla"],
  "Corregidora": ["El Pueblito", "Candiles"],
  
  // Estado de México
  "Toluca": ["Centro", "Las Américas"],
  "Metepec": ["San Salvador Tizatlalli", "Santiaguito"],
  
  // ... Agrega el resto conforme necesites
};

// ============================================
// HELPERS
// ============================================
export const getCiudadesPorEstado = (estado: string): string[] => {
  return CIUDADES_POR_ESTADO[estado] || [];
};

export const getMunicipiosPorCiudad = (ciudad: string): string[] => {
  return MUNICIPIOS_POR_CIUDAD[ciudad] || [];
};

export const getColoniasPorMunicipio = (municipio: string): string[] => {
  return COLONIAS_POR_MUNICIPIO[municipio] || [];
};