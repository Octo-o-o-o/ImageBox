// Preset template definitions - separate from server actions to avoid "use server" export restrictions

export const PRESET_TEMPLATES: Array<{
  name: string;
  promptTemplate: string;
  systemPrompt: string;
  promptGeneratorId: null;
  icon?: string | null;
  description?: string | null;
  isEnabled?: boolean;
}> = [
  {
    name: 'Universal Optimizer',
    promptTemplate: '{{user_input}}',
    systemPrompt: 'You are a creative AI prompt optimization expert. Enhance the user\'s prompt to be more detailed, vivid, and effective for AI image generation while maintaining their core intent. Add appropriate details about composition, lighting, style, and atmosphere that would improve the final image quality.',
    promptGeneratorId: null, // Will be manually selected by user (or auto-selected by SetupWizard)
  },
  {
    name: 'Presentation Graphics',
    promptTemplate: '{{user_input}}',
    systemPrompt: 'You are a professional presentation designer. Transform the user\'s concept into a clear, professional prompt optimized for creating business presentation graphics. Focus on clarity, professionalism, and visual impact suitable for slides. Emphasize clean layouts, corporate aesthetics, and information clarity.',
    promptGeneratorId: null, // Will be manually selected by user (or auto-selected by SetupWizard)
  },
];

export const PRESET_TEMPLATE_NAMES = PRESET_TEMPLATES.map(t => t.name);
