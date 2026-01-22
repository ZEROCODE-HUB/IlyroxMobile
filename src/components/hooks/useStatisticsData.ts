import { useState, useEffect, useCallback } from "react";
import { chartService } from "../../../services/chartService";

export interface CombinedData {
  properties: any[];
  searches: any[];
}

export const useStatisticsData = () => {
  const [data, setData] = useState<CombinedData>({
    properties: [],
    searches: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await chartService.getAllData();
      setData(result);
    } catch (err) {
      console.error("Error fetching statistics data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
};
