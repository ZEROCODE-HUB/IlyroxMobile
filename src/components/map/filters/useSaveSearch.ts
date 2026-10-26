import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { legalService, ConsentItem, TEXTO_DECLARACION_PROSPECTO } from "../../../services/legalService";
import { useToast } from "../../../context/ToastContext";
import { useModal } from "../../../context/ModalContext";
import { DEFAULT_COUNTRY } from "../../../lib/location/registry";
import { geocodeAddress, boundsCenter } from "../../../lib/geocodingService";
import { buildLocationCriteria } from "@/utils/locationMatch";

/**
 * Normaliza los filtros comerciales para persistencia/matching. `tipoUbicacion`
 * se maneja como array en la UI (selección múltiple), pero el matching (SQL y
 * cliente) lo lee como texto: una sola opción → ese valor; ambas o ninguna → ""
 * (= sin filtro de tipo de ubicación).
 */
function serializeComercialFilters(cf: any): any {
  if (!cf) return cf;
  const tu = cf.tipoUbicacion;
  const tipoUbicacion = Array.isArray(tu)
    ? tu.length === 1
      ? tu[0]
      : ""
    : tu ?? "";
  return { ...cf, tipoUbicacion };
}

/**
 * Igual que el comercial: en industrial, `ubicacion` (dentro/fuera de parque) se
 * maneja como array en la UI (selección múltiple) pero el matching la lee como
 * texto. Una sola opción → ese valor; ambas o ninguna → "" (= sin filtro).
 */
function serializeIndustrialFilters(inf: any): any {
  if (!inf) return inf;
  const u = inf.ubicacion;
  const ubicacion = Array.isArray(u) ? (u.length === 1 ? u[0] : "") : (u ?? "");
  return { ...inf, ubicacion };
}

/**
 * Igual que el comercial: en agrícola, usoTerreno y tipoRiego se manejan como
 * array en la UI (selección múltiple) pero el matching los lee como texto. Una
 * sola opción → ese valor; varias o ninguna → "" (= sin filtro).
 */
function serializeAgricolaFilters(ag: any): any {
  if (!ag) return ag;
  const one = (v: any) =>
    Array.isArray(v) ? (v.length === 1 ? v[0] : "") : (v ?? "");
  return { ...ag, usoTerreno: one(ag.usoTerreno), tipoRiego: one(ag.tipoRiego) };
}

/**
 * Garantiza que `data.bounds` exista para el matching geográfico server-side.
 * Si no hay bounds (p. ej. búsqueda por filtros de texto, sin chip de zona),
 * geocodifica la ubicación más específica (municipio > estado, NUNCA colonia) para
 * obtener su área.
 *
 * ¿Por qué NO geocodificamos con colonia? El "viewport" que Google devuelve
 * para una colonia suele ser mucho más grande que la colonia real y arrastra
 * propiedades de colonias vecinas (mismo motivo por el que el cliente ignora
 * los bounds de chips de colonia en `utils/locationMatch`).
 * Así, una búsqueda por colonia cae al fallback de texto en
 * `v_texto_match` (rescata por nombre de colonia, sin importar la distancia
 * del pin), que es lo que el cliente ya hace en vivo.
 */
async function ensureSearchBounds(data: any, filters: any): Promise<void> {
  if (data.bounds) return;
  const lf = filters?.locationFilter || {};

  // Si la búsqueda tiene criterio de COLONIA (chip o locationFilter.colonia),
  // NO guardar bounds: el matching del cliente para colonia es SOLO texto
  // (no usa bounds de Google — son aprox y arrastran colonias vecinas).
  // Guardar bounds para colonia causa que el SQL haga
  //   bounds OR texto  →  incluye todas las props dentro del bounds,
  //   independientemente de la colonia  (ej: Ruscello → 22 matches en SQL
  //   vs 1 en el cliente).
  const coloniasFromChips =
    (filters?.locationChips ?? [])
      .filter((c: any) => c?.type === "colonia")
      .map((c: any) => c?.locationFilter?.colonia ?? c?.label ?? "")
      .filter(Boolean);

  const tieneColonia = !!(
    lf.colonia ||
    (Array.isArray(lf.colonia) ? lf.colonia[0] : lf.colonia) ||
    coloniasFromChips.length > 0
  );

  if (tieneColonia) return; // colonia → texto puro, sin bounds

  // Para municipio/estado sí我们可以guardar bounds geocodificado.
  const partes = [lf.municipio, lf.estado].filter(Boolean);
  if (partes.length === 0) return;
  try {
    const geo = await geocodeAddress(partes.join(", "), filters?.pais);
    if (geo?.bounds) data.bounds = geo.bounds;
  } catch {
    // Si la geocodificación falla, el matching cae al texto normalizado.
  }
}

/**
 * Decide qué bounds guardar en la búsqueda para que coincidan EXACTAMENTE con
 * los que el cliente usa al filtrar en vivo (`usePropertyFilters`).
 *
 * Regla (espejo del cliente):
 *   - Sin chips         → null  (no hay info geográfica; `ensureSearchBounds`
 *                                 geocodificará municipio/estado si los hay).
 *   - Polígono dibujado → null  (el polígono manda y el SQL ya lo trata
 *                                 estricto; un bounds adicional ensancha
 *                                 el área y mete props fuera del polígono).
 *   - Solo colonias     → null  (el "viewport" de Google para una colonia es
 *                                 aprox e incluye colonias vecinas; el cliente
 *                                 no usa esos bounds, solo el match por texto
 *                                 de colonia).
 *   - Mezcla con municipio/estado → unión SOLO de los bounds de
 *                                   municipio/estado (los de colonia se
 *                                   excluyen explícitamente).
 *
 * Devuelve `null` o un `{ north, south, east, west }` con la unión de los
 * bounds confiables. El caller debe asignar `data.bounds` solo si el
 * resultado no es null.
 */
function computeReliableBounds(
  chips: any[] | undefined,
  polygons: any[] | undefined,
): { north: number; south: number; east: number; west: number } | null {
  if (!chips || chips.length === 0) return null;
  // Polígono dibujado manda: el SQL ya hace filtro estricto por polígono,
  // y un bounds adicional solo agrega ruido.
  if (polygons && polygons.length > 0) return null;

  // Solo conservar bounds de chips de municipio/estado. Los de colonia se
  // excluyen porque su viewport de Google es aprox.
  const chipsConfiables = chips.filter(
    (c) => (c?.type === "municipio" || c?.type === "estado") && c.bounds,
  );
  if (chipsConfiables.length === 0) return null;

  let north = chipsConfiables[0].bounds.north;
  let south = chipsConfiables[0].bounds.south;
  let east = chipsConfiables[0].bounds.east;
  let west = chipsConfiables[0].bounds.west;
  for (const chip of chipsConfiables) {
    north = Math.max(north, chip.bounds.north);
    south = Math.min(south, chip.bounds.south);
    east = Math.max(east, chip.bounds.east);
    west = Math.min(west, chip.bounds.west);
  }
  return { north, south, east, west };
}

export const useSaveSearch = (userId?: string) => {
  const { showToast } = useToast();
  const { showModal } = useModal();

  const [createLead, setCreateLead] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const validateLeadFields = () => {
    if (!createLead) return true;

    const newErrors: { [key: string]: string } = {};

    if (!leadName.trim()) {
      newErrors.leadName = "El nombre es obligatorio";
    }

    if (!leadPhone.trim()) {
      newErrors.leadPhone = "El teléfono es obligatorio";
    }

    // Email es opcional, pero si se proporciona, debe ser válido
    if (leadEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadEmail)) {
        newErrors.leadEmail = "Ingresa un email válido";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // REV10-07: el mismo prospecto del mismo asesor (por telefono o email) se reutiliza; no se duplica en cada guardado.
  const buscarProspectoExistente = async (): Promise<string | null> => {
    if (!userId) return null;
    const telefonos = Array.from(new Set([leadPhone.trim(), leadPhone.replace(/\D/g, "")].filter(Boolean)));
    if (telefonos.length > 0) {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("usuario_id", userId)
        .eq("activo", true)
        .in("telefono", telefonos)
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) return String(data[0].id);
    }
    if (leadEmail.trim()) {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("usuario_id", userId)
        .eq("activo", true)
        .eq("email", leadEmail.trim())
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) return String(data[0].id);
    }
    return null;
  };

  /** Fecha en que ya se declaro haber informado a este prospecto (si su telefono / email coincide con uno existente). */
  const declaracionPrevia = async (version: string): Promise<string | null> => {
    try {
      const existente = await buscarProspectoExistente();
      return existente ? await legalService.declaracionFecha(existente, version) : null;
    } catch {
      return null;
    }
  };

  const createLeadRecord = async () => {
    if (!createLead || !userId) return null;

    const leadInsertData: any = {
      nombre: leadName.trim(),
      telefono: leadPhone.trim(),
      usuario_id: userId,
      origen: "busqueda_guardada",
      estado: "nuevo",
      activo: true,
    };

    // Solo agregar email si fue proporcionado
    if (leadEmail.trim()) {
      leadInsertData.email = leadEmail.trim();
    }

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert([leadInsertData])
      .select()
      .maybeSingle();

    if (leadError) {
      if (leadError.code === "23505") {
        const { data: existingLead, error: fetchError } = await supabase
          .from("leads")
          .select("id")
          .eq("email", leadEmail.trim())
          .eq("usuario_id", userId)
          .maybeSingle();

        if (fetchError) {
          throw new Error("No se pudo crear o encontrar el prospecto");
        }

        return existingLead?.id || null;
      } else {
        throw leadError;
      }
    }

    return leadData?.id || null;
  };

  const buildSearchPostMetadata = (filters: any) => {
    // Zonas de interés: SOLO los polígonos dibujados en el mapa.
    const zonas_interes = Array.isArray(filters.polygons)
      ? filters.polygons.map((_poly: any, i: number) => ({
          id: `poly-${i}`,
          label: `Zona ${i + 1}`,
          type: "zona",
        }))
      : [];

    // Ubicaciones (multi-nivel): las zonas nombradas del buscador se muestran en
    // la sección "Ubicación", no en "Zonas de interés".
    const ubicaciones = Array.isArray(filters.locationChips)
      ? filters.locationChips.map((c: any) => {
          const lf = c.locationFilter || {};
          const bc = c.bounds ? boundsCenter(c.bounds) : null;
          const center = bc
            ? { latitud: bc.latitude, longitud: bc.longitude }
            : {};
          return {
            level: c.type === "zona" ? "colonia" : c.type,
            estado: lf.estado || (c.type === "estado" ? c.label : ""),
            municipio: lf.municipio || undefined,
            colonia: lf.colonia || undefined,
            label: c.label,
            ...center,
          };
        })
      : [];

    // Filtros especializados según tipo de propiedad (NO comisión, NO polígonos)
    let comercial: any = undefined;
    let industrial: any = undefined;
    let agricola: any = undefined;
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
      comercial = serializeComercialFilters(filters.comercialFilters);
    }
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
      industrial = serializeIndustrialFilters(filters.industrialFilters);
    }
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
      agricola = serializeAgricolaFilters(filters.agricolaFilters);
    }

    // Enrutar el precio al campo correcto según la operación, para que al publicar
    // el rango se muestre en compra o en renta (sin perder el dato).
    const pMin = filters.precioMin && filters.precioMin !== "0"
      ? parseFloat(filters.precioMin.toString().replace(/,/g, ""))
      : 0;
    const pMax = filters.precioMax && filters.precioMax !== "Sin límite"
      ? parseFloat(filters.precioMax.toString().replace(/,/g, ""))
      : null;
    const esRenta = String(filters.operacion ?? "").toLowerCase() === "renta";

    return {
      titulo: "SE BUSCA",
      icon: "search-outline",
      filtros: {
        operacion: filters.operacion,
        icon_operacion: "cash-outline",
        tipo_propiedad: filters.tipoPropiedad,
        icon_tipo: "business-outline",
        subtipo: Array.isArray(filters.subtipo) ? filters.subtipo : filters.subtipo ? [filters.subtipo] : [],
        moneda: filters.moneda,
        precio_min: esRenta ? 0 : pMin,
        precio_max: esRenta ? null : pMax,
        precio_renta_min: esRenta ? pMin : 0,
        precio_renta_max: esRenta ? pMax : null,
        ubicacion: {
          estado: filters.locationFilter?.estado ?? '',
          ciudad: filters.locationFilter?.ciudad ?? '',
          municipio: filters.locationFilter?.municipio ?? '',
          colonia: Array.isArray(filters.locationFilter?.colonia)
            ? filters.locationFilter.colonia.join(", ")
            : filters.locationFilter?.colonia ?? '',
          icon: "location-outline",
        },
        zonas_interes,
        ubicaciones,
        caracteristicas: {
          habitaciones: filters.habitaciones,
          icon_bed: "bed-outline",
          banos: filters.banos,
          medios_banos: filters.mediosBanos,
          icon_bath: "water-outline",
          estacionamientos: filters.estacionamientos,
          icon_car: "car-outline",
          niveles: filters.niveles,
          icon_layers: "layers-outline",
          antiguedad: filters.antiguedad,
          icon_time: "time-outline",
        },
        superficies: {
          m2_terreno_min: filters.m2TerrenoMin
            ? parseFloat(String(filters.m2TerrenoMin).replace(/,/g, ""))
            : 0,
          m2_construccion_min: filters.m2ConstruccionMin
            ? parseFloat(String(filters.m2ConstruccionMin).replace(/,/g, ""))
            : 0,
          ancho_terreno_min: filters.anchoTerrenoMin
            ? parseFloat(String(filters.anchoTerrenoMin).replace(/,/g, ""))
            : 0,
          largo_terreno_min: filters.largoTerrenoMin
            ? parseFloat(String(filters.largoTerrenoMin).replace(/,/g, ""))
            : 0,
          icon: "resize-outline",
        },
        amenidades: Array.isArray(filters.amenidades) ? filters.amenidades : [],
        ...(comercial ? { comercial } : {}),
        ...(industrial ? { industrial } : {}),
        ...(agricola ? { agricola } : {}),
      },
      prospecto: {
        nombre: leadName.trim(),
        telefono: leadPhone.trim(),
        ...(leadEmail.trim() && { email: leadEmail.trim() }),
      },
    };
  };

  const saveSearchToDatabase = async (filters: any, leadId: string | null) => {
    if (!userId) return;

    const criterios_busqueda: any = {
      operacion: filters.operacion,
    };

    if (filters.moneda) criterios_busqueda.moneda = filters.moneda;
    if (filters.tipoPropiedad)
      criterios_busqueda.tipo_propiedad = filters.tipoPropiedad;
    if (filters.subtipo) criterios_busqueda.subtipo = filters.subtipo;
    if (filters.precioMin)
      criterios_busqueda.precio_min = parseFloat(
        String(filters.precioMin).replace(/,/g, ""),
      );
    if (filters.precioMax)
      criterios_busqueda.precio_max = parseFloat(
        String(filters.precioMax).replace(/,/g, ""),
      );
    if (filters.habitaciones && filters.habitaciones !== "No indicado")
      criterios_busqueda.habitaciones = filters.habitaciones;
    if (filters.banos && filters.banos !== "No indicado")
      criterios_busqueda.banos = filters.banos;
    if (filters.mediosBanos && filters.mediosBanos !== "No indicado")
      criterios_busqueda.medios_banos = filters.mediosBanos;
    if (filters.estacionamientos && filters.estacionamientos !== "No indicado")
      criterios_busqueda.estacionamientos = filters.estacionamientos;
    if (filters.niveles && filters.niveles !== "No indicado")
      criterios_busqueda.niveles = filters.niveles;
    if (filters.antiguedad && filters.antiguedad !== "No indicado")
      criterios_busqueda.antiguedad = filters.antiguedad;
    if (filters.m2TerrenoMin)
      criterios_busqueda.m2_terreno_min = parseFloat(
        String(filters.m2TerrenoMin).replace(/,/g, ""),
      );
    if (filters.m2ConstruccionMin)
      criterios_busqueda.m2_construccion_min = parseFloat(
        String(filters.m2ConstruccionMin).replace(/,/g, ""),
      );
    if (filters.anchoTerrenoMin)
      criterios_busqueda.ancho_terreno_min = parseFloat(
        String(filters.anchoTerrenoMin).replace(/,/g, ""),
      );
    if (filters.largoTerrenoMin)
      criterios_busqueda.largo_terreno_min = parseFloat(
        String(filters.largoTerrenoMin).replace(/,/g, ""),
      );
    if (filters.locationFilter?.estado)
      criterios_busqueda.estado = filters.locationFilter.estado;
    if (filters.locationFilter?.ciudad)
      criterios_busqueda.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter?.municipio)
      criterios_busqueda.municipio = filters.locationFilter.municipio;
    if (filters.locationFilter?.colonia) {
      criterios_busqueda.colonias = Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia
        : [filters.locationFilter.colonia];
    }

    // Location chips (zonas nombradas con bounds geográficos)
    if (filters.locationChips?.length > 0) {
      criterios_busqueda.location_chips = filters.locationChips.map((c: any) => ({
        label: c.label,
        type: c.type,
        bounds: c.bounds,        // nuevo campo
        locationFilter: c.locationFilter,
      }));

      // Guardar bounds solo si hay al menos un chip de municipio/estado
      // (los de colonia se ignoran, mismo motivo que el cliente). Ver
      // `computeReliableBounds` para los detalles.
      const reliableBounds = computeReliableBounds(
        filters.locationChips,
        filters.polygons,
      );
      if (reliableBounds) {
        criterios_busqueda.bounds = reliableBounds;
      }
    }

    // Comisiones
    if (filters.comisionVentaMin) {
      criterios_busqueda.comision_venta_min = parseFloat(filters.comisionVentaMin);
    }
    if (filters.comisionRentaMin) {
      criterios_busqueda.comision_renta_min = parseFloat(filters.comisionRentaMin);
    }

    // Amenidades
    if (Array.isArray(filters.amenidades) && filters.amenidades.length > 0) {
      criterios_busqueda.amenidades = filters.amenidades;
    }

    // Filtros especializados por tipo
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
      criterios_busqueda.comercial = serializeComercialFilters(filters.comercialFilters);
    }
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
      criterios_busqueda.industrial = serializeIndustrialFilters(filters.industrialFilters);
    }
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
      criterios_busqueda.agricola = serializeAgricolaFilters(filters.agricolaFilters);
    }

    const insertData: any = {
      usuario_id: userId,
      // País de la búsqueda — el matching solo cruza propiedades del mismo país.
      pais: filters.pais || DEFAULT_COUNTRY,
      criterios_busqueda: criterios_busqueda,
      activa: true,
      frecuencia_notificaciones: 24,
    };

    if (filters.operacion && filters.operacion !== "") {
      insertData.tipo_operacion = filters.operacion;
    }

    if (leadId) {
      insertData.lead_id = leadId;
    }

    if (filters.tipoPropiedad)
      insertData.tipo_propiedad = filters.tipoPropiedad;
    if (filters.subtipo) insertData.subtipo = filters.subtipo;
    if (filters.precioMin) {
      const pMin = parseFloat(filters.precioMin.toString().replace(/,/g, ""));
      if (!isNaN(pMin)) insertData.precio_min = pMin;
    }
    if (filters.precioMax) {
      const pMax = parseFloat(filters.precioMax.toString().replace(/,/g, ""));
      if (!isNaN(pMax)) insertData.precio_max = pMax;
    }

    // Ubicación: mismos criterios que usa el mapa para filtrar
    // (utils/locationMatch), así lo guardado coincide con lo que se ve.
    const ubicacion = buildLocationCriteria(
      filters.locationFilter,
      filters.locationChips ?? [],
    );
    if (ubicacion.estado.length > 0) insertData.estado = ubicacion.estado;
    if (ubicacion.ciudad) insertData.ciudad = ubicacion.ciudad;
    if (ubicacion.municipio.length > 0) insertData.municipio = ubicacion.municipio;
    if (ubicacion.colonias.length > 0) insertData.colonias = ubicacion.colonias;

    if (filters.habitaciones && filters.habitaciones !== "No indicado") {
      const habNum = parseInt(filters.habitaciones);
      if (!isNaN(habNum)) insertData.habitaciones = habNum;
    }
    if (filters.banos && filters.banos !== "No indicado") {
      const banosNum = parseInt(filters.banos);
      if (!isNaN(banosNum)) insertData.banos = banosNum;
    }
    if (
      filters.estacionamientos &&
      filters.estacionamientos !== "No indicado"
    ) {
      const estNum = parseInt(filters.estacionamientos);
      if (!isNaN(estNum)) insertData.estacionamientos = estNum;
    }
    if (filters.m2ConstruccionMin) {
      const m2Cons = parseFloat(
        String(filters.m2ConstruccionMin).replace(/,/g, ""),
      );
      if (!isNaN(m2Cons)) insertData.metros_construccion = m2Cons;
    }
    if (filters.m2TerrenoMin) {
      const m2Terr = parseFloat(
        String(filters.m2TerrenoMin).replace(/,/g, ""),
      );
      if (!isNaN(m2Terr)) insertData.metros_terreno = m2Terr;
    }
    if (filters.niveles && filters.niveles !== "No indicado") {
      const niv = parseInt(filters.niveles);
      if (!isNaN(niv)) insertData.pisos = niv;
    }
    if (filters.antiguedad && filters.antiguedad !== "No indicado") {
      insertData.antiguedad = filters.antiguedad;
    }
    if (filters.comisionVentaMin) {
      const cvm = parseFloat(filters.comisionVentaMin);
      if (!isNaN(cvm) && cvm > 0) insertData.comision_venta_min = cvm;
    }
    if (filters.comisionRentaMin) {
      const crm = parseFloat(filters.comisionRentaMin);
      if (!isNaN(crm) && crm > 0) insertData.comision_renta_min = crm;
    }

    if (filters.polygons && filters.polygons.length > 0) {
      insertData.polygon_coords = filters.polygons;
    }

    // Bounds y place_name de la zona buscada (nuevo sistema Google Places).
    // IMPORTANTE: solo se guardan los bounds de chips de municipio/estado; los
    // de colonia se ignoran porque su viewport de Google es aprox y arrastra
    // colonias vecinas. Ver `computeReliableBounds`.
    //
    // `place_name` siempre se asigna (incluso para búsquedas solo de colonia)
    // porque es solo cosmético: la UI lo muestra al usuario como etiqueta de
    // la búsqueda guardada en el historial.
    if (filters.locationChips?.length > 0) {
      const reliableBounds = computeReliableBounds(
        filters.locationChips,
        filters.polygons,
      );
      if (reliableBounds) {
        insertData.bounds = reliableBounds;
      }
      insertData.place_name = filters.locationChips
        .map((c: any) => c.label)
        .join(", ");
    }

    if (filters.moneda) {
      const { data: monedaData, error: monedaError } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("simbolo", filters.moneda === "MXN" ? "$" : "USD")
        .eq("activa", true)
        .single();

      if (monedaData && !monedaError) {
        insertData.moneda = monedaData.codigo;
      } else {
        insertData.moneda = filters.moneda;
      }
    }

    // Garantizar área geográfica para el matching server-side (resuelve jerarquía).
    await ensureSearchBounds(insertData, filters);

    const { data: searchData, error: searchError } = await supabase
      .from("busquedas_guardadas")
      .insert([insertData])
      .select()
      .maybeSingle();

    if (searchError) {
      showToast("Error al guardar la búsqueda", "error");
      throw searchError;
    }

    return searchData;
  };

  /**
   * Actualiza una búsqueda guardada existente con los filtros actuales.
   * Reutiliza la misma lógica de normalización de saveSearchToDatabase pero hace UPDATE.
   */
  const updateSearchInDatabase = async (busquedaId: string, filters: any): Promise<boolean> => {
    if (!userId) throw new Error("No autenticado");

    // Construir objeto con la misma lógica que saveSearchToDatabase
    const criterios_busqueda: any = { operacion: filters.operacion };
    if (filters.moneda) criterios_busqueda.moneda = filters.moneda;
    if (filters.tipoPropiedad) criterios_busqueda.tipo_propiedad = filters.tipoPropiedad;
    if (filters.subtipo) criterios_busqueda.subtipo = filters.subtipo;
    if (filters.precioMin) criterios_busqueda.precio_min = parseFloat(filters.precioMin.toString().replace(/,/g, ""));
    if (filters.precioMax) criterios_busqueda.precio_max = parseFloat(filters.precioMax.toString().replace(/,/g, ""));
    if (filters.habitaciones && filters.habitaciones !== "No indicado") criterios_busqueda.habitaciones = filters.habitaciones;
    if (filters.banos && filters.banos !== "No indicado") criterios_busqueda.banos = filters.banos;
    if (filters.mediosBanos && filters.mediosBanos !== "No indicado") criterios_busqueda.medios_banos = filters.mediosBanos;
    if (filters.estacionamientos && filters.estacionamientos !== "No indicado") criterios_busqueda.estacionamientos = filters.estacionamientos;
    if (filters.niveles && filters.niveles !== "No indicado") criterios_busqueda.niveles = filters.niveles;
    if (filters.antiguedad && filters.antiguedad !== "No indicado") criterios_busqueda.antiguedad = filters.antiguedad;
    if (filters.m2TerrenoMin) criterios_busqueda.m2_terreno_min = parseFloat(String(filters.m2TerrenoMin).replace(/,/g, ""));
    if (filters.m2ConstruccionMin) criterios_busqueda.m2_construccion_min = parseFloat(String(filters.m2ConstruccionMin).replace(/,/g, ""));
    if (filters.anchoTerrenoMin) criterios_busqueda.ancho_terreno_min = parseFloat(String(filters.anchoTerrenoMin).replace(/,/g, ""));
    if (filters.largoTerrenoMin) criterios_busqueda.largo_terreno_min = parseFloat(String(filters.largoTerrenoMin).replace(/,/g, ""));
    if (filters.locationFilter?.estado) criterios_busqueda.estado = filters.locationFilter.estado;
    if (filters.locationFilter?.ciudad) criterios_busqueda.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter?.municipio) criterios_busqueda.municipio = filters.locationFilter.municipio;
    if (filters.locationFilter?.colonia) {
      criterios_busqueda.colonias = Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia
        : [filters.locationFilter.colonia];
    }
    if (filters.locationChips?.length > 0) {
      criterios_busqueda.location_chips = filters.locationChips.map((c: any) => ({
        label: c.label, type: c.type, bounds: c.bounds, locationFilter: c.locationFilter,
      }));
      // Solo guardamos bounds de municipio/estado; los de colonia se ignoran.
      const reliableBounds = computeReliableBounds(
        filters.locationChips,
        filters.polygons,
      );
      if (reliableBounds) {
        criterios_busqueda.bounds = reliableBounds;
      }
    }
    if (filters.comisionVentaMin) criterios_busqueda.comision_venta_min = parseFloat(filters.comisionVentaMin);
    if (filters.comisionRentaMin) criterios_busqueda.comision_renta_min = parseFloat(filters.comisionRentaMin);
    if (Array.isArray(filters.amenidades) && filters.amenidades.length > 0) criterios_busqueda.amenidades = filters.amenidades;
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) criterios_busqueda.comercial = serializeComercialFilters(filters.comercialFilters);
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) criterios_busqueda.industrial = serializeIndustrialFilters(filters.industrialFilters);
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) criterios_busqueda.agricola = serializeAgricolaFilters(filters.agricolaFilters);

    const updateData: any = {
      criterios_busqueda,
      updated_at: new Date().toISOString(),
    };
    if (filters.operacion && filters.operacion !== "") updateData.tipo_operacion = filters.operacion;
    if (filters.tipoPropiedad) updateData.tipo_propiedad = filters.tipoPropiedad;
    if (filters.subtipo) updateData.subtipo = filters.subtipo;
    if (filters.precioMin) { const v = parseFloat(filters.precioMin.toString().replace(/,/g, "")); if (!isNaN(v)) updateData.precio_min = v; }
    if (filters.precioMax) { const v = parseFloat(filters.precioMax.toString().replace(/,/g, "")); if (!isNaN(v)) updateData.precio_max = v; }
    if (filters.locationFilter.estado) updateData.estado = [filters.locationFilter.estado];
    if (filters.locationFilter.ciudad) updateData.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter.municipio) updateData.municipio = [filters.locationFilter.municipio];
    if (filters.locationFilter.colonia) {
      updateData.colonias = Array.isArray(filters.locationFilter.colonia) ? filters.locationFilter.colonia : [filters.locationFilter.colonia];
    }
    if (filters.locationChips?.length > 0 && !filters.locationFilter?.estado) {
      const estadosDeChips = [...new Set(filters.locationChips.map((c: any) => c.locationFilter?.estado).filter((e: string) => e && e.trim()))] as string[];
      if (estadosDeChips.length > 0) updateData.estado = estadosDeChips;
    }
    if (filters.habitaciones && filters.habitaciones !== "No indicado") { const v = parseInt(filters.habitaciones); if (!isNaN(v)) updateData.habitaciones = v; }
    if (filters.banos && filters.banos !== "No indicado") { const v = parseInt(filters.banos); if (!isNaN(v)) updateData.banos = v; }
    if (filters.estacionamientos && filters.estacionamientos !== "No indicado") { const v = parseInt(filters.estacionamientos); if (!isNaN(v)) updateData.estacionamientos = v; }
    if (filters.m2ConstruccionMin) { const v = parseFloat(String(filters.m2ConstruccionMin).replace(/,/g, "")); if (!isNaN(v)) updateData.metros_construccion = v; }
    if (filters.m2TerrenoMin) { const v = parseFloat(String(filters.m2TerrenoMin).replace(/,/g, "")); if (!isNaN(v)) updateData.metros_terreno = v; }
    if (filters.polygons?.length > 0) updateData.polygon_coords = filters.polygons;
    if (filters.locationChips?.length > 0) {
      const reliableBounds = computeReliableBounds(
        filters.locationChips,
        filters.polygons,
      );
      if (reliableBounds) {
        updateData.bounds = reliableBounds;
      }
      updateData.place_name = filters.locationChips
        .map((c: any) => c.label)
        .join(", ");
    }
    if (filters.moneda) {
      const { data: monedaData } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("simbolo", filters.moneda === "MXN" ? "$" : "USD")
        .eq("activa", true)
        .single();
      updateData.moneda = monedaData?.codigo || filters.moneda;
    }

    // Garantizar área geográfica también al actualizar.
    await ensureSearchBounds(updateData, filters);

    const { error } = await supabase
      .from("busquedas_guardadas")
      .update(updateData)
      .eq("id", busquedaId)
      .eq("usuario_id", userId);

    if (error) throw error;

    // Recalcular coincidencias de inmediato (sin esperar al cron, que corre cada
    // minuto), para que al volver a "Coincidencias" se vean ya las propiedades que
    // cumplen los nuevos criterios y desaparezcan las que dejaron de cumplir.
    // El RPC valida que la búsqueda pertenezca al usuario antes de recalcular.
    const { error: rpcError } = await supabase.rpc(
      "recalcular_matches_busqueda",
      { p_busqueda_id: busquedaId },
    );
    if (rpcError) {
      // No es crítico: el job encolado por el trigger lo recalculará igualmente.
      console.warn(
        "[useSaveSearch] recalcular_matches_busqueda falló (no crítico):",
        rpcError.message,
      );
    }

    return true;
  };

  const hasAnyCriteria = (filters: any): boolean => {
    if (!filters) return false;
    const trim = (v: any) => (typeof v === "string" ? v.trim() : v);
    const hasArray = (a: any) => Array.isArray(a) && a.length > 0;

    return Boolean(
      trim(filters.tipoPropiedad) ||
        hasArray(filters.subtipo) ||
        trim(filters.locationFilter?.estado) ||
        trim(filters.locationFilter?.ciudad) ||
        trim(filters.locationFilter?.municipio) ||
        (Array.isArray(filters.locationFilter?.colonia)
          ? filters.locationFilter.colonia.length > 0
          : trim(filters.locationFilter?.colonia)) ||
        hasArray(filters.locationChips) ||
        hasArray(filters.polygons) ||
        trim(filters.precioMin) ||
        trim(filters.precioMax) ||
        trim(filters.habitaciones) ||
        trim(filters.banos) ||
        trim(filters.mediosBanos) ||
        trim(filters.estacionamientos) ||
        trim(filters.niveles) ||
        trim(filters.antiguedad) ||
        trim(filters.m2TerrenoMin) ||
        trim(filters.m2ConstruccionMin) ||
        trim(filters.anchoTerrenoMin) ||
        trim(filters.largoTerrenoMin) ||
        parseFloat(filters.comisionVentaMin || "0") > 0 ||
        parseFloat(filters.comisionRentaMin || "0") > 0,
    );
  };

  const handleSaveSearch = async (
    filters: any,
    onClose: () => void,
    legal?: { aceptaAcuerdo: boolean; declaraProspecto: boolean },
  ): Promise<{ success: boolean; metadata?: any }> => {
    if (!userId) {
      showModal({
        title: "Error",
        message: "Debes iniciar sesión para guardar búsquedas",
        confirmText: "OK",
      });
      return { success: false };
    }

    if (!hasAnyCriteria(filters)) {
      showToast(
        "Agrega al menos un filtro o dibuja una zona en el mapa para guardar la búsqueda",
        "error",
      );
      return { success: false };
    }

    if (!validateLeadFields()) {
      return { success: false };
    }

    try {
      setIsSaving(true);
      let leadId = null;

      if (createLead) {
        // REV10-07: el prospecto lo carga el asesor, que es el responsable de esos datos (Acuerdo de Tratamiento de
        // Datos, doc 08). Se exige UNA vez la aceptacion del Acuerdo y UNA vez por prospecto la declaracion de que lo
        // informo; ambas quedan como evidencia. Si la BD aun no tiene el Acuerdo publicado, no se exige nada.
        const asesor = await legalService.estadoAsesor();
        const existente = await buscarProspectoExistente();
        const acuerdoPendiente = asesor.requerido && !asesor.aceptado;
        const declaracionPendiente =
          asesor.requerido && !(existente && (await legalService.declaracionRegistrada(existente, asesor.version)));

        const legalErrors: { [key: string]: string } = {};
        if (acuerdoPendiente && !legal?.aceptaAcuerdo) {
          legalErrors.legalAcuerdo = "Debes aceptar el Acuerdo de Tratamiento de Datos para guardar un prospecto";
        }
        if (declaracionPendiente && !legal?.declaraProspecto) {
          legalErrors.legalDeclaracion = "Debes confirmar que informaste a tu prospecto";
        }
        if (Object.keys(legalErrors).length > 0) {
          setErrors((prev: { [key: string]: string }) => ({ ...prev, ...legalErrors }));
          return { success: false };
        }

        leadId = existente ?? (await createLeadRecord());

        if (leadId && asesor.requerido) {
          const items: ConsentItem[] = [];
          if (acuerdoPendiente) items.push({ tipo: "acuerdo_datos_profesionales" });
          if (declaracionPendiente) {
            items.push({
              tipo: "asesor_informo_prospecto",
              lead_id: String(leadId),
              contexto: { texto_declaracion: TEXTO_DECLARACION_PROSPECTO, prospecto_reutilizado: !!existente },
            });
          }
          if (items.length > 0) {
            try {
              await legalService.registrarConsentimientos(items, "guardar_busqueda", { formulario: "busqueda_guardada" });
            } catch {
              showToast("No pudimos registrar tu declaración. Revisa tu conexión e inténtalo de nuevo.", "error");
              return { success: false };
            }
          }
        }
      }

      await saveSearchToDatabase(filters, leadId);

      // Construir metadata antes de limpiar el estado
      const metadata = buildSearchPostMetadata(filters);

      showToast("Búsqueda guardada correctamente", "success");

      // Limpiar formulario
      setCreateLead(false);
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      onClose();
      return { success: true, metadata };
    } catch (error: any) {
      showToast(error.message || "Error al procesar el guardado", "error");
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    createLead,
    setCreateLead,
    leadName,
    setLeadName,
    leadPhone,
    setLeadPhone,
    leadEmail,
    setLeadEmail,
    errors,
    isSaving,
    handleSaveSearch,
    updateSearchInDatabase,
    declaracionPrevia,
  };
};
