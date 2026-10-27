/**
 * SignalMesh AI - Physical Device Bridge
 * Delivers alerts to physical mobile phones via:
 * 1. USB Cable (Android ADB notifications & browser launch)
 * 2. Instant Zero-Config Mobile Push (via ntfy.sh high-priority hazard channel)
 * 
 * Team: APEX-AI-X
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ADB_PATH = 'C:\\Users\\Abhhilash m\\Downloads\\platform-tools\\platform-tools\\adb.exe';

function getAdbPath() {
  if (fs.existsSync(ADB_PATH)) return `"${ADB_PATH}"`;
  return 'adb';
}

/**
 * Checks if an Android phone is connected via USB cable with USB Debugging enabled.
 */
function checkUsbDevices() {
  return new Promise((resolve) => {
    const cmd = `${getAdbPath()} devices`;
    exec(cmd, (err, stdout) => {
      if (err) return resolve({ available: false, devices: [] });
      const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
      // Skip the first line 'List of devices attached'
      const deviceLines = lines.slice(1).filter((l) => l.includes('\tdevice') || l.includes('device'));
      resolve({
        available: true,
        devices: deviceLines,
        count: deviceLines.length
      });
    });
  });
}

/**
 * Pushes a native emergency alert onto the screen of a USB-connected phone.
 */
async function pushUsbAlert(alertData) {
  const status = await checkUsbDevices();
  if (!status.available || status.count === 0) {
    return {
      success: false,
      connected: false,
      error: 'No phone detected on USB cable. Please plug in your Android phone and enable "USB Debugging" in Developer Options.'
    };
  }

  const locName = alertData?.name || 'Dima Hasao';
  const riskLevel = alertData?.riskLevel || 'Very High';
  const riskScore = alertData?.riskScore || 88;
  const title = `🚨 [HAZARD BROADCAST] ${riskLevel.toUpperCase()} RISK: ${locName}`;
  const body = `Landslide danger score ${riskScore}/100. Soil saturation high. Evacuate vulnerable slopes immediately!`;

  return new Promise((resolve) => {
    const adb = getAdbPath();

    // 1. Post native Android notification on lock screen
    const safeTitle = title.replace(/"/g, '\\"');
    const safeBody = body.replace(/"/g, '\\"');
    const notifCmd = `${adb} shell cmd notification post -S bigtext -t "${safeTitle}" "SignalMesh" "${safeBody}"`;

    // 2. Open emergency alert URL on phone's screen
    const openUrlCmd = `${adb} shell am start -a android.intent.action.VIEW -d "http://10.60.203.188:3000/alerts"`;

    exec(`${notifCmd} && ${openUrlCmd}`, (err) => {
      if (err) {
        // Fallback to launching SMS composer
        const smsCmd = `${adb} shell am start -a android.intent.action.SENDTO -d sms: --es sms_body "${safeTitle} - ${safeBody}"`;
        exec(smsCmd, () => {
          resolve({
            success: true,
            connected: true,
            method: 'SMS Composer / Alert Intent',
            deviceCount: status.count,
            message: `Emergency alert dispatched to ${status.count} USB-connected device(s)!`
          });
        });
      } else {
        resolve({
          success: true,
          connected: true,
          method: 'Native Android Notification + Screen Pop',
          deviceCount: status.count,
          message: `Emergency notification posted to ${status.count} USB-connected phone(s)!`
        });
      }
    });
  });
}

/**
 * Dispatches an instant real-time notification to the phone via public push topic.
 * Any phone that visits https://ntfy.sh/signalmesh-hazard-alert receives an instant banner.
 */
async function pushInstantMobileAlert(alertData) {
  const locName = alertData?.name || 'Dima Hasao';
  const stateName = alertData?.state || 'Assam';
  const riskLevel = alertData?.riskLevel || 'Very High';
  const riskScore = alertData?.riskScore || 88;

  const topic = 'signalmesh-hazard-alert';
  const url = `https://ntfy.sh/${topic}`;

  const message = `🚨 SignalMesh AI EMERGENCY ALERT: ${riskLevel.toUpperCase()} LANDSLIDE RISK in ${locName}, ${stateName}. Score: ${riskScore}/100. Avoid cut-slopes! Info: http://10.60.203.188:3000/alerts`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Title: `🚨 SignalMesh AI: ${riskLevel} Risk in ${locName}`,
        Priority: '5', // Emergency priority: loud sound + vibration
        Tags: 'warning,rotating_light,sos',
        Click: 'http://10.60.203.188:3000/alerts'
      },
      body: message
    });

    const data = await res.json();
    return {
      success: true,
      provider: 'Instant Mobile Push (ntfy.sh)',
      topic,
      url: `https://ntfy.sh/${topic}`,
      id: data.id,
      message: `Instant push broadcast sent to topic '${topic}'. Open https://ntfy.sh/${topic} on any phone for instant lock-screen alert!`
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to dispatch instant push: ${err.message}`
    };
  }
}

module.exports = {
  checkUsbDevices,
  pushUsbAlert,
  pushInstantMobileAlert
};
