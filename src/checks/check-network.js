const { exec, parseProfiler } = require('../utils.js');

function checkNetwork() {
  // WiFi
  const wifiRaw = exec('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null');
  const wifiSSID = wifiRaw.match(/\bSSID:\s*(.+)/)?.[1] || '';
  const wifiConnected = wifiSSID.length > 0;
  const wifiSignal = wifiRaw.match(/agrCtlRSSI:\s*(-?\d+)/)?.[1] || '';
  const wifiChannel = wifiRaw.match(/channel:\s*(.+)/)?.[1] || '';

  // WiFi card present
  const wifiCard = exec('networksetup -listallhardwareports 2>/dev/null');
  const hasWifi = wifiCard.includes('Wi-Fi') || wifiCard.includes('AirPort');

  // Bluetooth
  const bt = parseProfiler('SPBluetoothDataType');
  const btVersion = bt['Bluetooth Low Energy Supported'] ? 'BLE' : '';
  const btAddress = bt['Address'] || '';
  const hasBluetooth = btAddress.length > 0 ||
    exec('system_profiler SPBluetoothDataType 2>/dev/null').includes('Bluetooth');

  // Bluetooth power state
  const btPower = exec('defaults read /Library/Preferences/com.apple.Bluetooth ControllerPowerState 2>/dev/null');
  const btOn = btPower === '1';

  // Ethernet
  const hasEthernet = wifiCard.includes('Ethernet');

  let status = 'good';
  if (!hasWifi || !hasBluetooth) status = 'bad';
  else if (!wifiConnected) status = 'warn';

  return {
    hasWifi,
    wifiConnected,
    wifiSSID,
    wifiSignal,
    wifiChannel,
    hasBluetooth,
    btOn,
    btVersion,
    hasEthernet,
    status,
  };
}

module.exports = { checkNetwork };
