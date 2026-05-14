import React from "react";
import { useLocalSearchParams } from "expo-router";
import PropertyDetail from "../../../components/Details/PropertyDetail";

export default function PropertyDetailScreen() {
  const { id, sinDatos } = useLocalSearchParams();

  return (
    <PropertyDetail
      propertyId={id as string}
      sinDatos={sinDatos === "true"}
    />
  );
}
