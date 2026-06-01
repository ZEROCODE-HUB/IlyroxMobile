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

      // Invalidar caches de feed y mapa para que reflejen la propiedad
      // recién creada/actualizada inmediatamente.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["map-properties"] });
      // Invalidar también el detalle de la propiedad si es una edición
      if (propertyId) {
        queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      }

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
