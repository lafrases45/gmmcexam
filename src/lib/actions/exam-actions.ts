'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUserRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return roleData?.role || 'Admin'
}


export async function getExams() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error("Supabase Error (getExams):", JSON.stringify(error))
  return data || []
}

export async function getExamsByGroup(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('exams').select('*').eq('group_id', groupId).order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getExamSubjectsBatch(examIds: string[]) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exam_subjects')
    .select(`
      *,
      subjects(*)
    `)
    .in('exam_id', examIds)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getExamRoutineBatch(examIds: string[]) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('exam_id, subject_id, exam_date, subjects(name, code)')
    .in('exam_id', examIds)
    .not('exam_date', 'is', null)
    .order('exam_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []).filter((d: any) => d.exam_date && d.exam_date.trim() !== '')
}

export async function getSubjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  if (error) console.error("Supabase Error (getSubjects):", JSON.stringify(error))
  return data || []
}

export async function createExam(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const program = formData.get('program') as string
  const year_or_semester = formData.get('yearOrSemester') as string
  const exam_type = formData.get('examType') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const result_date = formData.get('result_date') as string
  const status = formData.get('status') as string
  const exam_time = formData.get('exam_time') as string

  // 1. Insert the main exam record
  const { data: exam, error: examError } = await supabase.from('exams').insert({
    name,
    program,
    year_or_semester,
    exam_type,
    start_date,
    end_date,
    result_date,
    status,
    exam_time,
    group_id: formData.get('group_id') as string || undefined
  }).select().single()

  if (examError) {
    console.error("Exam Insert Error:", JSON.stringify(examError))
    throw new Error(examError.message)
  }

  // 2. Handle subject-specific marks
  const selectedSubjects = formData.getAll('selected_subjects') as string[]
  
  if (selectedSubjects.length > 0) {
    const examSubjectsData = selectedSubjects.map(subId => {
      const full_marks = Number(formData.get(`full_marks_${subId}`)) || 100
      const pass_marks = Number(formData.get(`pass_marks_${subId}`)) || 40
      return {
        exam_id: exam.id,
        subject_id: subId,
        full_marks,
        pass_marks
      }
    })

    const { error: subjectsError } = await supabase.from('exam_subjects').insert(examSubjectsData)
    
    if (subjectsError) {
      console.error("Exam Subjects Insert Error:", JSON.stringify(subjectsError))
    }

    const studentListRaw = formData.get('student_list') as string
    const studentNames = studentListRaw 
      ? studentListRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0)
      : []

    if (studentNames.length > 0) {
      const resultsData: any[] = []
      for (const student of studentNames) {
        for (const subId of selectedSubjects) {
          resultsData.push({
            exam_id: exam.id,
            subject_id: subId,
            student_name: student,
            marks: null,
            result: null
          })
        }
      }
      
      const { error: resultsError } = await supabase.from('results').upsert(resultsData, { onConflict: 'student_name,exam_id,subject_id' })
      if (resultsError) console.error("Results Insert Error:", JSON.stringify(resultsError))
    }
  }

  revalidatePath('/admin/internal-exams')
  return exam
}


export async function updateExam(examId: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const program = formData.get('program') as string
  const year_or_semester = formData.get('yearOrSemester') as string
  const exam_type = formData.get('examType') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const result_date = formData.get('result_date') as string
  const status = formData.get('status') as string
  const exam_time = formData.get('exam_time') as string

  // 1. Update the main exam record
  const { error: examError } = await supabase.from('exams').update({
    name,
    program,
    year_or_semester,
    exam_type,
    start_date,
    end_date,
    result_date,
    status,
    exam_time,
    group_id: formData.get('group_id') as string || undefined
  }).eq('id', examId)

  if (examError) {
    console.error("Exam Update Error:", JSON.stringify(examError))
    throw new Error(examError.message)
  }

  // 2. Refresh subject-specific marks (Delete and Re-insert)
  const selectedSubjects = formData.getAll('selected_subjects') as string[]
  
  // Clean old subjects
  await supabase.from('exam_subjects').delete().eq('exam_id', examId)
  
  if (selectedSubjects.length > 0) {
    const examSubjectsData = selectedSubjects.map(subId => {
      const full_marks = Number(formData.get(`full_marks_${subId}`)) || 100
      const pass_marks = Number(formData.get(`pass_marks_${subId}`)) || 40
      return {
        exam_id: examId,
        subject_id: subId,
        full_marks,
        pass_marks
      }
    })

    const { error: subjectsError } = await supabase.from('exam_subjects').insert(examSubjectsData)
    
    if (subjectsError) {
      console.error("Exam Subjects Update Error:", JSON.stringify(subjectsError))
    }

    const studentListRaw = formData.get('student_list') as string
    const studentNames = studentListRaw 
      ? studentListRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0)
      : []

    if (studentNames.length > 0) {
      const resultsData: any[] = []
      for (const student of studentNames) {
        for (const subId of selectedSubjects) {
          resultsData.push({
            exam_id: examId,
            subject_id: subId,
            student_name: student,
            marks: null,
            result: null
          })
        }
      }
      
      const { error: resultsError } = await supabase.from('results').upsert(resultsData, { onConflict: 'student_name,exam_id,subject_id' })
      if (resultsError) console.error("Results Update Error:", JSON.stringify(resultsError))
    }
  }

  revalidatePath('/admin/internal-exams')
}

export async function createExamBatch(
  basicInfo: { name: string, exam_type: string, start_date: string, end_date: string, result_date: string, status: string, exam_time: string },
  programs: { program: string, yearOrSem: string }[]
) {
  const supabase = await createClient()
  const group_id = crypto.randomUUID()
  
  const insertData = programs.map(p => ({
    ...basicInfo,
    program: p.program,
    year_or_semester: p.yearOrSem,
    group_id
  }))

  const { data: createdExams, error } = await supabase.from('exams').insert(insertData).select()
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/internal-exams')
  return { exams: createdExams, group_id }
}


export async function getGroupedExams() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
  if (error) return []
  
  // Group by group_id if exists, otherwise treat as single
  const groups: Record<string, any[]> = {}
  data.forEach(exam => {
    const id = exam.group_id || `single-${exam.id}`
    if (!groups[id]) groups[id] = []
    groups[id].push(exam)
  })
  return Object.values(groups)
}


export async function updateExamBasicInfo(
  examId: string,
  data: { name: string; program: string; year_or_semester: string; exam_type: string; start_date: string; end_date: string; result_date: string; status: string; exam_time?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('exams').update(data).eq('id', examId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/internal-exams')
}

export async function saveExamSubjectsOnly(
  examId: string,
  subjects: { subject_id: string; full_marks: number; pass_marks: number }[]
) {
  const supabase = await createClient()
  await supabase.from('exam_subjects').delete().eq('exam_id', examId)
  if (subjects.length > 0) {
    const rows = subjects.map(s => ({ exam_id: examId, subject_id: s.subject_id, full_marks: s.full_marks, pass_marks: s.pass_marks }))
    const { error } = await supabase.from('exam_subjects').insert(rows)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/internal-exams')
}


export async function getExamSubjects(examId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('*, subjects(name, code)')
    .eq('exam_id', examId)

  if (error) console.error("Supabase Error (getExamSubjects):", JSON.stringify(error))
  return data || []
}

export async function saveRoutine(examId: string, routine: { subject_id: string, exam_date: string }[]) {
  const supabase = await createClient()
  
  // Execute updates concurrently to prevent timeouts when saving many programs at once
  const updatePromises = routine.map(item => 
    supabase
      .from('exam_subjects')
      .update({ exam_date: item.exam_date })
      .eq('exam_id', examId)
      .eq('subject_id', item.subject_id)
      .then(({ error }) => {
        if (error) throw new Error(error.message)
      })
  )
  
  await Promise.all(updatePromises)
  
  revalidatePath('/admin/internal-exams')
  revalidatePath('/admin/seat-plan')
}

export async function getExamRoutine(examId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('subject_id, exam_date, subjects(name, code)')
    .eq('exam_id', examId)
    .not('exam_date', 'is', null)
    .order('exam_date', { ascending: true })

  if (error) console.error("Supabase Error (getExamRoutine):", JSON.stringify(error))
  return (data || []).filter((d: any) => d.exam_date && d.exam_date.trim() !== '')
}


export async function deleteExam(examId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('exams').delete().eq('id', examId)

  if (error) {
    console.error("Exam Delete Error:", JSON.stringify(error))
    throw new Error(error.message)
  }

  revalidatePath('/admin/internal-exams')
}

export async function getLedger() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('results')
    .select(`
      *,
      exams(name, result_date),
      subjects(name, code)
    `)
    .order('created_at', { ascending: false })
    .limit(500) // Optimization: Don't load more than 500 records at once

  if (error) console.error("Supabase Error (getLedger):", JSON.stringify(error))
  return data || []
}

// --- NEW MANAGEMENT ACTIONS ---

export async function addSubject(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const code = formData.get('code') as string
  const program = formData.get('program') as string
  const semester_or_year = formData.get('semester_or_year') as string
  const category = formData.get('category') as string || 'Compulsory'

  const { error } = await supabase.from('subjects').insert({ 
    name, 
    code, 
    program, 
    semester_or_year,
    category
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/internal-exams')
}

export async function updateSubject(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const code = formData.get('code') as string
  const program = formData.get('program') as string
  const semester_or_year = formData.get('semester_or_year') as string
  const category = formData.get('category') as string || 'Compulsory'

  const { error } = await supabase.from('subjects').update({ 
    name, 
    code, 
    program, 
    semester_or_year,
    category
  }).eq('id', id)
  
  if (error) throw new Error(error.message)
  revalidatePath('/admin/internal-exams')
}

export async function deleteSubject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/internal-exams')
}

export async function bulkAddTeachers(text: string, program: string) {
  const supabase = await createClient()
  const lines = text.split('\n').filter(l => l.trim() !== '')
  
  const entries = lines.map(line => {
    const parts = line.split(',').map(p => p.trim())
    const full_name = parts[0]
    const email = parts[1]
    return { full_name, email, program }
  })

  const { error } = await supabase.from('teacher_registry').insert(entries)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/internal-exams')
}

export async function getTeacherRegistry() {
  const supabase = await createClient()
  const { data } = await supabase.from('teacher_registry').select('*')
  return data || []
}

export async function getProfiles() {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*')
  return data || []
}

export async function getTeacherAssignments(email: string, userId?: string) {
  const supabase = await createClient()
  
  // 1. Get real assignments if userId exists
  let realAssignments: any[] = []
  if (userId) {
    const { data } = await supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', userId)
    realAssignments = data?.map(d => d.subject_id) || []
  }

  // 2. Get pending assignments
  const { data: pending } = await supabase.from('pending_assignments').select('subject_id').eq('email', email)
  const pendingAssignments = pending?.map(d => d.subject_id) || []

  return [...new Set([...realAssignments, ...pendingAssignments])]
}

export async function assignSubjectToTeacher(email: string, subjectId: string, userId?: string) {
  const supabase = await createClient()

  if (userId) {
    // If real user, insert into real table
    await supabase.from('teacher_subjects').insert({ teacher_id: userId, subject_id: subjectId })
  } else {
    // If registry only, insert into pending
    await supabase.from('pending_assignments').insert({ email, subject_id: subjectId })
  }
  
  revalidatePath('/admin/internal-exams')
}

export async function removeSubjectFromTeacher(email: string, subjectId: string, userId?: string) {
  const supabase = await createClient()

  if (userId) {
    await supabase.from('teacher_subjects').delete().eq('teacher_id', userId).eq('subject_id', subjectId)
  }
  
  await supabase.from('pending_assignments').delete().eq('email', email).eq('subject_id', subjectId)
  
  revalidatePath('/admin/internal-exams')
}

export async function updateTeacher(oldEmail: string, newData: { full_name: string, email: string }, userId?: string) {
  const supabase = await createClient()

  // 1. Update Registry
  await supabase.from('teacher_registry').update(newData).eq('email', oldEmail)

  // 2. Update Profile if exists
  if (userId) {
    await supabase.from('profiles').update({
      full_name: newData.full_name,
      email: newData.email
    }).eq('id', userId)
  }

  // 3. Update Pending Assignments if email changed
  if (oldEmail !== newData.email) {
    await supabase.from('pending_assignments').update({ email: newData.email }).eq('email', oldEmail)
  }

  revalidatePath('/admin/internal-exams')
}

export async function syncTeacherAssignments(email: string, subjectIds: string[], userId?: string) {
  const supabase = await createClient()

  if (userId) {
    // Sync real table
    await supabase.from('teacher_subjects').delete().eq('teacher_id', userId)
    if (subjectIds.length > 0) {
      const data = subjectIds.map(sid => ({ teacher_id: userId, subject_id: sid }))
      await supabase.from('teacher_subjects').insert(data)
    }
  }

  // Sync pending table
  await supabase.from('pending_assignments').delete().eq('email', email)
  if (subjectIds.length > 0) {
    const data = subjectIds.map(sid => ({ email, subject_id: sid }))
    await supabase.from('pending_assignments').insert(data)
  }

  revalidatePath('/admin/internal-exams')
}

export async function getSubjectResults(examId: string, subjectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .order('student_name', { ascending: true })

  if (error) {
    console.error("Supabase Error (getSubjectResults):", JSON.stringify(error))
  }
  return data || []
}

export async function submitMarks(examId: string, subjectId: string, studentName: string, marks: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // 1. Get subject pass marks
  const { data: sub } = await supabase
    .from('exam_subjects')
    .select('pass_marks')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .single()
    
  const passMarks = sub?.pass_marks || 40
  const result = marks >= passMarks ? 'Pass' : 'Fail'

  // 2. Update result
  const { error } = await supabase
    .from('results')
    .update({ 
      marks, 
      result,
      created_by: user?.id,
      created_at: new Date().toISOString() 
    })
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .eq('student_name', studentName)

  if (error) throw new Error(error.message)
  
  revalidatePath('/teacher')
}

export async function getMissingMarksReport(examId: string) {
  const supabase = await createClient()

  // 1. Get all exam IDs in the group if applicable
  const { data: currentExam } = await supabase.from('exams').select('group_id').eq('id', examId).single()
  let examIds = [examId]
  if (currentExam?.group_id) {
    const { data: groupExams } = await supabase.from('exams').select('id').eq('group_id', currentExam.group_id)
    examIds = groupExams?.map(e => e.id) || [examId]
  }

  // 2. Get ALL subjects configured for these exams
  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('exam_id, subject_id, exams(program, year_or_semester), subjects(name, code)')
    .in('exam_id', examIds)

  if (!examSubjects) return []

  // 3. Get results to check sync and marks status
  const { data: results } = await supabase
    .from('results')
    .select('exam_id, subject_id, marks')
    .in('exam_id', examIds)

  // 4. Get assignments for teacher names (Both pending and registered)
  const { data: pending } = await supabase.from('pending_assignments').select('email, subject_id')
  const { data: real } = await supabase
    .from('teacher_subjects')
    .select('subject_id, profiles!inner(email, full_name)')

  const { data: registry } = await supabase.from('teacher_registry').select('email, full_name')

  const report: any[] = []

  examSubjects.forEach((es: any) => {
    const subjectResults = results?.filter(r => r.exam_id === es.exam_id && r.subject_id === es.subject_id) || []
    
    let status = ''
    if (subjectResults.length === 0) {
      status = 'Sync Needed'
    } else {
      const missingCount = subjectResults.filter(r => r.marks === null).length
      if (missingCount > 0) {
        status = `${missingCount} students missing marks`
      }
    }

    if (status) {
      // Collect teacher emails from pending
      const pendingEmails = pending?.filter(a => a.subject_id === es.subject_id).map(a => a.email) || []
      
      // Collect teacher emails and names from registered
      const registeredTeachers = real?.filter(a => a.subject_id === es.subject_id).map(a => ({
        email: (a.profiles as any).email,
        name: (a.profiles as any).full_name
      })) || []

      const registeredEmails = registeredTeachers.map(rt => rt.email)
      
      // Combine all unique emails
      const allEmails = Array.from(new Set([...pendingEmails, ...registeredEmails]))
      
      // Map emails to names using registry or profiles
      const teachers = allEmails.map(email => {
        const reg = registry?.find(r => r.email === email)
        if (reg) return reg.full_name
        const prof = registeredTeachers.find(rt => rt.email === email)
        return prof?.name || email
      })
      
      report.push({
        exam_id: es.exam_id,
        program: es.exams.program,
        year: es.exams.year_or_semester,
        subject_id: es.subject_id,
        subject_name: es.subjects.name,
        subject_code: es.subjects.code,
        status,
        teacher_names: teachers.length > 0 ? teachers.join(', ') : 'Unassigned'
      })
    }
  })

  return report
}

export async function syncSeatPlanStudents(examId: string, students: { name: string, roll: string, major?: string }[]) {
  const supabase = await createClient()

  const { data: subjects } = await supabase.from('exam_subjects').select('subject_id').eq('exam_id', examId)
  if (!subjects || subjects.length === 0) {
    throw new Error('This exam has no subjects configured. Please configure subjects first.')
  }

  const resultsMap = new Map()
  for (const student of students) {
    for (const sub of subjects) {
      const key = `${student.name}-${examId}-${sub.subject_id}`
      if (!resultsMap.has(key)) {
        resultsMap.set(key, {
          exam_id: examId,
          subject_id: sub.subject_id,
          student_name: student.name,
          student_roll: student.roll,
          student_major: student.major || null,
          marks: null,
          result: null
        })
      }
    }
  }

  const resultsData = Array.from(resultsMap.values())

  const { error } = await supabase.from('results').upsert(resultsData, { onConflict: 'student_name,exam_id,subject_id' })
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/internal-exams')
}

// --- SEAT PLAN ACTIONS ---

export async function saveSeatPlan(examId: string, name: string, data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('seat_plans').upsert({
    exam_id: examId,
    name,
    allocation_data: data
  }, { onConflict: 'exam_id' })
  
  if (error) throw new Error(error.message)
  revalidatePath('/admin/seat-plan')
}

export async function getSeatPlans(examId?: string) {
  const supabase = await createClient()
  let query = supabase.from('seat_plans').select('*, exams(name)')
  if (examId) query = query.eq('exam_id', examId)
  
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data
}

export async function deleteSeatPlan(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('seat_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/seat-plan')
}

export async function getTeacherDashboardData(email: string, userId: string) {
  const supabase = await createClient()
  
  // 1. Get assigned subject IDs in parallel
  const [{ data: realAssignments }, { data: pendingAssignments }] = await Promise.all([
    supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', userId),
    supabase.from('pending_assignments').select('subject_id').eq('email', email)
  ])
  
  const subjectIds = [...new Set([
    ...(realAssignments?.map(a => a.subject_id) || []),
    ...(pendingAssignments?.map(a => a.subject_id) || [])
  ])]

  if (subjectIds.length === 0) return { assignments: [], exams: [], allAssignedSubjects: [] }

  // 2. Get details in parallel
  const [{ data: subjectDetails }, { data, error }] = await Promise.all([
    supabase.from('subjects').select('id, name, code').in('id', subjectIds),
    supabase.from('exam_subjects')
      .select(`
        exam_id,
        subject_id,
        exams!inner(id, name, program, status),
        subjects!inner(name, code)
      `)
      .in('subject_id', subjectIds)
  ])

  if (error) {
    console.error("Dashboard Data Error:", error)
    return { assignments: [], exams: [], allAssignedSubjects: subjectDetails || [] }
  }

  const assignments = (data || []).map((item: any) => {
    const exam = Array.isArray(item.exams) ? item.exams[0] : item.exams
    const subject = Array.isArray(item.subjects) ? item.subjects[0] : item.subjects
    return {
      examId: item.exam_id,
      examName: exam?.name || 'Unknown Exam',
      program: exam?.program || 'N/A',
      subjectId: item.subject_id,
      subjectName: subject?.name || 'Unknown Subject',
      subjectCode: subject?.code || ''
    }
  })

  const uniqueExams = Array.from(new Map((data || []).map((item: any) => {
    const exam = Array.isArray(item.exams) ? item.exams[0] : item.exams
    return [exam.id, exam]
  })).values())

  return { assignments, exams: uniqueExams, allAssignedSubjects: subjectDetails || [] }
}

export async function deleteTeacher(email: string, userId?: string) {
  const supabase = await createClient()
  
  // 1. Remove from registry
  await supabase.from('teacher_registry').delete().eq('email', email)
  
  // 2. Remove assignments
  if (userId) {
    await supabase.from('teacher_subjects').delete().eq('teacher_id', userId)
  }
  await supabase.from('pending_assignments').delete().eq('email', email)
  
  // 3. Remove from profiles
  if (userId) {
    await supabase.from('profiles').delete().eq('id', userId)
  }

  revalidatePath('/admin/internal-exams')
}

export async function getLedgerData(examId: string) {
  const supabase = await createClient()
  
  const { data: currentExam } = await supabase.from('exams').select('group_id, name').eq('id', examId).single()
  
  let examIds = [examId]
  if (currentExam?.group_id) {
    const { data: groupExams } = await supabase.from('exams').select('id').eq('group_id', currentExam.group_id)
    examIds = groupExams?.map(e => e.id) || [examId]
  }

  const { data: results, error: resErr } = await supabase
    .from('results')
    .select('*, exams(name, program, year_or_semester), subjects(name, code)')
    .in('exam_id', examIds)

  if (resErr) throw new Error(resErr.message)

  const ledger: Record<string, any> = {}
  
  results.forEach((r: any) => {
    const prog = r.exams.program
    if (!ledger[prog]) {
      ledger[prog] = { 
        programName: prog,
        yearOrSemester: r.exams.year_or_semester,
        examName: r.exams.name,
        students: {}, 
        subjects: {} 
      }
    }
    
    ledger[prog].subjects[r.subject_id] = { name: r.subjects.name, code: r.subjects.code }
    
    if (!ledger[prog].students[r.student_name]) {
      ledger[prog].students[r.student_name] = { 
        name: r.student_name, 
        roll: r.student_roll, 
        marks: {} 
      }
    }
    ledger[prog].students[r.student_name].marks[r.subject_id] = r.marks
  })

  // Convert objects to arrays for easier frontend consumption
  return Object.values(ledger).map((p: any) => ({
    ...p,
    students: Object.values(p.students).sort((a: any, b: any) => Number(a.roll) - Number(b.roll)),
    subjects: Object.values(p.subjects)
  }))
}

export async function exportSystemData() {
  const supabase = await createClient()
  
  const [
    { data: exams },
    { data: subjects },
    { data: results },
    { data: exam_subjects },
    { data: teacher_subjects },
    { data: teacher_registry },
    { data: profiles },
    { data: pending_assignments },
    { data: board_exams },
    { data: admission_batches },
    { data: admission_students },
    { data: seat_plans },
    { data: online_admissions },
    { data: notices }
  ] = await Promise.all([
    supabase.from('exams').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('results').select('*'),
    supabase.from('exam_subjects').select('*'),
    supabase.from('teacher_subjects').select('*'),
    supabase.from('teacher_registry').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('pending_assignments').select('*'),
    supabase.from('board_exams').select('*'),
    supabase.from('admission_batches').select('*'),
    supabase.from('admission_students').select('*'),
    supabase.from('seat_plans').select('*'),
    supabase.from('online_admissions').select('*'),
    supabase.from('notices').select('*')
  ])

  return {
    timestamp: new Date().toISOString(),
    version: '1.1',
    data: {
      exams: exams || [],
      subjects: subjects || [],
      results: results || [],
      exam_subjects: exam_subjects || [],
      teacher_subjects: teacher_subjects || [],
      teacher_registry: teacher_registry || [],
      profiles: profiles || [],
      pending_assignments: pending_assignments || [],
      board_exams: board_exams || [],
      admission_batches: admission_batches || [],
      admission_students: admission_students || [],
      seat_plans: seat_plans || [],
      online_admissions: online_admissions || [],
      notices: notices || []
    }
  }
}

export async function restoreSystemData(backup: any) {
  const supabase = await createClient()
  const { data } = backup
  
  try {
    // 1. Clear existing data (Destructive operation for recovery)
    // We delete in reverse order of dependencies
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('seat_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('exam_subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('teacher_subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pending_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('exams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('admission_students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('admission_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('board_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('online_admissions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('notices').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. Restore in order of dependencies
    if (data.subjects?.length) await supabase.from('subjects').insert(data.subjects)
    if (data.exams?.length) await supabase.from('exams').insert(data.exams)
    if (data.teacher_registry?.length) await supabase.from('teacher_registry').upsert(data.teacher_registry)
    if (data.profiles?.length) await supabase.from('profiles').upsert(data.profiles)
    if (data.teacher_subjects?.length) await supabase.from('teacher_subjects').insert(data.teacher_subjects)
    if (data.pending_assignments?.length) await supabase.from('pending_assignments').insert(data.pending_assignments)
    if (data.exam_subjects?.length) await supabase.from('exam_subjects').insert(data.exam_subjects)
    if (data.seat_plans?.length) await supabase.from('seat_plans').insert(data.seat_plans)
    if (data.results?.length) await supabase.from('results').insert(data.results)
    
    if (data.admission_batches?.length) await supabase.from('admission_batches').insert(data.admission_batches)
    if (data.admission_students?.length) await supabase.from('admission_students').insert(data.admission_students)
    if (data.board_exams?.length) await supabase.from('board_exams').insert(data.board_exams)
    if (data.online_admissions?.length) await supabase.from('online_admissions').insert(data.online_admissions)
    if (data.notices?.length) await supabase.from('notices').insert(data.notices)

    revalidatePath('/admin', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('Restore Error:', err)
    throw new Error('Failed to restore data: ' + err.message)
  }
}
