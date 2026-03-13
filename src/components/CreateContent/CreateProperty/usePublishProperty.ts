// ============================================
// usePublishProperty - Hook para la publicación con progreso robusto
// Maneja: subida de imágenes, preparación de datos, guardado,
// timeout, cancelación y manejo de errores
// ============================================

import { useState, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { uploadImage as uploadImageService } from "../../../services/uploadService";
import { usePropertyMutation } from "@/hooks/hooks/usePropertyMutation";
import { useAuth } from "../../../context/AuthContext";
import {
  PROPERTY_TYPES,
  esTerreno,
  getCamposVisibles,
} from "../../../constants/propertyData";

import type {
  ContractData,
  PublishState,
  INITIAL_PUBLISH_STATE,
} from "./types";
import type { usePropertyForm } from "./usePropertyForm";

// Timeout para la operación completa de publicación (2 minutos)
const PUBLISH_TIMEOUT_MS = 120_000;
// Timeout individual por imagen (30 segundos)
const IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Sube una imagen con timeout individual
 */
async function uploadImageWithTimeout(
  uri: string,
  folder: "propiedades",
  timeoutMs: number = IMAGE_UPLOAD_TIMEOUT_MS,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tiempo agotado subiendo imagen`));
    }, timeoutMs);

    uploadImageService(uri, folder)
      .then((url) => {
        clearTimeout(timer);
        resolve(url);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function usePublishProperty(
  form: ReturnType<typeof usePropertyForm>,
  propertyId?: string,
  onBack?: (shouldRefresh?: boolean) => void,
) {
  const { user } = useAuth();
  const router = useRouter();
  const { saveProperty } = usePropertyMutation();

  const [publishState, setPublishState] = useState<PublishState>({
    uploading: false,
    uploadProgress: 0,
    uploadStage: "",
    error: null,
    canCancel: true,
  });

  // Ref para controlar la cancelación
  const cancelledRef = useRef(false);
  // Ref para el timeout global
  const globalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateProgress = useCallback((progress: number, stage: string) => {
    setPublishState((prev) => ({
      ...prev,
      uploadProgress: Math.round(progress),
      uploadStage: stage,
    }));
  }, []);

  const cancelPublish = useCallback(() => {
    cancelledRef.current = true;
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current);
      globalTimeoutRef.current = null;
    }
    setPublishState({
      uploading: false,
      uploadProgress: 0,
      uploadStage: "",
      error: null,
      canCancel: true,
    });
    Alert.alert("Cancelado", "La publicación fue cancelada.");
  }, []);

  const clearPublishError = useCallback(() => {
    setPublishState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const handlePublish = useCallback(
    async (contractDataParam?: ContractData | null) => {
      const resolvedContractData = contractDataParam ?? form.contractData;

      // Validar
      if (!form.validate()) {
        // Obtener errores actualizados después de validate()
        // validate() ya setea los errores, usamos un timeout corto para leer el estado actualizado
        setTimeout(() => {
          Alert.alert(
            "Faltan datos requeridos",
            "Por favor revisa los campos marcados en rojo",
            [{ text: "OK" }],
          );
        }, 50);
        return;
      }

      if (!user) {
        Alert.alert("Error", "Debes iniciar sesión");
        return;
      }

      // Si es edición y el status cambió a Vendida/Rentada, mostrar modal
      if (
        propertyId &&
        (form.status === "Vendida" || form.status === "Rentada") &&
        form.originalStatus !== form.status &&
        !resolvedContractData
      ) {
        return "SHOW_CONTRACT_MODAL";
      }

      // Resetear cancelación
      cancelledRef.current = false;

      setPublishState({
        uploading: true,
        uploadProgress: 0,
        uploadStage: "Preparando...",
        error: null,
        canCancel: true,
      });

      // Timeout global
      globalTimeoutRef.current = setTimeout(() => {
        if (publishState.uploading) {
          cancelledRef.current = true;
          setPublishState((prev) => ({
            ...prev,
            uploading: false,
            error: "La operación tardó demasiado. Intenta de nuevo.",
          }));
          Alert.alert(
            "Tiempo agotado",
            "La publicación tardó demasiado. ¿Deseas intentar de nuevo?",
            [
              { text: "No", style: "cancel" },
              {
                text: "Reintentar",
                onPress: () => handlePublish(resolvedContractData),
              },
            ],
          );
        }
      }, PUBLISH_TIMEOUT_MS);

      try {
        // ============================================
        // PASO 1: Subir imágenes (0% - 40%)
        // ============================================
        updateProgress(5, "Subiendo imágenes...");
        const uploadedUrls: string[] = [];
        let failedImages = 0;

        for (let i = 0; i < form.images.length; i++) {
          if (cancelledRef.current) {
            throw new Error("CANCELLED");
          }

          // Si ya es URL remota, no subir de nuevo
          if (form.images[i].startsWith("http")) {
            uploadedUrls.push(form.images[i]);
            updateProgress(
              5 + ((i + 1) / form.images.length) * 35,
              `Imágenes: ${i + 1}/${form.images.length}`,
            );
            continue;
          }

          try {
            const url = await uploadImageWithTimeout(
              form.images[i],
              "propiedades",
            );
            if (url) {
              uploadedUrls.push(url);
            } else {
              failedImages++;
            }
          } catch (imgError: any) {
            console.warn(`Error subiendo imagen ${i + 1}:`, imgError.message);
            failedImages++;
            // Continuar con las demás imágenes en lugar de fallar todo
          }

          updateProgress(
            5 + ((i + 1) / form.images.length) * 35,
            `Imágenes: ${i + 1}/${form.images.length}${failedImages > 0 ? ` (${failedImages} fallidas)` : ""}`,
          );
        }

        if (uploadedUrls.length === 0) {
          throw new Error(
            "No se pudo subir ninguna imagen. Verifica tu conexión a internet.",
          );
        }

        if (failedImages > 0 && uploadedUrls.length > 0) {
          // Algunas imágenes fallaron pero hay al menos una exitosa
          console.warn(
            `${failedImages} imágenes no se pudieron subir. Continuando con ${uploadedUrls.length} imágenes.`,
          );
        }

        if (cancelledRef.current) throw new Error("CANCELLED");

        // ============================================
        // PASO 2: Preparar datos (40% - 55%)
        // ============================================
        updateProgress(45, "Preparando datos...");

        const camposVisibles = getCamposVisibles(form.subtipo);

        const propertyData = {
          tipo: form.tipoPrincipal,
          subtipo:
            form.subtipo ||
            PROPERTY_TYPES[
              form.tipoPrincipal as keyof typeof PROPERTY_TYPES
            ]?.[0],
          descripcion: form.descripcion,
          ciudad: form.ubicacionData.municipio,
          municipio: form.ubicacionData.municipio,
          estado: form.ubicacionData.estado,
          colonia: form.ubicacionData.colonia || null,
          calle: form.calle || null,
          numero_exterior: form.numeroExterior || null,
          numero_interior: form.numeroInterior || null,
          latitud: form.location.latitude,
          longitud: form.location.longitude,
          fotos: uploadedUrls,
          habitaciones: camposVisibles.recamaras
            ? parseInt(form.recamaras) || 0
            : 0,
          banos: camposVisibles.banos ? parseInt(form.banosCompletos) || 0 : 0,
          estacionamientos: camposVisibles.estacionamientos
            ? parseInt(form.estacionamientos) || 0
            : 0,
          metros_cuadrados_construccion: camposVisibles.m2Construccion
            ? parseFloat(form.m2Construccion) || null
            : null,
          metros_cuadrados_terreno: camposVisibles.m2Terreno
            ? parseFloat(form.m2Terreno) || null
            : null,
          pisos: camposVisibles.niveles ? parseInt(form.niveles) || 1 : null,
          amueblado: camposVisibles.amueblado ? form.amueblado : null,
          pet_friendly: camposVisibles.petFriendly ? form.petFriendly : "No",
          antiguedad: camposVisibles.antiguedad ? form.antiguedad : null,
          status: form.status,
          activo: form.status === "Publicada",
          created_by: user.id,
          nombre_propietario: form.nombreCompletoPropietario || null,
          email_propietario: form.emailPropietario || null,
          telefono_propietario: form.telefonoPropietario || null,
          ...(resolvedContractData
            ? {
                tipo_contrato: resolvedContractData.tipo_contrato,
                moneda_contrato: resolvedContractData.moneda,
                precio_contrato: resolvedContractData.precio,
              }
            : {}),
        };

        if (cancelledRef.current) throw new Error("CANCELLED");

        // ============================================
        // PASO 3: Preparar operaciones (55% - 65%)
        // ============================================
        updateProgress(55, "Preparando operaciones...");

        const operaciones = buildOperaciones(form);

        if (cancelledRef.current) throw new Error("CANCELLED");

        // ============================================
        // PASO 4: Preparar datos relacionados (65% - 75%)
        // ============================================
        updateProgress(65, "Preparando datos relacionados...");

        const relatedData = {
          operaciones,
          amenidades: form.amenidadesSeleccionadas,
          financiamientos:
            form.aceptaFinanciamiento === "Sí"
              ? form.tiposFinanciamientoSeleccionados
              : [],
          gravamenes:
            form.tieneGravamen === "Sí" && form.institucionGravamen
              ? [
                  {
                    institucion: form.institucionGravamen,
                    monto: form.montoGravamen
                      ? parseFloat(form.montoGravamen)
                      : null,
                  },
                ]
              : [],
        };

        if (cancelledRef.current) throw new Error("CANCELLED");

        // ============================================
        // PASO 5: Guardar en BD (75% - 95%)
        // ============================================
        updateProgress(75, "Guardando propiedad...");

        // Deshabilitar cancelación durante el guardado en BD
        setPublishState((prev) => ({ ...prev, canCancel: false }));

        // Timeout específico para el guardado en BD (60 segundos)
        const saveTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Tiempo agotado al guardar la propiedad. Los datos pueden haberse guardado parcialmente.",
                ),
              ),
            60_000,
          ),
        );

        const savePromise = saveProperty(propertyId, propertyData, relatedData);

        await Promise.race([savePromise, saveTimeoutPromise]);

        updateProgress(100, "¡Completado!");

        // Limpiar timeout global
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current);
          globalTimeoutRef.current = null;
        }

        // Éxito
        setTimeout(() => {
          setPublishState({
            uploading: false,
            uploadProgress: 0,
            uploadStage: "",
            error: null,
            canCancel: true,
          });

          Alert.alert(
            "¡Éxito!",
            propertyId
              ? "Propiedad actualizada correctamente"
              : "Propiedad publicada correctamente",
            [
              {
                text: "OK",
                onPress: () => {
                  if (!propertyId) {
                    router.replace({
                      pathname: "/(tabs)",
                      params: { refresh: String(Date.now()) },
                    });
                  } else {
                    if (onBack) onBack(true);
                  }
                },
              },
            ],
          );
        }, 500); // Pequeño delay para que el usuario vea el 100%
      } catch (error: any) {
        // Limpiar timeout global
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current);
          globalTimeoutRef.current = null;
        }

        if (error.message === "CANCELLED") {
          // Ya se manejó en cancelPublish
          return;
        }

        console.error("Error publishing property:", error);

        const errorMessage =
          error.message || "No se pudo publicar la propiedad";

        setPublishState({
          uploading: false,
          uploadProgress: 0,
          uploadStage: "",
          error: errorMessage,
          canCancel: true,
        });

        Alert.alert("Error al publicar", errorMessage, [
          { text: "OK" },
          {
            text: "Reintentar",
            onPress: () => handlePublish(resolvedContractData),
          },
        ]);
      }
    },
    [form, propertyId, user, onBack, router, saveProperty, updateProgress],
  );

  return {
    publishState,
    handlePublish,
    cancelPublish,
    clearPublishError,
  };
}

// ============================================
// HELPER: Construir operaciones
// ============================================
function buildOperaciones(form: ReturnType<typeof usePropertyForm>) {
  const operaciones: any[] = [];

  if (form.tipoOperacion === "venta" || form.tipoOperacion === "ambas") {
    operaciones.push({
      tipo_operacion: "venta",
      precio: parseFloat(form.precioVenta.replace(/,/g, "")),
      moneda: form.moneda,
      comparte_comision: form.comparteComision === "Sí",
      comision_tipo:
        form.comparteComision === "Sí"
          ? form.comisionTipo === "monto"
            ? "monto_fijo"
            : form.comisionTipo
          : null,
      comision_porcentaje:
        form.comparteComision === "Sí" && form.comisionTipo === "porcentaje"
          ? parseFloat(form.comisionValor.replace(/,/g, ""))
          : null,
      comision_monto_fijo:
        form.comparteComision === "Sí" && form.comisionTipo === "monto"
          ? parseFloat(form.comisionValor.replace(/,/g, ""))
          : null,
      porcentaje_comision_compartida:
        form.comparteComision === "Sí" &&
        form.comisionCompartidaTipo === "porcentaje"
          ? parseFloat(form.comisionCompartidaValor.replace(/,/g, ""))
          : null,
      monto_comision_compartida:
        form.comparteComision === "Sí" &&
        form.comisionCompartidaTipo === "monto"
          ? parseFloat(form.comisionCompartidaValor.replace(/,/g, ""))
          : null,
      condiciones_comision_compartida:
        form.comparteComision === "Sí" && form.condicionesComision
          ? form.condicionesComision
          : null,
    });
  }

  if (form.tipoOperacion === "renta" || form.tipoOperacion === "ambas") {
    const isAmbas = form.tipoOperacion === "ambas";
    const comparte = isAmbas
      ? form.comparteComisionRenta
      : form.comparteComision;
    const tipo = isAmbas ? form.comisionTipoRenta : form.comisionTipo;
    const valor = isAmbas ? form.comisionValorRenta : form.comisionValor;
    const compartidaTipo = isAmbas
      ? form.comisionCompartidaTipoRenta
      : form.comisionCompartidaTipo;
    const compartidaValor = isAmbas
      ? form.comisionCompartidaValorRenta
      : form.comisionCompartidaValor;
    const condiciones = isAmbas
      ? form.condicionesComisionRenta
      : form.condicionesComision;

    operaciones.push({
      tipo_operacion: "renta",
      precio: parseFloat(form.precioRenta.replace(/,/g, "")),
      moneda: form.moneda,
      comparte_comision: comparte === "Sí",
      comision_tipo:
        comparte === "Sí" ? (tipo === "monto" ? "monto_fijo" : tipo) : null,
      comision_porcentaje:
        comparte === "Sí" && tipo === "porcentaje"
          ? parseFloat(valor.replace(/,/g, ""))
          : null,
      comision_monto_fijo:
        comparte === "Sí" && tipo === "monto"
          ? parseFloat(valor.replace(/,/g, ""))
          : null,
      porcentaje_comision_compartida:
        comparte === "Sí" && compartidaTipo === "porcentaje"
          ? parseFloat(compartidaValor.replace(/,/g, ""))
          : null,
      monto_comision_compartida:
        comparte === "Sí" && compartidaTipo === "monto"
          ? parseFloat(compartidaValor.replace(/,/g, ""))
          : null,
      condiciones_comision_compartida:
        comparte === "Sí" && condiciones ? condiciones : null,
    });
  }

  return operaciones;
}
