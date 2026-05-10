'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = await createClient()
  
  // Fetch profiles
  const { data: profiles = [], error: profilesError } = await supabase
    .from('profiles')
    .select('*')
  if (profilesError) throw new Error(profilesError.message)

  // Fetch roles
  const { data: userRoles = [], error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
  if (rolesError) throw new Error(rolesError.message)

  // Fetch registry
  const { data: teacherRegistry = [], error: registryError } = await supabase
    .from('teacher_registry')
    .select('*')
  if (registryError) throw new Error(registryError.message)

  const rolesMap = new Map((userRoles || []).map(r => [r.user_id, r.role]))
  
  // Combine all sources
  const allUsersMap = new Map()

  // 1. Add profiles (highest priority)
  if (profiles && Array.isArray(profiles)) {
    profiles.forEach(p => {
      if (!p.email) return;
      allUsersMap.set(p.email.toLowerCase(), {
        ...p,
        role: rolesMap.get(p.id) || p.role || 'Teacher',
        is_registered: true
      })
    })
  }

  // 2. Add registry teachers if not already present
  if (teacherRegistry && Array.isArray(teacherRegistry)) {
    teacherRegistry.forEach(t => {
      if (!t.email) return;
      const emailLower = t.email.toLowerCase();
      if (!allUsersMap.has(emailLower)) {
        allUsersMap.set(emailLower, {
          id: t.id,
          email: t.email,
          full_name: t.full_name,
          role: 'Teacher',
          created_at: t.created_at,
          is_registered: false
        })
      }
    })
  }

  const result = Array.from(allUsersMap.values()).sort((a, b) => 
    (a.full_name || '').localeCompare(b.full_name || '')
  )
  
  return result
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient()

  // 1. Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  // 2. Update or Insert into user_roles table
  const { data: existingRole, error: fetchError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingRole) {
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
    if (roleError) throw new Error(roleError.message)
  } else {
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole })
    if (roleError) throw new Error(roleError.message)
  }

  revalidatePath('/admin/roles')
  return { success: true }
}
