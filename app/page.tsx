import { redirect } from 'next/navigation';
import { ensurePresetProvidersAndModels, ensurePresetTemplates } from '@/app/actions';

// Force dynamic rendering to avoid prerendering database operations during build
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Ensure preset providers, models, and templates exist on first launch
  await ensurePresetProvidersAndModels();
  await ensurePresetTemplates();

  // Always redirect to create page (presets are now built-in)
  redirect('/create');
}
