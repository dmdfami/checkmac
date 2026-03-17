const { exec } = require('../utils.js');
const fs = require('fs');

function checkSecurity() {
  // MDM enrollment check
  const profiles = exec('profiles status -type enrollment 2>&1');
  const hasMDM = profiles.includes('MDM enrollment') && !profiles.includes('No');
  const mdmDetail = hasMDM
    ? (profiles.match(/MDM server:\s*(.+)/)?.[1] || 'Có đăng ký MDM')
    : 'Không có MDM';

  // Also check profiles list
  const profilesList = exec('profiles list 2>&1');
  const hasProfiles = !profilesList.includes('no profiles') &&
    !profilesList.includes('There are no') &&
    profilesList.length > 10;

  // Check MDM config profiles directory
  const mdmConfigExists = fs.existsSync('/var/db/ConfigurationProfiles/Settings/.profilesAreInstalled');

  // Find My Mac
  const findMyRaw = exec('nvram -x -p 2>/dev/null');
  const findMyEnabled = findMyRaw.includes('fmm-mobileme-token') || findMyRaw.includes('FindMy');

  // Also check via iCloud
  const findMyAlt = exec('defaults read /Library/Preferences/com.apple.FindMyMac 2>/dev/null');
  const findMyAlt2 = findMyAlt.includes('1') || findMyEnabled;

  // FileVault
  const fdeStatus = exec('fdesetup status 2>/dev/null');
  const fileVaultOn = fdeStatus.includes('On') || fdeStatus.includes('Encryption');

  // SIP (System Integrity Protection)
  const sipStatus = exec('csrutil status 2>/dev/null');
  const sipEnabled = sipStatus.includes('enabled');

  // Firmware password (T2/Intel Macs)
  const firmwareRaw = exec('firmwarepasswd -check 2>/dev/null');
  const firmwarePassword = firmwareRaw.includes('Yes');

  // Activation Lock — check via serial
  const gatekeeper = exec('spctl --status 2>/dev/null');
  const gatekeeperOn = gatekeeper.includes('assessments enabled');

  // Secure Boot (Apple Silicon / T2)
  const secureBoot = exec('system_profiler SPiBridgeDataType 2>/dev/null');
  const secureBootMode = secureBoot.match(/Secure Boot Setting:\s*(.+)/)?.[1] || 'N/A';

  // Remote Desktop / Screen Sharing
  const remoteDesktop = exec('launchctl list 2>/dev/null | grep -i screensharing');
  const screenSharing = remoteDesktop.length > 0;

  // Firewall
  const firewallRaw = exec('defaults read /Library/Preferences/com.apple.alf globalstate 2>/dev/null');
  const firewallOn = firewallRaw === '1' || firewallRaw === '2';

  let status = 'good';
  if (hasMDM || findMyAlt2 || firmwarePassword) status = 'bad';
  else if (!sipEnabled || !gatekeeperOn || screenSharing) status = 'warn';

  return {
    hasMDM,
    mdmDetail,
    hasProfiles,
    mdmConfigExists,
    findMyEnabled: findMyAlt2,
    fileVaultOn,
    sipEnabled,
    firmwarePassword,
    gatekeeperOn,
    secureBootMode,
    screenSharing,
    firewallOn,
    status,
  };
}

module.exports = { checkSecurity };
