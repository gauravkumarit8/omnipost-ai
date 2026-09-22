import { adminClient } from '../utils/supabase/admin';

export interface UserCredits {
  userId: string;
  credits: number;
  plan: 'basic' | 'pro' | 'business';
}

/**
 * Fetches a user's current credit balance and plan.
 * Defaults to 5 credits on the 'basic' plan if no profile exists.
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Return default for Basic plan if profile isn't found in DB
    return { userId, credits: 5, plan: 'basic' };
  }

  return { userId, ...data };
}

/**
 * Checks if a user has enough credits to perform an action.
 * Pro and Business plans are granted unlimited credits.
 */
export async function hasEnoughCredits(userId: string, cost: number = 1): Promise<boolean> {
  const { credits, plan } = await getUserCredits(userId);
  
  // Unlimited AI for paid plans
  if (plan === 'pro' || plan === 'business') return true; 
  
  return credits >= cost;
}

/**
 * Deducts credits from a user's account.
 * Only affects users on the 'basic' plan.
 */
export async function decrementCredits(userId: string, amount: number = 1): Promise<void> {
  const { credits, plan } = await getUserCredits(userId);
  
  // Paid plans don't get their credits decremented
  if (plan === 'pro' || plan === 'business') return; 

  const { error } = await adminClient
    .from('profiles')
    .update({ credits: credits - amount })
    .eq('id', userId);

  if (error) throw new Error('Failed to decrement credits');
}

/**
 * Adds credits to a user's account (useful for bonuses or purchasing packs).
 */
export async function addCredits(userId: string, amount: number): Promise<void> {
  const { credits } = await getUserCredits(userId);
  
  const { error } = await adminClient
    .from('profiles')
    .update({ credits: credits + amount })
    .eq('id', userId);

  if (error) throw new Error('Failed to add credits');
}