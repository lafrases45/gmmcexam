'use client'

import React, { useState } from 'react'
import { toast } from '@/lib/store/useToastStore'
import styles from '../admin.module.css'
import { useUsers } from '@/lib/hooks/useUsers'
import { 
  ShieldCheck, Search, Filter, MoreVertical, 
  User, Mail, Calendar, CheckCircle2, 
  AlertCircle, RefreshCw, ChevronDown 
} from 'lucide-react'

const ROLE_OPTIONS = ['Admin', 'Teacher', 'Department Head']

export default function RoleManagementPage() {
  const { users, isLoading, updateRole, isUpdating } = useUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesRole = roleFilter === 'All' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId)
    try {
      await updateRole({ userId, role: newRole })
      toast.success('Role updated successfully!')
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin': return { bg: '#eff6ff', text: '#3b82f6', border: '#dbeafe' }
      case 'Department Head': return { bg: '#fef2f2', text: '#ef4444', border: '#fee2e2' }
      case 'Teacher': return { bg: '#f0fdf4', text: '#22c55e', border: '#dcfce7' }
      default: return { bg: '#f8fafc', text: '#64748b', border: '#f1f5f9' }
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <RefreshCw size={32} className="animate-spin text-blue-500" />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading user roles...</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Role Management</h1>
            <p>Assign and manage institutional roles for faculty and staff.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button 
               onClick={() => window.location.reload()}
               className={styles.button}
               style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
             >
                <RefreshCw size={16} />
                <span>Refresh List</span>
             </button>
             <div style={{ background: '#fff', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#3b82f6" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{users.length} Total Users</span>
             </div>
          </div>
        </div>
      </div>

      <div className={styles.statCard} style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Filter size={18} color="#64748b" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem', background: 'white' }}
            >
              <option value="All">All Roles</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.statCard} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>User Information</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current Role</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Joined Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200" style={{ background: 'white' }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={32} opacity={0.3} />
                      <p>No users found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => {
                  const badge = getRoleBadgeColor(user.role)
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <User size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{user.full_name || 'Unnamed User'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail size={12} /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '6px', 
                          fontSize: '0.65rem', 
                          fontWeight: 700,
                          backgroundColor: user.is_registered ? '#f0fdf4' : '#fff7ed',
                          color: user.is_registered ? '#16a34a' : '#c2410c',
                          border: `1px solid ${user.is_registered ? '#dcfce7' : '#ffedd5'}`,
                          textTransform: 'uppercase'
                        }}>
                          {user.is_registered ? 'Active' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.35rem 0.75rem', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          {user.role === 'Admin' && <ShieldCheck size={12} />}
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} />
                          {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ position: 'relative', width: 'fit-content' }}>
                          <select 
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={updatingId === user.id || !user.is_registered}
                            title={!user.is_registered ? 'Cannot assign role to offline user. They must register first.' : ''}
                            style={{ 
                              padding: '0.5rem 2rem 0.5rem 0.75rem', 
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0', 
                              fontSize: '0.85rem', 
                              background: !user.is_registered ? '#f1f5f9' : 'white',
                              cursor: (updatingId === user.id || !user.is_registered) ? 'not-allowed' : 'pointer',
                              appearance: 'none',
                              fontWeight: 500,
                              color: !user.is_registered ? '#94a3b8' : 'inherit'
                            }}
                          >
                            {ROLE_OPTIONS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                          {updatingId === user.id && (
                            <div style={{ position: 'absolute', right: '-2rem', top: '50%', transform: 'translateY(-50%)' }}>
                               <RefreshCw size={14} className="animate-spin text-blue-500" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
         <AlertCircle size={20} color="#d97706" style={{ marginTop: '0.1rem' }} />
         <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: 700 }}>Roles & Permissions Information</h4>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#b45309', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
               <li><strong>Admin:</strong> Full access to all institutional modules, reports, and system settings.</li>
               <li><strong>Department Head:</strong> Access to program-wide results ledger and academic reporting.</li>
               <li><strong>Teacher:</strong> Access to personal assignments and mark entry modules.</li>
            </ul>
         </div>
      </div>
    </div>
  )
}
