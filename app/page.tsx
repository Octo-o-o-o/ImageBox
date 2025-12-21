import { redirect } from 'next/navigation';
import { ensurePresetProvidersAndModels } from '@/app/actions';

export default async function HomePage() {
  // Ensure preset providers and models exist on first launch
  await ensurePresetProvidersAndModels();
  
  // Always redirect to create page (presets are now built-in)
  redirect('/create');
}
