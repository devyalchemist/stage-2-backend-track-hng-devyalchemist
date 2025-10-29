import express from "express";
import dotenv from "dotenv";
import pool from "./db/db.js";
import initStatusTable from "./models/status.model.js";
import initDb from "./models/country.model.js";
import countryRoutes from "./routes/country.routes.js";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 1. IMPORT THE ROUTES
// Load .env variables
// dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// This allows our app to accept and parse JSON request bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, "cache")));
const router = express.Router();
app.use("/", countryRoutes);
// --- Test Database Connection ---
const testDbConnection = async () => {
	try {
		await pool.query("SELECT 1");
		console.log("✅ Database connected successfully!");
		await initDb();
		await initStatusTable(); // 2. CALL IT
	} catch (error) {
		console.error("❌ Database connection failed:", error);
		process.exit(1); // Exit the app if DB connection fails
	}
};

// --- Routes ---
// Placeholder for our routes (we'll add them soon)
// app.use('/api', allOurRoutes);

// --- Start Server ---
const startServer = async () => {
	await testDbConnection();

	app.listen(PORT, () => {
		console.log(`🚀 Server running on http://localhost:${PORT}`);
	});
};

startServer();
