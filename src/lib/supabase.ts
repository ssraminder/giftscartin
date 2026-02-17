import { createClient, SupabaseClient } from '@supabase/supabase-js'

// NOTE: We use this ONLY for storage uploads and realtime subscriptions
// All data queries go through Prisma

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}
