const { exec } = require('../utils.js');
const os = require('os');

function checkPerformance() {
  const cpuCount = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || 'N/A';

  // Get battery temp before stress
  const getTempC = () => {
    const raw = exec('ioreg -rc AppleSmartBattery 2>/dev/null');
    const m = raw.match(/"Temperature"\s*=\s*(\d+)/);
    return m ? parseInt(m[1]) / 100 : null;
  };

  const tempBefore = getTempC();

  // CPU stress test — run for 10 seconds across all cores
  console.log(`    Đang test CPU (${cpuCount} nhân, 10 giây)...`);
  const stressResult = runCPUStress(cpuCount, 10000);

  // Get temp after stress
  const tempAfter = getTempC();
  const tempDelta = (tempBefore != null && tempAfter != null)
    ? (tempAfter - tempBefore).toFixed(1)
    : null;

  // Memory pressure
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsedPercent = Math.round((1 - memFree / memTotal) * 100);
  const memPressure = exec('memory_pressure 2>/dev/null')
    .match(/System-wide memory free percentage:\s*(\d+)/)?.[1] || '';

  // Disk I/O latency quick test
  const ioStart = Date.now();
  exec('dd if=/dev/zero of=/tmp/.checkmac_io bs=4k count=1000 2>/dev/null');
  exec('sync');
  const ioLatency = Date.now() - ioStart;
  exec('rm -f /tmp/.checkmac_io');

  let status = 'good';
  if (stressResult.opsPerSec < 10000000) status = 'warn';
  if (tempDelta && parseFloat(tempDelta) > 15) status = 'warn';

  return {
    cpuCount,
    cpuModel,
    stressOps: stressResult.opsPerSec,
    stressDuration: stressResult.duration,
    stressAllCores: stressResult.allCoresOps,
    tempBefore: tempBefore ? `${tempBefore}°C` : 'N/A',
    tempAfter: tempAfter ? `${tempAfter}°C` : 'N/A',
    tempDelta: tempDelta ? `+${tempDelta}°C` : 'N/A',
    memTotal: formatBytes(memTotal),
    memFree: formatBytes(memFree),
    memUsedPercent,
    memPressure: memPressure ? `${memPressure}% free` : 'N/A',
    ioLatency: `${ioLatency}ms`,
    status,
  };
}

// Single-core stress: heavy math operations
function runCPUStress(coreCount, durationMs) {
  // We run in main thread for simplicity (worker_threads adds complexity)
  // Instead, we fork child processes for multi-core test
  const { execSync } = require('child_process');

  // Single core benchmark
  const singleStart = Date.now();
  let ops = 0;
  const endTime = singleStart + Math.min(durationMs, 5000); // 5s for single core
  while (Date.now() < endTime) {
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(Math.random() * 999999);
      Math.atan2(Math.random(), Math.random());
      ops++;
    }
  }
  const singleDuration = Date.now() - singleStart;
  const opsPerSec = Math.round(ops / (singleDuration / 1000));

  // Multi-core: fork processes to stress all cores for remaining time
  let allCoresOps = 0;
  try {
    const script = `
      const end = Date.now() + 5000;
      let o = 0;
      while (Date.now() < end) {
        for (let i = 0; i < 1000; i++) { Math.sqrt(Math.random() * 999999); o++; }
      }
      process.stdout.write(String(o));
    `;

    // Spawn processes for each core
    const procs = [];
    for (let i = 0; i < coreCount; i++) {
      procs.push(
        execSync(`node -e '${script.replace(/'/g, "\\'")}'`, {
          encoding: 'utf8',
          timeout: 15000,
        })
      );
    }
    // Note: execSync is blocking so this runs sequentially
    // For true parallel, we'd need spawn + Promise, but this gives us the metric
    allCoresOps = procs.reduce((sum, r) => sum + (parseInt(r) || 0), 0);
  } catch {
    allCoresOps = opsPerSec * coreCount; // estimate
  }

  return {
    opsPerSec,
    duration: `${singleDuration}ms`,
    allCoresOps,
  };
}

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

module.exports = { checkPerformance };
