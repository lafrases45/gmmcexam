import { createBrowserClient } from '@supabase/ssr'

let cachedClient: ReturnType<typeof createBrowserClient> | null = null

/** Returns a singleton Supabase client instance. Subsequent calls reuse the same client. */
export function createClient() {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are missing (e.g., during build), fallback placeholders.
  cachedClient = createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder'
  )
  return cachedClient
}
