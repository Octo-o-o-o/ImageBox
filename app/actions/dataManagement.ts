'use server'

import { configStore, resourcesStore, libraryStore, runLogStore } from '@/lib/store';
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

    // Read all stores
    const config = await configStore.read();
    const resources = await resourcesStore.read();

    // Get remote access setting
    const remoteAccessEnabled = config.settings['remoteAccessEnabled'] === 'true';

    // Get access tokens
    const accessTokens = Object.values(config.tokens).map(t => ({
      name: t.name,
      description: t.description,
      token: t.token,
      expiresAt: t.expiresAt,
      isRevoked: t.isRevoked,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    }));

    // Get providers
    const providers = Object.values(resources.providers).map(p => ({
      name: p.name,
      type: p.type,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
    }));

    // Build provider ID to name map for models
    const providerIdToName: Record<string, string> = {};
    for (const p of Object.values(resources.providers)) {
      providerIdToName[p.id] = p.name;
    }

    // Get models with provider names
    const models = Object.values(resources.models)
      .filter(m => m.providerId && providerIdToName[m.providerId])
      .map(m => ({
        name: m.name,
        modelIdentifier: m.modelIdentifier,
        providerName: providerIdToName[m.providerId!],
        type: m.type,
        parameterConfig: m.parameterConfig,
      }));

    // Build model ID to name map for templates
    const modelIdToName: Record<string, string> = {};
    for (const m of Object.values(resources.models)) {
      modelIdToName[m.id] = m.name;
    }

    // Get templates
    const templates = Object.values(resources.templates).map(t => ({
      name: t.name,
      icon: t.icon,
      description: t.description,
      promptTemplate: t.promptTemplate,
      systemPrompt: t.systemPrompt,
      promptGeneratorName: t.promptGeneratorId ? modelIdToName[t.promptGeneratorId] || null : null,
      isEnabled: t.isEnabled,
    }));

    // Structure backup data
    const backupData: BackupData = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      remoteAccessEnabled,
      accessTokens,
      providers,
      models,
      templates,
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

    const resources = await resourcesStore.read();
    const config = await configStore.read();

    let providersRestored = 0;
    let modelsRestored = 0;
    let templatesRestored = 0;

    // Build name-to-id maps for existing data
    const existingProviderByName: Record<string, string> = {};
    for (const p of Object.values(resources.providers)) {
      existingProviderByName[p.name] = p.id;
    }

    const existingModelByNameAndProvider: Record<string, string> = {};
    for (const m of Object.values(resources.models)) {
      if (m.providerId) {
        const provider = resources.providers[m.providerId];
        if (provider) {
          existingModelByNameAndProvider[`${m.name}:${provider.name}`] = m.id;
        }
      }
    }

    const existingTemplateByName: Record<string, string> = {};
    for (const t of Object.values(resources.templates)) {
      existingTemplateByName[t.name] = t.id;
    }

    const now = new Date().toISOString();

    // Restore providers (skip if exists)
    for (const provider of backupData.providers) {
      if (!existingProviderByName[provider.name]) {
        const id = crypto.randomUUID();
        resources.providers[id] = {
          id,
          name: provider.name,
          type: provider.type as "GEMINI" | "OPENAI" | "LOCAL",
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          localBackend: null,
          localModelPath: null,
          createdAt: now,
        };
        existingProviderByName[provider.name] = id;
        providersRestored++;
      }
    }

    // Restore models (skip if exists)
    for (const model of backupData.models) {
      const providerId = existingProviderByName[model.providerName];
      if (!providerId) {
        console.warn(`Provider ${model.providerName} not found for model ${model.name}`);
        continue;
      }

      const modelKey = `${model.name}:${model.providerName}`;
      if (!existingModelByNameAndProvider[modelKey]) {
        const id = crypto.randomUUID();
        resources.models[id] = {
          id,
          name: model.name,
          modelIdentifier: model.modelIdentifier,
          type: model.type as "TEXT" | "IMAGE",
          providerId,
          parameterConfig: model.parameterConfig,
          createdAt: now,
        };
        existingModelByNameAndProvider[modelKey] = id;
        modelsRestored++;
      }
    }

    // Build model name to ID map after restoring models
    const modelNameToId: Record<string, string> = {};
    for (const m of Object.values(resources.models)) {
      modelNameToId[m.name] = m.id;
    }

    // Restore templates (skip if exists)
    for (const template of backupData.templates) {
      if (!existingTemplateByName[template.name]) {
        const id = crypto.randomUUID();
        const promptGeneratorId = template.promptGeneratorName
          ? modelNameToId[template.promptGeneratorName] || null
          : null;

        resources.templates[id] = {
          id,
          name: template.name,
          icon: template.icon,
          description: template.description,
          promptTemplate: template.promptTemplate,
          systemPrompt: template.systemPrompt,
          promptGeneratorId,
          isEnabled: template.isEnabled,
          createdAt: now,
          updatedAt: now,
        };
        templatesRestored++;
      }
    }

    // Save resources
    await resourcesStore.write(resources);

    // Restore remote access settings (if present in backup)
    if (typeof backupData.remoteAccessEnabled === 'boolean') {
      config.settings['remoteAccessEnabled'] = backupData.remoteAccessEnabled ? 'true' : 'false';
    }

    // Restore access tokens (skip if token already exists)
    if (Array.isArray(backupData.accessTokens)) {
      const existingTokens = new Set(Object.values(config.tokens).map(t => t.token));

      for (const t of backupData.accessTokens) {
        if (!t?.token || existingTokens.has(t.token)) continue;

        const id = crypto.randomUUID();
        config.tokens[id] = {
          id,
          name: t.name,
          description: t.description,
          token: t.token,
          expiresAt: t.expiresAt,
          isRevoked: t.isRevoked,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
        };
      }
    }

    // Save config
    await configStore.write(config);

    return {
      success: true,
      summary: {
        providers: providersRestored,
        models: modelsRestored,
        templates: templatesRestored,
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
    // Read all stores
    const resources = await resourcesStore.read();
    const config = await configStore.read();

    // 1. Clear access tokens
    config.tokens = {};

    // 2. Clear library data (images and folders)
    await libraryStore.write({
      version: '1.0',
      folders: {},
      images: {}
    });

    // 3. Delete run logs
    await runLogStore.deleteAll();

    // 4. Delete user-created templates (keep preset templates)
    const presetTemplateNames = new Set(PRESET_TEMPLATE_NAMES);
    for (const [id, template] of Object.entries(resources.templates)) {
      if (!presetTemplateNames.has(template.name)) {
        delete resources.templates[id];
      }
    }

    // 5. Delete user-created models (keep preset models with id starting with "preset-")
    for (const [id] of Object.entries(resources.models)) {
      if (!id.startsWith('preset-')) {
        delete resources.models[id];
      }
    }

    // 6. Delete user-created providers (keep preset providers with id starting with "preset-")
    // And clear API keys from preset providers
    for (const [id, provider] of Object.entries(resources.providers)) {
      if (!id.startsWith('preset-')) {
        delete resources.providers[id];
      } else {
        // Clear API key from preset provider
        resources.providers[id] = { ...provider, apiKey: null };
      }
    }

    // 7. Clear settings except preset initialization flags
    const preserveKeys = new Set(['presetsInitialized', 'presetsTemplatesInitialized', 'presetMigrationV2Done']);
    const newSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.settings)) {
      if (preserveKeys.has(key)) {
        newSettings[key] = value;
      }
    }
    config.settings = newSettings;

    // Save changes
    await resourcesStore.write(resources);
    await configStore.write(config);

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
