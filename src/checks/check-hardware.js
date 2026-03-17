const { exec, parseProfiler } = require('../utils.js');

function checkHardware() {
  const hw = parseProfiler('SPHardwareDataType');
  const serial = hw['Serial Number (system)'] || hw['Serial Number'] || 'N/A';
  const model = hw['Model Name'] || 'N/A';
  const modelId = hw['Model Identifier'] || 'N/A';
  const chip = hw['Chip'] || hw['Processor Name'] || 'N/A';
  const cpuCores = hw['Total Number of Cores'] || hw['Number of Cores'] || 'N/A';
  const memory = hw['Memory'] || 'N/A';
  const year = hw['Model Year'] || '';

  // GPU info
  const gpu = parseProfiler('SPDisplaysDataType');
  const gpuName = gpu['Chipset Model'] || gpu['Chip'] || chip;
  const gpuCores = gpu['Total Number of Cores'] || '';
  const vram = gpu['VRAM (Total)'] || gpu['VRAM'] || '';

  return {
    serial,
    model: `${model}${year ? ` (${year})` : ''}`,
    modelId,
    chip,
    cpuCores,
    memory,
    gpuName,
    gpuCores,
    vram,
  };
}

module.exports = { checkHardware };
