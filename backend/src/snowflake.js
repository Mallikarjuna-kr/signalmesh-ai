/**
 * SignalMesh AI - Snowflake Database Client
 * Official snowflake-sdk connection manager & parameterized query executor.
 * Team: APEX-AI-X
 */

const snowflake = require('snowflake-sdk');
require('dotenv').config();

// Track active connection instance
let activeConnection = null;
let isConnecting = false;
let connectionPromise = null;

/**
 * Validates whether all required Snowflake configuration parameters exist in .env
 * @returns {boolean}
 */
function isConfigured() {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;

  if (!account || !username || !password) {
    return false;
  }

  // Prevent placeholder values from pretending to be valid
  const placeholders = [
    'your_snowflake_account_identifier',
    'your_snowflake_username',
    'your_snowflake_password',
    'account_identifier',
    'username',
    'password'
  ];

  if (
    placeholders.includes(account.trim().toLowerCase()) ||
    placeholders.includes(username.trim().toLowerCase()) ||
    placeholders.includes(password.trim().toLowerCase())
  ) {
    return false;
  }

  return true;
}

/**
 * Returns safe metadata about the Snowflake connection configuration without leaking secrets.
 * @returns {object}
 */
function getConfigSummary() {
  return {
    configured: isConfigured(),
    account: process.env.SNOWFLAKE_ACCOUNT ? `${process.env.SNOWFLAKE_ACCOUNT.substring(0, 4)}...` : null,
    database: process.env.SNOWFLAKE_DATABASE || 'SIGNALMESH_DB',
    schema: process.env.SNOWFLAKE_SCHEMA || 'MONITORING',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    role: process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN',
    authenticator: process.env.SNOWFLAKE_AUTHENTICATOR || 'SNOWFLAKE',
    timeoutMs: Number(process.env.SNOWFLAKE_TIMEOUT_MS) || 15000
  };
}

/**
 * Sanitizes error messages by stripping any sensitive authorization or credential strings.
 * @param {Error|string} err
 * @returns {string}
 */
function sanitizeErrorMessage(err) {
  if (!err) return 'Unknown database error';
  const msg = typeof err === 'string' ? err : err.message || err.toString();
  
  // Mask potential passwords or tokens
  return msg
    .replace(/(password\s*[:=]\s*)([^\s,;&]+)/gi, '$1[REDACTED]')
    .replace(/(token\s*[:=]\s*)([^\s,;&]+)/gi, '$1[REDACTED]')
    .replace(/(secret\s*[:=]\s*)([^\s,;&]+)/gi, '$1[REDACTED]');
}

/**
 * Converts a Snowflake UPPER_SNAKE_CASE column name to camelCase.
 * Examples: RISK_LEVEL -> riskLevel, LOCATION_ID -> locationId, NAME -> name
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
  return str.toLowerCase().replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalizes Snowflake row results:
 * - Provides both original UPPERCASE and camelCase keys
 * - Automatically parses stringified JSON fields (like history or recommendations)
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;

  const normalized = { ...row };

  for (const [key, val] of Object.entries(row)) {
    const camel = toCamelCase(key);
    
    // Parse JSON string fields if present
    let parsedVal = val;
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try {
        parsedVal = JSON.parse(val);
      } catch (_) {
        parsedVal = val;
      }
    }

    normalized[camel] = parsedVal;
    normalized[key] = parsedVal;
  }

  return normalized;
}

/**
 * Connects to Snowflake or returns existing active connection.
 * @returns {Promise<snowflake.Connection>}
 */
async function getConnection() {
  if (!isConfigured()) {
    throw new Error('Snowflake credentials are not configured in backend/.env. Please configure SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, and SNOWFLAKE_PASSWORD.');
  }

  // Return existing active connection if healthy
  if (activeConnection && activeConnection.isUp()) {
    return activeConnection;
  }

  // If already connecting, await ongoing promise to prevent duplicate connections
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
      database: process.env.SNOWFLAKE_DATABASE || 'SIGNALMESH_DB',
      schema: process.env.SNOWFLAKE_SCHEMA || 'MONITORING',
      role: process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN',
      authenticator: process.env.SNOWFLAKE_AUTHENTICATOR || 'SNOWFLAKE',
      clientSessionKeepAlive: process.env.SNOWFLAKE_CLIENT_SESSION_KEEP_ALIVE === 'true'
    });

    const timeout = setTimeout(() => {
      isConnecting = false;
      connectionPromise = null;
      reject(new Error('Connection attempt to Snowflake timed out (exceeded 15s). Check network connectivity and account identifier.'));
    }, Number(process.env.SNOWFLAKE_TIMEOUT_MS) || 15000);

    connection.connect((err, conn) => {
      clearTimeout(timeout);
      isConnecting = false;
      connectionPromise = null;

      if (err) {
        activeConnection = null;
        reject(new Error(`Snowflake connection failed: ${sanitizeErrorMessage(err)}`));
      } else {
        activeConnection = conn;
        resolve(conn);
      }
    });
  });

  return connectionPromise;
}

/**
 * Executes a parameterized SQL statement against Snowflake.
 * @param {string} sqlText - SQL query with '?' placeholders
 * @param {Array} binds - Array of parameter values for '?' placeholders
 * @returns {Promise<Array<object>>} - Array of normalized row objects
 */
async function query(sqlText, binds = []) {
  const connection = await getConnection();

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(new Error(`Query execution failed: ${sanitizeErrorMessage(err)}`));
        } else {
          const normalizedRows = (rows || []).map(normalizeRow);
          resolve(normalizedRows);
        }
      }
    });
  });
}

/**
 * Verifies live connectivity by executing a lightweight ping query.
 * @returns {Promise<{ connected: boolean, latencyMs: number, details?: object, error?: string }>}
 */
async function testConnection() {
  if (!isConfigured()) {
    return {
      connected: false,
      latencyMs: 0,
      error: 'Snowflake credentials are not configured in backend/.env'
    };
  }

  const start = Date.now();
  try {
    const rows = await query('SELECT CURRENT_VERSION() AS VERSION, CURRENT_DATABASE() AS DB, CURRENT_SCHEMA() AS SCHEMA, CURRENT_WAREHOUSE() AS WH, CURRENT_ROLE() AS ROLE');
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      latencyMs,
      details: {
        version: rows[0]?.VERSION || rows[0]?.version,
        database: rows[0]?.DB || rows[0]?.db,
        schema: rows[0]?.SCHEMA || rows[0]?.schema,
        warehouse: rows[0]?.WH || rows[0]?.wh,
        role: rows[0]?.ROLE || rows[0]?.role
      }
    };
  } catch (err) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: sanitizeErrorMessage(err)
    };
  }
}

module.exports = {
  isConfigured,
  getConfigSummary,
  getConnection,
  query,
  testConnection,
  normalizeRow,
  sanitizeErrorMessage
};
