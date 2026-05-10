'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function usePrefetchData() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    // Prefetch dashboard stats
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats')
        if (error) throw error
        return data
      },
    })

    // Prefetch admission batches
    queryClient.prefetchQuery({
      queryKey: ['admission-batches'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('admission_batches')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        return data
      },
    })
  }, [queryClient, supabase])
}
