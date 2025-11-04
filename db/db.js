import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";
console.log(
	"The variable username from db is: ",
	process.env.DB_USER,
	typeof process.env.DB_USER
);
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
