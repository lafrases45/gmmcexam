'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllUsers, updateUserRole } from '@/lib/actions/role-actions'

export function useUsers() {
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['users-list'],
    queryFn: () => getAllUsers(),
    staleTime: 60 * 1000,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => 
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
    }
  })

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdating: updateRoleMutation.isPending
  }
}
