'use server'

import { revalidatePath } from 'next/cache'

/**
 * Purge le cache des pages publiques après une modification de contenu
 * (création / édition / publication / suppression d'un événement).
 * Appelé depuis les écrans admin côté client après une mutation réussie.
 */
export async function revalidatePublic() {
  revalidatePath('/')
  revalidatePath('/agenda')
}
