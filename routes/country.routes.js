import express from "express";
import {
	refreshCountries,
	getAllCountries,
	getCountryByName,
	deleteCountryByName,
	getApiStatus,
	getSummaryImage,
	loadRoot,
} from "../controllers/country.controller.js";

const router = express.Router();

// Define all the endpoints required by the task
router.route("/countries/image").get(getSummaryImage);

router.post("/countries/refresh", refreshCountries);
router.get("/countries/", getAllCountries);
router.get("/", loadRoot);
router
	.route("/countries/:name")
	.get(getCountryByName)
	.delete(deleteCountryByName);
router.route("status").get(getApiStatus);

export default router;
