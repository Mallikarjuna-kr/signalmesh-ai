# SignalMesh AI — Backend API & Snowflake Service
**Landslide Risk Monitoring & Early Warning Platform**  
**Engineering Team:** APEX-AI-X  
**Stack:** Node.js, Express, `snowflake-sdk`

---

## 1. Overview

The `backend/` service provides a secure, decoupled REST API bridging the React frontend (`http://localhost:3000`) and the **Snowflake Data Cloud** (`SIGNALMESH_DB.MONITORING`).

### Key Capabilities:
- **Zero Frontend Credential Exposure:** All Snowflake connection parameters and secrets remain strictly on the backend.
- **Parameterized SQL Security:** All user inputs (such as field reports) are executed via parameterized binds (`?`) to prevent SQL injection.
- **Resilient & Health-Monitored:** `GET /api/health` reports live connectivity latency without leaking authentication tokens.
- **Cross-Origin Resource Sharing (CORS):** Pre-configured to allow requests from the React development server origin (`http://localhost:3000`).

---

## 2. Snowflake Database Setup

The backend connects to the following Snowflake objects:
- **Database:** `SIGNALMESH_DB`
- **Schema:** `MONITORING`
- **Warehouse:** `COMPUTE_WH`
- **Tables:**
  - `LOCATIONS` — Baseline geospatial points, vulnerability scores, and contributing factors.
  - `ALERTS` — Live and historical landslide risk warnings.
  - `ENVIRONMENTAL_OBSERVATIONS` — Sensor telemetry records (rainfall, soil moisture, displacement).
  - `FIELD_REPORTS` — Crowdsourced citizen and officer incident submissions.

---

## 3. Installation & Setup

### Prerequisites
- Node.js `v18+` (or `v20+` / `v22+`)
- npm `v9+` or `v10+`

### Step 1: Install Dependencies
Open a terminal in the `backend/` directory:
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Open `.env` and fill in your Snowflake credentials:
```ini
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Snowflake Credentials
SNOWFLAKE_ACCOUNT=your_org-your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password

# Database Objects
SNOWFLAKE_DATABASE=SIGNALMESH_DB
SNOWFLAKE_SCHEMA=MONITORING
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=ACCOUNTADMIN
```

> **Security Note on Roles:**  
> While `ACCOUNTADMIN` was confirmed for initial hackathon velocity, production deployments should use a dedicated least-privilege role (e.g., `SIGNALMESH_APP_ROLE`) granted only `USAGE` on the warehouse and database, and `SELECT`/`INSERT` on `SIGNALMESH_DB.MONITORING.*`.

---

## 4. Starting the Server

### Development Mode (with automatic file reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

When started, the console will confirm:
```
================================================================
SignalMesh AI Backend API running on http://localhost:5000
CORS allowed origin: http://localhost:3000
Target Snowflake: SIGNALMESH_DB.MONITORING (COMPUTE_WH)
Snowflake Configured: YES
Health check available at: http://localhost:5000/api/health
================================================================
```

---

## 5. API Reference & Endpoint Examples

### 1. Health & Connection Status
- **Method:** `GET /api/health`
- **Description:** Verifies server runtime, configuration existence, and live Snowflake ping. Never returns credentials.
- **Example Request:**
  ```bash
  curl http://localhost:5000/api/health
  ```
- **Example Response (Healthy):**
  ```json
  {
    "status": "healthy",
    "service": "SignalMesh AI Backend API",
    "team": "APEX-AI-X",
    "timestamp": "2026-10-27T14:00:00.000Z",
    "port": 5000,
    "snowflake": {
      "configured": true,
      "connected": true,
      "latencyMs": 142,
      "account": "xy12...",
      "database": "SIGNALMESH_DB",
      "schema": "MONITORING",
      "warehouse": "COMPUTE_WH",
      "role": "ACCOUNTADMIN",
      "error": null
    }
  }
  ```

---

### 2. Get Monitored Locations
- **Method:** `GET /api/locations`
- **Description:** Retrieves all risk monitoring stations from `SIGNALMESH_DB.MONITORING.LOCATIONS`.
- **Example Request:**
  ```bash
  curl http://localhost:5000/api/locations
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "count": 8,
    "data": [
      {
        "id": "dima-hasao",
        "name": "Dima Hasao",
        "state": "Assam",
        "latitude": 25.77,
        "longitude": 93.03,
        "riskLevel": "Very High",
        "riskScore": 87,
        "rainfall": 85,
        "soilMoisture": 78,
        "slopeGradient": 82
      }
    ]
  }
  ```

---

### 3. Get Active & Historical Alerts
- **Method:** `GET /api/alerts`
- **Description:** Retrieves alert records from `SIGNALMESH_DB.MONITORING.ALERTS`.
- **Example Request:**
  ```bash
  curl http://localhost:5000/api/alerts
  ```

---

### 4. Get Environmental Observations
- **Method:** `GET /api/observations`
- **Description:** Retrieves sensor telemetry records from `SIGNALMESH_DB.MONITORING.ENVIRONMENTAL_OBSERVATIONS`.
- **Example Request:**
  ```bash
  curl http://localhost:5000/api/observations
  ```

---

### 5. Get Field Reports
- **Method:** `GET /api/reports`
- **Description:** Retrieves all submitted citizen and officer field reports from `SIGNALMESH_DB.MONITORING.FIELD_REPORTS`.
- **Example Request:**
  ```bash
  curl http://localhost:5000/api/reports
  ```

---

### 6. Submit a Field Report
- **Method:** `POST /api/reports`
- **Description:** Validates user input and safely inserts a new incident into `SIGNALMESH_DB.MONITORING.FIELD_REPORTS` using parameterized SQL.
- **Headers:** `Content-Type: application/json`
- **Example Request:**
  ```bash
  curl -X POST http://localhost:5000/api/reports \
    -H "Content-Type: application/json" \
    -d '{
      "locationId": "dima-hasao",
      "location": "Dima Hasao, Assam",
      "observation": "New tension cracks visible along lower slope",
      "description": "Cracks approx 4 inches wide after sustained overnight rain.",
      "submittedBy": "Officer S. Sharma",
      "photos": 2
    }'
  ```
- **Example Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Field report recorded successfully in Snowflake.",
    "data": {
      "id": "MFR-2026-8341",
      "locationId": "dima-hasao",
      "location": "Dima Hasao, Assam",
      "submittedBy": "Officer S. Sharma",
      "date": "27 Oct 2026",
      "observation": "New tension cracks visible along lower slope",
      "description": "Cracks approx 4 inches wide after sustained overnight rain.",
      "aiStatus": "Pending",
      "confidence": 0,
      "riskImpact": "Pending Assessment",
      "status": "Submitted",
      "photos": 2
    }
  }
  ```

---

## 6. Phone Authentication & Real SMS Alert Provider

SignalMesh AI implements authentic carrier-grade SMS delivery via **Twilio Programmable Messaging & Twilio Verify**. SMS alerts are strictly delivered to verified, opted-in mobile phone numbers.

### Environment Variables
Configure the following in `backend/.env`:
```ini
# Twilio Account Credentials (from https://console.twilio.com)
TWILIO_ACCOUNT_SID=your_actual_account_sid
TWILIO_AUTH_TOKEN=your_actual_auth_token

# E.164 Sender Phone Number (purchased/active on your Twilio account)
TWILIO_PHONE_NUMBER=+1234567890

# Optional: Twilio Verify Service SID (starts with 'VA...')
TWILIO_VERIFY_SERVICE_SID=

# Session Secret (random 32-character key)
SESSION_SECRET=your_secure_random_key_here

# Local Development Sandbox (echoes OTP and SMS payloads to console if Twilio is unconfigured)
DEV_OTP_CONSOLE_ECHO=false
```

### Phone Normalization & E.164
All entered phone numbers are normalized according to ITU-T E.164 standards:
- Indian 10-digit mobile numbers (e.g. `9876543210`) are normalized to `+919876543210`.
- International formats (e.g. `+14155552671`) are validated against standard regex `^\+[1-9]\d{7,14}$`.
- Formatting characters (spaces, dashes, dots, parentheses) are safely stripped.

### Security, Rate Limits & Protections
1. **Cryptographic OTPs:** 6-digit random codes generated using `crypto.randomInt()`. Codes are stored exclusively as SHA-256 HMAC hashes with salt. Raw codes are never stored on disk or logged.
2. **Rate Limiting & Cooldowns:**
   - 60-second cooldown between consecutive OTP requests for the same phone number.
   - Maximum 5 OTP requests per hour per phone number.
   - Maximum 5 verification attempts per OTP before the code is permanently locked.
   - 10-minute code expiry window.
3. **Session Management:** Cryptographically generated bearer tokens (7-day duration) stored as SHA-256 hashes in `backend/data/identity.json`.
4. **Emergency SMS Deduplication:** Cooldown of 10 minutes per location per user to prevent duplicate SMS flooding during telemetry spikes.
5. **No Fake Delivery Claims:** If Twilio credentials are missing or unverified, the system transparently reports `unconfigured` or `failed` with exact carrier diagnostic codes.

---

## 7. Authentication & SMS API Endpoints

### 1. Request Phone Verification OTP
- **Method:** `POST /api/auth/send-otp`
- **Body:** `{ "phone": "9876543210" }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "phone": "+919876543210",
    "maskedPhone": "+91••••3210",
    "status": "queued",
    "provider": "Twilio Programmable SMS",
    "expiresInSeconds": 600,
    "cooldownSeconds": 60
  }
  ```

### 2. Verify OTP & Sign In
- **Method:** `POST /api/auth/verify-otp`
- **Body:** `{ "phone": "+919876543210", "otp": "592813" }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Phone number verified successfully.",
    "user": {
      "id": "usr_9a4f2c",
      "phoneE164": "+919876543210",
      "maskedPhone": "+91••••3210",
      "name": "Field Responder",
      "role": "Command Officer",
      "verified": true,
      "smsConsent": true
    },
    "token": "7a8b9c...secure_session_token"
  }
  ```

### 3. Check Current User Session
- **Method:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <token>`

### 4. Sign Out
- **Method:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer <token>`

### 5. Check SMS Provider Configuration
- **Method:** `GET /api/alerts/sms-status`

### 6. Opt-In / Subscribe to Emergency SMS Alerts
- **Method:** `POST /api/alerts/subscribe`
- **Headers:** `Authorization: Bearer <token>`

### 7. Opt-Out / Unsubscribe from Emergency SMS Alerts
- **Method:** `POST /api/alerts/unsubscribe`
- **Headers:** `Authorization: Bearer <token>`

### 8. Dispatch Emergency SMS Alert
- **Method:** `POST /api/alerts/send-test`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "alertData": {
      "name": "Dima Hasao",
      "state": "Assam",
      "riskLevel": "Very High",
      "riskScore": 88,
      "rainfall": 85,
      "soilMoisture": 78,
      "locationId": "dima-hasao"
    }
  }
  ```

---

## 8. Security & Error Handling

- **Error Masking:** Database and carrier error messages are sanitized before being returned to clients to ensure tokens, passwords, and private connection strings are never exposed.
- **Audit Logging:** Every SMS dispatch attempt is recorded in `backend/data/sms_audit_log.json` with timestamp, destination, provider status, SID, and error codes.
- **No False Positives:** The `/api/health` endpoint verifies connection by actively executing a query against Snowflake; `/api/alerts/sms-status` verifies real Twilio configuration before attempting live dispatches.
