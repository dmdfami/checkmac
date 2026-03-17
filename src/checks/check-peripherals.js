const { exec } = require('../utils.js');

function checkPeripherals() {
  const raw = exec('system_profiler SPCameraDataType SPAudioDataType SPUSBDataType SPThunderboltDataType 2>/dev/null');

  // Camera
  const hasCamera = raw.includes('FaceTime') || raw.includes('Camera') || raw.includes('iSight');
  const cameraModel = raw.match(/Model ID:\s*(.+)/)?.[1] || '';

  // Audio — check for both input and output
  const audioRaw = exec('system_profiler SPAudioDataType 2>/dev/null');
  const hasSpeakers = audioRaw.includes('Speaker') || audioRaw.includes('Output');
  const hasMic = audioRaw.includes('Microphone') || audioRaw.includes('Input');

  // USB ports
  const usbRaw = exec('system_profiler SPUSBDataType 2>/dev/null');
  const usbControllers = (usbRaw.match(/USB\s*\d\.\d\s*Bus/gi) || []).length;
  const usbDevices = (usbRaw.match(/Product ID:/g) || []).length;

  // Thunderbolt
  const tbRaw = exec('system_profiler SPThunderboltDataType 2>/dev/null');
  const tbPorts = (tbRaw.match(/Port/gi) || []).length;
  const tbVersion = tbRaw.match(/Version:\s*(.+)/)?.[1] || '';

  // Keyboard (internal) — multiple detection methods
  const ioregAll = exec('ioreg -l 2>/dev/null');
  const hasKeyboard = ioregAll.includes('Keyboard') ||
    exec('hidutil list 2>/dev/null').includes('Keyboard');

  // Trackpad — multiple detection methods
  const hasTrackpad = ioregAll.includes('Trackpad') ||
    exec('hidutil list 2>/dev/null').includes('Trackpad');

  // Touch Bar (MacBook Pro 2016-2020)
  const hasTouchBar = exec('ioreg -l 2>/dev/null | grep -c DFR').trim() !== '0';

  // Touch ID
  const hasTouchID = exec('bioutil -c -s 2>/dev/null').includes('biometrics') ||
    exec('system_profiler SPiBridgeDataType 2>/dev/null').includes('Touch ID');

  const allDevices = [hasCamera, hasSpeakers, hasMic, hasKeyboard, hasTrackpad];
  const detectedCount = allDevices.filter(Boolean).length;

  let status = 'good';
  if (detectedCount < 3) status = 'bad';
  else if (detectedCount < 5) status = 'warn';

  return {
    hasCamera,
    cameraModel,
    hasSpeakers,
    hasMic,
    usbControllers,
    usbDevices,
    tbPorts,
    tbVersion,
    hasKeyboard,
    hasTrackpad,
    hasTouchBar,
    hasTouchID,
    detectedCount,
    totalDevices: allDevices.length,
    status,
  };
}

module.exports = { checkPeripherals };
