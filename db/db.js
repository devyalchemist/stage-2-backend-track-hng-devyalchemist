import mysql from "mysql2/promise";
// import dotenv from "dotenv";

// dotenv.config();
if (!process.env.DB_HOST) {
	throw new Error("DB_HOST environment variable is missing!");
}
if (!process.env.DB_CA_BASE64) {
	throw new Error("DB_CA_BASE64 environment variable is missing!");
}

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	port: process.env.DB_PORT,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	ssl: {
		ca: Buffer.from(process.env.DB_CA_BASE64, "base64").toString(),
		rejectUnauthorized: true,
	},
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

export default pool;
