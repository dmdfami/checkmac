const { exec, Spinner } = require('../utils.js');
const { spawn } = require('child_process');
const os = require('os');

// Read CPU/GPU temperature via sudo powermetrics
// Fallback to ioreg battery temp if powermetrics fails
function readTemperatures() {
  // Try powermetrics first (needs sudo, most accurate)
  const pm = exec('sudo powermetrics --samplers smc -i1 -n1 2>/dev/null', { timeout: 10000 });
  if (pm) {
    const cpuMatch = pm.match(/CPU die temperature:\s*([\d.]+)\s*C/);
    const gpuMatch = pm.match(/GPU die temperature:\s*([\d.]+)\s*C/);
    if (cpuMatch || gpuMatch) {
      return {
        cpu: cpuMatch ? parseFloat(cpuMatch[1]) : null,
        gpu: gpuMatch ? parseFloat(gpuMatch[1]) : null,
        source: 'powermetrics',
      };
    }
  }

  // Fallback: ioreg battery temp
  const raw = exec('ioreg -rc AppleSmartBattery 2>/dev/null');
  const m = raw.match(/"Temperature"\s*=\s*(\d+)/);
  return {
    cpu: m ? parseInt(m[1]) / 100 : null,
    gpu: null,
    source: 'ioreg-battery',
  };
}

// Spawn N node processes in parallel, each doing CPU math for durationMs
function runParallelCPUStress(coreCount, durationMs) {
  return new Promise((resolve) => {
    const script = `
      const end = Date.now() + ${durationMs};
      let ops = 0;
      while (Date.now() < end) {
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(Math.random() * 999999);
          Math.atan2(Math.random(), Math.random());
          ops++;
        }
      }
      process.stdout.write(String(ops));
    `;

    let completed = 0;
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < coreCount; i++) {
      const child = spawn('node', ['-e', script], { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      child.stdout.on('data', (d) => { output += d; });
      child.on('close', () => {
        results.push(parseInt(output) || 0);
        completed++;
        if (completed === coreCount) {
          const elapsed = Date.now() - startTime;
          const totalOps = results.reduce((a, b) => a + b, 0);
          resolve({ totalOps, elapsed, perCore: results });
        }
      });
    }
  });
}

// Single-core benchmark (runs in main thread)
function runSingleCoreBenchmark(durationMs) {
  const start = Date.now();
  let ops = 0;
  const endTime = start + durationMs;
  while (Date.now() < endTime) {
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(Math.random() * 999999);
      Math.atan2(Math.random(), Math.random());
      ops++;
    }
  }
  const elapsed = Date.now() - start;
  return { ops, elapsed, opsPerSec: Math.round(ops / (elapsed / 1000)) };
}

// GPU stress via inline Swift Metal compute shader
function runGPUStress(durationSec) {
  const swiftCode = `
import Metal
import Foundation

guard let device = MTLCreateSystemDefaultDevice() else {
    print("NO_METAL")
    exit(0)
}

let count = 1024 * 1024
let bufferSize = count * MemoryLayout<Float>.size
guard let bufferA = device.makeBuffer(length: bufferSize, options: .storageModeShared),
      let bufferB = device.makeBuffer(length: bufferSize, options: .storageModeShared),
      let bufferC = device.makeBuffer(length: bufferSize, options: .storageModeShared) else {
    print("BUFFER_FAIL")
    exit(0)
}

// Fill buffers
let ptrA = bufferA.contents().bindMemory(to: Float.self, capacity: count)
let ptrB = bufferB.contents().bindMemory(to: Float.self, capacity: count)
for i in 0..<count {
    ptrA[i] = Float.random(in: 0...1)
    ptrB[i] = Float.random(in: 0...1)
}

let shaderSrc = ${'"""'}
#include <metal_stdlib>
using namespace metal;
kernel void stress(device float *A [[buffer(0)]],
                   device float *B [[buffer(1)]],
                   device float *C [[buffer(2)]],
                   uint id [[thread_position_in_grid]]) {
    float a = A[id], b = B[id];
    for (int i = 0; i < 200; i++) {
        a = a * b + sin(a) * cos(b);
        b = b * a + cos(b) * sin(a);
    }
    C[id] = a + b;
}
${'"""'}

guard let library = try? device.makeLibrary(source: shaderSrc, options: nil),
      let function = library.makeFunction(name: "stress"),
      let pipeline = try? device.makeComputePipelineState(function: function),
      let queue = device.makeCommandQueue() else {
    print("COMPILE_FAIL")
    exit(0)
}

let threadGroupSize = MTLSize(width: pipeline.maxTotalThreadsPerThreadgroup, height: 1, depth: 1)
let gridSize = MTLSize(width: count, height: 1, depth: 1)

let deadline = Date().addingTimeInterval(${durationSec})
var iterations = 0

while Date() < deadline {
    guard let cmdBuffer = queue.makeCommandBuffer(),
          let encoder = cmdBuffer.makeComputeCommandEncoder() else { break }
    encoder.setComputePipelineState(pipeline)
    encoder.setBuffer(bufferA, offset: 0, index: 0)
    encoder.setBuffer(bufferB, offset: 0, index: 1)
    encoder.setBuffer(bufferC, offset: 0, index: 2)
    encoder.dispatchThreads(gridSize, threadsPerThreadgroup: threadGroupSize)
    encoder.endEncoding()
    cmdBuffer.commit()
    cmdBuffer.waitUntilCompleted()
    iterations += 1
}

print("GPU_OK:\\(iterations):\\(device.name)")
`;

  // Write Swift file and compile+run
  const tmpFile = '/tmp/.checkmac_gpu_stress.swift';
  require('fs').writeFileSync(tmpFile, swiftCode);
  // Swift compile ~5s + buffer fill ~3s + run time → need generous timeout
  const result = exec(`swift ${tmpFile} 2>/dev/null`, { timeout: (durationSec + 30) * 1000 });
  exec(`rm -f ${tmpFile}`);

  if (result.startsWith('GPU_OK:')) {
    const parts = result.split(':');
    return { ok: true, iterations: parseInt(parts[1]), gpuName: parts[2] || 'Unknown' };
  }
  if (result === 'NO_METAL') return { ok: false, reason: 'No Metal support' };
  if (result === 'COMPILE_FAIL') return { ok: false, reason: 'Metal compile failed' };
  return { ok: false, reason: result || 'GPU stress timeout/error' };
}

// Monitor cool-down: read temp every intervalMs for totalMs
function monitorCoolDown(totalMs, intervalMs) {
  const samples = [];
  const rounds = Math.floor(totalMs / intervalMs);
  for (let i = 0; i < rounds; i++) {
    const temp = readTemperatures();
    samples.push({ time: i * intervalMs, cpu: temp.cpu, gpu: temp.gpu });
    if (i < rounds - 1) {
      // Blocking sleep via execSync — simple, no async needed
      exec(`sleep ${intervalMs / 1000}`);
    }
  }
  return samples;
}

// Calculate cooling rate from samples (°C per minute)
function calcCoolingRate(samples) {
  const cpuTemps = samples.filter(s => s.cpu != null);
  if (cpuTemps.length < 2) return { cpuRate: null, gpuRate: null };

  const first = cpuTemps[0];
  const last = cpuTemps[cpuTemps.length - 1];
  const elapsedMin = (last.time - first.time) / 60000;
  const cpuRate = elapsedMin > 0 ? (first.cpu - last.cpu) / elapsedMin : null;

  const gpuTemps = samples.filter(s => s.gpu != null);
  let gpuRate = null;
  if (gpuTemps.length >= 2) {
    const gFirst = gpuTemps[0];
    const gLast = gpuTemps[gpuTemps.length - 1];
    const gMin = (gLast.time - gFirst.time) / 60000;
    gpuRate = gMin > 0 ? (gFirst.gpu - gLast.gpu) / gMin : null;
  }

  return { cpuRate, gpuRate };
}

// Rate the cooling performance
// rate = how fast temp drops (°C/min). Higher = better cooling.
// But if peak temp was barely above baseline, cooling is irrelevant — machine ran cool.
function rateCooling(rate, peakTemp, baselineTemp) {
  if (rate == null) return 'N/A';
  // If temp delta was <3°C, machine stayed cool — excellent thermal
  if (peakTemp != null && baselineTemp != null && (peakTemp - baselineTemp) < 3) return 'excellent';
  if (rate > 10) return 'excellent';
  if (rate >= 5) return 'normal';
  return 'poor'; // likely dried thermal paste
}

async function checkPerformance() {
  const cpuCount = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || 'N/A';

  // 1. Baseline temperature
  console.log('    Đang đo nhiệt độ baseline...');
  const baseline = readTemperatures();

  // 2. Single-core CPU benchmark (5s)
  console.log(`    Đang test CPU single-core (5 giây)...`);
  const singleCore = runSingleCoreBenchmark(5000);

  // 3. Multi-core CPU stress — TRUE parallel (15s)
  console.log(`    Đang stress CPU ${cpuCount} nhân song song (15 giây)...`);
  const multiCore = await runParallelCPUStress(cpuCount, 15000);

  // Temperature after CPU stress
  const afterCPU = readTemperatures();

  // 4. GPU stress via Metal (15s)
  console.log('    Đang stress GPU via Metal (15 giây)...');
  const gpuResult = runGPUStress(15);

  // Temperature after GPU stress (peak)
  const peak = readTemperatures();

  // 5. Cool-down monitoring (60s, every 3s)
  console.log('    Đang theo dõi tốc độ hạ nhiệt (60 giây)...');
  const coolSamples = monitorCoolDown(60000, 3000);
  const { cpuRate, gpuRate } = calcCoolingRate(coolSamples);
  const coolRating = rateCooling(cpuRate, peak.cpu, baseline.cpu);

  // 6. Memory pressure
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsedPercent = Math.round((1 - memFree / memTotal) * 100);
  const memPressure = exec('memory_pressure 2>/dev/null')
    .match(/System-wide memory free percentage:\s*(\d+)/)?.[1] || '';

  // 7. Disk I/O latency
  const ioStart = Date.now();
  exec('dd if=/dev/zero of=/tmp/.checkmac_io bs=4k count=1000 2>/dev/null');
  exec('sync');
  const ioLatency = Date.now() - ioStart;
  exec('rm -f /tmp/.checkmac_io');

  // Determine status
  let status = 'good';
  if (singleCore.opsPerSec < 10000000) status = 'warn';
  if (peak.cpu && baseline.cpu && (peak.cpu - baseline.cpu) > 25) status = 'warn';
  if (coolRating === 'poor') status = 'warn';
  if (!gpuResult.ok) status = 'warn';

  return {
    cpuCount,
    cpuModel,
    // Single-core
    singleCoreOps: singleCore.opsPerSec,
    singleCoreDuration: `${singleCore.elapsed}ms`,
    // Multi-core (true parallel)
    multiCoreTotalOps: multiCore.totalOps,
    multiCoreDuration: `${multiCore.elapsed}ms`,
    // GPU
    gpuOk: gpuResult.ok,
    gpuIterations: gpuResult.ok ? gpuResult.iterations : 0,
    gpuName: gpuResult.ok ? gpuResult.gpuName : (gpuResult.reason || 'N/A'),
    gpuError: gpuResult.ok ? null : gpuResult.reason,
    // Temperatures
    tempSource: baseline.source,
    tempBaseline: baseline.cpu != null ? `${baseline.cpu.toFixed(1)}°C` : 'N/A',
    tempAfterCPU: afterCPU.cpu != null ? `${afterCPU.cpu.toFixed(1)}°C` : 'N/A',
    tempPeak: peak.cpu != null ? `${peak.cpu.toFixed(1)}°C` : 'N/A',
    tempDelta: (peak.cpu != null && baseline.cpu != null)
      ? `+${(peak.cpu - baseline.cpu).toFixed(1)}°C` : 'N/A',
    gpuTempBaseline: baseline.gpu != null ? `${baseline.gpu.toFixed(1)}°C` : 'N/A',
    gpuTempPeak: peak.gpu != null ? `${peak.gpu.toFixed(1)}°C` : 'N/A',
    // Cool-down
    coolDownSamples: coolSamples.length,
    cpuCoolRate: cpuRate != null ? `${cpuRate.toFixed(1)}°C/phút` : 'N/A',
    gpuCoolRate: gpuRate != null ? `${gpuRate.toFixed(1)}°C/phút` : 'N/A',
    coolRating,
    // Memory
    memTotal: formatBytes(memTotal),
    memFree: formatBytes(memFree),
    memUsedPercent,
    memPressure: memPressure ? `${memPressure}% free` : 'N/A',
    // Disk I/O
    ioLatency: `${ioLatency}ms`,
    status,
  };
}

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

module.exports = { checkPerformance };
