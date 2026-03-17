const { Spinner, bold, cyan, red } = require('./utils.js');
const { checkHardware } = require('./checks/check-hardware.js');
const { checkBattery } = require('./checks/check-battery.js');
const { checkStorage } = require('./checks/check-storage.js');
const { checkSecurity } = require('./checks/check-security.js');
const { checkNetwork } = require('./checks/check-network.js');
const { checkPeripherals } = require('./checks/check-peripherals.js');
const { checkDisplay } = require('./checks/check-display.js');
const { checkSystem } = require('./checks/check-system.js');
const { checkPerformance } = require('./checks/check-performance.js');
const { calculateScores } = require('./scoring.js');
const { printReport } = require('./reporter.js');

async function runAllChecks() {
  console.log('');
  console.log(cyan('╔══════════════════════════════════════════════════════════╗'));
  console.log(cyan('║') + bold('   🖥️  CHECKMAC — Kiểm tra chất lượng MacBook            ') + cyan('║'));
  console.log(cyan('║') + '   by @dmdfami • v1.0.0                                   ' + cyan('║'));
  console.log(cyan('╚══════════════════════════════════════════════════════════╝'));
  console.log('');

  // Check if running on macOS
  if (process.platform !== 'darwin') {
    console.log(red('❌ Tool này chỉ chạy trên macOS!'));
    process.exit(1);
  }

  const steps = [
    ['Phần cứng & Model', checkHardware, 'hardware'],
    ['Pin', checkBattery, 'battery'],
    ['Ổ cứng & SMART', checkStorage, 'storage'],
    ['Bảo mật & MDM', checkSecurity, 'security'],
    ['WiFi & Bluetooth', checkNetwork, 'network'],
    ['Camera, Loa, USB...', checkPeripherals, 'peripherals'],
    ['Màn hình', checkDisplay, 'display'],
    ['Hệ thống & Crash logs', checkSystem, 'system'],
    ['Hiệu năng CPU (stress test)', checkPerformance, 'performance'],
  ];

  const results = {};
  const spinner = new Spinner('');

  for (let i = 0; i < steps.length; i++) {
    const [label, fn, key] = steps[i];
    spinner.update(`[${i + 1}/${steps.length}] Đang kiểm tra ${label}...`);
    spinner.start();

    try {
      results[key] = fn();
    } catch (err) {
      results[key] = { error: err.message, status: 'bad' };
    }

    spinner.stop(`  ✅ ${label}`);
  }

  // Calculate scores
  const scoring = calculateScores(results);

  // Print full report
  printReport(results, scoring);
}

module.exports = { runAllChecks };
