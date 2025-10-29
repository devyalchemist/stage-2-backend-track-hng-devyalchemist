import pool from "../db/db.js";

// This function will run once when the server starts
const initDb = async () => {
	try {
		const createTableQuery = `
      CREATE TABLE IF NOT EXISTS countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        capital VARCHAR(255),
        region VARCHAR(255),
        population BIGINT NOT NULL,
        currency_code VARCHAR(10),
        exchange_rate DECIMAL(15, 5),
        estimated_gdp DECIMAL(20, 2),
        flag_url VARCHAR(255),
        last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

		await pool.query(createTableQuery);
		console.log('✅ "countries" table is ready.');
	} catch (error) {
		console.error('❌ Error creating "countries" table:', error);
		process.exit(1); // Stop the app if we can't create the table
	}
};

export default initDb;
