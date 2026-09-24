import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("useExchangeRate");

const DEFAULT_EXCHANGE_RATE = {
  usd_to_mxn: 20,
  mxn_to_usd: 0.05,
};

interface ExchangeRate {
  usd_to_mxn: number;
  mxn_to_usd: number;
}

const fetchExchangeRate = async (): Promise<ExchangeRate> => {
  const { data, error } = await supabase
    .from("configuracion_monedas")
    .select("codigo, valor_en_usd")
    .eq("activa", true)
    .in("codigo", ["MXN", "USD"]);

  if (error) throw error;

  if (!data || data.length === 0) return DEFAULT_EXCHANGE_RATE;

  const usdData = data.find((m) => m.codigo === "USD");
  const mxnData = data.find((m) => m.codigo === "MXN");

  if (!usdData || !mxnData) {
    log.warn("Missing USD or MXN in configuracion_monedas");
    return DEFAULT_EXCHANGE_RATE;
  }

  const mxnPerUsd = parseFloat(mxnData.valor_en_usd);
  return {
    usd_to_mxn: mxnPerUsd,
    mxn_to_usd: 1 / mxnPerUsd,
  };
};

export const useExchangeRate = () => {
  const { data, isLoading } = useQuery<ExchangeRate, Error>({
    queryKey: ["exchange-rate"],
    queryFn: fetchExchangeRate,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: () => DEFAULT_EXCHANGE_RATE,
  });

  const exchangeRate = data ?? DEFAULT_EXCHANGE_RATE;

  const convertPrice = useCallback(
    (price: number, fromCurrency: "MXN" | "USD", toCurrency: "MXN" | "USD"): number => {
      if (fromCurrency === toCurrency) return price;
      if (fromCurrency === "USD" && toCurrency === "MXN") {
        return price * exchangeRate.usd_to_mxn;
      }
      if (fromCurrency === "MXN" && toCurrency === "USD") {
        return price * exchangeRate.mxn_to_usd;
      }
      return price;
    },
    [exchangeRate],
  );

  return {
    exchangeRate,
    loading: isLoading,
    convertPrice,
  };
};
