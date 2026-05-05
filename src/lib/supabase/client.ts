import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are missing (e.g. during build), 
  // return a client that will fail at runtime rather than crashing the build.
  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder'
  )
}
