#!/usr/bin/env node

const { runAllChecks } = require('../src/index.js');

runAllChecks().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
