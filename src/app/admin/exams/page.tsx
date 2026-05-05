import React from 'react'
import styles from './exams.module.css'
import AdminPanel from '@/components/exams/AdminPanel'
import TeacherPanel from '@/components/exams/TeacherPanel'
import { getUserRole, getExams, getSubjects, getLedger } from '@/lib/actions/exam-actions'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const role = await getUserRole()
  
  // Fetch common data
  const exams = await getExams()
  const subjects = await getSubjects()
  
  // Ledger only needed for Admins upfront (mostly)
  const ledger = role === 'Admin' ? await getLedger() : []
  
  // Teacher data for Admin Panel
  const { getTeacherRegistry, getProfiles } = await import('@/lib/actions/exam-actions')
  const teacherRegistry = role === 'Admin' ? await getTeacherRegistry() : []
  const profiles = role === 'Admin' ? await getProfiles() : []

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
        <TeacherPanel exams={exams} subjects={subjects} />
      )}
    </div>
  )
}
