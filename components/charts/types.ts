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
  filters?: any; // Will use either FilterOptions or StatsFilters
}

// Data types for each chart
export interface PricePerM2Data {
  month: string;
  total: number;
  terrain: number;
  construction: number;
}

export interface FilteredChartProps extends BaseChartProps {
  properties?: any[];
  searches?: any[];
  operationType: string;
  propertyType?: string;
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
  count: number;
}

export interface SaleTimeData {
  category: string;
  avgDays: number;
  count: number;
}

export interface Chart08Props extends BaseChartProps {}

export interface PublishedVsSoldData {
  zone: string;
  published: number;
  sold: number;
  effectiveness: number;
}

export interface SearchesByNeighborhoodData {
  neighborhood: string;
  count: number;
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
  label?: string;
}

export interface StatsFilters {
  estado?: string;
  ciudad?: string;
  municipio?: string;
  colonia?: string;
  tipoOperacion?: string;
  tipoPropiedad?: string;
  subtipo?: string;
  habitaciones?: string;
  banos?: string;
  precioMin?: number;
  precioMax?: number;
  metrosMin?: number;
  metrosMax?: number;
  fechaInicio?: string;
  fechaFin?: string;
}
