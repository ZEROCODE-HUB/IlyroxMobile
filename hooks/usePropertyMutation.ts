import { useState } from "react";
import { propertyService } from "../services/propertyService";

export const usePropertyMutation = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const saveProperty = async (
    propertyId: string | undefined,
    propertyData: any,
    relatedData: any
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      if (propertyId) {
        // UPDATE
        await propertyService.updateProperty(
          propertyId,
          propertyData,
          relatedData
        );
        return { success: true, id: propertyId, mode: "update" };
      } else {
        // CREATE
        const newProp = await propertyService.createProperty(
          propertyData,
          relatedData
        );
        return { success: true, id: newProp.id, mode: "create" };
      }
    } catch (err) {
      console.error("Error saving property:", err);
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
