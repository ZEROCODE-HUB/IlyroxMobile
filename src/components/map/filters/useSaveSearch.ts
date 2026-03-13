import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../context/ToastContext";
import { useCreateContent } from "../../../hooks/hooks/useCreateContent";
import { useAuth } from "../../../context/AuthContext";

export const useSaveSearch = (userId?: string) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { createPost } = useCreateContent(user?.id);

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

  const createSearchPost = async (filters: any) => {
    if (!createLead) return true;

    const busquedaMetadata = {
      titulo: "SE BUSCA",
      icon: "search-outline",
      filtros: {
        operacion: filters.operacion,
        icon_operacion: "cash-outline",
        tipo_propiedad: filters.tipoPropiedad,
        icon_tipo: "business-outline",
        subtipo: filters.subtipo,
        moneda: filters.moneda,
        precio_min:
          filters.precioMin && filters.precioMin !== "0"
            ? parseFloat(filters.precioMin.replace(/,/g, ""))
            : 0,
        precio_max:
          filters.precioMax && filters.precioMax !== "Sin límite"
            ? parseFloat(filters.precioMax.replace(/,/g, ""))
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
            ? parseFloat(filters.m2TerrenoMin.replace(/,/g, ""))
            : 0,
          m2_construccion_min: filters.m2ConstruccionMin
            ? parseFloat(filters.m2ConstruccionMin.replace(/,/g, ""))
            : 0,
          icon: "resize-outline",
        },
      },
      prospecto: {
        nombre: leadName.trim(),
        telefono: leadPhone.trim(),
        ...(leadEmail.trim() && { email: leadEmail.trim() }),
      },
    };

    const postSuccess = await createPost(
      "🔍  BUSCO PROPIEDAD:",
      [],
      "busqueda",
      busquedaMetadata,
    );

    if (!postSuccess) {
      showToast("Error al crear el post de la búsqueda", "error");
      return false;
    }

    return true;
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
      // Si es un array (nuevo formato) o un string (viejo), aseguramos que se guarde como array
      criterios_busqueda.colonias = Array.isArray(filters.locationFilter.colonia) 
        ? filters.locationFilter.colonia 
        : [filters.locationFilter.colonia];
    }

    const insertData: any = {
      usuario_id: userId,
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
      insertData.estado = filters.locationFilter.estado;
    if (filters.locationFilter.ciudad)
      insertData.ciudad = filters.locationFilter.ciudad;
    if (filters.locationFilter.municipio)
      insertData.municipio = filters.locationFilter.municipio;
    if (filters.locationFilter.colonia) {
      insertData.colonias = Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia
        : [filters.locationFilter.colonia];
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

  const handleSaveSearch = async (filters: any, onClose: () => void) => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión para guardar búsquedas");
      return false;
    }

    if (!validateLeadFields()) {
      return false;
    }

    try {
      let leadId = null;

      if (createLead) {
        leadId = await createLeadRecord();
      }

      await saveSearchToDatabase(filters, leadId);

      if (createLead) {
        await createSearchPost(filters);
      }

      showToast("Búsqueda guardada correctamente", "success");

      // Limpiar formulario
      setCreateLead(false);
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      onClose();
      return true;
    } catch (error: any) {
      showToast(error.message || "Error al procesar el guardado", "error");
      return false;
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
  };
};
