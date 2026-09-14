import React from "react";
import { useLocalSearchParams } from "expo-router";
import PropertyDetail from "../../../components/Details/PropertyDetail";
import {
  usePropertyCacheStore,
  CachedPropertyData,
} from "@/store/propertyCacheStore";
import { normalizePropertyData } from "@/utils/normalizePropertyData";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const cache = usePropertyCacheStore((state) => state.cache);

  // Cache lookup síncrono durante el render (mismo patrón que los posts):
  // el feed precachea la propiedad con setProperty() ANTES de navegar, así
  // que al montar esta pantalla el dato ya está disponible al primer render →
  // sin parpadeo de shimmer ni render extra con el useEffect.
  // normalizePropertyData convierte la forma del feed (images/features/...)
  // a la forma cruda que PropertyDetail espera (fotos/habitaciones/...).
  const cached = id ? (cache.get(id as string)?.data ?? null) : null;
  const initialData = cached
    ? (normalizePropertyData(cached) as CachedPropertyData)
    : null;

  return (
    <PropertyDetail
      propertyId={id as string}
      initialData={initialData}
    />
  );
}