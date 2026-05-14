import { logger } from "./logger";

const log = logger.scoped("currencyConverter");

const apiURL = "https://api.appnexus.com/currency?code=MXN&show_rate=true"; // API para obtener el valor actual del peso mexicano

const currencyConverter = async (): Promise<number> => {
  try {
    const response = await fetch(apiURL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data.response.currency.rate_per_usd;
  } catch (error) {
    log.error("Error fetching currency rate:", error);
    return 18; // Fallback value
  }
};

export default currencyConverter;
