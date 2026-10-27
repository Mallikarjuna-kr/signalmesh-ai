/**
 * SignalMesh AI - User Identity, Session & OTP Store
 * Provides low-latency transactional persistence for user accounts,
 * verified phone numbers, session tokens, OTP generation/validation,
 * rate limiting, and SMS consent tracking.
 * 
 * Team: APEX-AI-X
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const IDENTITY_FILE = path.join(DATA_DIR, 'identity.json');
const SMS_AUDIT_FILE = path.join(DATA_DIR, 'sms_audit_log.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache synced with disk
let store = {
  users: {},        // userId -> user
  sessions: {},     // tokenHash -> { userId, expiresAt, createdAt }
  otps: {},         // phoneE164 -> { hashedOtp, expiresAt, attempts, lastRequestedAt, requestCountHour, windowStart }
  alertCooldowns: {} // `${phoneE164}:${locationId}` -> timestamp
};

// Load existing store from disk if present
function loadStore() {
  try {
    if (fs.existsSync(IDENTITY_FILE)) {
      const raw = fs.readFileSync(IDENTITY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      store.users = parsed.users || {};
      store.sessions = parsed.sessions || {};
    }
  } catch (err) {
    console.error('[IdentityStore] Failed to load identity.json:', err.message);
  }
}

// Persist store atomically to disk
function saveStore() {
  try {
    const tempFile = `${IDENTITY_FILE}.tmp`;
    const dataToSave = {
      users: store.users,
      sessions: store.sessions,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf8');
    fs.renameSync(tempFile, IDENTITY_FILE);
  } catch (err) {
    console.error('[IdentityStore] Failed to save identity.json:', err.message);
  }
}

// Initialize on boot
loadStore();

// ---------------------------------------------------------------------
// Phone Normalization (E.164 Format)
// ---------------------------------------------------------------------
/**
 * Normalizes phone numbers to standard E.164 format.
 * Defaults bare 10-digit numbers to Indian country code (+91).
 * Strips out spaces, dashes, parentheses, dots.
 * 
 * @param {string} rawPhone - User supplied phone string
 * @returns {{ valid: boolean, phoneE164?: string, error?: string }}
 */
function normalizeToE164(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Handle leading '00' international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle Indian domestic numbers starting with '0' (e.g. 09876543210 -> +919876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+91' + cleaned.slice(1);
  }

  // If starts with 10 digits without '+' prefix, assume India (+91)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  }

  // If number starts with '91' and has 12 digits, prepend '+'
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  // Final E.164 standard regex: starts with +, followed by 8 to 15 digits (ITU-T E.164)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid phone format. Please enter a valid mobile number with country code (e.g., +919876543210).'
    };
  }

  return { valid: true, phoneE164: cleaned };
}

// ---------------------------------------------------------------------
// Cryptographic Hash & Session Utilities
// ---------------------------------------------------------------------
function hashSecret(secret) {
  const salt = process.env.SESSION_SECRET || 'signalmesh_default_salt_2026';
  return crypto.createHmac('sha256', salt).update(secret).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------
// OTP Generation, Storage & Verification
// ---------------------------------------------------------------------
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000;    // 60 seconds cooldown between sends
const MAX_OTP_PER_HOUR = 5;           // Rate limit: max 5 OTPs per hour per number
const MAX_VERIFY_ATTEMPTS = 5;        // Lock OTP after 5 wrong attempts

/**
 * Generates a secure random 6-digit OTP and manages rate limits.
 */
function createOtpForPhone(phoneE164) {
  const now = Date.now();
  const existing = store.otps[phoneE164];

  // 1. Check cooldown (60 seconds)
  if (existing && existing.lastRequestedAt && (now - existing.lastRequestedAt < OTP_COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((OTP_COOLDOWN_MS - (now - existing.lastRequestedAt)) / 1000);
    return {
      success: false,
      code: 'COOLDOWN_ACTIVE',
      error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      retryAfterSeconds: remainingSeconds
    };
  }

  // 2. Check hourly rate limit
  if (existing) {
    if (now - existing.windowStart > 60 * 60 * 1000) {
      existing.requestCountHour = 0;
      existing.windowStart = now;
    }
    if (existing.requestCountHour >= MAX_OTP_PER_HOUR) {
      return {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many verification code requests for this number. Please try again after 1 hour.'
      };
    }
  }

  // 3. Generate secure cryptographic 6-digit code
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = hashSecret(`${phoneE164}:${rawOtp}`);

  store.otps[phoneE164] = {
    hashedOtp,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastRequestedAt: now,
    requestCountHour: (existing ? existing.requestCountHour : 0) + 1,
    windowStart: (existing ? existing.windowStart : now)
  };

  return {
    success: true,
    rawOtp, // Passed to SMS sender service only, NEVER logged or stored raw
    expiresInSeconds: OTP_EXPIRY_MS / 1000
  };
}

/**
 * Validates a user-supplied OTP against stored cryptographic hash.
 */
function verifyOtpForPhone(phoneE164, userEnteredOtp) {
  const now = Date.now();
  const record = store.otps[phoneE164];

  if (!record || !record.hashedOtp) {
    return {
      success: false,
      code: 'NO_OTP_REQUESTED',
      error: 'No active verification code found for this number. Please request a new code.'
    };
  }

  // Check expiration
  if (now > record.expiresAt) {
    delete store.otps[phoneE164];
    return {
      success: false,
      code: 'OTP_EXPIRED',
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  // Check attempt limit
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    delete store.otps[phoneE164];
    return {
      success: false,
      code: 'MAX_ATTEMPTS_EXCEEDED',
      error: 'Maximum verification attempts exceeded. Please request a new verification code.'
    };
  }

  // Check code match using constant-time comparison
  record.attempts += 1;
  const expectedHash = hashSecret(`${phoneE164}:${userEnteredOtp.trim()}`);
  const match = crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(record.hashedOtp));

  if (!match) {
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    return {
      success: false,
      code: 'INVALID_OTP',
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`
    };
  }

  // Verification successful: clear OTP entry
  delete store.otps[phoneE164];

  // Retrieve or create verified user
  let user = getUserByPhone(phoneE164);
  if (!user) {
    user = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      phoneE164,
      name: 'Field Responder',
      role: 'Command Officer',
      verified: true,
      verifiedAt: new Date().toISOString(),
      smsConsent: true, // Default opt-in upon phone verification for emergency alerts
      smsConsentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    store.users[user.id] = user;
  } else {
    user.verified = true;
    user.verifiedAt = new Date().toISOString();
    user.lastLoginAt = new Date().toISOString();
  }

  saveStore();

  // Create session
  const token = generateSessionToken();
  const tokenHash = hashSecret(token);
  const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  store.sessions[tokenHash] = {
    userId: user.id,
    expiresAt: now + SESSION_DURATION_MS,
    createdAt: new Date().toISOString()
  };

  saveStore();

  return {
    success: true,
    user: sanitizeUser(user),
    token
  };
}

// ---------------------------------------------------------------------
// User & Session Management
// ---------------------------------------------------------------------
function getUserByPhone(phoneE164) {
  return Object.values(store.users).find((u) => u.phoneE164 === phoneE164) || null;
}

function getUserById(userId) {
  return store.users[userId] || null;
}

function getUserByToken(token) {
  if (!token) return null;
  const tokenHash = hashSecret(token);
  const session = store.sessions[tokenHash];
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    delete store.sessions[tokenHash];
    saveStore();
    return null;
  }

  const user = store.users[session.userId];
  return user ? sanitizeUser(user) : null;
}

function revokeSession(token) {
  if (!token) return;
  const tokenHash = hashSecret(token);
  delete store.sessions[tokenHash];
  saveStore();
}

function updateSmsConsent(userId, consent) {
  const user = store.users[userId];
  if (!user) return { success: false, error: 'User not found' };

  user.smsConsent = Boolean(consent);
  if (user.smsConsent) {
    user.smsConsentAt = new Date().toISOString();
    delete user.smsUnsubscribedAt;
  } else {
    user.smsUnsubscribedAt = new Date().toISOString();
  }

  saveStore();
  return { success: true, user: sanitizeUser(user) };
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    phoneE164: user.phoneE164,
    maskedPhone: maskPhone(user.phoneE164),
    name: user.name,
    role: user.role,
    verified: user.verified,
    verifiedAt: user.verifiedAt,
    smsConsent: user.smsConsent,
    smsConsentAt: user.smsConsentAt,
    lastLoginAt: user.lastLoginAt
  };
}

function maskPhone(phoneE164) {
  if (!phoneE164 || phoneE164.length < 8) return phoneE164;
  return phoneE164.slice(0, 3) + '••••' + phoneE164.slice(-4);
}

// ---------------------------------------------------------------------
// Alert Cooldown & Deduplication
// ---------------------------------------------------------------------
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between duplicate alerts for same location

function checkAlertCooldown(phoneE164, locationId) {
  const key = `${phoneE164}:${locationId}`;
  const lastSent = store.alertCooldowns[key];
  const now = Date.now();

  if (lastSent && (now - lastSent < ALERT_COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((ALERT_COOLDOWN_MS - (now - lastSent)) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      error: `An emergency SMS alert was already dispatched for this location recently. Cooldown active for ${remainingSeconds}s to prevent spam.`
    };
  }

  return { allowed: true };
}

function recordAlertDispatched(phoneE164, locationId) {
  const key = `${phoneE164}:${locationId}`;
  store.alertCooldowns[key] = Date.now();
}

// ---------------------------------------------------------------------
// SMS Audit Logging (Append-Only)
// ---------------------------------------------------------------------
function logSmsDispatch(record) {
  try {
    const entry = {
      id: `sms_log_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...record
    };

    let log = [];
    if (fs.existsSync(SMS_AUDIT_FILE)) {
      try {
        log = JSON.parse(fs.readFileSync(SMS_AUDIT_FILE, 'utf8'));
      } catch (e) {
        log = [];
      }
    }
    log.push(entry);
    // Keep last 1,000 log records
    if (log.length > 1000) log = log.slice(-1000);

    fs.writeFileSync(SMS_AUDIT_FILE, JSON.stringify(log, null, 2), 'utf8');
    return entry;
  } catch (err) {
    console.error('[IdentityStore] Failed to write SMS audit log:', err.message);
  }
}

module.exports = {
  normalizeToE164,
  createOtpForPhone,
  verifyOtpForPhone,
  getUserByPhone,
  getUserById,
  getUserByToken,
  revokeSession,
  updateSmsConsent,
  sanitizeUser,
  checkAlertCooldown,
  recordAlertDispatched,
  logSmsDispatch
};
