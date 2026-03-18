import { useState, useEffect } from "react";
import { Property } from "@/types";
import { useExchangeRate } from "./useExchangeRate";
import {
  usePropertyFiltersStore,
  PropertyFilters,
} from "@/store/propertyFiltersStore";

export type { PropertyFilters };

export interface GeofenceBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const usePropertyFilters = (
  properties: Property[],
  geofenceBounds?: GeofenceBounds | null,
) => {
  const { convertPrice } = useExchangeRate();

  const { filters, updateFilter, updateLocationFilter, clearFilters } =
    usePropertyFiltersStore();

  const [filteredProperties, setFilteredProperties] =
    useState<Property[]>(properties);

  useEffect(() => {
    const filtered = properties.filter((p, index) => {
      const anyP = p as any;

      // Validar status/estado de forma robusta
      const rawStatus = (p as any).status || (p as any).estado;
      if (rawStatus) {
        const s = String(rawStatus).toLowerCase().trim();
        // Excluir si es vendida o suspendida (o cualquier cosa que no sea publicada/disponible)
        if (s === "vendida" || s === "suspendida" || s === "baja") {
          return false;
        }
        // Opcional: Ser estricto y solo permitir "publicada" / "disponible"
        // Si el sistema usa otros estados intermedios que deban verse, ajustar aquí.
        // Por seguridad, si dice "vendida", adiós.
      }

      // Geocerca por coordenadas si está definida.
      // Si hay un filtro de ubicación explícito (ciudad/municipio/colonia), desactivamos la geocerca
      // porque los bounds de Google suelen ser muy restrictivos para zonas industriales periféricas.
      const hasNamedLocationFilter = !!(
        filters.locationFilter.municipio ||
        (Array.isArray(filters.locationFilter.colonia)
          ? filters.locationFilter.colonia.length > 0
          : filters.locationFilter.colonia)
      );

      // DEBUG Geofence
      // console.log(`[DEBUG_GEO] Property ${p.id} - hasNamedLocationFilter: ${hasNamedLocationFilter}, geofenceBounds: ${!!geofenceBounds}`);

      if (geofenceBounds && !hasNamedLocationFilter) {
        const lat = p.coordinates?.lat ?? anyP.latitud;
        const lng = p.coordinates?.lng ?? anyP.longitud;
        const valid =
          lat != null &&
          lng != null &&
          !isNaN(lat) &&
          !isNaN(lng) &&
          lat >= geofenceBounds.minLat &&
          lat <= geofenceBounds.maxLat &&
          lng >= geofenceBounds.minLng &&
          lng <= geofenceBounds.maxLng;
        if (!valid) {
          return false;
        }
      }

      // FILTRO DE OPERACIÓN - Solo aplicar si hay filtro
      if (filters.operacion) {
        // Una propiedad puede tener múltiples operaciones (venta Y renta)
        // Necesitamos buscar si ALGUNA de sus operaciones coincide con el filtro
        let hasMatchingOperation = false;

        // El array en la BD se llama operaciones_propiedad
        const operaciones = anyP.operaciones_propiedad || anyP.operaciones;

        // Primero revisar si tiene el array de operaciones
        if (operaciones && Array.isArray(operaciones)) {
          hasMatchingOperation = operaciones.some((op: any) => {
            const tipoOp = op?.tipo_operacion;
            if (!tipoOp) return false;

            // Normalizar: convertir a minúsculas y traducir de inglés a español
            const lower = String(tipoOp).toLowerCase();
            let normalized = lower;

            // Solo hacer replace si NO está ya en español
            if (lower === "sale") {
              normalized = "venta";
            } else if (lower === "rent") {
              normalized = "renta";
            }
            // Si ya es "venta" o "renta", no hacer nada

            return normalized === filters.operacion.toLowerCase();
          });
        } else {
          // Fallback: revisar campos individuales por compatibilidad
          const rawOperacion = anyP.operacion || anyP.operation;
          if (rawOperacion) {
            const pOperacion = String(rawOperacion)
              .toLowerCase()
              .replace("sale", "venta")
              .replace("rent", "renta");

            hasMatchingOperation =
              pOperacion === filters.operacion.toLowerCase();
          }
        }

        // Si no encontró ninguna operación que coincida, filtrar la propiedad
        if (!hasMatchingOperation) {
          return false;
        }
      }

      // Filtro de estado
      if (filters.locationFilter.estado) {
        const pEstado = (anyP.estado || p.location?.state || "")
          .toString()
          .trim()
          .toLowerCase();
        const fEstado = filters.locationFilter.estado
          .toString()
          .trim()
          .toLowerCase();
        if (pEstado !== fEstado) {
          return false;
        }
      }

      const pCiudad = (anyP.ciudad || p.location?.city || "")
        .toString()
        .trim()
        .toLowerCase();
      const pMunicipio = (anyP.municipio || p.location?.municipio || "")
        .toString()
        .trim()
        .toLowerCase();

      // Filtro de municipio (Flexible: busca en municipio O ciudad)
      if (filters.locationFilter.municipio) {
        const fMunicipio = filters.locationFilter.municipio
          .toString()
          .trim()
          .toLowerCase();

        const matchMunicipio = pMunicipio === fMunicipio;
        const matchCiudad = pCiudad === fMunicipio;

        if (!matchMunicipio && !matchCiudad) {
          return false;
        }
      }

      // Filtro de colonia
      if (
        filters.locationFilter.colonia &&
        filters.locationFilter.colonia.length > 0
      ) {
        const pColoniaRaw = anyP.colonia || p.location?.colony || "";
        const pColonia = pColoniaRaw.toString().trim().toLowerCase();

        if (Array.isArray(filters.locationFilter.colonia)) {
          const fColonias = filters.locationFilter.colonia.map((c) =>
            c.trim().toLowerCase(),
          );
          const isMatch = fColonias.some(
            (f) => pColonia.includes(f) || f.includes(pColonia),
          );
          if (!isMatch) return false;
        } else {
          const fColonia = filters.locationFilter.colonia
            .toString()
            .trim()
            .toLowerCase();
          const isMatch =
            pColonia.includes(fColonia) || fColonia.includes(pColonia);
          if (!isMatch) return false;
        }
      }

      if (
        filters.tipoPropiedad &&
        p.type?.toString().toLowerCase() !== filters.tipoPropiedad.toLowerCase()
      ) {
        return false;
      }

      if (filters.subtipo && filters.subtipo.length > 0) {
        const propSubtipo = anyP.subtipo?.toString().toLowerCase();
        if (!filters.subtipo.some((s) => s.toLowerCase() === propSubtipo)) {
          return false;
        }
      }

      // FILTRADO DE PRECIO CON CONVERSIÓN DE MONEDA
      // Si hay filtro de operación, usar el precio de esa operación específica
      // (una propiedad puede tener precio de venta Y precio de renta)
      let pPrice = p.price || 0;
      let pCurrency: "MXN" | "USD" = p.currency || "MXN";

      // El array en la BD se llama operaciones_propiedad
      const operaciones = anyP.operaciones_propiedad || anyP.operaciones;

      // Si hay operaciones múltiples y un filtro de operación, buscar el precio correcto
      if (filters.operacion && operaciones && Array.isArray(operaciones)) {
        const matchingOp = operaciones.find((op: any) => {
          const tipoOp = op?.tipo_operacion;
          if (!tipoOp) return false;

          // Normalizar: convertir a minúsculas y traducir de inglés a español
          const lower = String(tipoOp).toLowerCase();
          let normalized = lower;

          // Solo hacer replace si NO está ya en español
          if (lower === "sale") {
            normalized = "venta";
          } else if (lower === "rent") {
            normalized = "renta";
          }

          return normalized === filters.operacion.toLowerCase();
        });

        // Si encontramos la operación que coincide con el filtro, usar su precio
        if (matchingOp) {
          pPrice = matchingOp.precio || 0;
          pCurrency = matchingOp.moneda || "MXN";
        }
      }

      // Convertir el precio de la propiedad a la moneda del filtro
      let finalPrice = pPrice;
      if (pCurrency !== filters.moneda) {
        finalPrice = convertPrice(
          pPrice,
          pCurrency as "MXN" | "USD",
          filters.moneda,
        );
      }

      const minP = parseFloat(filters.precioMin.replace(/,/g, "")) || 0;
      const maxP = parseFloat(filters.precioMax.replace(/,/g, "")) || Infinity;

      const passesPrice = finalPrice >= minP && finalPrice <= maxP;

      if (!passesPrice) {
        return false;
      }

      if (filters.habitaciones && filters.habitaciones !== "No indicado") {
        const beds = p.features?.beds || 0;
        if (
          filters.habitaciones === "Más" ||
          filters.habitaciones.includes("Más")
        ) {
          if (beds < 5) return false;
        } else {
          const hMin = parseInt(filters.habitaciones);
          if (!isNaN(hMin) && beds < hMin) return false;
        }
      }

      if (filters.banos && filters.banos !== "No indicado") {
        const baths = p.features?.baths || 0;
        if (filters.banos === "Más" || filters.banos.includes("Más")) {
          if (baths < 5) return false;
        } else {
          const bMin = parseInt(filters.banos);
          if (!isNaN(bMin) && baths < bMin) return false;
        }
      }

      if (
        filters.estacionamientos &&
        filters.estacionamientos !== "No indicado"
      ) {
        const parking = p.features?.parking || 0;
        if (
          filters.estacionamientos === "Más" ||
          filters.estacionamientos.includes("Más")
        ) {
          if (parking < 5) return false;
        } else {
          const pMin = parseInt(filters.estacionamientos);
          if (!isNaN(pMin) && parking < pMin) return false;
        }
      }

      if (
        filters.antiguedad &&
        filters.antiguedad !== "No indicado" &&
        (p as any).antiguedad
      ) {
        if ((p as any).antiguedad !== filters.antiguedad) return false;
      }

      if (filters.m2TerrenoMin) {
        const land = p.features?.landSqft || 0;
        if (land < parseFloat(filters.m2TerrenoMin.replace(/,/g, "")))
          return false;
      }

      if (filters.m2ConstruccionMin) {
        const constr = p.features?.constructionSqft || 0;
        if (constr < parseFloat(filters.m2ConstruccionMin.replace(/,/g, "")))
          return false;
      }

      if (
        filters.niveles &&
        filters.niveles !== "No indicado" &&
        (p as any).niveles
      ) {
        if ((p as any).niveles !== filters.niveles) return false;
      }

      return true;
    });

    setFilteredProperties(filtered);
  }, [properties, filters, geofenceBounds]);

  const hasActiveFilters =
    filters.tipoPropiedad !== "" ||
    (filters.subtipo && filters.subtipo.length > 0) ||
    filters.precioMin !== "" ||
    filters.precioMax !== "" ||
    filters.habitaciones !== "" ||
    filters.banos !== "" ||
    filters.estacionamientos !== "" ||
    filters.antiguedad !== "" ||
    filters.niveles !== "" ||
    filters.m2TerrenoMin !== "" ||
    filters.m2ConstruccionMin !== "" ||
    filters.operacion !== "" ||
    !!(
      filters.locationFilter.estado ||
      filters.locationFilter.ciudad ||
      filters.locationFilter.municipio ||
      (Array.isArray(filters.locationFilter.colonia)
        ? filters.locationFilter.colonia.length > 0
        : filters.locationFilter.colonia)
    );

  return {
    filters,
    filteredProperties,
    updateFilter,
    updateLocationFilter,
    clearFilters,
    hasActiveFilters,
  };
};
