'use server';

import { prisma } from '@/lib/prisma';
import os from 'os';

// --- Remote Access ---

/**
 * Get remote access toggle state
 */
export async function getRemoteAccessEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'remoteAccessEnabled' }
  });
  return setting?.value === 'true';
}

/**
 * Set remote access toggle
 */
export async function setRemoteAccessEnabled(enabled: boolean) {
  await prisma.setting.upsert({
    where: { key: 'remoteAccessEnabled' },
    update: { value: enabled ? 'true' : 'false' },
    create: { key: 'remoteAccessEnabled', value: enabled ? 'true' : 'false' }
  });
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
  const tokens = await prisma.accessToken.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return tokens.map((t: typeof tokens[number]) => ({
    ...t,
    isExpired: t.expiresAt < new Date()
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
  const count = await prisma.accessToken.count();
  const name = `Token ${count + 1}`;

  const accessToken = await prisma.accessToken.create({
    data: {
      name,
      token,
      expiresAt
    }
  });

  return {
    id: accessToken.id,
    name: accessToken.name,
    description: accessToken.description,
    token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    createdAt: accessToken.createdAt
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
  const count = await prisma.accessToken.count();
  const name = `Token ${count + 1}`;

  // Use transaction to ensure both operations complete atomically
  const [accessToken] = await prisma.$transaction([
    prisma.accessToken.create({
      data: {
        name,
        token,
        expiresAt
      }
    }),
    prisma.setting.upsert({
      where: { key: 'remoteAccessEnabled' },
      update: { value: 'true' },
      create: { key: 'remoteAccessEnabled', value: 'true' }
    })
  ]);

  return {
    id: accessToken.id,
    name: accessToken.name,
    description: accessToken.description,
    token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    createdAt: accessToken.createdAt
  };
}

/**
 * Update access token description/note
 */
export async function updateAccessTokenDescription(id: string, description: string) {
  return await prisma.accessToken.update({
    where: { id },
    data: { description: description || null }
  });
}

/**
 * Delete access token
 */
export async function deleteAccessToken(id: string) {
  return await prisma.accessToken.delete({
    where: { id }
  });
}

/**
 * Revoke access token (soft delete)
 */
export async function revokeAccessToken(id: string) {
  return await prisma.accessToken.update({
    where: { id },
    data: { isRevoked: true }
  });
}

/**
 * Validate access token
 * @returns token info if valid, null if invalid
 */
export async function validateAccessToken(token: string) {
  const accessToken = await prisma.accessToken.findUnique({
    where: { token }
  });

  if (!accessToken) return null;
  if (accessToken.isRevoked) return null;
  if (accessToken.expiresAt < new Date()) return null;

  // Update last used time
  await prisma.accessToken.update({
    where: { id: accessToken.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    id: accessToken.id,
    name: accessToken.name
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

  // 平台相关的“更可能是物理网卡”的命名规则（用于加权，不作为硬过滤）
  // 说明：
  // - macOS: en0/en1 通常分别对应 Wi‑Fi/以太网；bridge/utun/awdl 等更常见于热点共享/VPN/直连等场景
  // - Windows: Ethernet / Wi‑Fi / Local Area Connection
  // - Linux: eth*/enp* / wlan*/wlp*
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

  // 常见虚拟/隧道/直连接口关键字（强过滤）
  // 目标：避免选到 VPN / Docker / 虚拟机 / 容器桥接 / Apple 的直连与共享网卡等导致“地址看似对但不可用”
  const virtualInterfaceKeywords = [
    'docker',
    'vbox',
    'virtualbox',
    'vmware',
    'veth',
    'br-',
    'virbr',
    'lxc',
    'cni',
    'flannel',
    'cilium',
    'kube',
    'zt', // ZeroTier
    'tailscale',
    'wg', // wireguard
    'tun',
    'tap',
    'utun', // macOS VPN
    'awdl', // Apple Wireless Direct Link
    'llw',  // Low Latency WLAN
    'p2p',  // Apple P2P
    'bridge', // macOS 共享/桥接更常见
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
        // 172.16/12 虽然也是私网，但在某些环境下更容易对应热点共享/隧道网络，适度降权
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
