/**
 * normalizePropertyData.ts
 *
 * El detalle de propiedad (PropertyDetail.tsx) renderiza con la forma cruda
 * que trae Supabase (fotos, tipo, subtipo, habitaciones, operaciones, ...).
 * El feed, en cambio, transforma la propiedad a otro shape (images, type,
 * subtype, features, operations...). Al abrir una propiedad desde el feed,
 * propertyCacheStore puede contener cualquiera de las dos formas:
 *   - el feed cachea la transformada (Feed.tsx setProperty)
 *   - usePropertyDetails cachea la cruda (después del fetch)
 *
 * Este helper detecta la forma y, si es la transformada, la mapea a la cruda
 * para que el render instantáneo muestre la info core (fotos, precio, stats,
 * título, ubicación, dueño) sin esperar el fetch de fondo.
 */

type AnyRecord = Record<string, any>;

export function normalizePropertyData(
  data: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!data) return null;

  // Ya es la forma cruda (fetch de usePropertyDetails o cache previo).
  if (data.fotos || data.operaciones) return data;

  const features = data.features || {};
  const location = data.location || {};
  const operations = Array.isArray(data.operations) ? data.operations : [];

  const opList =
    operations.length > 0
      ? operations
      : data.price
        ? [
            {
              tipo_operacion:
                data.operation === "Rent" ? "renta" : "venta",
              precio: data.price,
              moneda: data.currency || "MXN",
            },
          ]
        : [];

  // El perfil del feed (User) no es el raw `perfiles`, pero alcanza para que
  // PropertyOwnerContact dibuje nombre + avatar + ocupación al instante.
  const user = data.user;
  const perfil =
    user && user.id
      ? {
          id: user.id,
          nombre: user.nombre || user.name || "Usuario",
          foto: user.avatar || "",
          apellido_paterno: user.apellido_paterno || "",
          ocupacion: user.ocupacion,
          celular: user.celular,
          prefijo_celular: user.prefijo_celular,
        }
      : data.perfil;

  // OJO: el feed convierte null -> "" y null -> 0 (|| "", || 0). PropertyDetail
  // usa patrones `campo && <JSX>` y `campo && 0` retornaría ""/0, que React
  // intenta renderizar como nodo de texto ("Text strings must be rendered
  // within a <Text> component"). Convertimos los falsy a undefined para que
  // esos condicionales retornen undefined (React los ignora en silencio).
  return {
    ...data,
    fotos: data.images || [],
    tipo: data.type,
    subtipo: data.subtype,
    descripcion: data.description || data.descripcion || undefined,
    codigo_propiedad: data.code,
    created_at: data.createdAt ?? data.created_at,
    municipio: location.municipio || location.city || data.municipio || "",
    ciudad: location.city || data.ciudad || "",
    colonia: data.colonia || location.colony || "",
    habitaciones: features.beds,
    banos: features.baths,
    medios_banos: features.halfBaths,
    estacionamientos: features.parking,
    pisos: features.floors,
    metros_cuadrados_construccion: features.constructionSqft || undefined,
    metros_cuadrados_terreno: features.landSqft || undefined,
    operaciones: opList,
    perfil,
  };
}