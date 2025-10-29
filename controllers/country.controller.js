// --- (We will add imports here later, like the pool and services) ---
import pool from "../db/db.js";
import {
	fetchCountryData,
	fetchExchangeRates,
} from "../services/externalApi.service.js";
import { getRandomMultiplier } from "../utils/helpers.js";

// We'll need these for the image generation part later
import fs from "fs";
import path from "path";
import sharp from "sharp";

// POST /api/countries/refresh

export const refreshCountries = async (req, res) => {
	let connection;
	try {
		connection = await pool.getConnection();
		await connection.beginTransaction();

		// 1️⃣ FETCH EXTERNAL DATA
		const [countries, rates] = await Promise.all([
			fetchCountryData(),
			fetchExchangeRates(),
		]);

		let processedCount = 0;

		// 2️⃣ UPSERT EACH COUNTRY
		for (const country of countries) {
			if (!country.name || !country.population) continue;

			const currency = country.currencies?.[0];
			const currencyCode = currency?.code || null;

			let exchangeRate = null;
			let estimatedGdp = null;

			if (currencyCode) {
				if (rates[currencyCode]) {
					exchangeRate = rates[currencyCode];
					estimatedGdp =
						(country.population * getRandomMultiplier()) / exchangeRate;
				}
			} else {
				estimatedGdp = 0; // If no currency
			}

			const upsertQuery = `
        INSERT INTO countries
          (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          capital = VALUES(capital),
          region = VALUES(region),
          population = VALUES(population),
          currency_code = VALUES(currency_code),
          exchange_rate = VALUES(exchange_rate),
          estimated_gdp = VALUES(estimated_gdp),
          flag_url = VALUES(flag_url),
          last_refreshed_at = NOW();
      `;

			const params = [
				country.name,
				country.capital || null,
				country.region || null,
				country.population,
				currencyCode,
				exchangeRate,
				estimatedGdp,
				country.flag || null,
			];

			await connection.query(upsertQuery, params);
			processedCount++;
		}

		// 3️⃣ UPDATE STATUS TABLE
		const newTimestamp = new Date();
		await connection.query(
			"UPDATE api_status SET total_countries = ?, last_refreshed_at = ? WHERE id = 1",
			[processedCount, newTimestamp]
		);

		// 4️⃣ GENERATE SUMMARY IMAGE
		await generateSummaryImage(connection, newTimestamp);

		await connection.commit();

		res.status(200).json({
			message: `Data refreshed successfully. ${processedCount} countries updated.`,
			last_refreshed_at: newTimestamp,
		});
	} catch (error) {
		if (connection) await connection.rollback();

		if (error.message.includes("Could not fetch")) {
			return res.status(503).json({
				error: "External data source unavailable",
				details: error.message,
			});
		}

		console.error("Refresh error:", error);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		if (connection) connection.release();
	}
};
// --- (Keep the other stub functions for now) ---
async function generateSummaryImage(connection, lastRefreshed) {
	const [statusRows] = await connection.query(
		"SELECT total_countries FROM api_status WHERE id = 1"
	);
	const [topCountries] = await connection.query(
		"SELECT name FROM countries ORDER BY estimated_gdp DESC LIMIT 5"
	);

	const totalCountries = statusRows[0]?.total_countries || 0;
	const lastRefresh = lastRefreshed.toISOString();

	const width = 800;
	const height = 400;

	const listOfTop = topCountries
		.map(
			(e, i) =>
				`<tspan x="50%" dy="${i === 0 ? 0 : 32}">${i + 1}. ${e.name}</tspan>`
		)
		.join("");

	const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(25,30,45)" />
      <text x="50%" y="18%" font-size="42" fill="#00ff99" text-anchor="middle" font-family="Arial, sans-serif">
        🌍 Countries Summary
      </text>
      <text x="50%" y="35%" font-size="28" fill="#ffffff" text-anchor="middle" font-family="Arial, sans-serif">
        Total Countries: ${totalCountries}
      </text>
      <text x="50%" y="52%" font-size="24" fill="#ffaa00" text-anchor="middle" font-family="Arial, sans-serif">
        ${listOfTop}
      </text>
      <text x="50%" y="90%" font-size="22" fill="#cccccc" text-anchor="middle" font-family="Arial, sans-serif">
        Last Refresh: ${lastRefresh}
      </text>
    </svg>
  `;

	const cacheDir = path.resolve("./cache");
	const outputPath = path.join(cacheDir, "summary.png");
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

	const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();
	await sharp(buffer).toFile(outputPath);
}

export const getSummaryImage = async (req, res) => {
	try {
		const imagePath = path.resolve("./cache/summary.png");

		if (!fs.existsSync(imagePath)) {
			return res.status(404).json({
				error: "Summary image not found",
			});
		}

		res.setHeader("Content-Type", "image/png");
		res.sendFile(imagePath);
	} catch (error) {
		console.error("Error serving summary image:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// GET /api/countries
// GET /countries
export const getAllCountries = async (req, res) => {
	try {
		const { region, currency, sort } = req.query;

		// --- Base query setup ---
		let query = "SELECT * FROM countries";
		const params = [];
		const conditions = [];

		// --- Filter: Region ---
		if (region) {
			conditions.push("region = ?");
			params.push(region);
		}

		// --- Filter: Currency ---
		if (currency) {
			conditions.push("currency_code = ?");
			params.push(currency);
		}

		// Combine WHERE conditions if any
		if (conditions.length > 0) {
			query += " WHERE " + conditions.join(" AND ");
		}

		// --- Sorting ---
		if (sort) {
			if (sort === "gdp_asc") query += " ORDER BY estimated_gdp ASC";
			else if (sort === "gdp_desc") query += " ORDER BY estimated_gdp DESC";
			else {
				// Invalid sort option
				return res.status(400).json({
					error: "Validation failed",
					details: {
						sort: "must be 'gdp_asc' or 'gdp_desc'",
					},
				});
			}
		}

		// Execute the query
		const [rows] = await pool.query(query, params);

		// --- Handle empty result when filters applied ---
		if ((region || currency) && rows.length === 0) {
			return res.status(400).json({
				error: "Validation failed",
				details: {
					message: `No countries found for the provided filter(s).`,
				},
			});
		}

		res.status(200).json(rows);
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// GET /api/countries/image
// export const getSummaryImage = async (req, res) => {
// 	try {
// 		// --- 1️⃣ Fetch summary data from DB ---
// 		const [statusRows] = await pool.query(
// 			"SELECT total_countries, last_refreshed_at FROM api_status WHERE id = 1"
// 		);
// 		const [topCountries] = await pool.query(
// 			"SELECT name FROM countries ORDER BY estimated_gdp DESC LIMIT 5"
// 		);
// 		console.log(topCountries);

// 		// console.log(statusRows);
// 		if (!statusRows || statusRows.length === 0) {
// 			return res.status(404).json({
// 				error: "Not found",
// 				details: {
// 					api_status: "No status record found in the database.",
// 				},
// 			});
// 		}

// 		const { total_countries, last_refreshed_at } = statusRows[0];

// 		const totalCountries = total_countries || 0;
// 		const lastRefresh = last_refreshed_at

// 		// --- 2️⃣ Prepare SVG layout for Sharp ---
// 		const width = 800;
// 		const height = 400;

// 		const listOfTop = topCountries
// 			.map(
// 				(e, i) =>
// 					`<tspan x="50%" dy="${i === 0 ? 0 : 32}">${i + 1}. ${e.name}</tspan>`
// 			)
// 			.join("");

// 		const svgImage = `
//   <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
//     <rect width="100%" height="100%" fill="rgb(25,30,45)" />

//     <!-- Title -->
//     <text x="50%" y="18%" font-size="42" fill="#00ff99" text-anchor="middle" font-family="Arial, sans-serif">
//       🌍 Countries Summary
//     </text>

//     <!-- Total countries -->
//     <text x="50%" y="35%" font-size="28" fill="#ffffff" text-anchor="middle" font-family="Arial, sans-serif">
//       Total Countries: ${totalCountries}
//     </text>

//     <!-- Top 5 countries -->
//     <text
//       x="50%"
//       y="50%"
//       font-size="24"
//       fill="#ffaa00"
//       text-anchor="middle"
//       font-family="Arial, sans-serif"
//     >
//       ${listOfTop}
//     </text>

//     <!-- Last Refresh (moved down to avoid overlap) -->
//     <text x="50%" y="90%" font-size="22" fill="#cccccc" text-anchor="middle" font-family="Arial, sans-serif">
//       Last Refresh: ${lastRefresh}
//     </text>
//   </svg>
// `;

// 		// --- 3️⃣ Generate image buffer ---
// 		const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

// 		// --- 4️⃣ Save to ../cache/summary.png ---
// 		const cacheDir = path.resolve("./cache");
// 		const outputPath = path.join(cacheDir, "summary.png");

// 		if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// 		await sharp(buffer).toFile(outputPath);

// 		// --- 5️⃣ Serve the file ---
// 		res.setHeader("Content-Type", "image/png");
// 		res.sendFile(outputPath);
// 	} catch (error) {
// 		console.error("Error generating summary image:", error);
// 		res.status(500).json({ error: "Internal server error" });
// 	}
// };

// GET /api/countries/:name
// GET /countries/:name
export const getCountryByName = async (req, res) => {
	try {
		const { name } = req.params;

		// --- Validation: name is required ---
		if (!name || name.trim() === "") {
			return res.status(400).json({
				error: "Validation failed",
				details: {
					name: "is required",
				},
			});
		}

		// --- Query the DB for country by name ---
		const [rows] = await pool.query("SELECT * FROM countries WHERE name = ?", [
			name,
		]);

		// --- Handle not found case ---
		if (rows.length === 0) {
			return res.status(404).json({
				error: "Country not found",
				details: {
					name: `No country found with the name '${name}'`,
				},
			});
		}

		// --- Success ---
		res.status(200).json(rows[0]);
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const deleteCountryByName = async (req, res) => {
	try {
		const { name } = req.params;

		// --- Validation: name required ---
		if (!name || name.trim() === "") {
			return res.status(400).json({
				error: "Validation failed",
				details: {
					name: "is required",
				},
			});
		}

		const [existing] = await pool.query(
			"SELECT id FROM countries WHERE name = ?",
			[name]
		);

		if (existing.length === 0) {
			return res.status(404).json({
				error: "Not found",
				details: {
					name: `No country found with the name '${name}'`,
				},
			});
		}

		const [result] = await pool.query("DELETE FROM countries WHERE name = ?", [
			name,
		]);

		if (result.affectedRows === 0) {
			return res.status(404).json({
				error: "Not found",
				details: {
					name: `No country found with the name '${name}'`,
				},
			});
		}

		res.status(204).send();
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getApiStatus = async (req, res) => {
	try {
		const [rows] = await pool.query(
			"SELECT total_countries, last_refreshed_at FROM api_status WHERE id = 1"
		);

		// 2. CHECK IF THE ROW EXISTS
		if (rows.length === 0) {
			// This is a safety check, though it should never happen
			return res.status(404).json({ error: "Status not found" });
		}

		const status = rows[0];

		res.status(200).json({
			total_countries: status.total_countries,
			last_refreshed_at: status.last_refreshed_at,
		});
	} catch (error) {
		console.error("Error in getApiStatus:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// GET /api/countries/image

// GET /api/countries/image

// export const getSummaryImage = async (req, res) => {
// 	try {
// 		// (Logic to find and send the image file goes here)
// 		res.status(200).json({ message: "Summary image (placeholder)" });
// 	} catch (error) {
// 		res.status(500).json({ error: "Internal server error" });
// 	}
// };
