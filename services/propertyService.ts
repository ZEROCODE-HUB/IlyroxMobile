import { supabase } from "../lib/supabase";
import { Property } from "../types";

export const propertyService = {
  async propertiesByUser(targetUserId: string): Promise<Property[]> {
    const { data: propsData, error: propsError } = await supabase
      .from("propiedades")
      .select(
        `
          id,
          tipo,
          subtipo,
          descripcion,
          ciudad,
          municipio,
          colonia,
          fotos,
          habitaciones,
          banos,
          metros_cuadrados_construccion,
          metros_cuadrados_terreno,
          activo,
          codigo_propiedad,
          created_at,
          operaciones_propiedad (
            tipo_operacion,
            precio,
            moneda,
            comision_tipo,
            comision_porcentaje,
            comision_monto_fijo,
            comparte_comision
          )
        `
      )
      .eq("created_by", targetUserId)
      .is("deleted_at", null);

    if (propsError) {
      console.error("Error fetching properties:", propsError);
      return [];
    }

    if (!propsData) return [];

    return propsData.map((p: any) => {
      const operation = p.operaciones_propiedad?.[0];
      let status: Property["status"] = "Publicada";
      if (!p.activo) status = "Suspendida";

      let commission: Property["commission"] | undefined;
      if (operation?.comision_porcentaje || operation?.comision_monto_fijo) {
        commission = {
          shared: operation?.comparte_comision || false,
          percentage: operation?.comision_porcentaje || undefined,
        };
      }

      return {
        id: p.id,
        code: p.codigo_propiedad || undefined,
        title: `${p.subtipo} en ${p.ciudad}`,
        description: p.descripcion,
        price: operation?.precio || 0,
        currency: operation?.moneda || "MXN",
        createdAt: p.created_at,
        location: {
          address: "",
          country: "México",
          state: "",
          city: p.ciudad || "",
          municipio: p.municipio,
          colony: p.colonia || "",
        },
        images: p.fotos || [],
        features: {
          beds: p.habitaciones || 0,
          baths: p.banos || 0,
          constructionSqft: p.metros_cuadrados_construccion || 0,
          landSqft: p.metros_cuadrados_terreno || 0,
        },
        amenities: [],
        type: p.tipo,
        subtype: p.subtipo,
        operation: operation?.tipo_operacion === "venta" ? "Sale" : "Rent",
        status: status,
        commission,
      };
    });
  },

  async getIdbyPropertyId(id: string) {
    const { data, error } = await supabase
      .from("propiedades")
      .select("created_by")
      .eq("id", id)
      .single();

    if (error) throw error;

    return data.created_by;
  },
};
