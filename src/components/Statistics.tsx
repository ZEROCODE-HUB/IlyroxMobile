import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActivePoint } from "./charts/types";
import { AppHeader } from "./AppHeader";
import { COLORS } from "../constants/colors";
import { useStatisticsData } from "./hooks/useStatisticsData";
import { Ionicons } from "@expo/vector-icons";
import { StatisticsFilterModal } from "./modals/StatisticsFilterModal";
import { PROPERTY_TYPES } from "../constants/propertyData";

// Import chart components
import Chart01_PricePerM2 from "./charts/Chart01_PricePerM2";
import Chart02_MarketOpportunities from "./charts/Chart02_MarketOpportunities";
import Chart03_SearchVsProperties from "./charts/Chart03_SearchVsProperties";
import Chart04_DemandByZone from "./charts/Chart04_DemandByZone";

// Other charts (unchanged)
import Chart05_SearchByGender from "./charts/Chart05_SearchByGender";
import Chart06_PropertiesByZone from "./charts/Chart06_PropertiesByZone";
import Chart07_AvgPriceByNeighborhood from "./charts/Chart07_AvgPriceByNeighborhood";
import Chart08_SaleTimeNewVsUsed from "./charts/Chart08_SaleTimeNewVsUsed";
import Chart09_PublishedVsSold from "./charts/Chart09_PublishedVsSold";
import Chart10_SearchesByNeighborhood from "./charts/Chart10_SearchesByNeighborhood";
import Chart11_TopAmenities from "./charts/Chart11_TopAmenities";
import Chart12_SurfaceVsSaleTime from "./charts/Chart12_SurfaceVsSaleTime";
import Chart13_PriceByRooms from "./charts/Chart13_PriceByRooms";
import { ScreenWrapper } from "../screens/ScreenWrapper";

const Statistics = () => {
  const navigation = useNavigation<any>();
  const isVisible = true;

  if (isVisible) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title="Dashboard I360"
          showBackButton={false}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 30,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary + "15",
              padding: 40,
              borderRadius: 100,
              marginBottom: 24,
            }}
          >
            <Ionicons name="stats-chart" size={80} color={COLORS.primary} />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: COLORS.primary,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Próximamente
          </Text>
        </View>
      </ScreenWrapper>
    );
  }


  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  // Filters State
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState({
    location: {
      estado: "",
      ciudad: "",
      municipio: "",
      colonia: "",
    },
    propertyType: {
      type: "Todos",
      subtype: "",
    },
    operationType: "Venta",
  });

  // Data Loading
  const { data, loading, error, refresh } = useStatisticsData();

  const handlePress = (chart: string, index: number, value: any) => {
    setActivePoint({ chart, index, value });
  };

  // Filter Data
  const { filteredProperties, filteredSearches } = useMemo(() => {
    let props = data.properties || [];
    let searches = data.searches || [];

    // --- 1. Filter Properties ---
    props = props.filter((p: any) => {
      // Operation Type
      const ops = Array.isArray(p.operaciones_propiedad)
        ? p.operaciones_propiedad
        : [p.operaciones_propiedad];
      const hasOp = ops.some(
        (o: any) =>
          o?.tipo_operacion?.toLowerCase() ===
          filters.operationType.toLowerCase(),
      );
      if (!hasOp) return false;

      // Property Type
      if (
        filters.propertyType.type !== "Todos" &&
        p.tipo?.toLowerCase() !== filters.propertyType.type.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.propertyType.subtype &&
        p.subtipo?.toLowerCase() !== filters.propertyType.subtype.toLowerCase()
      ) {
        return false;
      }

      // Location
      if (
        filters.location.estado &&
        p.estado?.trim().toLowerCase() !==
        filters.location.estado.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.ciudad &&
        p.ciudad?.trim().toLowerCase() !==
        filters.location.ciudad.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.municipio &&
        p.municipio?.trim().toLowerCase() !==
        filters.location.municipio.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.colonia &&
        p.colonia?.trim().toLowerCase() !==
        filters.location.colonia.trim().toLowerCase()
      )
        return false;

      return true;
    });

    // --- 2. Filter Searches ---
    searches = searches.filter((s: any) => {
      // Operation Type (Check top level columns)
      const op = s.tipo_operacion || s.operacion; // fallback just in case
      if (op && op.toLowerCase() !== filters.operationType.toLowerCase()) {
        return false;
      }

      // Property Type (Check top level columns)
      if (filters.propertyType.type !== "Todos") {
        const sType = s.tipo_propiedad || "";
        if (
          !sType.toLowerCase().includes(filters.propertyType.type.toLowerCase())
        ) {
          // Strict check might miss "Casa en Condominio" if type is "Casa"
          // Let's try inclusion or exact match based on data quality
          return false;
        }
      }
      if (filters.propertyType.subtype) {
        const sSubtype = s.subtipo || "";
        if (
          sSubtype.toLowerCase() !== filters.propertyType.subtype.toLowerCase()
        ) {
          return false;
        }
      }

      // Location (Check top level columns)
      if (
        filters.location.estado &&
        s.estado?.trim().toLowerCase() !==
        filters.location.estado.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.ciudad &&
        s.ciudad?.trim().toLowerCase() !==
        filters.location.ciudad.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.municipio &&
        s.municipio?.trim().toLowerCase() !==
        filters.location.municipio.trim().toLowerCase()
      )
        return false;
      if (
        filters.location.colonia &&
        s.colonia?.trim().toLowerCase() !==
        filters.location.colonia.trim().toLowerCase()
      )
        return false;

      return true;
    });

    return { filteredProperties: props, filteredSearches: searches };
  }, [data, filters]);

  // Transform filters for charts (Flat structure)
  const chartFilters = useMemo(() => {
    return {
      estado: filters.location.estado || "Todos",
      ciudad: filters.location.ciudad || "Todos",
      municipio: filters.location.municipio || "Todos",
      colonia: filters.location.colonia || "Todos",
      tipoPropiedad: filters.propertyType.type as any,
      subtipo: filters.propertyType.subtype || "Todos",
      tipoOperacion: filters.operationType,
    };
  }, [filters]);

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Dashboard I360"
        showBackButton
        onBack={() => navigation.goBack()}
      // rightComponent={
      //   <TouchableOpacity onPress={() => setShowFiltersModal(true)}>
      //     <Ionicons name="filter" size={24} color={COLORS.primary} />
      //   </TouchableOpacity>
      // }
      />

      {/* Active Filters Summary */}
      {/* <View style={styles.filtersSummary}>
        <Text style={styles.summaryText}>
          {filters.operationType} • {filters.propertyType.type}
          {filters.propertyType.subtype
            ? ` (${filters.propertyType.subtype})`
            : ""}
        </Text>
        <Text style={styles.locationSummary}>
          {[
            filters.location.estado,
            filters.location.ciudad,
            filters.location.municipio,
            filters.location.colonia,
          ]
            .filter(Boolean)
            .join(" > ") || "Todo México"}
        </Text>
      </View> */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 20 }}
          />
        ) : (
          <>
            <Chart01_PricePerM2
              onPress={handlePress}
              activePoint={activePoint}
              properties={filteredProperties}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type} // Pass main type for compatibility
            />
            <Chart02_MarketOpportunities
              onPress={handlePress}
              activePoint={activePoint}
              properties={filteredProperties}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type}
            />
            <Chart03_SearchVsProperties
              onPress={handlePress}
              activePoint={activePoint}
              properties={filteredProperties}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type}
            />
            <Chart04_DemandByZone
              onPress={handlePress}
              activePoint={activePoint}
              properties={filteredProperties}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type}
            />

            {/* Other Charts */}
            <Chart05_SearchByGender
              onPress={handlePress}
              activePoint={activePoint}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type}
            />
            <Chart06_PropertiesByZone
              onPress={handlePress}
              activePoint={activePoint}
              properties={filteredProperties}
              searches={filteredSearches}
              operationType={filters.operationType}
              propertyType={filters.propertyType.type}
            />
            <Chart07_AvgPriceByNeighborhood
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
            <Chart08_SaleTimeNewVsUsed
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
            <Chart09_PublishedVsSold
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
            <Chart10_SearchesByNeighborhood
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
            <Chart11_TopAmenities
              onPress={handlePress}
              activePoint={activePoint}
            />
            <Chart12_SurfaceVsSaleTime
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
            <Chart13_PriceByRooms
              onPress={handlePress}
              activePoint={activePoint}
              filters={chartFilters}
            />
          </>
        )}
      </ScrollView>

      <StatisticsFilterModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        currentFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setShowFiltersModal(false);
        }}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  filtersSummary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  locationSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default Statistics;
