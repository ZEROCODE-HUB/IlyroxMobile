import React from "react";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

export default function MapScreen() {
  const { properties, saveSearch } = useApp();

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
