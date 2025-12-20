#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

// Get local network IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return null;
}

const localIP = getLocalIP();
const port = process.env.PORT || 3000;

console.log('\n🚀 Starting ImageBox development server...\n');
console.log('📍 Access URLs:');
console.log(`   Local:    http://localhost:${port}`);

if (localIP) {
  console.log(`   Network:  http://${localIP}:${port}`);
  console.log('\n💡 Share the Network URL with devices on your LAN\n');
} else {
  console.log('   Network:  Unable to detect IP address');
}

// Determine the correct next binary path for Windows
const isWindows = process.platform === 'win32';
const nextBin = isWindows
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'next.cmd')
  : 'next';

// Start Next.js dev server
const nextDev = spawn(nextBin, ['dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: isWindows // Only use shell on Windows
});

nextDev.on('error', (err) => {
  console.error('\n❌ Failed to start Next.js dev server:', err.message);
  console.error('\nTry running: npm install\n');
  process.exit(1);
});

nextDev.on('close', (code) => {
  process.exit(code);
});
