import { redirect } from 'next/navigation';
import { hasImageGenerationModel } from '@/app/actions';

export default async function HomePage() {
  const hasModel = await hasImageGenerationModel();
  if (hasModel) {
    redirect('/create');
  } else {
    redirect('/wizard');
  }
}
