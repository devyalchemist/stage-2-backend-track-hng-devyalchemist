import pool from "../db/db.js";

const initStatusTable = async () => {
	try {
		const createTableQuery = `
      CREATE TABLE IF NOT EXISTS api_status (
        id INT PRIMARY KEY DEFAULT 1,
        total_countries INT DEFAULT 0,
        last_refreshed_at TIMESTAMP
      );
    `;
		await pool.query(createTableQuery);

		// Ensure the single row exists so we can UPDATE it later
		const insertInitialRowQuery = `
      INSERT IGNORE INTO api_status (id, last_refreshed_at) VALUES (1, NULL);
    `;
		await pool.query(insertInitialRowQuery);

		console.log('✅ "api_status" table is ready.');
	} catch (error) {
		console.error('❌ Error creating "api_status" table:', error);
		process.exit(1);
	}
};

export default initStatusTable;
