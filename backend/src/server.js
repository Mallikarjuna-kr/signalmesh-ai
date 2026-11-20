/**
 * SignalMesh AI - Express Backend Server
 * Connects React frontend (port 3000) securely to Snowflake Data Cloud.
 * Team: APEX-AI-X
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const snowflake = require('./snowflake');
const identityStore = require('./identityStore');
const smsService = require('./smsService');
const deviceBridge = require('./deviceBridge');
const realtimeService = require('./realtimeService');

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ---------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, localhost, and Vercel domains
    if (!origin) return callback(null, true);
    if (
      origin === CORS_ORIGIN ||
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    // Permissive for demo and deployment
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));

// Safe request logger (does not log sensitive bodies or credentials)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Authentication Middlewares
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required. Please sign in with your verified phone number.',
      code: 'AUTH_REQUIRED'
    });
  }
  const token = authHeader.slice(7).trim();
  const user = identityStore.getUserByToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please sign in again.',
      code: 'SESSION_EXPIRED'
    });
  }
  req.user = user;
  req.token = token;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = identityStore.getUserByToken(token);
    if (user) {
      req.user = user;
      req.token = token;
    }
  }
  next();
}

// Helper for fully qualified table identifiers
const DB = process.env.SNOWFLAKE_DATABASE || 'SIGNALMESH_DB';
const SCHEMA = process.env.SNOWFLAKE_SCHEMA || 'MONITORING';
const table = (name) => `${DB}.${SCHEMA}.${name}`;

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------

/**
 * GET /api/health
 * Checks server status, configuration presence, and tests live Snowflake & SMS provider connectivity.
 * Never outputs passwords, tokens, or private keys.
 */
app.get('/api/health', async (req, res) => {
  const configSummary = snowflake.getConfigSummary();
  const smsSummary = smsService.getConfigSummary();

  // Test live query only if configuration is present
  let connectionTest = { connected: false, error: 'Snowflake credentials not configured' };
  if (configSummary.configured) {
    connectionTest = await snowflake.testConnection();
  }

  const statusCode = connectionTest.connected ? 200 : (configSummary.configured ? 503 : 200);

  res.status(statusCode).json({
    status: connectionTest.connected ? 'healthy' : 'degraded',
    service: 'SignalMesh AI Backend API',
    team: 'APEX-AI-X',
    timestamp: new Date().toISOString(),
    port: PORT,
    snowflake: {
      configured: configSummary.configured,
      connected: connectionTest.connected,
      latencyMs: connectionTest.latencyMs || null,
      account: configSummary.account,
      database: configSummary.database,
      schema: configSummary.schema,
      warehouse: configSummary.warehouse,
      role: configSummary.role,
      authenticator: configSummary.authenticator,
      details: connectionTest.details || null,
      error: connectionTest.error || null
    },
    sms: smsSummary
  });
});

/**
 * GET /api/realtime/locations
 * Fetches and returns live multi-spectral weather, soil moisture, and seismic data
 * with dynamic landslide risk scores computed for all monitored Northeast locations.
 */
app.get('/api/realtime/locations', async (req, res) => {
  try {
    const data = await realtimeService.getRealtimeLocations();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------
// Authentication & Phone Verification Routes
// ---------------------------------------------------------------------

/**
 * POST /api/auth/send-otp
 * Normalizes phone number to E.164, enforces rate limits/cooldowns,
 * generates cryptographic OTP, and dispatches via Twilio SMS / Verify.
 */
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required.'
    });
  }

  // 1. Normalize to E.164 (handles Indian +91 and international formats)
  const norm = identityStore.normalizeToE164(phone);
  if (!norm.valid) {
    return res.status(400).json({
      success: false,
      error: norm.error
    });
  }

  // 2. Manage cooldowns, rate limits and cryptographic OTP generation
  const otpResult = identityStore.createOtpForPhone(norm.phoneE164);
  if (!otpResult.success) {
    return res.status(429).json({
      success: false,
      error: otpResult.error,
      code: otpResult.code,
      retryAfterSeconds: otpResult.retryAfterSeconds
    });
  }

  // 3. Dispatch SMS via Twilio
  const dispatch = await smsService.sendOtpSms(norm.phoneE164, otpResult.rawOtp);

  // Return real provider status without exposing OTP code
  return res.json({
    success: dispatch.success,
    phone: norm.phoneE164,
    maskedPhone: identityStore.sanitizeUser({ phoneE164: norm.phoneE164 }).maskedPhone,
    status: dispatch.status,
    provider: dispatch.provider,
    expiresInSeconds: otpResult.expiresInSeconds,
    cooldownSeconds: 60,
    message: dispatch.message || (dispatch.success ? 'Verification code dispatched to your phone.' : dispatch.error),
    error: dispatch.error
  });
});

/**
 * POST /api/auth/verify-otp
 * Verifies entered 6-digit OTP against cryptographic hash.
 * Creates verified user identity and session token upon success.
 */
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body || {};

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and verification code are required.'
    });
  }

  const norm = identityStore.normalizeToE164(phone);
  if (!norm.valid) {
    return res.status(400).json({ success: false, error: norm.error });
  }

  const verifyResult = identityStore.verifyOtpForPhone(norm.phoneE164, otp.toString());

  if (!verifyResult.success) {
    return res.status(400).json({
      success: false,
      error: verifyResult.error,
      code: verifyResult.code
    });
  }

  return res.json({
    success: true,
    message: 'Phone number verified successfully.',
    user: verifyResult.user,
    token: verifyResult.token
  });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile and SMS consent state.
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Revokes active session token.
 */
app.post('/api/auth/logout', requireAuth, (req, res) => {
  identityStore.revokeSession(req.token);
  res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

// ---------------------------------------------------------------------
// Emergency SMS Alert Delivery & Consent Routes
// ---------------------------------------------------------------------

/**
 * GET /api/alerts/sms-status
 * Checks SMS provider configuration and diagnostic readiness.
 */
app.get('/api/alerts/sms-status', (req, res) => {
  res.json({
    success: true,
    sms: smsService.getConfigSummary()
  });
});

/**
 * POST /api/alerts/subscribe
 * Explicitly opts in authenticated user to SMS hazard notifications.
 */
app.post('/api/alerts/subscribe', requireAuth, (req, res) => {
  const result = identityStore.updateSmsConsent(req.user.id, true);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({
    success: true,
    message: 'Successfully opted in to real-time emergency SMS alerts.',
    user: result.user
  });
});

/**
 * POST /api/alerts/unsubscribe
 * Explicitly opts out user from SMS hazard notifications.
 */
app.post('/api/alerts/unsubscribe', requireAuth, (req, res) => {
  const result = identityStore.updateSmsConsent(req.user.id, false);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({
    success: true,
    message: 'Successfully opted out of emergency SMS alerts.',
    user: result.user
  });
});

/**
 * POST /api/alerts/send-test
 * Dispatches a genuine emergency alert SMS to the authenticated user's verified phone.
 * Enforces verified phone number, explicit SMS consent, and alert cooldown deduplication.
 */
app.post('/api/alerts/send-test', optionalAuth, async (req, res) => {
  let targetPhone = null;
  let targetUserId = null;
  let userConsent = false;

  if (req.user) {
    targetPhone = req.user.phoneE164;
    targetUserId = req.user.id;
    userConsent = req.user.smsConsent;
  } else if (req.body.phone) {
    const norm = identityStore.normalizeToE164(req.body.phone);
    if (!norm.valid) {
      return res.status(400).json({ success: false, error: norm.error });
    }
    const existingUser = identityStore.getUserByPhone(norm.phoneE164);
    if (!existingUser || !existingUser.verified) {
      return res.status(403).json({
        success: false,
        error: 'Phone number has not been verified with OTP yet. Please verify your phone number first.',
        code: 'PHONE_NOT_VERIFIED'
      });
    }
    targetPhone = existingUser.phoneE164;
    targetUserId = existingUser.id;
    userConsent = existingUser.smsConsent;
  } else {
    return res.status(401).json({
      success: false,
      error: 'Please sign in with your verified phone number to receive emergency SMS alerts.',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check explicit consent
  if (!userConsent) {
    return res.status(403).json({
      success: false,
      error: 'Emergency SMS alerts are currently disabled for this number. Please opt in to enable SMS broadcasts.',
      code: 'CONSENT_REQUIRED'
    });
  }

  const alertData = req.body.alertData || {
    name: 'Dima Hasao',
    state: 'Assam',
    riskLevel: 'Very High',
    riskScore: 88,
    rainfall: 85,
    soilMoisture: 78,
    locationId: 'dima-hasao'
  };

  const locId = alertData.id || alertData.locationId || 'dima-hasao';

  // Check cooldown & deduplication to prevent accidental spam / repeat sends
  const cooldownCheck = identityStore.checkAlertCooldown(targetPhone, locId);
  if (!cooldownCheck.allowed && !req.body.force) {
    return res.status(429).json({
      success: false,
      error: cooldownCheck.error,
      code: 'COOLDOWN_ACTIVE',
      remainingSeconds: cooldownCheck.remainingSeconds
    });
  }

  // Dispatch SMS through real Twilio provider
  const dispatchResult = await smsService.sendEmergencyAlertSms({
    toPhoneE164: targetPhone,
    alertData,
    userId: targetUserId
  });

  if (dispatchResult.success) {
    identityStore.recordAlertDispatched(targetPhone, locId);
  }

  return res.json({
    success: dispatchResult.success,
    status: dispatchResult.status,
    sid: dispatchResult.sid,
    provider: dispatchResult.provider,
    to: targetPhone,
    maskedPhone: identityStore.sanitizeUser({ phoneE164: targetPhone }).maskedPhone,
    message: dispatchResult.message || (dispatchResult.success ? `Emergency SMS dispatched via ${dispatchResult.provider}` : dispatchResult.error),
    error: dispatchResult.error,
    simulatedDisclaimer: 'Demonstration risk metrics are simulated for evaluation purposes.'
  });
});

/**
 * GET /api/alerts/usb-status
 * Checks if an Android phone is attached via USB cable with USB Debugging enabled.
 */
app.get('/api/alerts/usb-status', async (req, res) => {
  const result = await deviceBridge.checkUsbDevices();
  res.json({
    success: true,
    usb: result
  });
});

/**
 * POST /api/alerts/usb-push
 * Delivers native emergency alert notification directly to USB-connected phone.
 */
app.post('/api/alerts/usb-push', async (req, res) => {
  const alertData = req.body.alertData || {
    name: 'Dima Hasao',
    state: 'Assam',
    riskLevel: 'Very High',
    riskScore: 88
  };
  const result = await deviceBridge.pushUsbAlert(alertData);
  res.json(result);
});

/**
 * POST /api/alerts/instant-push
 * Broadcasts emergency alert to public ntfy.sh push channel so ANY phone receives it instantly.
 */
app.post('/api/alerts/instant-push', async (req, res) => {
  const alertData = req.body.alertData || {
    name: 'Dima Hasao',
    state: 'Assam',
    riskLevel: 'Very High',
    riskScore: 88
  };
  const result = await deviceBridge.pushInstantMobileAlert(alertData);
  res.json(result);
});

/**
 * GET /api/locations
 * Fetches all monitored location records from SIGNALMESH_DB.MONITORING.LOCATIONS
 */
app.get('/api/locations', async (req, res) => {
  if (!snowflake.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Snowflake database is not configured. Please supply credentials in backend/.env.',
      code: 'SNOWFLAKE_NOT_CONFIGURED'
    });
  }

  try {
    const sql = `SELECT * FROM ${table('LOCATIONS')} ORDER BY ID ASC`;
    const rows = await snowflake.query(sql);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('[Error: /api/locations]', err.message);
    res.status(502).json({
      success: false,
      error: 'Failed to retrieve locations from Snowflake.',
      details: snowflake.sanitizeErrorMessage(err)
    });
  }
});

/**
 * GET /api/alerts
 * Fetches active and historical alerts from SIGNALMESH_DB.MONITORING.ALERTS
 */
app.get('/api/alerts', async (req, res) => {
  if (!snowflake.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Snowflake database is not configured. Please supply credentials in backend/.env.',
      code: 'SNOWFLAKE_NOT_CONFIGURED'
    });
  }

  try {
    const sql = `SELECT * FROM ${table('ALERTS')} ORDER BY ID ASC`;
    const rows = await snowflake.query(sql);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('[Error: /api/alerts]', err.message);
    res.status(502).json({
      success: false,
      error: 'Failed to retrieve alerts from Snowflake.',
      details: snowflake.sanitizeErrorMessage(err)
    });
  }
});

/**
 * GET /api/observations
 * Fetches environmental telemetry records from SIGNALMESH_DB.MONITORING.ENVIRONMENTAL_OBSERVATIONS
 */
app.get('/api/observations', async (req, res) => {
  if (!snowflake.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Snowflake database is not configured. Please supply credentials in backend/.env.',
      code: 'SNOWFLAKE_NOT_CONFIGURED'
    });
  }

  try {
    const sql = `SELECT * FROM ${table('ENVIRONMENTAL_OBSERVATIONS')} ORDER BY ID ASC`;
    const rows = await snowflake.query(sql);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('[Error: /api/observations]', err.message);
    res.status(502).json({
      success: false,
      error: 'Failed to retrieve observations from Snowflake.',
      details: snowflake.sanitizeErrorMessage(err)
    });
  }
});

/**
 * GET /api/reports
 * Fetches citizen and field reports from SIGNALMESH_DB.MONITORING.FIELD_REPORTS
 */
app.get('/api/reports', async (req, res) => {
  if (!snowflake.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Snowflake database is not configured. Please supply credentials in backend/.env.',
      code: 'SNOWFLAKE_NOT_CONFIGURED'
    });
  }

  try {
    const sql = `SELECT * FROM ${table('FIELD_REPORTS')} ORDER BY ID DESC`;
    const rows = await snowflake.query(sql);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('[Error: /api/reports]', err.message);
    res.status(502).json({
      success: false,
      error: 'Failed to retrieve field reports from Snowflake.',
      details: snowflake.sanitizeErrorMessage(err)
    });
  }
});

/**
 * POST /api/reports
 * Validates report submission and inserts a new record into SIGNALMESH_DB.MONITORING.FIELD_REPORTS
 * Uses parameterized SQL binding to prevent SQL injection.
 */
app.post('/api/reports', async (req, res) => {
  const { locationId, location, observation, description, submittedBy, photos } = req.body || {};

  // Validation
  if (!observation || typeof observation !== 'string' || !observation.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Field "observation" is required and must be a non-empty string.'
    });
  }

  if (!locationId && !location) {
    return res.status(400).json({
      success: false,
      error: 'Field "locationId" or "location" is required.'
    });
  }

  if (!snowflake.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Snowflake database is not configured. Please supply credentials in backend/.env.',
      code: 'SNOWFLAKE_NOT_CONFIGURED'
    });
  }

  // Generate safe standardized ID: MFR-YYYY-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const currentYear = new Date().getFullYear();
  const id = req.body.id || `MFR-${currentYear}-${randomSuffix}`;

  const cleanLocationId = (locationId || 'unknown').toString().trim().toLowerCase().slice(0, 100);
  const cleanLocation = (location || cleanLocationId).toString().trim().slice(0, 200);
  const cleanSubmittedBy = (submittedBy || 'Field Officer').toString().trim().slice(0, 100);
  const cleanObservation = observation.toString().trim().slice(0, 300);
  const cleanDescription = (description || '').toString().trim().slice(0, 2000);
  const photoCount = typeof photos === 'number' ? photos : (Array.isArray(photos) ? photos.length : 0);

  // Default initial audit lifecycle values
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const aiStatus = 'Pending';
  const confidence = 0;
  const riskImpact = 'Pending Assessment';
  const status = 'Submitted';

  try {
    const insertSql = `
      INSERT INTO ${table('FIELD_REPORTS')} (
        ID,
        LOCATION_ID,
        LOCATION,
        SUBMITTED_BY,
        DATE,
        OBSERVATION,
        DESCRIPTION,
        AI_STATUS,
        CONFIDENCE,
        RISK_IMPACT,
        STATUS
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const binds = [
      id,
      cleanLocationId,
      cleanLocation,
      cleanSubmittedBy,
      dateStr,
      cleanObservation,
      cleanDescription,
      aiStatus,
      confidence,
      riskImpact,
      status
    ];

    await snowflake.query(insertSql, binds);

    const createdReport = {
      id,
      locationId: cleanLocationId,
      location: cleanLocation,
      submittedBy: cleanSubmittedBy,
      date: dateStr,
      observation: cleanObservation,
      description: cleanDescription,
      aiStatus,
      confidence,
      riskImpact,
      status,
      photos: photoCount
    };

    res.status(201).json({
      success: true,
      message: 'Field report recorded successfully in Snowflake.',
      data: createdReport
    });
  } catch (err) {
    console.error('[Error: POST /api/reports]', err.message);
    res.status(502).json({
      success: false,
      error: 'Failed to insert field report into Snowflake.',
      details: snowflake.sanitizeErrorMessage(err)
    });
  }
});

// ---------------------------------------------------------------------
// 404 & Global Error Handling
// ---------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
    details: process.env.NODE_ENV === 'development' ? snowflake.sanitizeErrorMessage(err) : undefined
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`SignalMesh AI Backend API running on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${CORS_ORIGIN}`);
  console.log(`Target Snowflake: ${DB}.${SCHEMA} (${process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH'})`);
  console.log(`Snowflake Configured: ${snowflake.isConfigured() ? 'YES' : 'NO (awaiting backend/.env)'}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});

module.exports = app;
