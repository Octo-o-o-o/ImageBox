'use server';

import { prisma } from '@/lib/prisma';
import { saveSetting } from './settings';

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

  // Define preset templates
  const presetTemplates = [
    {
      name: 'Universal Optimizer',
      promptTemplate: '{{user_input}}',
      systemPrompt: 'You are a creative AI prompt optimization expert. Enhance the user\'s prompt to be more detailed, vivid, and effective for AI image generation while maintaining their core intent. Add appropriate details about composition, lighting, style, and atmosphere that would improve the final image quality.',
      promptGeneratorId: null, // Will be manually selected by user
    },
    {
      name: 'Presentation Graphics',
      promptTemplate: '{{user_input}}',
      systemPrompt: 'You are a professional presentation designer. Transform the user\'s concept into a clear, professional prompt optimized for creating business presentation graphics. Focus on clarity, professionalism, and visual impact suitable for slides. Emphasize clean layouts, corporate aesthetics, and information clarity.',
      promptGeneratorId: null, // Will be manually selected by user
    },
  ];

  // Create templates
  for (const template of presetTemplates) {
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
