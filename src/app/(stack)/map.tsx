import React from "react";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { useMapProperties } from "@/hooks/useMapProperties";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

export default function MapScreen() {
  const { saveSearch } = useApp();
  const { data: properties = [] } = useMapProperties();

  return (
    <ScreenWrapper withHeader={false}>
      <MapSearch
        properties={properties}
        onSaveSearch={(name, leadName, leadPhone) =>
          saveSearch(name, "", leadName, leadPhone)
        }
      />
    </ScreenWrapper>
  );
}
