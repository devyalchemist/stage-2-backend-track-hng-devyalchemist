import axios from "axios";

// Define the URLs for the external APIs
const COUNTRY_API_URL =
	"https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

/**
 * Fetches all country data from the restcountries API.
 */
export const fetchCountryData = async () => {
	try {
		const response = await axios.get(COUNTRY_API_URL);
		return response.data; // Return the array of countries
	} catch (error) {
		console.error("Error fetching country data:", error.message);
		// Throw a new, specific error for our controller to catch
		throw new Error("Could not fetch data from restcountries.com");
	}
};

/**
 * Fetches the latest USD exchange rates.
 */
export const fetchExchangeRates = async () => {
	try {
		const response = await axios.get(EXCHANGE_RATE_API_URL);
		return response.data.rates; // Return the "rates" object (e.g., { "USD": 1, "NGN": 1600, ... })
	} catch (error) {
		console.error("Error fetching exchange rates:", error.message);
		// Throw a new, specific error for our controller to catch
		throw new Error("Could not fetch data from open.er-api.com");
	}
};
