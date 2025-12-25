'use server';

import { prisma } from '@/lib/prisma';
import { PRESET_PROVIDERS, PRESET_MODELS, isPresetProvider } from '@/lib/presetProviders';

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

  const migrationDone = await prisma.setting.findUnique({
    where: { key: migrationKey }
  });

  if (migrationDone) return;

  console.log('[Migration] Starting preset provider migration v2...');

  // Find all preset providers without API keys and remove them (and their models)
  const presetsWithoutKeys = await prisma.provider.findMany({
    where: {
      id: { startsWith: 'preset-' },
      OR: [
        { apiKey: null },
        { apiKey: '' }
      ]
    }
  });

  for (const provider of presetsWithoutKeys) {
    try {
      // Delete associated models first
      await prisma.aIModel.deleteMany({
        where: { providerId: provider.id }
      });
      // Then delete the provider
      await prisma.provider.delete({
        where: { id: provider.id }
      });
      console.log(`[Migration] Removed inactive preset provider: ${provider.name}`);
    } catch (e) {
      console.log(`[Migration] Failed to remove ${provider.name}:`, e);
    }
  }

  // Mark migration as complete
  await prisma.setting.create({
    data: { key: migrationKey, value: 'true' }
  });

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
    // Create or update the provider with API key
    const existingProvider = await prisma.provider.findUnique({
      where: { id: preset.id }
    });

    if (existingProvider) {
      // Update existing provider with new API key
      await prisma.provider.update({
        where: { id: preset.id },
        data: { apiKey }
      });
    } else {
      // Create new provider
      await prisma.provider.create({
        data: {
          id: preset.id,
          name: preset.name,
          type: preset.type,
          baseUrl: preset.baseUrl || null,
          apiKey,
        }
      });
    }

    // Get models to create for this provider
    const presetModels = PRESET_MODELS.filter(m => m.providerId === preset.id);
    const modelsToCreate = selectedModelIds
      ? presetModels.filter(m => selectedModelIds.includes(m.id))
      : presetModels;

    // Create models that don't exist yet
    for (const model of modelsToCreate) {
      const existingModel = await prisma.aIModel.findUnique({
        where: { id: model.id }
      });

      if (!existingModel) {
        await prisma.aIModel.create({
          data: {
            id: model.id,
            name: model.name,
            modelIdentifier: model.modelIdentifier,
            type: model.type,
            providerId: model.providerId,
            parameterConfig: model.parameterConfig,
          }
        });
      }
    }

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
  return await prisma.provider.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Get available preset providers that haven't been activated yet.
 * Used by AddProviderModal to show which presets are available.
 */
export async function getAvailablePresetProviders(): Promise<typeof PRESET_PROVIDERS> {
  const existingProviders = await prisma.provider.findMany({
    where: { id: { startsWith: 'preset-' } },
    select: { id: true }
  });

  const existingIds = new Set(existingProviders.map(p => p.id));

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
  if (data.id) {
    return await prisma.provider.update({ where: { id: data.id }, data });
  } else {
    return await prisma.provider.create({ data });
  }
}

export async function deleteProvider(id: string) {
  return await prisma.provider.delete({ where: { id } });
}

// --- Models ---

export async function getModels() {
  return await prisma.aIModel.findMany({
    orderBy: { name: 'asc' },
    include: { provider: true }
  });
}

export async function saveModel(data: { id?: string; name: string; modelIdentifier: string; type: string; providerId: string; parameterConfig?: string }) {
  const { id, name, modelIdentifier, type, providerId, parameterConfig } = data;
  const saveData = { name, modelIdentifier, type, providerId, parameterConfig };

  if (id) {
    return await prisma.aIModel.update({ where: { id }, data: saveData });
  } else {
    return await prisma.aIModel.create({ data: saveData });
  }
}

export async function deleteModel(id: string) {
  return await prisma.aIModel.delete({ where: { id } });
}

export async function hasImageGenerationModel() {
  const count = await prisma.aIModel.count({
    where: { type: 'IMAGE' }
  });
  return count > 0;
}
