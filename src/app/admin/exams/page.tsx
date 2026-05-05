import React from 'react'
import styles from './exams.module.css'
import AdminPanel from '@/components/exams/AdminPanel'
import TeacherPanel from '@/components/exams/TeacherPanel'
import { getUserRole, getExams, getSubjects, getLedger } from '@/lib/actions/exam-actions'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Start parallel fetching
  const [role, exams, subjects] = await Promise.all([
    getUserRole(),
    getExams(),
    getSubjects()
  ])

  let ledger: any[] = []
  let teacherRegistry: any[] = []
  let profiles: any[] = []
  let teacherAssignments: any[] = []
  let teacherExams: any[] = []

  // Conditional parallel fetching based on role
  if (role === 'Admin') {
    const { getTeacherRegistry, getProfiles, getLedger } = await import('@/lib/actions/exam-actions')
    const [l, tr, p] = await Promise.all([
      getLedger(),
      getTeacherRegistry(),
      getProfiles()
    ])
    ledger = l
    teacherRegistry = tr
    profiles = p
  } else {
    const { getTeacherDashboardData } = await import('@/lib/actions/exam-actions')
    const data = await getTeacherDashboardData(user?.email || '', user?.id || '')
    teacherAssignments = data.assignments
    teacherExams = data.exams
  }

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
