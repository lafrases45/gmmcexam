'use client'

import React from 'react'
import styles from './exams.module.css'
import AdminPanel from '@/components/exams/AdminPanel'
import TeacherPanel from '@/components/exams/TeacherPanel'
import { useAuth } from '@/components/providers/AuthProvider'
import { useExamsData } from '@/lib/hooks/useExamsData'
import { RefreshCw } from 'lucide-react'

export default function ExamsPage() {
  const { session } = useAuth()
  const { data, isLoading, error } = useExamsData(session?.user)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <RefreshCw size={32} className="animate-spin text-blue-500" />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Initializing Examination Modules...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading exam data. Please refresh the page.</p>
      </div>
    )
  }

  const role = data?.role
  
  return (
    <div className={styles.examContainer}>
      {role === 'Admin' || role === 'Department Head' ? (
        <AdminPanel 
          exams={data.exams} 
          subjects={data.subjects} 
          ledger={data.ledger} 
          teacherRegistry={data.teacherRegistry}
          profiles={data.profiles}
        />
      ) : (
        <TeacherPanel 
          initialExams={data.teacherExams} 
          initialAssignments={data.teacherAssignments} 
        />
      )}
    </div>
  )
}
