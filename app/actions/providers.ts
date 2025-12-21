'use server';

import { prisma } from '@/lib/prisma';
import { PRESET_PROVIDERS, PRESET_MODELS } from '@/lib/presetProviders';

// --- Providers ---

/**
 * Ensure preset providers and models exist in the database.
 * This is called ONLY ONCE on first app launch.
 * If user deletes presets later, they will NOT be re-added.
 */
export async function ensurePresetProvidersAndModels() {
  const initDone = await prisma.setting.findUnique({
    where: { key: 'presetsInitialized' }
  });

  if (initDone?.value === 'true') {
    return;
  }

  console.log('[Init] First launch: Creating preset providers and models...');

  for (const preset of PRESET_PROVIDERS) {
    try {
      await prisma.provider.create({
        data: {
          id: preset.id,
          name: preset.name,
          type: preset.type,
          baseUrl: preset.baseUrl || null,
          apiKey: null,
        }
      });
      console.log(`[Init] Created preset provider: ${preset.name}`);
    } catch (e) {
      console.log(`[Init] Provider ${preset.name} may already exist, skipping`);
    }
  }

  for (const preset of PRESET_MODELS) {
    try {
      await prisma.aIModel.create({
        data: {
          id: preset.id,
          name: preset.name,
          modelIdentifier: preset.modelIdentifier,
          type: preset.type,
          providerId: preset.providerId,
          parameterConfig: preset.parameterConfig,
        }
      });
      console.log(`[Init] Created preset model: ${preset.name}`);
    } catch (e) {
      console.log(`[Init] Model ${preset.name} may already exist, skipping`);
    }
  }

  await prisma.setting.create({
    data: { key: 'presetsInitialized', value: 'true' }
  });

  console.log('[Init] Preset providers and models initialization complete.');
}

export async function getProviders() {
  await ensurePresetProvidersAndModels();
  return await prisma.provider.findMany({ orderBy: { name: 'asc' } });
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
