import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

export default pool;
