@echo off
title SignalMesh AI - Phone Alert Pusher
echo ========================================================
echo   SignalMesh AI - Direct Phone Alert Pusher (APEX-AI-X)
echo ========================================================
echo.
echo Option 1: Plug in your Android Phone with USB Cable and enable 'USB Debugging'
echo Option 2: Open http://10.60.203.188:3000 directly in Chrome/Safari on your phone
echo Option 3: Visit https://ntfy.sh/signalmesh-hazard-alert on your phone
echo.

set ADB="C:\Users\Abhhilash m\Downloads\platform-tools\platform-tools\adb.exe"

if exist %ADB% (
    echo [*] Checking for connected USB devices...
    %ADB% devices
    echo.
    echo [*] Dispatching native notification to connected Android device...
    %ADB% shell cmd notification post -S bigtext -t "🚨 [EMERGENCY HAZARD] Dima Hasao, Assam" "SignalMesh" "VERY HIGH LANDSLIDE RISK (88/100). Evacuate vulnerable slopes immediately!"
    %ADB% shell am start -a android.intent.action.VIEW -d "http://10.60.203.188:3000/alerts"
    echo.
    echo [*] Done! Check your phone's screen and notification bar.
) else (
    echo [!] ADB not found at expected path.
)

pause
