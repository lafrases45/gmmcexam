'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useBatchStudents(batchId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['batch-students', batchId],
    queryFn: async () => {
      if (!batchId) return []
      const { data, error } = await supabase.rpc('load_batch_students', { p_batch_id: batchId })
      if (error) throw error
      return data || []
    },
    enabled: !!batchId,
    staleTime: 60 * 1000, // 1 minute cache
  })
}
