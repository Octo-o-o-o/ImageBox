'use server';

import { resourcesStore, type TemplateRecord } from '@/lib/store';
import { saveSetting, getSettings } from './settings';
import { PRESET_TEMPLATES } from '@/lib/presetTemplates';

// --- Templates ---

export async function getTemplates() {
  const data = await resourcesStore.read();
  const templates = Object.values(data.templates);

  // Join with promptGenerator (model)
  return templates
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      promptGenerator: t.promptGeneratorId ? data.models[t.promptGeneratorId] || null : null
    }));
}

export async function createTemplate(data: {
  name: string;
  promptTemplate: string;
  promptGeneratorId?: string;
  systemPrompt?: string;
  isEnabled?: boolean;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const template: TemplateRecord = {
    id,
    name: data.name,
    icon: null,
    description: null,
    promptTemplate: data.promptTemplate,
    systemPrompt: data.systemPrompt || null,
    promptGeneratorId: data.promptGeneratorId || null,
    isEnabled: data.isEnabled ?? true,
    createdAt: now,
    updatedAt: now
  };

  await resourcesStore.update(d => ({
    ...d,
    templates: { ...d.templates, [id]: template }
  }));

  return {
    ...template,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt)
  };
}

export async function deleteTemplate(id: string) {
  const data = await resourcesStore.read();
  const template = data.templates[id];
  if (!template) return null;

  await resourcesStore.update(d => {
    const { [id]: _, ...rest } = d.templates;
    return { ...d, templates: rest };
  });

  return {
    ...template,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt)
  };
}

export async function updateTemplate(id: string, data: {
  name: string;
  promptTemplate: string;
  promptGeneratorId?: string;
  systemPrompt?: string;
  isEnabled?: boolean;
}) {
  const current = await resourcesStore.read();
  const template = current.templates[id];
  if (!template) return null;

  const updated: TemplateRecord = {
    ...template,
    name: data.name,
    promptTemplate: data.promptTemplate,
    systemPrompt: data.systemPrompt || null,
    promptGeneratorId: data.promptGeneratorId || null,
    isEnabled: data.isEnabled ?? template.isEnabled,
    updatedAt: new Date().toISOString()
  };

  await resourcesStore.update(d => ({
    ...d,
    templates: { ...d.templates, [id]: updated }
  }));

  return {
    ...updated,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt)
  };
}

export async function toggleTemplateEnabled(id: string, isEnabled: boolean) {
  const data = await resourcesStore.read();
  const template = data.templates[id];
  if (!template) return null;

  const updated: TemplateRecord = {
    ...template,
    isEnabled,
    updatedAt: new Date().toISOString()
  };

  await resourcesStore.update(d => ({
    ...d,
    templates: { ...d.templates, [id]: updated }
  }));

  return {
    ...updated,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt)
  };
}

// --- Preset Templates Initialization ---

/**
 * Ensures preset templates exist in the database.
 * This runs on first app launch and adds built-in templates.
 */
export async function ensurePresetTemplates() {
  // Check if templates have been initialized
  const settings = await getSettings();
  if (settings['presetsTemplatesInitialized'] === 'true') {
    return; // Already initialized
  }

  const data = await resourcesStore.read();

  // Create templates
  for (const presetTemplate of PRESET_TEMPLATES) {
    // Check if template already exists by name to avoid duplicates
    const existing = Object.values(data.templates).find(t => t.name === presetTemplate.name);

    if (!existing) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const template: TemplateRecord = {
        id,
        name: presetTemplate.name,
        icon: presetTemplate.icon || null,
        description: presetTemplate.description || null,
        promptTemplate: presetTemplate.promptTemplate,
        systemPrompt: presetTemplate.systemPrompt || null,
        promptGeneratorId: presetTemplate.promptGeneratorId || null,
        isEnabled: presetTemplate.isEnabled ?? true,
        createdAt: now,
        updatedAt: now
      };

      data.templates[id] = template;
    }
  }

  await resourcesStore.write(data);

  // Mark as initialized
  await saveSetting('presetsTemplatesInitialized', 'true');
}
