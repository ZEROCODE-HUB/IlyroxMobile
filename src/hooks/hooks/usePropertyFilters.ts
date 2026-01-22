import { useState, useEffect } from "react";
import { Property } from "../../types";

export interface PropertyFilters {
  tipoPropiedad: string;
  subtipo: string;
  precioMin: string;
  precioMax: string;
  moneda: "MXN" | "USD";
  operacion: "venta" | "renta" | ""; // Permitir vacío
  locationFilter: {
    estado: string;
    ciudad: string;
    municipio: string;
    colonia: string;
  };
  habitaciones: string;
  banos: string;
  estacionamientos: string;
  antiguedad: string;
  niveles: string;
  m2TerrenoMin: string;
  m2ConstruccionMin: string;
}

const EXCHANGE_RATE = 20;

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
  const [filters, setFilters] = useState<PropertyFilters>({
    tipoPropiedad: "",
    subtipo: "",
    precioMin: "",
    precioMax: "",
    moneda: "MXN",
    operacion: "", // ← VACÍO por defecto, no filtrar
    locationFilter: {
      estado: "",
      ciudad: "",
      municipio: "",
      colonia: "",
    },
    habitaciones: "",
    banos: "",
    estacionamientos: "",
    antiguedad: "",
    niveles: "",
    m2TerrenoMin: "",
    m2ConstruccionMin: "",
  });

  const [filteredProperties, setFilteredProperties] =
    useState<Property[]>(properties);

  useEffect(() => {
    const filtered = properties.filter((p, index) => {
      const anyP = p as any;

      // Log de cada propiedad
      if (index < 3) {
        console.log(`\nPropiedad ${index + 1}:`, {
          id: p.id,
          title: p.title,
          type: p.type,
          ciudad: anyP.ciudad,
          municipio: anyP.municipio,
          price: p.price,
          operacion: anyP.operacion,
          operation: anyP.operation,
          operaciones: anyP.operaciones,
        });
      }

      // Validar status/estado de forma robusta
      const rawStatus = (p as any).status || (p as any).estado;
      if (rawStatus) {
        const s = String(rawStatus).toLowerCase().trim();
        // Excluir si es vendida o suspendida (o cualquier cosa que no sea publicada/disponible)
        if (s === "Vendida" || s === "Suspendida" || s === "Baja") {
          if (index < 3)
            console.log(
              `  ❌ Rechazada por status no disponible: ${rawStatus}`,
            );
          return false;
        }
        // Opcional: Ser estricto y solo permitir "publicada" / "disponible"
        // Si el sistema usa otros estados intermedios que deban verse, ajustar aquí.
        // Por seguridad, si dice "vendida", adiós.
      }

      // Geocerca por coordenadas si está definida
      if (geofenceBounds) {
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
          if (index < 3)
            console.log(
              `  ❌ Fuera de geocerca: (${lat}, ${lng}) no dentro de`,
              geofenceBounds,
            );
          return false;
        }
      }

      // FILTRO DE OPERACIÓN - Solo aplicar si hay filtro
      if (filters.operacion) {
        const rawOperacion =
          anyP.operacion ||
          anyP.operation ||
          (anyP.operaciones && anyP.operaciones[0]?.tipo_operacion);
        const pOperacion =
          rawOperacion &&
          String(rawOperacion)
            .toLowerCase()
            .replace("sale", "venta")
            .replace("rent", "renta");

        if (
          pOperacion &&
          pOperacion.toLowerCase() !== filters.operacion.toLowerCase()
        ) {
          if (index < 3)
            console.log(
              `  ❌ Rechazada por operación: ${pOperacion} !== ${filters.operacion}`,
            );
          return false;
        } else if (!pOperacion) {
          if (index < 3)
            console.log(`  ℹ️ Propiedad sin campo operación definido`);
          // No rechazar, permitir pasar
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
          if (index < 3)
            console.log(
              `  ❌ Rechazada por estado: ${pEstado} !== ${filters.locationFilter.estado}`,
            );
          return false;
        }
      }

      // Filtro de ciudad
      if (filters.locationFilter.ciudad) {
        const pCiudad = (anyP.ciudad || p.location?.city || "")
          .toString()
          .trim()
          .toLowerCase();
        const fCiudad = filters.locationFilter.ciudad
          .toString()
          .trim()
          .toLowerCase();
        if (pCiudad !== fCiudad) {
          if (index < 3)
            console.log(
              `  ❌ Rechazada por ciudad: ${pCiudad} !== ${filters.locationFilter.ciudad}`,
            );
          return false;
        }
      }

      // Filtro de municipio
      const pMunicipio = (anyP.municipio || p.location?.municipio || "")
        .toString()
        .trim()
        .toLowerCase();
      if (
        filters.locationFilter.municipio &&
        pMunicipio !==
          filters.locationFilter.municipio.toString().trim().toLowerCase()
      ) {
        if (index < 3)
          console.log(
            `  ❌ Rechazada por municipio: ${pMunicipio} !== ${filters.locationFilter.municipio}`,
          );
        return false;
      }

      // Filtro de colonia
      if (filters.locationFilter.colonia) {
        const pColonia = (anyP.colonia || p.location?.colony || "")
          .toString()
          .trim()
          .toLowerCase();
        const fColonia = filters.locationFilter.colonia
          .toString()
          .trim()
          .toLowerCase();
        if (pColonia !== fColonia) {
          if (index < 3)
            console.log(
              `  ❌ Rechazada por colonia: ${pColonia} !== ${filters.locationFilter.colonia}`,
            );
          return false;
        }
      }

      if (filters.tipoPropiedad && p.type !== filters.tipoPropiedad) {
        if (index < 3)
          console.log(
            `  ❌ Rechazada por tipo: ${p.type} !== ${filters.tipoPropiedad}`,
          );
        return false;
      }

      if (filters.subtipo && anyP.subtipo !== filters.subtipo) {
        if (index < 3)
          console.log(
            `  ❌ Rechazada por subtipo: ${anyP.subtipo} !== ${filters.subtipo}`,
          );
        return false;
      }

      const pPrice = p.price || 0;
      const pCurrency =
        anyP.currency ||
        (anyP.operaciones && anyP.operaciones[0]?.moneda) ||
        "MXN";

      let finalPrice = pPrice;

      if (filters.moneda === "USD" && pCurrency === "MXN") {
        finalPrice = pPrice / EXCHANGE_RATE;
      } else if (filters.moneda === "MXN" && pCurrency === "USD") {
        finalPrice = pPrice * EXCHANGE_RATE;
      }

      const minP = parseFloat(filters.precioMin) || 0;
      const maxP = parseFloat(filters.precioMax) || Infinity;

      if (finalPrice < minP || finalPrice > maxP) {
        if (index < 3)
          console.log(
            `  ❌ Rechazada por precio: ${finalPrice} no está entre ${minP} y ${maxP}`,
          );
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
        if (land < parseFloat(filters.m2TerrenoMin)) return false;
      }

      if (filters.m2ConstruccionMin) {
        const constr = p.features?.constructionSqft || 0;
        if (constr < parseFloat(filters.m2ConstruccionMin)) return false;
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

  const updateFilter = <K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateLocationFilter = (
    location: PropertyFilters["locationFilter"],
  ) => {
    setFilters((prev) => ({ ...prev, locationFilter: location }));
  };

  const clearFilters = () => {
    setFilters({
      tipoPropiedad: "",
      subtipo: "",
      precioMin: "",
      precioMax: "",
      moneda: "MXN",
      operacion: "",
      locationFilter: {
        estado: "",
        ciudad: "",
        municipio: "",
        colonia: "",
      },
      habitaciones: "",
      banos: "",
      estacionamientos: "",
      antiguedad: "",
      niveles: "",
      m2TerrenoMin: "",
      m2ConstruccionMin: "",
    });
  };

  const hasActiveFilters =
    filters.tipoPropiedad !== "" ||
    filters.subtipo !== "" ||
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
      filters.locationFilter.colonia
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
