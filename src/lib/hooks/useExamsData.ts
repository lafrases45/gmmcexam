import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { 
  getUserRole, getExams, getSubjects, getLedger,
  getTeacherRegistry, getProfiles, getTeacherDashboardData 
} from '@/lib/actions/exam-actions'

export function useExamsData(user: any) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['exams-full-data', user?.id],
    queryFn: async () => {
      // 1. Get role first
      const role = await getUserRole()
      
      // 2. Fetch based on role
      if (role === 'Admin' || role === 'Department Head') {
        const [exams, subjects, ledger, teacherRegistry, profiles] = await Promise.all([
          getExams(),
          getSubjects(),
          getLedger(),
          getTeacherRegistry(),
          getProfiles()
        ])
        return { role, exams, subjects, ledger, teacherRegistry, profiles }
      } else {
        const data = await getTeacherDashboardData(user?.email || '', user?.id || '')
        // For teachers, we still need basic subjects for mapping/lookups
        const subjects = await getSubjects()
        return { 
          role, 
          teacherExams: data.exams, 
          teacherAssignments: data.assignments,
          subjects 
        }
      }
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  })
}
