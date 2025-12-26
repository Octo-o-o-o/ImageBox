'use server';

import { resourcesStore, configStore, type ProviderRecord, type ModelRecord } from '@/lib/store';
import { PRESET_PROVIDERS, PRESET_MODELS } from '@/lib/presetProviders';

// --- Providers ---

/**
 * Migrate existing preset providers: clean up those without API keys.
 * This runs once on first access after the refactor.
 *
 * New behavior: Preset providers are NOT auto-created anymore.
 * They are only created when user explicitly activates them via activatePresetProvider().
 */
export async function migratePresetProviders() {
  const migrationKey = 'presetMigrationV2Done';

  const config = await configStore.read();
  if (config.settings[migrationKey]) return;

  console.log('[Migration] Starting preset provider migration v2...');

  const data = await resourcesStore.read();

  // Find all preset providers without API keys and remove them (and their models)
  const presetsWithoutKeys = Object.values(data.providers).filter(
    p => p.id.startsWith('preset-') && (!p.apiKey || p.apiKey === '')
  );

  for (const provider of presetsWithoutKeys) {
    // Delete associated models first
    const modelIds = Object.keys(data.models).filter(
      id => data.models[id].providerId === provider.id
    );
    for (const modelId of modelIds) {
      delete data.models[modelId];
    }
    // Then delete the provider
    delete data.providers[provider.id];
    console.log(`[Migration] Removed inactive preset provider: ${provider.name}`);
  }

  await resourcesStore.write(data);

  // Mark migration as complete
  await configStore.update(d => ({
    ...d,
    settings: { ...d.settings, [migrationKey]: 'true' }
  }));

  console.log('[Migration] Preset provider migration v2 complete.');
}

/**
 * Activate a preset provider by creating it with API key and optionally selected models.
 * This is the main entry point for adding a preset provider.
 *
 * @param presetProviderId - The preset provider ID (e.g., 'preset-google-gemini')
 * @param apiKey - The API key for this provider
 * @param selectedModelIds - Optional array of model IDs to create. If undefined, creates all preset models for this provider.
 */
export async function activatePresetProvider(
  presetProviderId: string,
  apiKey: string,
  selectedModelIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  const preset = PRESET_PROVIDERS.find(p => p.id === presetProviderId);

  if (!preset) {
    return { success: false, error: 'Invalid preset provider ID' };
  }

  try {
    const data = await resourcesStore.read();
    const now = new Date().toISOString();

    // Create or update the provider with API key
    const existingProvider = data.providers[preset.id];

    if (existingProvider) {
      // Update existing provider with new API key
      data.providers[preset.id] = { ...existingProvider, apiKey };
    } else {
      // Create new provider
      const provider: ProviderRecord = {
        id: preset.id,
        name: preset.name,
        type: preset.type as "GEMINI" | "OPENAI" | "LOCAL",
        baseUrl: preset.baseUrl || null,
        apiKey,
        localBackend: null,
        localModelPath: null,
        createdAt: now
      };
      data.providers[preset.id] = provider;
    }

    // Get models to create for this provider
    const presetModels = PRESET_MODELS.filter(m => m.providerId === preset.id);
    const modelsToCreate = selectedModelIds
      ? presetModels.filter(m => selectedModelIds.includes(m.id))
      : presetModels;

    // Create models that don't exist yet
    for (const model of modelsToCreate) {
      if (!data.models[model.id]) {
        const modelRecord: ModelRecord = {
          id: model.id,
          name: model.name,
          modelIdentifier: model.modelIdentifier,
          type: model.type as "TEXT" | "IMAGE",
          providerId: model.providerId,
          parameterConfig: model.parameterConfig || null,
          createdAt: now
        };
        data.models[model.id] = modelRecord;
      }
    }

    await resourcesStore.write(data);

    console.log(`[Activate] Activated preset provider: ${preset.name} with ${modelsToCreate.length} models`);
    return { success: true };
  } catch (e) {
    console.error('[Activate] Failed to activate preset provider:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Get all providers from database.
 * After migration, only returns providers that were explicitly activated.
 */
export async function getProviders() {
  await migratePresetProviders();
  const data = await resourcesStore.read();
  return Object.values(data.providers)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => ({
      ...p,
      createdAt: new Date(p.createdAt)
    }));
}

/**
 * Get available preset providers that haven't been activated yet.
 * Used by AddProviderModal to show which presets are available.
 */
export async function getAvailablePresetProviders(): Promise<typeof PRESET_PROVIDERS> {
  const data = await resourcesStore.read();
  const existingIds = new Set(
    Object.keys(data.providers).filter(id => id.startsWith('preset-'))
  );

  return PRESET_PROVIDERS.filter(p => !existingIds.has(p.id));
}

/**
 * Get preset models for a specific provider ID.
 * Used by AddProviderModal to show model selection.
 */
export async function getPresetModelsForProvider(providerId: string) {
  return PRESET_MODELS.filter(m => m.providerId === providerId);
}

export async function saveProvider(data: {
  id?: string;
  name: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  localBackend?: string;
  localModelPath?: string;
}) {
  const resources = await resourcesStore.read();
  const now = new Date().toISOString();

  if (data.id) {
    // Update existing
    const existing = resources.providers[data.id];
    if (!existing) return null;

    const updated: ProviderRecord = {
      ...existing,
      name: data.name,
      type: data.type as "GEMINI" | "OPENAI" | "LOCAL",
      baseUrl: data.baseUrl || null,
      apiKey: data.apiKey || null,
      localBackend: data.localBackend || null,
      localModelPath: data.localModelPath || null
    };

    await resourcesStore.update(d => ({
      ...d,
      providers: { ...d.providers, [data.id!]: updated }
    }));

    return { ...updated, createdAt: new Date(updated.createdAt) };
  } else {
    // Create new
    const id = crypto.randomUUID();
    const provider: ProviderRecord = {
      id,
      name: data.name,
      type: data.type as "GEMINI" | "OPENAI" | "LOCAL",
      baseUrl: data.baseUrl || null,
      apiKey: data.apiKey || null,
      localBackend: data.localBackend || null,
      localModelPath: data.localModelPath || null,
      createdAt: now
    };

    await resourcesStore.update(d => ({
      ...d,
      providers: { ...d.providers, [id]: provider }
    }));

    return { ...provider, createdAt: new Date(provider.createdAt) };
  }
}

export async function deleteProvider(id: string) {
  const data = await resourcesStore.read();
  const provider = data.providers[id];
  if (!provider) return null;

  // Also delete associated models
  const modelIdsToDelete = Object.keys(data.models).filter(
    modelId => data.models[modelId].providerId === id
  );

  await resourcesStore.update(d => {
    const { [id]: _, ...restProviders } = d.providers;
    const newModels = { ...d.models };
    for (const modelId of modelIdsToDelete) {
      delete newModels[modelId];
    }
    return { ...d, providers: restProviders, models: newModels };
  });

  return { ...provider, createdAt: new Date(provider.createdAt) };
}

// --- Models ---

export async function getModels() {
  const data = await resourcesStore.read();
  return Object.values(data.models)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(m => ({
      ...m,
      createdAt: new Date(m.createdAt),
      provider: m.providerId ? data.providers[m.providerId] || null : null
    }));
}

export async function saveModel(data: {
  id?: string;
  name: string;
  modelIdentifier: string;
  type: string;
  providerId: string;
  parameterConfig?: string;
}) {
  const resources = await resourcesStore.read();
  const now = new Date().toISOString();

  if (data.id) {
    // Update existing
    const existing = resources.models[data.id];
    if (!existing) return null;

    const updated: ModelRecord = {
      ...existing,
      name: data.name,
      modelIdentifier: data.modelIdentifier,
      type: data.type as "TEXT" | "IMAGE",
      providerId: data.providerId,
      parameterConfig: data.parameterConfig || null
    };

    await resourcesStore.update(d => ({
      ...d,
      models: { ...d.models, [data.id!]: updated }
    }));

    return {
      ...updated,
      createdAt: new Date(updated.createdAt),
      provider: resources.providers[updated.providerId || ''] || null
    };
  } else {
    // Create new
    const id = crypto.randomUUID();
    const model: ModelRecord = {
      id,
      name: data.name,
      modelIdentifier: data.modelIdentifier,
      type: data.type as "TEXT" | "IMAGE",
      providerId: data.providerId,
      parameterConfig: data.parameterConfig || null,
      createdAt: now
    };

    await resourcesStore.update(d => ({
      ...d,
      models: { ...d.models, [id]: model }
    }));

    return {
      ...model,
      createdAt: new Date(model.createdAt),
      provider: resources.providers[model.providerId || ''] || null
    };
  }
}

export async function deleteModel(id: string) {
  const data = await resourcesStore.read();
  const model = data.models[id];
  if (!model) return null;

  await resourcesStore.update(d => {
    const { [id]: _, ...rest } = d.models;
    return { ...d, models: rest };
  });

  return {
    ...model,
    createdAt: new Date(model.createdAt),
    provider: model.providerId ? data.providers[model.providerId] || null : null
  };
}

export async function hasImageGenerationModel() {
  const data = await resourcesStore.read();
  const imageModels = Object.values(data.models).filter(m => m.type === 'IMAGE');
  return imageModels.length > 0;
}

/**
 * Test if a provider's API key is valid by making a simple API call.
 */
export async function testProviderApiKey(providerId: string): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> {
  const data = await resourcesStore.read();
  const provider = data.providers[providerId];

  if (!provider) {
    return { success: false, message: 'Provider not found' };
  }

  if (provider.type === 'LOCAL') {
    return { success: false, message: 'LOCAL providers do not require API key testing' };
  }

  if (!provider.apiKey) {
    return { success: false, message: 'API key not configured' };
  }

  const startTime = Date.now();

  try {
    if (provider.type === 'GEMINI') {
      // Gemini API: Test by listing models
      const baseUrl = provider.baseUrl || 'https://generativelanguage.googleapis.com';
      const url = `${baseUrl}/v1beta/models?key=${provider.apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const responseData = await response.json();
        const modelCount = responseData.models?.length || 0;
        return {
          success: true,
          message: `OK (${latency}ms)`,
          details: `${modelCount} models available`
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || response.statusText;
        return {
          success: false,
          message: `Error ${response.status}`,
          details: errorMessage
        };
      }
    } else if (provider.type === 'OPENAI') {
      // OpenAI-compatible API: Test by listing models
      const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
      const url = `${baseUrl}/models`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        }
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const responseData = await response.json();
        const modelCount = responseData.data?.length || 0;
        return {
          success: true,
          message: `OK (${latency}ms)`,
          details: `${modelCount} models available`
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || response.statusText;
        return {
          success: false,
          message: `Error ${response.status}`,
          details: errorMessage
        };
      }
    } else {
      return { success: false, message: `Unknown provider type: ${provider.type}` };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
