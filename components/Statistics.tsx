import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActivePoint } from "./charts/types";
import { AppHeader } from "./AppHeader";
import { COLORS } from "../constants/colors";

// Import all chart components
import Chart01_PricePerM2 from "./charts/Chart01_PricePerM2";
import Chart02_MarketOpportunities from "./charts/Chart02_MarketOpportunities";
import Chart03_SearchVsProperties from "./charts/Chart03_SearchVsProperties";
import Chart04_DemandByZone from "./charts/Chart04_DemandByZone";
import Chart05_SearchByGender from "./charts/Chart05_SearchByGender";
import Chart06_PropertiesByZone from "./charts/Chart06_PropertiesByZone";
import Chart07_AvgPriceByNeighborhood from "./charts/Chart07_AvgPriceByNeighborhood";
import Chart08_SaleTimeNewVsUsed from "./charts/Chart08_SaleTimeNewVsUsed";
import Chart09_PublishedVsSold from "./charts/Chart09_PublishedVsSold";
import Chart10_SearchesByNeighborhood from "./charts/Chart10_SearchesByNeighborhood";
import Chart11_TopAmenities from "./charts/Chart11_TopAmenities";
import Chart12_SurfaceVsSaleTime from "./charts/Chart12_SurfaceVsSaleTime";
import Chart13_PriceByRooms from "./charts/Chart13_PriceByRooms";
import { SafeAreaView } from "react-native-safe-area-context";

const Statistics = () => {
  const navigation = useNavigation<any>();
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  const handlePress = (chart: string, index: number, value: any) => {
    setActivePoint({ chart, index, value });
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Dashboard I360"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart Components */}
        <Chart01_PricePerM2 onPress={handlePress} activePoint={activePoint} />
        <Chart02_MarketOpportunities
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart03_SearchVsProperties
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart04_DemandByZone onPress={handlePress} activePoint={activePoint} />
        <Chart05_SearchByGender
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart06_PropertiesByZone
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart07_AvgPriceByNeighborhood
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart08_SaleTimeNewVsUsed
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart09_PublishedVsSold
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart10_SearchesByNeighborhood
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart11_TopAmenities onPress={handlePress} activePoint={activePoint} />
        <Chart12_SurfaceVsSaleTime
          onPress={handlePress}
          activePoint={activePoint}
        />
        <Chart13_PriceByRooms onPress={handlePress} activePoint={activePoint} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
});

export default Statistics;
