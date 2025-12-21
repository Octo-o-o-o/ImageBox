'use server';

import { prisma } from '@/lib/prisma';

// --- Templates ---

export async function getTemplates() {
  return await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
    include: { promptGenerator: true, imageGenerator: true }
  });
}

export async function createTemplate(data: { name: string; promptTemplate: string; promptGeneratorId?: string; imageGeneratorId?: string; defaultParams: string; systemPrompt?: string }) {
  return await prisma.template.create({ data });
}

export async function deleteTemplate(id: string) {
  return await prisma.template.delete({ where: { id } });
}

export async function updateTemplate(id: string, data: { name: string; promptTemplate: string; promptGeneratorId?: string; imageGeneratorId?: string; defaultParams: string; systemPrompt?: string }) {
  return await prisma.template.update({ where: { id }, data });
}
