const { exec, parseProfiler } = require('../utils.js');

function checkDisplay() {
  const raw = exec('system_profiler SPDisplaysDataType 2>/dev/null');
  const resolution = raw.match(/Resolution:\s*(.+)/)?.[1] || 'N/A';
  const retinaMatch = raw.match(/Retina/i);
  const isRetina = !!retinaMatch;
  const refreshRate = raw.match(/UI Looks like:\s*(.+)/)?.[1] || '';
  const mainDisplay = raw.match(/Main Display:\s*(.+)/)?.[1] || '';

  // Display name / type
  const displayName = raw.match(/Display Type:\s*(.+)/)?.[1] ||
    raw.match(/Chipset Model:\s*(.+)/)?.[1] || 'Built-in';

  // ProMotion (120Hz) check
  const proMotion = raw.includes('ProMotion') || raw.includes('120');

  // External displays
  const displays = (raw.match(/Display Type:/g) || []).length || 1;

  // True Tone
  const trueTone = raw.includes('True Tone');

  // HDR
  const hdr = raw.includes('HDR');

  return {
    resolution,
    isRetina,
    proMotion,
    displayName,
    displays,
    trueTone,
    hdr,
    status: 'info',
  };
}

module.exports = { checkDisplay };
