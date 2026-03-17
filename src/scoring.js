// Calculate overall quality score from all check results

function calculateScores(results) {
  const scores = {};

  // Battery: 30% weight
  if (results.battery.hasBattery) {
    const health = results.battery.healthPercent;
    const cycle = results.battery.cycleCount;
    let s = 10;
    if (health < 70) s = 3;
    else if (health < 80) s = 5;
    else if (health < 85) s = 6;
    else if (health < 90) s = 7;
    else if (health < 95) s = 8;
    // Cycle penalty
    if (cycle > 800) s -= 2;
    else if (cycle > 500) s -= 1;
    scores.battery = { score: Math.max(0, s), weight: 30, label: 'Pin' };
  } else {
    scores.battery = { score: 5, weight: 10, label: 'Pin (desktop)' };
  }

  // Storage SMART: 20%
  const smartOk = results.storage.smart === 'Verified';
  scores.storage = {
    score: smartOk ? 10 : 0,
    weight: 20,
    label: 'Ổ cứng',
  };

  // Security: 20%
  const sec = results.security;
  let secScore = 10;
  if (sec.hasMDM) secScore -= 5;
  if (sec.findMyEnabled) secScore -= 4;
  if (sec.firmwarePassword) secScore -= 3;
  if (!sec.sipEnabled) secScore -= 1;
  scores.security = {
    score: Math.max(0, secScore),
    weight: 20,
    label: 'Bảo mật',
  };

  // Peripherals: 15%
  const peri = results.peripherals;
  scores.peripherals = {
    score: Math.round((peri.detectedCount / peri.totalDevices) * 10),
    weight: 15,
    label: 'Thiết bị ngoại vi',
  };

  // System stability: 15%
  const sys = results.system;
  let sysScore = 10;
  if (sys.kernelPanics > 3) sysScore = 3;
  else if (sys.kernelPanics > 0) sysScore -= 2;
  if (sys.crashCount > 20) sysScore -= 2;
  else if (sys.crashCount > 10) sysScore -= 1;
  scores.system = {
    score: Math.max(0, sysScore),
    weight: 15,
    label: 'Ổn định hệ thống',
  };

  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  for (const k of Object.keys(scores)) {
    weightedSum += scores[k].score * scores[k].weight;
    totalWeight += scores[k].weight;
  }
  const overall = (weightedSum / totalWeight).toFixed(1);

  // Grade
  let grade, gradeLabel;
  if (overall >= 9) { grade = 'A+'; gradeLabel = 'XUẤT SẮC'; }
  else if (overall >= 8) { grade = 'A'; gradeLabel = 'RẤT TỐT'; }
  else if (overall >= 7) { grade = 'B+'; gradeLabel = 'TỐT'; }
  else if (overall >= 6) { grade = 'B'; gradeLabel = 'KHÁ'; }
  else if (overall >= 5) { grade = 'C'; gradeLabel = 'TRUNG BÌNH'; }
  else { grade = 'D'; gradeLabel = 'KÉM'; }

  return { scores, overall, grade, gradeLabel };
}

module.exports = { calculateScores };
