import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getTeacherDashboardData, getExams, getSubjects } from '@/lib/actions/exam-actions'
import TeacherPanel from '@/components/exams/TeacherPanel'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/teacher/login')
  }

  const { assignments, exams: activeExams, allAssignedSubjects } = await getTeacherDashboardData(user.email!, user.id)
  
  return (
    <div>
      <div style={{ marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Dashboard Overview</h2>
        <p style={{ color: '#64748b' }}>Welcome back. You have {allAssignedSubjects.length} subjects registered in your profile.</p>
        
        {allAssignedSubjects.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {allAssignedSubjects.map((s: any) => {
              const isActive = assignments.some(a => a.subjectId === s.id)
              return (
                <span key={s.id} style={{ 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.8rem', 
                  background: isActive ? '#dcfce7' : '#f1f5f9',
                  color: isActive ? '#166534' : '#475569',
                  border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                }}>
                  {s.name} {isActive ? '✓' : '(Not in Exam)'}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <TeacherPanel initialExams={activeExams} initialAssignments={assignments} />
    </div>
  )
}
