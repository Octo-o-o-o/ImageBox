'use server'

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import path from 'path';
import { PRESET_TEMPLATE_NAMES } from '@/lib/presetTemplates';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Backup data structure
interface BackupData {
  version: string;
  timestamp: string;
  // Remote access settings (optional for backward compatibility with v1.0 backups)
  remoteAccessEnabled?: boolean;
  accessTokens?: Array<{
    name: string;
    description: string | null;
    token: string;
    expiresAt: string; // ISO string
    isRevoked: boolean;
    createdAt: string; // ISO string
    lastUsedAt: string | null; // ISO string
  }>;
  providers: Array<{
    name: string;
    type: string;
    baseUrl: string | null;
    apiKey: string | null;
  }>;
  models: Array<{
    name: string;
    modelIdentifier: string;
    providerName: string;
    type: string;
    parameterConfig: string | null;
  }>;
  templates: Array<{
    name: string;
    icon: string | null;
    description: string | null;
    promptTemplate: string;
    systemPrompt: string | null;
    promptGeneratorName: string | null;
    isEnabled: boolean;
  }>;
}

type BackupAccessTokenRow = {
  name: string;
  description: string | null;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

// Derive encryption key from password
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

// Encrypt backup data
function encryptBackup(data: BackupData, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const jsonString = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(jsonString, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  // Format: [salt][iv][tag][encrypted data]
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

// Decrypt backup data
function decryptBackup(encryptedBase64: string, password: string): BackupData {
  const encryptedData = Buffer.from(encryptedBase64, 'base64');

  const salt = encryptedData.subarray(0, SALT_LENGTH);
  const iv = encryptedData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = encryptedData.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedData.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString('utf8')) as BackupData;
}

/**
 * Create encrypted backup of Provider, Model, and Template configurations
 * @param password Password to encrypt the backup
 * @returns Base64 encrypted backup data
 */
export async function createBackup(password: string): Promise<{
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}> {
  try {
    if (!password || password.length < 1) {
      return { success: false, error: 'Password is required' };
    }

    // Fetch remote access settings + tokens
    const remoteAccessSetting = await prisma.setting.findUnique({
      where: { key: 'remoteAccessEnabled' },
      select: { value: true },
    });
    const remoteAccessEnabled = remoteAccessSetting?.value === 'true';

    const accessTokens = await prisma.accessToken.findMany({
      select: {
        name: true,
        description: true,
        token: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all providers
    const providers = await prisma.provider.findMany({
      select: {
        name: true,
        type: true,
        baseUrl: true,
        apiKey: true,
      },
    });

    // Fetch all models
    const models = await prisma.aIModel.findMany({
      select: {
        name: true,
        modelIdentifier: true,
        type: true,
        parameterConfig: true,
        provider: { select: { name: true } },
      },
    });

    // Fetch all templates
    const templates = await prisma.template.findMany({
      select: {
        name: true,
        icon: true,
        description: true,
        promptTemplate: true,
        systemPrompt: true,
        promptGenerator: { select: { name: true } },
        isEnabled: true,
      },
    });

    // Structure backup data
    const backupData: BackupData = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      remoteAccessEnabled,
      accessTokens: accessTokens.map((t: BackupAccessTokenRow) => ({
        name: t.name,
        description: t.description ?? null,
        token: t.token,
        expiresAt: t.expiresAt.toISOString(),
        isRevoked: t.isRevoked,
        createdAt: t.createdAt.toISOString(),
        lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
      })),
      providers: providers.map(p => ({
        name: p.name,
        type: p.type,
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
      })),
      models: models
        .filter(m => m.provider !== null)
        .map(m => ({
          name: m.name,
          modelIdentifier: m.modelIdentifier,
          providerName: m.provider!.name,
          type: m.type,
          parameterConfig: m.parameterConfig,
        })),
      templates: templates.map(t => ({
        name: t.name,
        icon: t.icon,
        description: t.description,
        promptTemplate: t.promptTemplate,
        systemPrompt: t.systemPrompt,
        promptGeneratorName: t.promptGenerator?.name ?? null,
        isEnabled: t.isEnabled,
      })),
    };

    // Encrypt backup
    const encryptedData = encryptBackup(backupData, password);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `imagebox-backup-${timestamp}.ibx`;

    return {
      success: true,
      data: encryptedData,
      filename,
    };
  } catch (error) {
    console.error('Backup creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Restore configuration from encrypted backup file
 * @param encryptedData Base64 encrypted backup data
 * @param password Password to decrypt the backup
 * @returns Summary of restored items
 */
export async function restoreBackup(
  encryptedData: string,
  password: string
): Promise<{
  success: boolean;
  summary?: { providers: number; models: number; templates: number };
  error?: string;
}> {
  try {
    if (!password || password.length < 1) {
      return { success: false, error: 'Password is required' };
    }

    if (!encryptedData) {
      return { success: false, error: 'Backup data is required' };
    }

    // Decrypt backup
    let backupData: BackupData;
    try {
      backupData = decryptBackup(encryptedData, password);
    } catch (error) {
      console.error('Decryption error:', error);
      return { success: false, error: 'Invalid password or corrupted backup file' };
    }

    // Validate backup format
    if (!backupData.version || !backupData.providers || !backupData.models || !backupData.templates) {
      return { success: false, error: 'Invalid backup file format' };
    }

    // Use transaction for atomic restore
    const result = await prisma.$transaction(async (tx) => {
      let providersRestored = 0;
      let modelsRestored = 0;
      let templatesRestored = 0;

      // Restore providers (skip if exists)
      for (const provider of backupData.providers) {
        const existing = await tx.provider.findFirst({
          where: { name: provider.name },
        });

        if (!existing) {
          await tx.provider.create({
            data: {
              name: provider.name,
              type: provider.type,
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
            },
          });
          providersRestored++;
        }
      }

      // Restore models (skip if exists)
      for (const model of backupData.models) {
        // Find provider
        const provider = await tx.provider.findFirst({
          where: { name: model.providerName },
        });

        if (!provider) {
          console.warn(`Provider ${model.providerName} not found for model ${model.name}`);
          continue;
        }

        const existing = await tx.aIModel.findFirst({
          where: {
            name: model.name,
            providerId: provider.id,
          },
        });

        if (!existing) {
          await tx.aIModel.create({
            data: {
              name: model.name,
              modelIdentifier: model.modelIdentifier,
              type: model.type,
              parameterConfig: model.parameterConfig,
              providerId: provider.id,
            },
          });
          modelsRestored++;
        }
      }

      // Restore templates (skip if exists)
      for (const template of backupData.templates) {
        const existing = await tx.template.findFirst({
          where: { name: template.name },
        });

        if (!existing) {
          // Find prompt generator if specified
          let promptGenerator = null;
          if (template.promptGeneratorName) {
            promptGenerator = await tx.aIModel.findFirst({
              where: { name: template.promptGeneratorName },
            });
          }

          await tx.template.create({
            data: {
              name: template.name,
              icon: template.icon,
              description: template.description,
              promptTemplate: template.promptTemplate,
              systemPrompt: template.systemPrompt,
              promptGeneratorId: promptGenerator?.id,
              isEnabled: template.isEnabled,
            },
          });
          templatesRestored++;
        }
      }

      // Restore remote access settings (if present in backup)
      if (typeof backupData.remoteAccessEnabled === 'boolean') {
        await tx.setting.upsert({
          where: { key: 'remoteAccessEnabled' },
          update: { value: backupData.remoteAccessEnabled ? 'true' : 'false' },
          create: { key: 'remoteAccessEnabled', value: backupData.remoteAccessEnabled ? 'true' : 'false' },
        });
      }

      // Restore access tokens (skip if token already exists)
      if (Array.isArray(backupData.accessTokens)) {
        for (const t of backupData.accessTokens) {
          if (!t?.token) continue;
          const existing = await tx.accessToken.findUnique({
            where: { token: t.token },
          });
          if (existing) continue;

          await tx.accessToken.create({
            data: {
              name: t.name,
              description: t.description ?? null,
              token: t.token,
              expiresAt: new Date(t.expiresAt),
              isRevoked: !!t.isRevoked,
              createdAt: new Date(t.createdAt),
              lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt) : null,
            },
          });
        }
      }

      return { providersRestored, modelsRestored, templatesRestored };
    });

    return {
      success: true,
      summary: {
        providers: result.providersRestored,
        models: result.modelsRestored,
        templates: result.templatesRestored,
      },
    };
  } catch (error) {
    console.error('Restore error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset all database data while preserving preset providers/models/templates
 * Clears API keys from providers to return to first-time app state
 */
export async function resetDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Use transaction for atomic reset
    await prisma.$transaction(async (tx) => {
      // 0. Delete remote access tokens
      await tx.accessToken.deleteMany({});

      // 1. Delete user data (Images, Folders, RunLogs)
      await tx.image.deleteMany({});
      await tx.folder.deleteMany({});
      await tx.runLog.deleteMany({});

      // 2. Delete user-created templates (keep preset templates)
      await tx.template.deleteMany({
        where: {
          name: {
            notIn: PRESET_TEMPLATE_NAMES
          }
        }
      });

      // 3. Delete user-created models (keep preset models with id starting with "preset-")
      await tx.aIModel.deleteMany({
        where: {
          NOT: {
            id: {
              startsWith: 'preset-'
            }
          }
        }
      });

      // 4. Delete user-created providers (keep preset providers with id starting with "preset-")
      await tx.provider.deleteMany({
        where: {
          NOT: {
            id: {
              startsWith: 'preset-'
            }
          }
        }
      });

      // 5. Clear API keys from preset providers (back to unconfigured state)
      await tx.provider.updateMany({
        where: {
          id: {
            startsWith: 'preset-'
          }
        },
        data: {
          apiKey: null
        }
      });

      // 6. Delete settings except preset initialization flags
      await tx.setting.deleteMany({
        where: {
          AND: [
            { key: { not: 'presetsInitialized' } },
            { key: { not: 'presetsTemplatesInitialized' } }
          ]
        }
      });
    });

    // No need to re-initialize presets since we preserved them
    return { success: true };
  } catch (error) {
    console.error('Database reset error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the absolute path to generated images folder
 */
export async function getGeneratedImagesPath(): Promise<string> {
  const folderPath = path.join(process.cwd(), 'public', 'generated');
  return folderPath;
}
