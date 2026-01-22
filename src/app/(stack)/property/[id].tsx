import React from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import PropertyDetail from "../../../components/Details/PropertyDetail";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();

  return <PropertyDetail propertyId={id as string} navigation={navigation} />;
}
