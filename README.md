# Country Data API

## Overview
This is a RESTful API built with Node.js and Express.js that serves aggregated country data. It fetches information from external sources, persists it in a MySQL database, and provides endpoints to query this data, including a dynamically generated summary image.

## Features
- **Express.js**: For robust API routing and server management.
- **MySQL2**: As the database driver for storing and retrieving country data.
- **Axios**: To perform HTTP requests to external country and exchange rate APIs.
- **Sharp**: For high-performance, on-the-fly generation of a PNG summary image from SVG data.

## Getting Started
### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/devyalchemist/stage-2-backend-track-hng-devyalchemist.git
    cd stage-2-backend-track-hng-devyalchemist
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and populate it with the required variables listed below.

4.  **Start the server:**
    ```bash
    npm start
    ```

### Environment Variables
A `.env` file is required to run the application. The `ca_base64.txt` file contains the required certificate for SSL database connections, which should be used for the `DB_SSL_CA_BASE64` variable.

| Variable             | Description                                          | Example                                                                          |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`               | The port the server will run on.                     | `3000`                                                                           |
| `DB_HOST`            | Your MySQL database host.                            | `aws.connect.psdb.cloud`                                                         |
| `DB_USER`            | Your MySQL database username.                        | `user123`                                                                        |
| `DB_PASSWORD`        | Your MySQL database password.                        | `your_secure_password`                                                           |
| `DB_DATABASE`        | The name of the MySQL database.                      | `countries_db`                                                                   |
| `DB_SSL_CA_BASE64`   | The Base64 encoded SSL certificate authority string. | `LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUV...` (content of `ca_base64.txt`) |

## API Documentation
### Base URL
`http://localhost:3000`

### Endpoints
#### GET /
Retrieves a simple status message to confirm the server is running.

**Request**:
No payload required.

**Response**:
*   **200 OK**
    ```json
    {
      "message": "Server is running. DB connection should be working."
    }
    ```

**Errors**:
- None specified.

---
#### POST /countries/refresh
Fetches the latest data from external country and exchange rate APIs, updates the database, and generates a new summary image. This is a long-running operation.

**Request**:
No payload required.

**Response**:
*   **200 OK**
    ```json
    {
      "message": "Data refreshed successfully. 250 countries updated.",
      "last_refreshed_at": "2024-09-15T18:30:00.000Z"
    }
    ```

**Errors**:
- **503 Service Unavailable**: If an external API (restcountries.com or open.er-api.com) cannot be reached.
- **500 Internal Server Error**: If a database error or other unexpected issue occurs during the process.

---
#### GET /status
Retrieves the current status of the API data, including the total number of countries and the timestamp of the last successful refresh.

**Request**:
No payload required.

**Response**:
*   **200 OK**
    ```json
    {
      "total_countries": 250,
      "last_refreshed_at": "2024-09-15T18:30:00.000Z"
    }
    ```

**Errors**:
- **404 Not Found**: If the status record has not been initialized in the database.
- **500 Internal Server Error**: For database query failures.

---
#### GET /countries
Fetches a list of all countries from the database. It supports filtering by region and currency, and sorting by estimated GDP.

**Request**:
Query parameters are optional.
- `region` (string): Filters countries by a specific region (e.g., `Africa`).
- `currency` (string): Filters countries by a currency code (e.g., `NGN`).
- `sort` (string): Sorts the results. Accepts `gdp_asc` or `gdp_desc`.

**Response**:
*   **200 OK**
    ```json
    [
      {
        "id": 1,
        "name": "Nigeria",
        "capital": "Abuja",
        "region": "Africa",
        "population": 206139587,
        "currency_code": "NGN",
        "exchange_rate": 1600.50000,
        "estimated_gdp": "150123456789.00",
        "flag_url": "https://restcountries.eu/data/nga.svg",
        "last_refreshed_at": "2024-09-15T18:30:00.000Z"
      }
    ]
    ```

**Errors**:
- **400 Bad Request**: If an invalid `sort` parameter is provided or if filters result in no matching countries.
- **500 Internal Server Error**: For database query failures.

---
#### GET /countries/:name
Retrieves detailed information for a single country by its exact name.

**Request**:
URL parameter `name` is required.
Example: `/countries/Nigeria`

**Response**:
*   **200 OK**
    ```json
    {
      "id": 1,
      "name": "Nigeria",
      "capital": "Abuja",
      "region": "Africa",
      "population": 206139587,
      "currency_code": "NGN",
      "exchange_rate": 1600.50000,
      "estimated_gdp": "150123456789.00",
      "flag_url": "https://restcountries.eu/data/nga.svg",
      "last_refreshed_at": "2024-09-15T18:30:00.000Z"
    }
    ```

**Errors**:
- **400 Bad Request**: If the `name` parameter is missing.
- **404 Not Found**: If no country with the specified name exists in the database.
- **500 Internal Server Error**: For database query failures.

---
#### DELETE /countries/:name
Deletes a country from the database by its exact name.

**Request**:
URL parameter `name` is required.
Example: `/countries/Nigeria`

**Response**:
*   **204 No Content**: On successful deletion.

**Errors**:
- **400 Bad Request**: If the `name` parameter is missing.
- **404 Not Found**: If no country with the specified name exists to be deleted.
- **500 Internal Server Error**: For database query failures.

---
#### GET /countries/image
Serves a dynamically generated PNG image summarizing the API data, including total countries and the top 5 countries by estimated GDP.

**Request**:
No payload required.

**Response**:
*   **200 OK** with `Content-Type: image/png` header and the image data as the body.

**Errors**:
- **404 Not Found**: If the summary image has not been generated yet (run `POST /countries/refresh` first).
- **500 Internal Server Error**: If there is an issue reading the image file from the server's cache.

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)