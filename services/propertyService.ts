import { supabase } from "@/lib/supabase";
import { Property } from "@/types";

const normalizePropertyStatus = (
  value: unknown,
  activo?: boolean,
): Property["status"] => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw) {
    const normalized = raw.toLowerCase();
    if (normalized === "publicada") return "Publicada";
    if (normalized === "suspendida") return "Suspendida";
    if (normalized === "rentada") return "Rentada";
    if (normalized === "reservada") return "Reservada";
    if (normalized === "vendida") return "Vendida";
  }
  if (activo === false) return "Suspendida";
  return "Publicada";
};

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
          status,
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
        `,
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
      const status = normalizePropertyStatus(p.status, p.activo);

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

  async propertyDetails(propertyId: string) {
    const { data, error } = await supabase
      .from("propiedades")
      .select(
        `
              *,
              operaciones_propiedad (*),
              propiedad_amenidades (
                catalogo_amenidades (nombre)
              ),
              propiedad_financiamientos (
                catalogo_tipos_financiamiento (nombre)
              ),
              propiedad_gravamenes (
                monto,
                catalogo_instituciones_financieras (nombre)
              )
            `,
      )
      .eq("id", propertyId)
      .single();
    if (error) throw error;
    if (data) return data;
  },

  async createProperty(propertyData: any, relatedData: any) {
    // 1. Insert Property
    const { data: newProp, error: insertError } = await supabase
      .from("propiedades")
      .insert(propertyData)
      .select()
      .single();

    if (insertError) throw insertError;
    const propiedadId = newProp.id;

    // 2. Add Relations
    await this.addPropertyRelations(propiedadId, relatedData);

    // 3. Create Feed Item
    const { error: feedError } = await supabase.from("feed_items").insert({
      tipo_contenido: "propiedad",
      contenido_id: propiedadId,
      publicado_por: propertyData.created_by,
      visibilidad: "publico",
      estado_moderacion: "activo",
    });

    if (feedError) throw feedError;

    return newProp;
  },

  async updateProperty(
    propertyId: string,
    propertyData: any,
    relatedData: any,
  ) {
    // 1. Update Property
    const { error: updateError } = await supabase
      .from("propiedades")
      .update(propertyData)
      .eq("id", propertyId);

    if (updateError) throw updateError;

    // 2. Clean existing relations
    await supabase
      .from("operaciones_propiedad")
      .delete()
      .eq("propiedad_id", propertyId);
    await supabase
      .from("propiedad_amenidades")
      .delete()
      .eq("propiedad_id", propertyId);
    await supabase
      .from("propiedad_financiamientos")
      .delete()
      .eq("propiedad_id", propertyId);
    await supabase
      .from("propiedad_gravamenes")
      .delete()
      .eq("propiedad_id", propertyId);

    // 3. Add new Relations
    await this.addPropertyRelations(propertyId, relatedData);

    return true;
  },

  async addPropertyRelations(propiedadId: string, relatedData: any) {
    const { operaciones, amenidades, financiamientos, gravamenes } =
      relatedData;

    // Operaciones
    if (operaciones && operaciones.length > 0) {
      const opsWithId = operaciones.map((op: any) => ({
        ...op,
        propiedad_id: propiedadId,
      }));
      const { error } = await supabase
        .from("operaciones_propiedad")
        .insert(opsWithId);
      if (error) throw error;
    }

    // Amenidades - Need to fetch IDs first? assuming names are passed, we need IDs.
    // Wait, the previous code was doing:
    // const { data: catAmenidad } = await supabase.from("cat_amenidades").select("id").eq("nombre", amenidad).single();
    // It's better to optimize this. But for now let's reuse the logic or expect IDs?
    // The component was doing it one by one. I should probably move that logic here.

    // Actually, to make it efficient, let's process them here.
    if (amenidades && amenidades.length > 0) {
      for (const amenidad of amenidades) {
        // Assuming we need to look up ID by name if not provided.
        // Ideally the UI should provide IDs, but the UI uses names.
        // We'll look up IDs.
        const { data: catAmenidad } = await supabase
          .from("catalogo_amenidades")
          .select("id")
          .eq("nombre", amenidad)
          .single();

        if (catAmenidad) {
          await supabase.from("propiedad_amenidades").insert({
            propiedad_id: propiedadId,
            amenidad_id: catAmenidad.id,
          });
        }
      }
    }

    // Financiamientos
    if (financiamientos && financiamientos.length > 0) {
      for (const tipo of financiamientos) {
        const { data: catFin } = await supabase
          .from("catalogo_tipos_financiamiento")
          .select("id")
          .eq("nombre", tipo)
          .single();

        if (catFin) {
          await supabase.from("propiedad_financiamientos").insert({
            propiedad_id: propiedadId,
            tipo_financiamiento_id: catFin.id,
          });
        }
      }
    }

    // Gravamenes
    if (gravamenes && gravamenes.length > 0) {
      // Assuming gravamenes is array of objects { institucion: string, monto: number }
      for (const grav of gravamenes) {
        const { data: catInst } = await supabase
          .from("catalogo_instituciones_financieras")
          .select("id")
          .eq("nombre", grav.institucion)
          .single();

        if (catInst) {
          await supabase.from("propiedad_gravamenes").insert({
            propiedad_id: propiedadId,
            institucion_financiera_id: catInst.id,
            monto: grav.monto,
            fecha_gravamen: new Date(), // Default
          });
        }
      }
    }
  },
};
