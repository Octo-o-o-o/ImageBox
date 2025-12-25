import { redirect } from 'next/navigation';
import { migratePresetProviders, ensurePresetTemplates } from '@/app/actions';

// Force dynamic rendering to avoid prerendering database operations during build
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Run migration for preset providers (cleans up old presets without API keys)
  await migratePresetProviders();
  // Ensure preset templates exist on first launch
  await ensurePresetTemplates();

  // Always redirect to create page
  redirect('/create');
}
