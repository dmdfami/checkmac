const { exec } = require('../utils.js');

function checkBattery() {
  const raw = exec('ioreg -rc AppleSmartBattery 2>/dev/null');
  if (!raw) {
    return { hasBattery: false };
  }

  const get = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*=\\s*(.+)`));
    return m ? m[1].trim() : null;
  };

  const cycleCount = parseInt(get('CycleCount')) || 0;
  const maxCap = parseInt(get('AppleRawMaxCapacity') || get('MaxCapacity')) || 0;
  const designCap = parseInt(get('DesignCapacity')) || 0;
  const currentCap = parseInt(get('AppleRawCurrentCapacity') || get('CurrentCapacity')) || 0;
  const isCharging = get('IsCharging') === 'Yes';
  const fullyCharged = get('FullyCharged') === 'Yes';
  const temperature = parseInt(get('Temperature')) || 0; // centidegrees C
  const tempCelsius = (temperature / 100).toFixed(1);
  const healthPercent = designCap > 0 ? Math.round((maxCap / designCap) * 100) : 0;

  // Apple defines max cycle for most models
  const maxCycles = 1000;
  const cyclePercent = Math.round((cycleCount / maxCycles) * 100);

  // Condition from system
  const condition = exec('system_profiler SPPowerDataType 2>/dev/null')
    .match(/Condition:\s*(.+)/)?.[1] || 'N/A';

  let status = 'good';
  if (healthPercent < 80 || cycleCount > 800) status = 'bad';
  else if (healthPercent < 90 || cycleCount > 500) status = 'warn';

  return {
    hasBattery: true,
    cycleCount,
    maxCycles,
    cyclePercent,
    maxCap,
    designCap,
    currentCap,
    healthPercent,
    isCharging,
    fullyCharged,
    tempCelsius,
    condition,
    status,
  };
}

module.exports = { checkBattery };
