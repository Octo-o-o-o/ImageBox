'use server';

import { configStore, type TokenRecord } from '@/lib/store';
import os from 'os';

// --- Remote Access ---

/**
 * Get remote access toggle state
 */
export async function getRemoteAccessEnabled(): Promise<boolean> {
  const data = await configStore.read();
  return data.settings['remoteAccessEnabled'] === 'true';
}

/**
 * Set remote access toggle
 */
export async function setRemoteAccessEnabled(enabled: boolean) {
  await configStore.update(data => ({
    ...data,
    settings: { ...data.settings, remoteAccessEnabled: enabled ? 'true' : 'false' }
  }));
}

/**
 * Generate random token
 */
function generateToken(): string {
  // Exclude confusing characters: 0, O, o, 1, l, I
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get all access tokens (return full token, no need to hide for personal project)
 */
export async function getAccessTokens() {
  const data = await configStore.read();
  const tokens = Object.values(data.tokens);

  return tokens
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(t => ({
      ...t,
      expiresAt: new Date(t.expiresAt),
      createdAt: new Date(t.createdAt),
      lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt) : null,
      isExpired: new Date(t.expiresAt) < new Date()
    }));
}

/**
 * Create access token (simplified, auto-generate name)
 * @param expiresIn validity period (hours), -1 means permanent
 * @returns object containing full token
 */
export async function createAccessToken(expiresIn: number) {
  const token = generateToken();

  // Calculate expiration time
  let expiresAt: Date;
  if (expiresIn === -1) {
    // Permanent: set to 100 years later
    expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
  }

  // Auto-generate name: Token + sequence
  const data = await configStore.read();
  const count = Object.keys(data.tokens).length;
  const name = `Token ${count + 1}`;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const accessToken: TokenRecord = {
    id,
    name,
    description: null,
    token,
    expiresAt: expiresAt.toISOString(),
    isRevoked: false,
    createdAt: now,
    lastUsedAt: null
  };

  await configStore.update(d => ({
    ...d,
    tokens: { ...d.tokens, [id]: accessToken }
  }));

  return {
    id: accessToken.id,
    name: accessToken.name,
    description: accessToken.description,
    token: accessToken.token,
    expiresAt: new Date(accessToken.expiresAt),
    createdAt: new Date(accessToken.createdAt)
  };
}

/**
 * Create access token AND enable remote access atomically
 * Used in setup mode to avoid race condition where token is created
 * but remote access is not yet enabled, causing subsequent requests to fail
 * @param expiresIn validity period (hours), -1 means permanent
 * @returns object containing full token
 */
export async function createAccessTokenWithRemoteAccess(expiresIn: number) {
  const token = generateToken();

  // Calculate expiration time
  let expiresAt: Date;
  if (expiresIn === -1) {
    // Permanent: set to 100 years later
    expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
  }

  // Auto-generate name: Token + sequence
  const data = await configStore.read();
  const count = Object.keys(data.tokens).length;
  const name = `Token ${count + 1}`;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const accessToken: TokenRecord = {
    id,
    name,
    description: null,
    token,
    expiresAt: expiresAt.toISOString(),
    isRevoked: false,
    createdAt: now,
    lastUsedAt: null
  };

  // Atomic update: create token AND enable remote access
  await configStore.update(d => ({
    ...d,
    settings: { ...d.settings, remoteAccessEnabled: 'true' },
    tokens: { ...d.tokens, [id]: accessToken }
  }));

  return {
    id: accessToken.id,
    name: accessToken.name,
    description: accessToken.description,
    token: accessToken.token,
    expiresAt: new Date(accessToken.expiresAt),
    createdAt: new Date(accessToken.createdAt)
  };
}

/**
 * Update access token description/note
 */
export async function updateAccessTokenDescription(id: string, description: string) {
  const data = await configStore.read();
  const token = data.tokens[id];
  if (!token) return null;

  const updated = { ...token, description: description || null };
  await configStore.update(d => ({
    ...d,
    tokens: { ...d.tokens, [id]: updated }
  }));

  return {
    ...updated,
    expiresAt: new Date(updated.expiresAt),
    createdAt: new Date(updated.createdAt),
    lastUsedAt: updated.lastUsedAt ? new Date(updated.lastUsedAt) : null
  };
}

/**
 * Delete access token
 */
export async function deleteAccessToken(id: string) {
  await configStore.update(data => {
    const { [id]: _, ...rest } = data.tokens;
    return { ...data, tokens: rest };
  });
}

/**
 * Revoke access token (soft delete)
 */
export async function revokeAccessToken(id: string) {
  const data = await configStore.read();
  const token = data.tokens[id];
  if (!token) return null;

  const updated = { ...token, isRevoked: true };
  await configStore.update(d => ({
    ...d,
    tokens: { ...d.tokens, [id]: updated }
  }));

  return {
    ...updated,
    expiresAt: new Date(updated.expiresAt),
    createdAt: new Date(updated.createdAt),
    lastUsedAt: updated.lastUsedAt ? new Date(updated.lastUsedAt) : null
  };
}

/**
 * Validate access token
 * @returns token info if valid, null if invalid
 */
export async function validateAccessToken(tokenValue: string) {
  const data = await configStore.read();
  const token = Object.values(data.tokens).find(t => t.token === tokenValue);

  if (!token) return null;
  if (token.isRevoked) return null;
  if (new Date(token.expiresAt) < new Date()) return null;

  // Update last used time
  const updated = { ...token, lastUsedAt: new Date().toISOString() };
  await configStore.update(d => ({
    ...d,
    tokens: { ...d.tokens, [token.id]: updated }
  }));

  return {
    id: token.id,
    name: token.name
  };
}

/**
 * Get local LAN IP address
 * Prioritizes common physical network interfaces and private IP ranges
 */
export async function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates: Array<{ name: string; address: string; priority: number }> = [];

  const platform = process.platform;

  // Platform-specific interface naming rules for scoring
  const preferredInterfaceRules: Array<{ test: (nameLower: string) => boolean; score: number }> = [
    ...(platform === 'darwin'
      ? [
          { test: (n: string) => n === 'en0', score: 140 },
          { test: (n: string) => n === 'en1', score: 130 },
          { test: (n: string) => n.startsWith('en'), score: 110 },
        ]
      : []),
    ...(platform === 'win32'
      ? [
          { test: (n: string) => n.includes('ethernet'), score: 140 },
          { test: (n: string) => n.includes('wi-fi') || n.includes('wifi'), score: 130 },
          { test: (n: string) => n.includes('local area connection'), score: 120 },
        ]
      : []),
    ...(platform === 'linux'
      ? [
          { test: (n: string) => n === 'eth0', score: 140 },
          { test: (n: string) => n.startsWith('eth') || n.startsWith('enp'), score: 130 },
          { test: (n: string) => n === 'wlan0', score: 130 },
          { test: (n: string) => n.startsWith('wlan') || n.startsWith('wlp'), score: 120 },
        ]
      : []),
  ];

  // Common virtual/tunnel interface keywords (strong filter)
  const virtualInterfaceKeywords = [
    'docker', 'vbox', 'virtualbox', 'vmware', 'veth', 'br-', 'virbr', 'lxc',
    'cni', 'flannel', 'cilium', 'kube', 'zt', 'tailscale', 'wg', 'tun', 'tap',
    'utun', 'awdl', 'llw', 'p2p', 'bridge',
  ];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const iface of addrs) {
      // Skip internal and non-IPv4 addresses
      if (iface.family !== 'IPv4' || iface.internal) continue;

      const ip = iface.address;
      const nameLower = name.toLowerCase();

      // Skip link-local addresses
      if (ip.startsWith('169.254.')) {
        continue;
      }

      // Skip common virtual/tunnel interfaces
      if (virtualInterfaceKeywords.some((k) => nameLower.includes(k) || nameLower.startsWith(k))) {
        continue;
      }

      // Calculate priority
      let priority = 0;

      // Priority 1: Preferred interface names (highest)
      for (const rule of preferredInterfaceRules) {
        if (rule.test(nameLower)) {
          priority += rule.score;
          break;
        }
      }

      // Priority 2: Private IP ranges (RFC 1918)
      if (ip.startsWith('192.168.')) {
        priority += 40; // Most common home/office network
      } else if (ip.startsWith('10.')) {
        priority += 30;
      } else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
        priority += 15;
      }

      // Priority 3: Interface name specificity (small boost)
      if (nameLower.includes('ethernet') || nameLower.includes('eth')) {
        priority += 15; // Ethernet
      } else if (nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('wlan')) {
        priority += 10; // Wi-Fi
      }

      candidates.push({ name, address: ip, priority });
    }
  }

  // Sort by priority (descending) and return the highest priority IP
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return 'localhost';
}
