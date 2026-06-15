import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { propertyService } from "../services/propertyService";
import { logger } from "@/utils/logger";

const log = logger.scoped("usePropertyMutation");

export const usePropertyMutation = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const queryClient = useQueryClient();

  const saveProperty = async (
    propertyId: string | undefined,
    propertyData: any,
    relatedData: any,
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      let result: { success: boolean; id: string; mode: string };

      if (propertyId) {
        // UPDATE
        await propertyService.updateProperty(
          propertyId,
          propertyData,
          relatedData,
        );
        result = { success: true, id: propertyId, mode: "update" };
      } else {
        // CREATE
        const newProp = await propertyService.createProperty(
          propertyData,
          relatedData,
        );
        result = { success: true, id: newProp.id, mode: "create" };
      }

      // El mapa siempre se refresca para reflejar la propiedad creada/actualizada.
      queryClient.invalidateQueries({ queryKey: ["map-properties"] });

      if (propertyId) {
        // UPDATE: refrescar el feed (para reflejar los cambios) y el detalle.
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      }
      // CREATE: NO invalidar el feed. El caller hace un prepend optimista para que
      // la propiedad aparezca arriba al instante; invalidar aquí dispararía un
      // refetch que la reordenaría por engagement_score y pisaría ese prepend.
      // El orden por score se reaplica en el siguiente refresh (igual que los posts).

      return result;
    } catch (err) {
      log.error("Error saving property:", err);
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveProperty,
    isSaving,
    error,
  };
};
