const {
  bold, red, green, yellow, blue, cyan, dim, magenta,
  bgStatus, progressBar, box, section, stripAnsi
} = require('./utils.js');

function yn(v) { return v ? green('✅ Có') : red('❌ Không'); }
function ynReverse(v) { return v ? red('⚠️  BẬT') : green('✅ Tắt'); }

function printReport(results, scoring) {
  const { hardware: hw, battery: bat, storage: st, security: sec,
    network: net, peripherals: peri, display: disp,
    system: sys, performance: perf } = results;

  const W = 60;
  const line = cyan('─'.repeat(W));

  console.log('\n');
  console.log(box('🖥️  KIỂM TRA MACBOOK - BÁO CÁO CHẤT LƯỢNG', [
    `Model: ${bold(hw.model)}  (${hw.modelId})`,
    `Chip:  ${bold(hw.chip)}  ${hw.cpuCores} cores`,
    `RAM:   ${bold(hw.memory)}   GPU: ${hw.gpuName}`,
    `Serial: ${bold(hw.serial)}`,
    `macOS:  ${sys.productVersion} (${sys.buildVersion})`,
  ], W));

  // Battery
  console.log('');
  console.log(section('🔋', 'PIN', bat.status));
  if (bat.hasBattery) {
    console.log(`    Chu kỳ sạc: ${bold(`${bat.cycleCount}`)}/${bat.maxCycles}  (${bat.cyclePercent}% đã dùng)`);
    console.log(`    Sức khỏe:   ${progressBar(bat.healthPercent)}  (${bat.maxCap}/${bat.designCap} mAh)`);
    console.log(`    Tình trạng: ${bat.condition}`);
    console.log(`    Nhiệt độ:   ${bat.tempCelsius}°C   ${bat.isCharging ? '⚡ Đang sạc' : bat.fullyCharged ? '🔌 Đã đầy' : '🔋 Dùng pin'}`);
  } else {
    console.log(`    ${dim('Không có pin (Desktop Mac)')}`);
  }

  // Storage
  console.log('');
  console.log(section('💾', 'Ổ CỨNG', st.status));
  console.log(`    SMART:     ${st.smart === 'Verified' ? green('✅ Verified') : red('❌ ' + st.smart)}`);
  console.log(`    Loại:      ${st.diskType} — ${st.mediaName}`);
  console.log(`    Dung lượng: ${st.usedSize} / ${st.totalSize}  (còn trống ${st.availSize})`);
  console.log(`    Đã dùng:   ${progressBar(st.usedPercent)}`);
  console.log(`    Tốc độ:    Ghi ${bold(st.writeSpeed)} | Đọc ${bold(st.readSpeed)}`);

  // Security
  console.log('');
  console.log(section('🔒', 'BẢO MẬT', sec.status));
  console.log(`    MDM:              ${sec.hasMDM ? red('🔴 CÓ MDM — ' + sec.mdmDetail) : green('✅ Không có MDM')}`);
  console.log(`    Find My Mac:      ${ynReverse(sec.findMyEnabled)}${sec.findMyEnabled ? red(' ← YÊU CẦU TẮT!') : ''}`);
  console.log(`    Firmware Password: ${ynReverse(sec.firmwarePassword)}`);
  console.log(`    FileVault:        ${sec.fileVaultOn ? yellow('🔐 Bật') : dim('Tắt')}`);
  console.log(`    SIP:              ${sec.sipEnabled ? green('✅ Enabled') : red('⚠️  Disabled')}`);
  console.log(`    Gatekeeper:       ${sec.gatekeeperOn ? green('✅ Enabled') : yellow('⚠️  Disabled')}`);
  console.log(`    Secure Boot:      ${sec.secureBootMode}`);
  console.log(`    Firewall:         ${sec.firewallOn ? green('✅ Bật') : yellow('⚠️  Tắt')}`);
  console.log(`    Screen Sharing:   ${sec.screenSharing ? yellow('⚠️  Bật') : green('✅ Tắt')}`);
  if (sec.hasProfiles || sec.mdmConfigExists) {
    console.log(`    ${red('⚠️  Phát hiện Configuration Profiles — kiểm tra kỹ!')}`);
  }

  // Network
  console.log('');
  console.log(section('📡', 'KẾT NỐI', net.status));
  console.log(`    WiFi:      ${yn(net.hasWifi)}${net.wifiConnected ? ` — ${net.wifiSSID} (${net.wifiSignal}dBm)` : ''}`);
  console.log(`    Bluetooth: ${yn(net.hasBluetooth)}${net.btOn ? ' (Bật)' : ''}`);
  console.log(`    Ethernet:  ${net.hasEthernet ? '✅ Có' : dim('Không có')}`);

  // Peripherals
  console.log('');
  console.log(section('🎛️', 'THIẾT BỊ', peri.status));
  console.log(`    Camera:    ${yn(peri.hasCamera)}${peri.cameraModel ? ` (${peri.cameraModel})` : ''}`);
  console.log(`    Loa:       ${yn(peri.hasSpeakers)}`);
  console.log(`    Micro:     ${yn(peri.hasMic)}`);
  console.log(`    Bàn phím:  ${yn(peri.hasKeyboard)}`);
  console.log(`    Trackpad:  ${yn(peri.hasTrackpad)}`);
  console.log(`    Touch Bar: ${peri.hasTouchBar ? '✅ Có' : dim('Không')}`);
  console.log(`    Touch ID:  ${peri.hasTouchID ? '✅ Có' : dim('Không')}`);
  console.log(`    USB:       ${peri.usbControllers} controllers, ${peri.usbDevices} devices`);
  console.log(`    Thunderbolt: ${peri.tbPorts} ports ${peri.tbVersion ? `(${peri.tbVersion})` : ''}`);

  // Display
  console.log('');
  console.log(section('🖥️', 'MÀN HÌNH', 'info'));
  console.log(`    Độ phân giải: ${bold(disp.resolution)}${disp.isRetina ? ' Retina' : ''}`);
  console.log(`    ProMotion:    ${disp.proMotion ? green('✅ 120Hz') : dim('60Hz')}`);
  console.log(`    True Tone:    ${disp.trueTone ? '✅' : dim('Không')}`);
  console.log(`    HDR:          ${disp.hdr ? '✅' : dim('Không')}`);

  // Performance
  console.log('');
  console.log(section('⚡', 'HIỆU NĂNG', perf.status));
  console.log(`    CPU:        ${perf.cpuCount} nhân — ${(perf.singleCoreOps / 1000000).toFixed(1)}M ops/s (single-core)`);
  console.log(`    Multi-core: ${(perf.multiCoreTotalOps / 1000000).toFixed(1)}M ops tổng (${perf.multiCoreDuration} — song song thật)`);
  console.log(`    GPU:        ${perf.gpuOk ? green('✅ Metal OK') + ` — ${perf.gpuName} (${perf.gpuIterations} iterations)` : yellow('⚠️  ' + perf.gpuError)}`);
  console.log(`    Nhiệt độ:   ${perf.tempBaseline} → ${perf.tempAfterCPU} (CPU) → ${bold(perf.tempPeak)} (peak)  ${bold(perf.tempDelta)}`);
  if (perf.gpuTempBaseline !== 'N/A') {
    console.log(`    GPU temp:   ${perf.gpuTempBaseline} → ${perf.gpuTempPeak}`);
  }
  const coolColor = perf.coolRating === 'excellent' ? green : perf.coolRating === 'normal' ? yellow : perf.coolRating === 'poor' ? red : dim;
  const coolLabel = perf.coolRating === 'excellent' ? 'XUẤT SẮC' : perf.coolRating === 'normal' ? 'BÌNH THƯỜNG' : perf.coolRating === 'poor' ? 'KÉM (kiểm tra keo tản nhiệt!)' : 'N/A';
  console.log(`    Hạ nhiệt:   ${perf.cpuCoolRate} CPU${perf.gpuCoolRate !== 'N/A' ? ` | ${perf.gpuCoolRate} GPU` : ''} — ${coolColor(coolLabel)}`);
  console.log(`    RAM:        ${perf.memTotal} — ${perf.memUsedPercent}% đang dùng  ${perf.memPressure}`);
  console.log(`    Disk I/O:   ${perf.ioLatency} (4KB x 1000 writes)`);

  // System
  console.log('');
  console.log(section('📊', 'HỆ THỐNG', sys.status));
  console.log(`    macOS:        ${sys.productName} ${sys.productVersion}`);
  console.log(`    Ngày cài đặt: ${sys.installDate}`);
  console.log(`    Uptime:       ${sys.uptime}`);
  console.log(`    Crash (30d):  ${sys.crashCount === 0 ? green('0') : yellow(String(sys.crashCount))}`);
  console.log(`    Kernel panic: ${sys.kernelPanics === 0 ? green('0') : red(String(sys.kernelPanics))}`);
  console.log(`    Login items:  ${sys.loginItemCount}`);

  // Overall Score
  console.log('');
  const { overall, grade, gradeLabel, scores } = scoring;
  const scoreColor = overall >= 8 ? green : overall >= 6 ? yellow : red;
  console.log(box(`📋  ĐÁNH GIÁ TỔNG: ${scoreColor(`${overall}/10`)} — ${bold(grade)} ${gradeLabel}`, [
    '',
    ...Object.values(scores).map(s =>
      `  ${s.label.padEnd(20)} ${progressBar(s.score * 10, 15)}  (x${s.weight}%)`
    ),
    '',
    ...getWarnings(results),
    '',
    `${dim(`Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}`)}`,
  ], W));
  console.log('');
}

function getWarnings(r) {
  const warnings = [];
  if (r.security.hasMDM)
    warnings.push(red('🔴 MÁY CÓ MDM — Có thể bị khóa từ xa bởi doanh nghiệp!'));
  if (r.security.findMyEnabled)
    warnings.push(red('🔴 Find My Mac đang BẬT — Yêu cầu người bán TẮT trước khi nhận!'));
  if (r.security.firmwarePassword)
    warnings.push(red('🔴 Firmware Password — Có thể không cài lại được macOS!'));
  if (r.storage.smart !== 'Verified')
    warnings.push(red('🔴 Ổ cứng SMART lỗi — KHÔNG NÊN MUA!'));
  if (r.battery.hasBattery && r.battery.healthPercent < 80)
    warnings.push(yellow('⚠️  Pin dưới 80% — cần thay pin (~1.5-3 triệu)'));
  if (r.system.kernelPanics > 0)
    warnings.push(yellow(`⚠️  Phát hiện ${r.system.kernelPanics} kernel panic — có thể lỗi phần cứng`));
  if (!r.security.sipEnabled)
    warnings.push(yellow('⚠️  SIP bị tắt — hệ thống có thể đã bị can thiệp'));
  if (r.security.screenSharing)
    warnings.push(yellow('⚠️  Screen Sharing đang bật — kiểm tra remote access'));
  if (r.performance.coolRating === 'poor')
    warnings.push(yellow('⚠️  Tốc độ hạ nhiệt kém — có thể keo tản nhiệt đã khô'));
  if (!r.performance.gpuOk)
    warnings.push(yellow('⚠️  GPU Metal test thất bại — kiểm tra GPU'));
  if (warnings.length === 0)
    warnings.push(green('✅ Không phát hiện vấn đề nghiêm trọng'));
  return warnings;
}

module.exports = { printReport };
