const { exec } = require('../utils.js');

function checkStorage() {
  // SMART status
  const diskInfo = exec('diskutil info disk0 2>/dev/null');
  const smart = diskInfo.match(/SMART Status:\s*(.+)/)?.[1] || 'N/A';
  const diskType = diskInfo.match(/Solid State:\s*(.+)/)?.[1] === 'Yes' ? 'SSD' : 'HDD';
  const mediaName = diskInfo.match(/Media Name:\s*(.+)/)?.[1] || 'N/A';

  // Disk space for main volume
  const dfRaw = exec('df -h / 2>/dev/null');
  const dfLine = dfRaw.split('\n')[1] || '';
  const dfParts = dfLine.split(/\s+/);
  const totalSize = dfParts[1] || 'N/A';
  const usedSize = dfParts[2] || 'N/A';
  const availSize = dfParts[3] || 'N/A';
  const usedPercent = parseInt(dfParts[4]) || 0;

  // Disk write speed test (write 100MB temp file)
  let writeSpeed = 'N/A';
  let readSpeed = 'N/A';
  try {
    const writeResult = exec('dd if=/dev/zero of=/tmp/.checkmac_disktest bs=1m count=100 2>&1');
    writeSpeed = parseDDSpeed(writeResult);
    const readResult = exec('dd if=/tmp/.checkmac_disktest of=/dev/null bs=1m 2>&1');
    readSpeed = parseDDSpeed(readResult);

    exec('rm -f /tmp/.checkmac_disktest');
  } catch { /* ignore */ }

  let status = 'good';
  if (smart !== 'Verified') status = 'bad';
  else if (usedPercent > 90) status = 'warn';

  return {
    smart,
    diskType,
    mediaName,
    totalSize,
    usedSize,
    availSize,
    usedPercent,
    writeSpeed,
    readSpeed,
    status,
  };
}

function parseDDSpeed(output) {
  // Try "X bytes/sec" format
  const bytesMatch = output.match(/([\d.]+)\s*bytes\/sec/);
  if (bytesMatch) {
    const mbps = parseFloat(bytesMatch[1]) / (1024 * 1024);
    return mbps >= 1024 ? `${(mbps / 1024).toFixed(1)} GB/s` : `${Math.round(mbps)} MB/s`;
  }
  // Try "X MB/s" or "X GB/s"
  const speedMatch = output.match(/([\d.]+)\s*(MB\/s|GB\/s)/);
  return speedMatch ? speedMatch[0] : 'N/A';
}

module.exports = { checkStorage };
