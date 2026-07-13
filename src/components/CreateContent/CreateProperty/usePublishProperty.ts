// ============================================
// usePublishProperty - Hook para la publicación con progreso robusto
// Maneja: subida de imágenes, preparación de datos, guardado,
// timeout, cancelación y manejo de errores
// ============================================

import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { prependPublishedFeedItem } from "@/hooks/useFeed";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { uploadImage as uploadImageService } from "../../../services/uploadService";
import { usePropertyMutation } from "@/hooks/usePropertyMutation";
import { useAuth } from "../../../context/AuthContext";
import {
  PROPERTY_TYPES,
  getCamposVisibles,
} from "../../../constants/propertyData";
import { DEFAULT_COUNTRY } from "../../../lib/location/registry";

import type {
  ContractData,
  PublishState,
} from "./types";
import type { usePropertyForm } from "./usePropertyForm";
import { logger } from "@/utils/logger";
import { notifyMatchingUsers } from "@/hooks/useMatchNotifier";

const log = logger.scoped("usePublishProperty");

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

/** Callback que se llama al publicar una propiedad NUEVA con éxito,
 *  para que el caller pueda abrir el flujo de Open House. */
export interface OpenHousePrefill {
  propertyId: string;
  location: string;
  firstPhoto: string | null;
}

/** Info que se pasa al callback de éxito para que el caller maneje la UI */
export interface PublishSuccessInfo {
  newPropertyId: string | null;
  isUpdate: boolean;
  firstPhotoUrl: string | null;
  location: string;
}

export function usePublishProperty(
  form: ReturnType<typeof usePropertyForm>,
  propertyId?: string,
  onBack?: (shouldRefresh?: boolean) => void,
  onOpenHousePrompt?: (prefill: OpenHousePrefill) => void,
  onPublishSuccess?: (info: PublishSuccessInfo) => void,
) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { saveProperty } = usePropertyMutation();
  const { showModal } = useModal();
  const { showToast } = useToast();

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
    showToast("La publicación fue cancelada.", "info");
  }, [showToast]);

  const clearPublishError = useCallback(() => {
    setPublishState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const handlePublish = useCallback(
    async (contractDataParam?: ContractData | null) => {
      const resolvedContractData = contractDataParam ?? form.contractData;

      // ── Validar (de arriba hacia abajo) ───────────────────────────────────
      // validate() cubre todos los campos requeridos, incluida la ubicación
      // exacta en el mapa ({0,0} = sin marcar). Si falla, devolvemos un centinela
      // para que la pantalla haga scroll al primer campo en rojo.
      if (!form.validate()) {
        const errs = form.getValidationErrors();
        const errKeys = Object.keys(errs);
        const soloComision =
          errKeys.length > 0 &&
          errKeys.every((k) => k === "comision" || k === "comisionRenta");
        const comisionMsg = errs.comision || errs.comisionRenta;
        setTimeout(() => {
          showModal({
            title: soloComision ? "Comisión inválida" : "Faltan datos requeridos",
            message: soloComision
              ? comisionMsg
              : "Por favor revisa los campos marcados en rojo",
            confirmText: "Entendido",
          });
        }, 50);
        return "VALIDATION_FAILED";
      }

      if (!user) {
        showModal({ title: "Sesión requerida", message: "Debes iniciar sesión para continuar.", confirmText: "OK" });
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

      // ── Aviso de sin comisión ANTES de arrancar la subida ──────────────────
      // Si no hay comisión definida, mostramos la advertencia y esperamos
      // confirmación del usuario antes de iniciar cualquier carga.
      const tieneComision = checkComisionPresente(form);
      if (!tieneComision && form.status === "Publicada") {
        showModal({
          title: "Sin comisión definida",
          message:
            "Tu propiedad se guardará pero no aparecerá en el feed ni en el mapa hasta que definas tu comisión. ¿Deseas continuar de todas formas?",
          confirmText: "Publicar de todas formas",
          cancelText: "Agregar comisión",
          confirmVariant: "primary",
          onConfirm: () => void doUpload(resolvedContractData),
          onCancel: () => {},
        });
        return;
      }

      // Sin advertencia pendiente: arrancar directamente
      void doUpload(resolvedContractData);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, propertyId, user, onBack, router, saveProperty, updateProgress, showModal, showToast],
  );

  // ── Lógica de subida separada para poder llamarla desde el modal ──────────
  const doUpload = useCallback(
    async (resolvedContractData: ContractData | null | undefined) => {
      if (!user) return; // handlePublish ya lo valida; guarda defensiva

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
          showModal({
            title: "Tiempo agotado",
            message: "La publicación tardó demasiado. ¿Deseas intentar de nuevo?",
            confirmText: "Reintentar",
            cancelText: "No",
            confirmVariant: "primary",
            onConfirm: () => void handlePublish(resolvedContractData),
            onCancel: () => {},
          });
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
            log.warn(`Error subiendo imagen ${i + 1}:`, imgError.message);
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
          log.warn(
            `${failedImages} imágenes no se pudieron subir. Continuando con ${uploadedUrls.length} imágenes.`,
          );
        }

        if (cancelledRef.current) throw new Error("CANCELLED");

        // ============================================
        // PASO 2: Preparar datos (40% - 55%)
        // ============================================
        updateProgress(45, "Preparando datos...");

        const camposVisibles = getCamposVisibles(form.subtipo, form.tipoPrincipal);

        const tieneComision = checkComisionPresente(form);
        const sinComision = !tieneComision;
        // Nota: el aviso de sinComision ya se mostró ANTES de arrancar doUpload.

        const propertyData = {
          tipo: form.tipoPrincipal,
          subtipo:
            form.subtipo ||
            PROPERTY_TYPES[
              form.tipoPrincipal as keyof typeof PROPERTY_TYPES
            ]?.[0],
          descripcion: form.descripcion,
          pais: form.ubicacionData.pais || DEFAULT_COUNTRY,
          ciudad: form.ubicacionData.municipio,
          municipio: form.ubicacionData.municipio,
          estado: form.ubicacionData.estado,
          colonia: form.ubicacionData.colonia || null,
          calle: form.calle || null,
          numero_exterior: form.numeroExterior || null,
          numero_interior: form.numeroInterior || null,
          codigo_postal: form.codigoPostal || null,
          latitud: form.location.latitude,
          longitud: form.location.longitude,
          fotos: uploadedUrls,
          habitaciones: camposVisibles.recamaras
            ? parseInt(form.recamaras) || 0
            : 0,
          banos: camposVisibles.banos ? parseInt(form.banosCompletos) || 0 : 0,
          medios_banos: camposVisibles.mediosBanos ? parseInt(form.mediosBanos) || 0 : null,
          estacionamientos: camposVisibles.estacionamientos
            ? parseInt(form.estacionamientos) || 0
            : 0,
          metros_cuadrados_construccion: camposVisibles.m2Construccion
            ? parseFloat(form.m2Construccion?.replace(/,/g, "") || "") || null
            : null,
          metros_cuadrados_terreno: camposVisibles.m2Terreno
            ? parseFloat(form.m2Terreno?.replace(/,/g, "") || "") || null
            : null,
          ancho_terreno: parseFloat(form.anchoTerreno?.replace(/,/g, "") || "") || null,
          largo_terreno: parseFloat(form.largoTerreno?.replace(/,/g, "") || "") || null,
          costo_mantenimiento: parseFloat(form.costoMantenimiento?.replace(/,/g, "") || "") || null,
          pisos: camposVisibles.niveles ? parseInt(form.niveles) || 1 : null,
          amueblado: camposVisibles.amueblado ? form.amueblado : null,
          // pet_friendly solo aplica/se muestra en renta o ambas; en venta el
          // campo nunca se renderiza y form.petFriendly queda "" (violaría el
          // CHECK 'Sí'|'No'|'Parcial'). Enviamos "No" como valor seguro.
          pet_friendly:
            camposVisibles.petFriendly &&
            (form.tipoOperacion === "renta" || form.tipoOperacion === "ambas") &&
            form.petFriendly
              ? form.petFriendly
              : "No",
          antiguedad: camposVisibles.antiguedad ? form.antiguedad : null,
          status: sinComision ? "Suspendida" : form.status,
          activo: form.status === "Publicada" && tieneComision,
          sin_comision: sinComision,
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
          // Campos especializados por tipo
          ...(form.tipoPrincipal === 'agricola' ? {
            tipo_agua: form.tiposAgua.length ? form.tiposAgua : null,
            concesion_agua: form.concesionAgua || null,
            uso_terreno: form.usoTerreno.length ? form.usoTerreno : null,
            tipo_riego: form.tipoRiego.length ? form.tipoRiego : null,
            infra_electricidad: form.infraElectricidad || null,
            infra_camino_acceso: form.infraCaminoAcceso || null,
            infra_cercado: form.infraCercado || null,
            acceso_carretera: form.accesoCarretera || null,
            acceso_camiones: form.accesoCamiones || null,
          } : {}),
          ...(form.tipoPrincipal === 'comercial' ? {
            tipo_ubicacion_comercial: form.tipoUbicacionComercial || null,
            frente_metros: parseFloat(form.frenteMetros) || null,
            nivel_piso: parseInt(form.nivelPiso) || null,
            sobre_avenida_principal: form.sobreAvenidaPrincipal || null,
            en_esquina: form.enEsquina || null,
            alta_visibilidad: form.altaVisibilidad || null,
            alto_flujo_vehicular: form.altoFlujoVehicular || null,
          } : {}),
          ...(form.tipoPrincipal === 'industrial' ? {
            ubicacion_industrial: form.ubicacionIndustrial || null,
            altura_libre_m: form.alturaLibreM || null,
            tipo_energia_kva: form.tipoEnergiaKva.length ? form.tipoEnergiaKva : null,
            area_oficinas_m2: parseFloat(form.areaOficinas) || null,
            patio_maniobras_m2: parseFloat(form.patioManiobras) || null,
          } : {}),
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
            form.tieneGravamen === "Sí" && form.institucionGravamen.length > 0
              ? form.institucionGravamen.map((institucion) => {
                  const raw = (form.montosGravamen[institucion] || "").replace(
                    /,/g,
                    "",
                  );
                  const monto = raw ? parseFloat(raw) : null;
                  return {
                    institucion,
                    monto: monto != null && Number.isFinite(monto) ? monto : null,
                  };
                })
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

        const saveResult = await Promise.race([savePromise, saveTimeoutPromise]);

        updateProgress(100, "¡Completado!");

        // Notificar usuarios con búsquedas guardadas que coincidan (solo en publicación nueva)
        if (!propertyId && saveResult?.id) {
          notifyMatchingUsers(saveResult.id);
        }

        // Limpiar timeout global
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current);
          globalTimeoutRef.current = null;
        }

        // Éxito
        const newPropertyId = !propertyId ? (saveResult?.id ?? null) : null;

        // Prepend optimista: que la propiedad aparezca arriba del feed al instante
        // (ignora el score; el orden por score se reaplica al refrescar/reentrar).
        if (newPropertyId) {
          prependPublishedFeedItem(queryClient, newPropertyId, user?.id).catch(
            () => {},
          );
        }

        setTimeout(() => {
          setPublishState({
            uploading: false,
            uploadProgress: 0,
            uploadStage: "",
            error: null,
            canCancel: true,
          });

          if (onPublishSuccess) {
            // El caller (CreateProperty/index.tsx) muestra el bottom sheet
            const location = [
              form.calle,
              form.ubicacionData.municipio,
              form.ubicacionData.estado,
            ]
              .filter(Boolean)
              .join(" - ");

            // Presentar el bottom sheet en un tick POSTERIOR: cerrar el
            // ProgressModal y presentar otro <Modal> nativo en el mismo commit
            // provoca en iOS la race "present while a presentation is in
            // progress" (modal fantasma / pantalla negra al editar). Se espera a
            // que el ProgressModal termine de cerrarse.
            setTimeout(() => {
              onPublishSuccess({
                newPropertyId,
                isUpdate: !!propertyId,
                firstPhotoUrl: uploadedUrls[0] ?? null,
                location,
              });
            }, 350);
          } else {
            // Fallback: modal legacy (si se usa el hook sin el nuevo callback)
            showModal({
              title: propertyId ? "¡Propiedad actualizada!" : "¡Propiedad publicada!",
              message: propertyId
                ? "Propiedad actualizada correctamente"
                : "Propiedad publicada correctamente",
              confirmText: newPropertyId ? "Ver propiedad" : "Listo",
              confirmVariant: "primary",
              onConfirm: () => {
                if (newPropertyId) {
                  router.push({
                    pathname: "/(stack)/property/[id]",
                    params: { id: newPropertyId },
                  });
                } else if (!propertyId) {
                  router.replace({
                    pathname: "/(tabs)",
                    params: { refresh: String(Date.now()) },
                  });
                } else {
                  if (onBack) onBack(true);
                }
              },
            });
          }
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

        log.error("Error publishing property:", error);

        const errorMessage =
          error.message || "No se pudo publicar la propiedad";

        setPublishState({
          uploading: false,
          uploadProgress: 0,
          uploadStage: "",
          error: errorMessage,
          canCancel: true,
        });

        showModal({
          title: "Error al publicar",
          message: errorMessage,
          confirmText: "Reintentar",
          cancelText: "Cerrar",
          confirmVariant: "primary",
          onConfirm: () => void doUpload(resolvedContractData),
          onCancel: () => {},
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, propertyId, user, onBack, router, saveProperty, updateProgress, showModal, showToast, onOpenHousePrompt, onPublishSuccess],
  );

  return {
    publishState,
    handlePublish,
    cancelPublish,
    clearPublishError,
  };
}

// ============================================
// HELPER: Verificar si hay comisión definida (y > 0)
// ============================================
function checkComisionPresente(form: ReturnType<typeof usePropertyForm>): boolean {
  if (form.tipoOperacion === "venta" || form.tipoOperacion === "ambas") {
    const val = parseFloat(form.comisionValor) || 0;
    if (val === 0) return false;
  }
  if (form.tipoOperacion === "renta" || form.tipoOperacion === "ambas") {
    const rawVal =
      form.tipoOperacion === "ambas" ? form.comisionValorRenta : form.comisionValor;
    const val = parseFloat(rawVal) || 0;
    if (val === 0) return false;
  }
  return true;
}

// ============================================
// HELPER: Construir operaciones
// ============================================
function buildOperaciones(form: ReturnType<typeof usePropertyForm>) {
  const operaciones: any[] = [];

  if (form.tipoOperacion === "venta" || form.tipoOperacion === "ambas") {
    const pct = form.comisionValor ? parseFloat(form.comisionValor) : null;
    const compartidaPct =
      form.comparteComision === "Sí" && form.comisionCompartidaValor && pct
        ? Math.round((parseFloat(form.comisionCompartidaValor) / 100) * pct * 100) / 100
        : null;

    operaciones.push({
      tipo_operacion: "venta",
      precio: parseFloat(form.precioVenta.replace(/,/g, "")),
      moneda: form.moneda,
      comision_tipo: pct ? "porcentaje" : null,
      comision_porcentaje: pct,
      comision_monto_fijo: null,
      comparte_comision: form.comparteComision === "Sí",
      porcentaje_comision_compartida: compartidaPct,
      monto_comision_compartida: null,
      condiciones_comision_compartida:
        form.comparteComision === "Sí" && form.condicionesComision
          ? form.condicionesComision
          : null,
    });
  }

  if (form.tipoOperacion === "renta" || form.tipoOperacion === "ambas") {
    const isAmbas = form.tipoOperacion === "ambas";
    const mesesValor = isAmbas ? form.comisionValorRenta : form.comisionValor;
    const comparte = isAmbas ? form.comparteComisionRenta : form.comparteComision;
    const mesesCompartidos =
      comparte === "Sí"
        ? isAmbas
          ? form.comisionCompartidaValorRenta
          : form.comisionCompartidaValor
        : "";
    const condiciones = isAmbas ? form.condicionesComisionRenta : form.condicionesComision;

    const meses = mesesValor ? parseFloat(mesesValor) : null;
    const mesesComp =
      comparte === "Sí" && mesesCompartidos && meses
        ? Math.round((parseFloat(mesesCompartidos) / 100) * meses * 100) / 100
        : null;

    operaciones.push({
      tipo_operacion: "renta",
      precio: parseFloat(form.precioRenta.replace(/,/g, "")),
      moneda: form.moneda,
      comision_tipo: null,
      comision_porcentaje: null,
      comision_monto_fijo: null,
      comision_meses: meses,
      comparte_comision: comparte === "Sí",
      // reutilizamos porcentaje_comision_compartida para almacenar los meses compartidos
      porcentaje_comision_compartida: mesesComp,
      monto_comision_compartida: null,
      condiciones_comision_compartida:
        comparte === "Sí" && condiciones ? condiciones : null,
    });
  }

  return operaciones;
}
