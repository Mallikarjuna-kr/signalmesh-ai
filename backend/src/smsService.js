/**
 * SignalMesh AI - Real SMS & Phone Verification Service
 * Integrates with Twilio Programmable Messaging & Verify API.
 * Never fakes SMS delivery; reports real provider statuses (accepted, queued, delivered, failed, unconfigured).
 * 
 * Team: APEX-AI-X
 */

const identityStore = require('./identityStore');

let twilioClient = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) return null;
  // Ignore placeholders
  if (accountSid.includes('your_twilio') || authToken.includes('your_twilio')) return null;

  if (!twilioClient) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      console.error('[SMSService] Failed to initialize Twilio client:', err.message);
      return null;
    }
  }
  return twilioClient;
}

function isConfigured() {
  const client = getTwilioClient();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  const hasPhone = fromPhone && !fromPhone.includes('+1234567890');
  const hasVerify = verifySid && verifySid.startsWith('VA');

  return Boolean(client && (hasPhone || hasVerify));
}

function getConfigSummary() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID || '';
  const configured = isConfigured();

  return {
    configured,
    provider: 'Twilio',
    hasAccountSid: Boolean(accountSid && !accountSid.includes('your_twilio')),
    accountSidPrefix: accountSid.length > 6 ? `${accountSid.slice(0, 6)}...` : null,
    hasPhoneNumber: Boolean(fromNumber && !fromNumber.includes('+1234567890')),
    fromNumberMasked: fromNumber ? `${fromNumber.slice(0, 3)}••••${fromNumber.slice(-3)}` : null,
    hasVerifyService: Boolean(verifySid && verifySid.startsWith('VA')),
    devEchoMode: process.env.DEV_OTP_CONSOLE_ECHO === 'true'
  };
}

/**
 * Sends a real OTP verification code to the normalized E.164 phone.
 * If Twilio Verify is configured, delegates to Twilio Verify.
 * If Twilio Programmable SMS is configured, sends via SMS.
 * If provider is unconfigured, reports unconfigured (or dev console echo if explicitly enabled).
 */
async function sendOtpSms(phoneE164, rawOtp) {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const isDevEcho = process.env.DEV_OTP_CONSOLE_ECHO === 'true';

  // 1. If provider is configured with Twilio Verify
  if (client && verifySid && verifySid.startsWith('VA')) {
    try {
      const verification = await client.verify.v2.services(verifySid).verifications.create({
        to: phoneE164,
        channel: 'sms'
      });
      return {
        success: true,
        status: verification.status, // 'pending'
        sid: verification.sid,
        provider: 'Twilio Verify',
        to: phoneE164
      };
    } catch (err) {
      console.error('[SMSService:TwilioVerify] Failed to dispatch OTP:', err.message);
      return {
        success: false,
        status: 'failed',
        errorCode: err.code,
        error: sanitizeTwilioError(err)
      };
    }
  }

  // 2. If provider is configured with Twilio Programmable SMS
  if (client && fromNumber && !fromNumber.includes('+1234567890')) {
    try {
      const messageBody = `SignalMesh AI Security: Your verification code is ${rawOtp}. Valid for 10 minutes. Do not share this code.`;
      const message = await client.messages.create({
        body: messageBody,
        from: fromNumber,
        to: phoneE164
      });

      return {
        success: true,
        status: message.status, // 'queued', 'sending', 'sent', 'delivered'
        sid: message.sid,
        provider: 'Twilio Programmable SMS',
        to: phoneE164
      };
    } catch (err) {
      console.error('[SMSService:TwilioSMS] Failed to send message:', err.message);
      return {
        success: false,
        status: 'failed',
        errorCode: err.code,
        error: sanitizeTwilioError(err)
      };
    }
  }

  // 3. Provider is not configured
  if (isDevEcho) {
    // Development sandbox mode: strictly logs to backend server console
    console.log(`\n========================================================`);
    console.log(`[DEV SANDBOX: OTP CODE] For Phone: ${phoneE164}`);
    console.log(`Code: ${rawOtp} (Valid for 10 minutes)`);
    console.log(`========================================================\n`);

    return {
      success: true,
      status: 'dev_sandbox_echoed',
      provider: 'Dev Sandbox (Twilio Unconfigured)',
      message: 'Twilio credentials not configured in backend/.env. In development sandbox mode, the verification code was output to the backend server terminal console.'
    };
  }

  return {
    success: false,
    status: 'unconfigured',
    provider: 'Twilio',
    error: 'Twilio SMS provider is not configured. Please supply TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env to deliver live SMS.'
  };
}

/**
 * Dispatches a genuine emergency alert SMS to a verified, opted-in user.
 */
async function sendEmergencyAlertSms({ toPhoneE164, alertData, userId }) {
  const locName = alertData?.name || 'Dima Hasao';
  const stateName = alertData?.state || 'Assam';
  const riskLevel = (alertData?.riskLevel || 'Very High').toUpperCase();
  const riskScore = alertData?.riskScore || 88;
  const rainfall = alertData?.rainfall || '85%';
  const soilMoisture = alertData?.soilMoisture || '78%';
  const locationId = alertData?.id || alertData?.locationId || 'dima-hasao';

  // Format concise emergency message with simulation disclaimer
  const messageBody = `🚨 SignalMesh AI EMERGENCY ALERT: ${riskLevel} LANDSLIDE RISK detected at ${locName}, ${stateName}. Score: ${riskScore}/100 | Rain: ${rainfall} | Soil: ${soilMoisture}. Avoid cut-slopes and report movement. Info: http://localhost:3000/alerts [SIMULATED DEMO HAZARD]`;

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const isDevEcho = process.env.DEV_OTP_CONSOLE_ECHO === 'true';

  if (client && fromNumber && !fromNumber.includes('+1234567890')) {
    try {
      const message = await client.messages.create({
        body: messageBody,
        from: fromNumber,
        to: toPhoneE164
      });

      // Record successful dispatch in audit log
      identityStore.logSmsDispatch({
        userId,
        phoneE164: toPhoneE164,
        provider: 'Twilio Programmable SMS',
        status: message.status,
        providerMessageId: message.sid,
        locationId,
        riskLevel,
        riskScore
      });

      return {
        success: true,
        status: message.status, // 'queued', 'accepted', 'sending'
        sid: message.sid,
        provider: 'Twilio',
        to: toPhoneE164
      };
    } catch (err) {
      console.error('[SMSService:EmergencySMS] Failed to send alert SMS:', err.message);

      identityStore.logSmsDispatch({
        userId,
        phoneE164: toPhoneE164,
        provider: 'Twilio Programmable SMS',
        status: 'failed',
        error: sanitizeTwilioError(err),
        errorCode: err.code,
        locationId,
        riskLevel,
        riskScore
      });

      return {
        success: false,
        status: 'failed',
        errorCode: err.code,
        error: sanitizeTwilioError(err)
      };
    }
  }

  // Not configured
  if (isDevEcho) {
    console.log(`\n========================================================`);
    console.log(`[DEV SANDBOX: EMERGENCY SMS] To: ${toPhoneE164}`);
    console.log(`Body: ${messageBody}`);
    console.log(`========================================================\n`);

    identityStore.logSmsDispatch({
      userId,
      phoneE164: toPhoneE164,
      provider: 'Dev Sandbox',
      status: 'dev_sandbox_echoed',
      locationId,
      riskLevel,
      riskScore
    });

    return {
      success: true,
      status: 'dev_sandbox_echoed',
      provider: 'Dev Sandbox (Twilio Unconfigured)',
      message: 'Twilio provider not configured in backend/.env. In development sandbox mode, the emergency SMS payload was output to the backend server terminal console.'
    };
  }

  identityStore.logSmsDispatch({
    userId,
    phoneE164: toPhoneE164,
    provider: 'Twilio',
    status: 'unconfigured',
    locationId,
    riskLevel,
    riskScore,
    error: 'Twilio provider unconfigured'
  });

  return {
    success: false,
    status: 'unconfigured',
    provider: 'Twilio',
    error: 'Twilio SMS provider is not configured. Please supply TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env to deliver live SMS.'
  };
}

/**
 * Maps Twilio error codes to human-readable explanations without leaking sensitive tokens.
 */
function sanitizeTwilioError(err) {
  if (!err) return 'Unknown SMS delivery error';
  const code = err.code;

  switch (code) {
    case 21211:
      return 'The destination phone number is invalid. Please check the international country code.';
    case 21408:
      return 'SMS destination country permission denied. Please enable destination country permissions in your Twilio Console.';
    case 21614:
      return 'To send SMS to this number using a Twilio Trial account, you must first verify the destination number in Twilio Verified Caller IDs.';
    case 21608:
      return 'The Twilio account is in trial and this number is unverified.';
    case 20003:
      return 'Twilio authentication failed. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.';
    case 21606:
      return 'The Twilio sender phone number is not capable of sending SMS.';
    default:
      return err.message || 'SMS delivery failed at carrier.';
  }
}

module.exports = {
  isConfigured,
  getConfigSummary,
  sendOtpSms,
  sendEmergencyAlertSms
};
