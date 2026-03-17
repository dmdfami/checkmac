const { exec } = require('../utils.js');
const fs = require('fs');
const path = require('path');

function checkSystem() {
  // macOS version
  const productName = exec('sw_vers -productName 2>/dev/null') || 'macOS';
  const productVersion = exec('sw_vers -productVersion 2>/dev/null') || 'N/A';
  const buildVersion = exec('sw_vers -buildVersion 2>/dev/null') || '';

  // Install date
  let installDate = 'N/A';
  try {
    const setupDone = '/var/db/.AppleSetupDone';
    if (fs.existsSync(setupDone)) {
      const stat = fs.statSync(setupDone);
      installDate = stat.birthtime.toISOString().split('T')[0];
    }
  } catch { /* ignore */ }

  // Uptime
  const uptimeRaw = exec('uptime 2>/dev/null');
  const uptimeMatch = uptimeRaw.match(/up\s+(.+?),\s+\d+\s+user/);
  const uptime = uptimeMatch ? uptimeMatch[1].trim() : 'N/A';

  // Crash logs (last 30 days)
  let crashCount = 0;
  let kernelPanics = 0;
  try {
    const diagDir = '/Library/Logs/DiagnosticReports';
    const userDiagDir = path.join(process.env.HOME || '', 'Library/Logs/DiagnosticReports');
    const thirtyDaysAgo = Date.now() - 30 * 86400000;

    for (const dir of [diagDir, userDiagDir]) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => {
        try {
          return fs.statSync(path.join(dir, f)).mtime.getTime() > thirtyDaysAgo;
        } catch { return false; }
      });
      crashCount += files.filter(f => f.endsWith('.crash') || f.endsWith('.ips')).length;
      kernelPanics += files.filter(f => f.includes('kernel') || f.includes('panic')).length;
    }
  } catch { /* ignore */ }

  // Last shutdown cause
  const shutdownCause = exec('log show --predicate \'eventMessage contains "Previous shutdown cause"\' --last 1h 2>/dev/null')
    .match(/Previous shutdown cause:\s*(.+)/)?.[1] || '';

  // Login items count
  const loginItems = exec('osascript -e \'tell application "System Events" to get the name of every login item\' 2>/dev/null');
  const loginItemCount = loginItems ? loginItems.split(',').length : 0;

  let status = 'good';
  if (kernelPanics > 3) status = 'bad';
  else if (crashCount > 20 || kernelPanics > 0) status = 'warn';

  return {
    productName,
    productVersion,
    buildVersion,
    installDate,
    uptime,
    crashCount,
    kernelPanics,
    loginItemCount,
    status,
  };
}

module.exports = { checkSystem };
