import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../context/ToastContext";
import { useModal } from "../../../context/ModalContext";
import { DEFAULT_COUNTRY } from "../../../lib/location/registry";
import { geocodeAddress } from "../../../lib/geocodingService";

/**
 * Garantiza que `data.bounds` exista para el matching geográfico server-side.
 * Si no hay bounds (p. ej. búsqueda por filtros de texto, sin chip de zona),
 * geocodifica la ubicación más específica (colonia > municipio > estado) para
 * obtener su área. Así una búsqueda por colonia trae propiedades del municipio
 * que la contiene y viceversa, sin depender de comparar nombres.
 */
async function ensureSearchBounds(data: any, filters: any): Promise<void> {
  if (data.bounds) return;
  const lf = filters?.locationFilter || {};
  const coloniaTxt = Array.isArray(lf.colonia) ? lf.colonia[0] : lf.colonia;
  const partes = [coloniaTxt, lf.municipio, lf.estado].filter(Boolean);
  if (partes.length === 0) return;
  try {
    const geo = await geocodeAddress(partes.join(", "), filters?.pais);
    if (geo?.bounds) data.bounds = geo.bounds;
  } catch {
    // Si la geocodificación falla, el matching cae al texto normalizado.
  }
}

export const useSaveSearch = (userId?: string) => {
  const { showToast } = useToast();
  const { showModal } = useModal();

  const [createLead, setCreateLead] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    // Zonas de interés: tomamos los chips de ubicación nombrada (excluye polígonos a propósito)
    const zonas_interes = Array.isArray(filters.locationChips)
      ? filters.locationChips.map((c: any) => ({
          id: c.id,
          label: c.label,
          type: c.type,
          locationFilter: c.locationFilter,
        }))
      : [];

    // Filtros especializados según tipo de propiedad (NO comisión, NO polígonos)
    let comercial: any = undefined;
    let industrial: any = undefined;
    let agricola: any = undefined;
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
      comercial = filters.comercialFilters;
    }
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
      industrial = filters.industrialFilters;
    }
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
      agricola = filters.agricolaFilters;
    }

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
        precio_min:
          filters.precioMin && filters.precioMin !== "0"
            ? parseFloat(filters.precioMin.toString().replace(/,/g, ""))
            : 0,
        precio_max:
          filters.precioMax && filters.precioMax !== "Sin límite"
            ? parseFloat(filters.precioMax.toString().replace(/,/g, ""))
            : null,
        ubicacion: {
          estado: filters.locationFilter.estado,
          ciudad: filters.locationFilter.ciudad,
          municipio: filters.locationFilter.municipio,
          colonia: Array.isArray(filters.locationFilter.colonia)
            ? filters.locationFilter.colonia.join(", ")
            : filters.locationFilter.colonia,
          icon: "location-outline",
        },
        zonas_interes,
        caracteristicas: {
          habitaciones: filters.habitaciones,
          icon_bed: "bed-outline",
          banos: filters.banos,
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
            ? parseFloat(filters.m2TerrenoMin.toString().replace(/,/g, ""))
            : 0,
          m2_construccion_min: filters.m2ConstruccionMin
            ? parseFloat(filters.m2ConstruccionMin.toString().replace(/,/g, ""))
            : 0,
          icon: "resize-outline",
        },
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
        filters.precioMin.toString().replace(/,/g, ""),
      );
    if (filters.precioMax)
      criterios_busqueda.precio_max = parseFloat(
        filters.precioMax.toString().replace(/,/g, ""),
      );
    if (filters.habitaciones && filters.habitaciones !== "No indicado")
      criterios_busqueda.habitaciones = filters.habitaciones;
    if (filters.banos && filters.banos !== "No indicado")
      criterios_busqueda.banos = filters.banos;
    if (filters.estacionamientos && filters.estacionamientos !== "No indicado")
      criterios_busqueda.estacionamientos = filters.estacionamientos;
    if (filters.niveles && filters.niveles !== "No indicado")
      criterios_busqueda.niveles = filters.niveles;
    if (filters.antiguedad && filters.antiguedad !== "No indicado")
      criterios_busqueda.antiguedad = filters.antiguedad;
    if (filters.m2TerrenoMin)
      criterios_busqueda.m2_terreno_min = parseFloat(
        filters.m2TerrenoMin.toString().replace(/,/g, ""),
      );
    if (filters.m2ConstruccionMin)
      criterios_busqueda.m2_construccion_min = parseFloat(
        filters.m2ConstruccionMin.toString().replace(/,/g, ""),
      );
    if (filters.locationFilter.estado)
      criterios_busqueda.estado = filters.locationFilter.estado;
    if (filters.locationFilter.ciudad)
      criterios_busqueda.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter.municipio)
      criterios_busqueda.municipio = filters.locationFilter.municipio;
    if (filters.locationFilter.colonia) {
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

      // Guardar bounds del primer chip (o unión de todos) en el campo de nivel superior
      const chipsConBounds = filters.locationChips.filter((c: any) => c.bounds);
      if (chipsConBounds.length > 0) {
        let north = chipsConBounds[0].bounds.north;
        let south = chipsConBounds[0].bounds.south;
        let east = chipsConBounds[0].bounds.east;
        let west = chipsConBounds[0].bounds.west;
        for (const chip of chipsConBounds) {
          north = Math.max(north, chip.bounds.north);
          south = Math.min(south, chip.bounds.south);
          east = Math.max(east, chip.bounds.east);
          west = Math.min(west, chip.bounds.west);
        }
        criterios_busqueda.bounds = { north, south, east, west };
      }
    }

    // Comisiones
    if (filters.comisionVentaMin) {
      criterios_busqueda.comision_venta_min = parseFloat(filters.comisionVentaMin);
    }
    if (filters.comisionRentaMin) {
      criterios_busqueda.comision_renta_min = parseFloat(filters.comisionRentaMin);
    }

    // Filtros especializados por tipo
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
      criterios_busqueda.comercial = filters.comercialFilters;
    }
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
      criterios_busqueda.industrial = filters.industrialFilters;
    }
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
      criterios_busqueda.agricola = filters.agricolaFilters;
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

    if (filters.locationFilter.estado)
      insertData.estado = [filters.locationFilter.estado];
    if (filters.locationFilter.ciudad)
      insertData.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter.municipio)
      insertData.municipio = [filters.locationFilter.municipio];
    if (filters.locationFilter.colonia) {
      insertData.colonias = Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia
        : [filters.locationFilter.colonia];
    }

    // Si se usaron chips sin locationFilter base, extraer estados de los chips
    // para que el trigger de match pueda filtrar por ubicación correctamente
    if (filters.locationChips?.length > 0 && !filters.locationFilter?.estado) {
      const estadosDeChips = [
        ...new Set(
          filters.locationChips
            .map((c: any) => c.locationFilter?.estado)
            .filter((e: string) => e && e.trim())
        ),
      ] as string[];
      if (estadosDeChips.length > 0) {
        insertData.estado = estadosDeChips;
      }
    }

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
        filters.m2ConstruccionMin.toString().replace(/,/g, ""),
      );
      if (!isNaN(m2Cons)) insertData.metros_construccion = m2Cons;
    }
    if (filters.m2TerrenoMin) {
      const m2Terr = parseFloat(
        filters.m2TerrenoMin.toString().replace(/,/g, ""),
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

    // Bounds y place_name de la zona buscada (nuevo sistema Google Places)
    if (filters.locationChips?.length > 0) {
      const chipsConBounds = filters.locationChips.filter((c: any) => c.bounds);
      if (chipsConBounds.length > 0) {
        let north = chipsConBounds[0].bounds.north;
        let south = chipsConBounds[0].bounds.south;
        let east = chipsConBounds[0].bounds.east;
        let west = chipsConBounds[0].bounds.west;
        for (const chip of chipsConBounds) {
          north = Math.max(north, chip.bounds.north);
          south = Math.min(south, chip.bounds.south);
          east = Math.max(east, chip.bounds.east);
          west = Math.min(west, chip.bounds.west);
        }
        insertData.bounds = { north, south, east, west };
        insertData.place_name = chipsConBounds.map((c: any) => c.label).join(", ");
      }
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
    if (filters.estacionamientos && filters.estacionamientos !== "No indicado") criterios_busqueda.estacionamientos = filters.estacionamientos;
    if (filters.niveles && filters.niveles !== "No indicado") criterios_busqueda.niveles = filters.niveles;
    if (filters.antiguedad && filters.antiguedad !== "No indicado") criterios_busqueda.antiguedad = filters.antiguedad;
    if (filters.m2TerrenoMin) criterios_busqueda.m2_terreno_min = parseFloat(filters.m2TerrenoMin.toString().replace(/,/g, ""));
    if (filters.m2ConstruccionMin) criterios_busqueda.m2_construccion_min = parseFloat(filters.m2ConstruccionMin.toString().replace(/,/g, ""));
    if (filters.locationFilter.estado) criterios_busqueda.estado = filters.locationFilter.estado;
    if (filters.locationFilter.ciudad) criterios_busqueda.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter.municipio) criterios_busqueda.municipio = filters.locationFilter.municipio;
    if (filters.locationFilter.colonia) {
      criterios_busqueda.colonias = Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia
        : [filters.locationFilter.colonia];
    }
    if (filters.locationChips?.length > 0) {
      criterios_busqueda.location_chips = filters.locationChips.map((c: any) => ({
        label: c.label, type: c.type, bounds: c.bounds, locationFilter: c.locationFilter,
      }));
      const chipsConBounds = filters.locationChips.filter((c: any) => c.bounds);
      if (chipsConBounds.length > 0) {
        let north = chipsConBounds[0].bounds.north, south = chipsConBounds[0].bounds.south;
        let east = chipsConBounds[0].bounds.east, west = chipsConBounds[0].bounds.west;
        for (const chip of chipsConBounds) {
          north = Math.max(north, chip.bounds.north); south = Math.min(south, chip.bounds.south);
          east = Math.max(east, chip.bounds.east); west = Math.min(west, chip.bounds.west);
        }
        criterios_busqueda.bounds = { north, south, east, west };
      }
    }
    if (filters.comisionVentaMin) criterios_busqueda.comision_venta_min = parseFloat(filters.comisionVentaMin);
    if (filters.comisionRentaMin) criterios_busqueda.comision_renta_min = parseFloat(filters.comisionRentaMin);
    if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) criterios_busqueda.comercial = filters.comercialFilters;
    if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) criterios_busqueda.industrial = filters.industrialFilters;
    if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) criterios_busqueda.agricola = filters.agricolaFilters;

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
    if (filters.m2ConstruccionMin) { const v = parseFloat(filters.m2ConstruccionMin.toString().replace(/,/g, "")); if (!isNaN(v)) updateData.metros_construccion = v; }
    if (filters.m2TerrenoMin) { const v = parseFloat(filters.m2TerrenoMin.toString().replace(/,/g, "")); if (!isNaN(v)) updateData.metros_terreno = v; }
    if (filters.polygons?.length > 0) updateData.polygon_coords = filters.polygons;
    if (filters.locationChips?.length > 0) {
      const chipsConBounds = filters.locationChips.filter((c: any) => c.bounds);
      if (chipsConBounds.length > 0) {
        let north = chipsConBounds[0].bounds.north, south = chipsConBounds[0].bounds.south;
        let east = chipsConBounds[0].bounds.east, west = chipsConBounds[0].bounds.west;
        for (const chip of chipsConBounds) {
          north = Math.max(north, chip.bounds.north); south = Math.min(south, chip.bounds.south);
          east = Math.max(east, chip.bounds.east); west = Math.min(west, chip.bounds.west);
        }
        updateData.bounds = { north, south, east, west };
        updateData.place_name = chipsConBounds.map((c: any) => c.label).join(", ");
      }
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
        trim(filters.estacionamientos) ||
        trim(filters.niveles) ||
        trim(filters.antiguedad) ||
        trim(filters.m2TerrenoMin) ||
        trim(filters.m2ConstruccionMin) ||
        parseFloat(filters.comisionVentaMin || "0") > 0 ||
        parseFloat(filters.comisionRentaMin || "0") > 0,
    );
  };

  const handleSaveSearch = async (filters: any, onClose: () => void): Promise<{ success: boolean; metadata?: any }> => {
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
      let leadId = null;

      if (createLead) {
        leadId = await createLeadRecord();
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
    handleSaveSearch,
    updateSearchInDatabase,
  };
};
