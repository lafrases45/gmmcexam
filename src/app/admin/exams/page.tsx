import React from 'react'
import styles from './exams.module.css'
import AdminPanel from '@/components/exams/AdminPanel'
import TeacherPanel from '@/components/exams/TeacherPanel'
import { getUserRole, getExams, getSubjects, getLedger } from '@/lib/actions/exam-actions'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const role = await getUserRole()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch common data
  const exams = await getExams()
  const subjects = await getSubjects()
  
  // Ledger only needed for Admins upfront (mostly)
  const ledger = role === 'Admin' ? await getLedger() : []
  
  // Teacher data for Admin Panel
  const { getTeacherRegistry, getProfiles, getTeacherDashboardData } = await import('@/lib/actions/exam-actions')
  const teacherRegistry = role === 'Admin' ? await getTeacherRegistry() : []
  const profiles = role === 'Admin' ? await getProfiles() : []

  // Data for Teacher Panel (only if not admin, or as empty for TS)
  const { assignments: teacherAssignments, exams: teacherExams } = 
    role !== 'Admin' 
      ? await getTeacherDashboardData(user?.email || '', user?.id || '') 
      : { assignments: [], exams: [] }

  return (
    <div className={styles.examContainer}>

      {role === 'Admin' ? (
        <AdminPanel 
          exams={exams} 
          subjects={subjects} 
          ledger={ledger} 
          teacherRegistry={teacherRegistry}
          profiles={profiles}
        />
      ) : (
        <TeacherPanel initialExams={teacherExams} initialAssignments={teacherAssignments} />
      )}
    </div>
  )
}
