'use server';

import { prisma } from '@/lib/prisma';
import { saveSetting } from './settings';
import { PRESET_TEMPLATES } from '@/lib/presetTemplates';

// --- Templates ---

export async function getTemplates() {
  return await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
    include: { promptGenerator: true }
  });
}

export async function createTemplate(data: { name: string; promptTemplate: string; promptGeneratorId?: string; systemPrompt?: string; isEnabled?: boolean }) {
  return await prisma.template.create({ data });
}

export async function deleteTemplate(id: string) {
  return await prisma.template.delete({ where: { id } });
}

export async function updateTemplate(id: string, data: { name: string; promptTemplate: string; promptGeneratorId?: string; systemPrompt?: string; isEnabled?: boolean }) {
  return await prisma.template.update({ where: { id }, data });
}

export async function toggleTemplateEnabled(id: string, isEnabled: boolean) {
  return await prisma.template.update({
    where: { id },
    data: { isEnabled }
  });
}

// --- Preset Templates Initialization ---

/**
 * Ensures preset templates exist in the database.
 * This runs on first app launch and adds built-in templates.
 */
export async function ensurePresetTemplates() {
  // Check if templates have been initialized
  const setting = await prisma.setting.findUnique({ where: { key: 'presetsTemplatesInitialized' } });
  if (setting?.value === 'true') {
    return; // Already initialized
  }

  // Create templates
  for (const template of PRESET_TEMPLATES) {
    // Check if template already exists by name to avoid duplicates
    const existing = await prisma.template.findFirst({
      where: { name: template.name }
    });

    if (!existing) {
      await prisma.template.create({ data: template });
    }
  }

  // Mark as initialized
  await saveSetting('presetsTemplatesInitialized', 'true');
}
