import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// This client uses the service role key — NEVER expose to the browser.
// Only import this in Server Actions or API Route Handlers.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
