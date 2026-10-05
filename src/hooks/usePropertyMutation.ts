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
        // UPDATE: NO invalidar ["feed"] completo. Eso marca la lista infinita
        // como stale y dispara un refetch en background: el servidor devuelve el
        // feed reordenado por engagement_score y los items se saltan de posición
        // mientras el usuario los está mirando. En su lugar el caller parchea SOLO
        // el item editado (patchFeedItem en useFeed) y se refresca el detalle.
        queryClient.invalidateQueries({ queryKey: ["feed", "item"] });
        queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
        // Propiedades del perfil/mapa del propietario: se refrescan sin tocar el feed.
        queryClient.invalidateQueries({ queryKey: ["mapFeedItems"] });
        queryClient.invalidateQueries({ queryKey: ["propertyFeedItems"] });
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
