import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";const log = logger.scoped("useExchangeRate");

interface ExchangeRate {
  usd_to_mxn: number;
  mxn_to_usd: number;
}

const DEFAULT_EXCHANGE_RATE = {
  usd_to_mxn: 20,
  mxn_to_usd: 0.05,
};

export const useExchangeRate = () => {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(DEFAULT_EXCHANGE_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // Obtener el valor en USD de cada moneda desde configuracion_monedas
        const { data, error } = await supabase
          .from("configuracion_monedas")
          .select("codigo, valor_en_usd")
          .eq("activa", true)
          .in("codigo", ["MXN", "USD"]);

        if (error) throw error;

        if (data && data.length > 0) {
          // Encontrar los valores
          const usdData = data.find((m) => m.codigo === "USD");
          const mxnData = data.find((m) => m.codigo === "MXN");

          if (usdData && mxnData) {
            // valor_en_usd representa cuántas unidades de esa moneda = 1 USD
            // Ejemplo: MXN tiene valor_en_usd = 18 significa 1 USD = 18 MXN
            // Por lo tanto: 1 MXN = 1/18 USD
            const mxnPerUsd = parseFloat(mxnData.valor_en_usd);
            
            setExchangeRate({
              usd_to_mxn: mxnPerUsd,      // 1 USD = 18 MXN
              mxn_to_usd: 1 / mxnPerUsd,  // 1 MXN = 0.055 USD
            });
          } else {
            // Si falta alguna moneda, usar valores por defecto
            log.warn("Missing USD or MXN in configuracion_monedas");
            setExchangeRate(DEFAULT_EXCHANGE_RATE);
          }
        } else {
          // No hay datos, usar valores por defecto
          setExchangeRate(DEFAULT_EXCHANGE_RATE);
        }
      } catch (error) {
        log.error("Error fetching exchange rate:", error);
        // Mantener el valor por defecto en caso de error
        setExchangeRate(DEFAULT_EXCHANGE_RATE);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
  }, []);

  const convertPrice = (
    price: number,
    fromCurrency: "MXN" | "USD",
    toCurrency: "MXN" | "USD"
  ): number => {
    if (fromCurrency === toCurrency) return price;

    if (fromCurrency === "USD" && toCurrency === "MXN") {
      return price * exchangeRate.usd_to_mxn;
    } else if (fromCurrency === "MXN" && toCurrency === "USD") {
      return price * exchangeRate.mxn_to_usd;
    }

    return price;
  };

  return {
    exchangeRate,
    loading,
    convertPrice,
  };
};
