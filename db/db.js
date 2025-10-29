import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from .env file
dotenv.config();

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	port: process.env.DB_PORT,

	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	ssl: {
		ca: fs.readFileSync("../certs/ca.pem"), // read the CA cert directly

		rejectUnauthorized: true,
	},
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

export default pool;
