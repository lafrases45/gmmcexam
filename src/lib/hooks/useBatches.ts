'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useBatches() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['admission-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_batches')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}
