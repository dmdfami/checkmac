const { execSync } = require('child_process');

// ANSI color helpers — zero dependencies
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function bold(s) { return `${c.bold}${s}${c.reset}`; }
function red(s) { return `${c.red}${s}${c.reset}`; }
function green(s) { return `${c.green}${s}${c.reset}`; }
function yellow(s) { return `${c.yellow}${s}${c.reset}`; }
function blue(s) { return `${c.blue}${s}${c.reset}`; }
function cyan(s) { return `${c.cyan}${s}${c.reset}`; }
function dim(s) { return `${c.dim}${s}${c.reset}`; }
function magenta(s) { return `${c.magenta}${s}${c.reset}`; }
function bgStatus(status) {
  if (status === 'good') return `${c.bgGreen}${c.white}${c.bold} ✅ TỐT ${c.reset}`;
  if (status === 'warn') return `${c.bgYellow}${c.white}${c.bold} ⚠️  CHÚ Ý ${c.reset}`;
  if (status === 'bad') return `${c.bgRed}${c.white}${c.bold} 🔴 NGUY HIỂM ${c.reset}`;
  return `${c.dim} ℹ️  INFO ${c.reset}`;
}

// Safe exec — returns empty string on error
function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000, ...opts }).trim();
  } catch {
    return '';
  }
}

// Parse system_profiler output into key-value object
function parseProfiler(type) {
  const raw = exec(`system_profiler ${type} 2>/dev/null`);
  const result = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s+(.+?):\s+(.+)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

// Progress bar generator
function progressBar(percent, width = 20) {
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  let color = c.green;
  if (percent > 70) color = c.yellow;
  if (percent > 90) color = c.red;
  return `${color}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset} ${percent}%`;
}

// Box drawing
function box(title, lines, width = 56) {
  const out = [];
  out.push(`${cyan('┌' + '─'.repeat(width - 2) + '┐')}`);
  if (title) {
    const pad = width - 4 - stripAnsi(title).length;
    out.push(`${cyan('│')} ${bold(title)}${' '.repeat(Math.max(0, pad))} ${cyan('│')}`);
    out.push(`${cyan('├' + '─'.repeat(width - 2) + '┤')}`);
  }
  for (const line of lines) {
    const visLen = stripAnsi(line).length;
    const pad = width - 4 - visLen;
    out.push(`${cyan('│')} ${line}${' '.repeat(Math.max(0, pad))} ${cyan('│')}`);
  }
  out.push(`${cyan('└' + '─'.repeat(width - 2) + '┘')}`);
  return out.join('\n');
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// Section header
function section(icon, title, status) {
  return `${icon} ${bold(title)}${' '.repeat(Math.max(1, 30 - title.length))}${bgStatus(status)}`;
}

// Spinner for progress feedback
class Spinner {
  constructor(text) {
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.i = 0;
    this.text = text;
    this.timer = null;
  }
  start() {
    this.timer = setInterval(() => {
      process.stdout.write(`\r${cyan(this.frames[this.i++ % this.frames.length])} ${this.text}`);
    }, 80);
    return this;
  }
  update(text) { this.text = text; }
  stop(msg) {
    clearInterval(this.timer);
    process.stdout.write(`\r${' '.repeat(60)}\r`);
    if (msg) console.log(msg);
  }
}

module.exports = {
  c, bold, red, green, yellow, blue, cyan, dim, magenta,
  bgStatus, exec, parseProfiler, progressBar, box, stripAnsi,
  section, Spinner
};
