// Shared types for chart components

export interface ActivePoint {
    chart: string;
    index: number;
    value: any;
}

export interface ChartTooltipProps {
    chart: string;
    activePoint: ActivePoint | null;
    onClose: () => void;
}

export interface BaseChartProps {
    onPress?: (chart: string, index: number, value: any) => void;
    activePoint?: ActivePoint | null;
}

// Data types for each chart
export interface PricePerM2Data {
    month: string;
    total: number;
    terrain: number;
    construction: number;
}

export interface MarketOpportunityData {
    range: string;
    avgPrice: number;
    searches: number;
    minConstruction?: number;
    minLand?: number;
}

export interface SearchVsPropertyData {
    range: string;
    searches: number;
    properties: number;
    minConstruction: number;
    minLand: number;
}

export interface DemandByZoneData {
    zone: string;
    searches: number;
    properties: number;
    minPrice: number;
}

export interface SearchByGenderData {
    gender: string;
    searches: number;
}

export interface PropertiesByZoneData {
    zone: string;
    count: number;
}

export interface AvgPriceByNeighborhoodData {
    neighborhood: string;
    avgPrice: number;
}

export interface SaleTimeData {
    type: string;
    days: number;
}

export interface PublishedVsSoldData {
    zone: string;
    published: number;
    sold: number;
}

export interface SearchesByNeighborhoodData {
    neighborhood: string;
    searches: number;
}

export interface TopAmenitiesData {
    amenity: string;
    count: number;
}

export interface SurfaceVsSaleTimeData {
    neighborhood: string;
    fast: number;
    slow: number;
}

export interface PriceByRoomsData {
    rooms: number;
    avgPrice: number;
}
