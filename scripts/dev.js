#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

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

// Start Next.js dev server
const nextDev = spawn('next', ['dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true
});

nextDev.on('close', (code) => {
  process.exit(code);
});
