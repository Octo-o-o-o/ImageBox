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

  return tokens.map(t => ({
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
 */
export async function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
