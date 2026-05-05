'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/app/admin/exams/exams.module.css'
import { 
  createExam, updateExam, getExamSubjects, deleteExam, 
  addSubject, updateSubject, deleteSubject, bulkAddTeachers, 
  getTeacherRegistry, getProfiles, getTeacherAssignments,
  assignSubjectToTeacher, removeSubjectFromTeacher,
  syncTeacherAssignments, updateTeacher, deleteTeacher, getMissingMarksReport,
  saveRoutine, getExamRoutine,
  updateExamBasicInfo, saveExamSubjectsOnly,
  createExamBatch, getExamsByGroup, getTeacherDashboardData, getLedgerData
} from '@/lib/actions/exam-actions'
import { 
  ClipboardList, Users, BookOpen, Trash2, Edit2, 
  Plus, Save, ArrowLeft, CheckCircle, Search, 
  Layout, Calendar, FileText, BarChart3,
  ChevronRight, RefreshCw, AlertCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
const LedgerManager = dynamic(() => import('./LedgerManager'), { ssr: false })
const ResultReports = dynamic(() => import('./ResultReports'), { ssr: false })

export default function AdminPanel({ 
  exams: initialExams, 
  subjects, 
  ledger: initialLedger,
  teacherRegistry: initialTeacherRegistry = [],
  profiles: initialProfiles = []
}: { 
  exams: any[], 
  subjects: any[], 
  ledger: any[],
  teacherRegistry?: any[],
  profiles?: any[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'exams' | 'subjects' | 'teachers'>('exams')
  const [exams, setExams] = useState(initialExams)
  const [results, setResults] = useState([])
  const [ledger, setLedger] = useState(initialLedger)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  // wizardStep: 0=list, 1=basic info, 2=subjects, 3=routine, 4=exam dashboard
  const [wizardStep, setWizardStep] = useState(0)
  const [editingExam, setEditingExam] = useState<any>(null)
  const [existingMarks, setExistingMarks] = useState<any[]>([]);
  const [missingReport, setMissingReport] = useState<any[]>([]);
  const [routineData, setRoutineData] = useState<any[]>([]);
  const [routineInputs, setRoutineInputs] = useState<Record<string, string>>({});
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  
  // New state for bulk subject management
  const [subjectSettings, setSubjectSettings] = useState<Record<string, { selected: boolean, fm: number, pm: number }>>({});
  
  // States for Teacher Management
  const [teacherRegistry, setTeacherRegistry] = useState<any[]>(initialTeacherRegistry)
  const [profiles, setProfiles] = useState<any[]>(initialProfiles)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [teacherAssignments, setTeacherAssignments] = useState<string[]>([])
  const [tempAssignments, setTempAssignments] = useState<string[]>([])
  const [isBulkAdding, setIsBulkAdding] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<any>(null)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  
  // Subject Form States
  const [subName, setSubName] = useState('')
  const [subCode, setSubCode] = useState('')
  const [subSem, setSubSem] = useState('')
  const [subCat, setSubCat] = useState('Compulsory')
  
  const [subjectSearch, setSubjectSearch] = useState('')
  const [activeExamsForTeacher, setActiveExamsForTeacher] = useState<any[]>([])

  const [mappingProg, setMappingProg] = useState('')
  const [mappingSem, setMappingSem] = useState('')
  
  // New state for Subject Management tab filtering
  const [manageProg, setManageProg] = useState('')
  const [manageYear, setManageYear] = useState('')
  
  // Custom Modal State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ show: boolean, id: string | null, title: string }>({ show: false, id: null, title: '' })
  const [notificationModal, setNotificationModal] = useState<{ show: boolean, type: 'success' | 'warning', message: string }>({ show: false, type: 'success', message: '' })
  
  const [program, setProgram] = useState('')
  const [yearOrSem, setYearOrSem] = useState('')
  const [examType, setExamType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [examName, setExamName] = useState('')
  const [examTime, setExamTime] = useState('')
  const [programRows, setProgramRows] = useState<{program: string, yearOrSem: string}[]>([{program: '', yearOrSem: ''}])
  const [examGroupId, setExamGroupId] = useState<string | null>(null)
  const [groupExams, setGroupExams] = useState<any[]>([])
  const [isAutoFilling, setIsAutoFilling] = useState(false)

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient()
    
    // Subscribe to exams, results, and subjects for full realtime sync
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_subjects' }, () => {
        router.refresh()
        if (editingExam) loadExamData(editingExam)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_registry' }, () => {
        router.refresh()
        loadTeacherData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        router.refresh()
        loadTeacherData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_subjects' }, () => {
        router.refresh()
        if (editingExam) loadExamData(editingExam)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_assignments' }, () => {
        router.refresh()
        if (editingExam) loadExamData(editingExam)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, editingExam])

  useEffect(() => {
    setTeacherRegistry(initialTeacherRegistry)
    setProfiles(initialProfiles)
  }, [initialTeacherRegistry, initialProfiles])

  useEffect(() => {
    setExams(initialExams)
    setLedger(initialLedger)
    
    // Smooth deep-linking for dashboard quick actions
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'teachers') setActiveTab('teachers');
    if (tab === 'subjects') setActiveTab('subjects');
  }, [initialExams, initialLedger])

  const getNextNepaliDate = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    
    let y = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let d = parseInt(parts[2]);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

    d++;
    // Simplified Nepali date increment (max 32 days)
    if (d > 32) {
      d = 1;
      m++;
    }
    if (m > 12) {
      m = 1;
      y++;
    }

    return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
  };

  const handleAutoFill = (startSubjectId: string, startDate: string) => {
    if (!startDate || !startDate.includes('/')) {
      alert('Please enter a valid date (e.g. 2081/01/15) first.');
      return;
    }
    
    const newInputs = { ...routineInputs };
    let currentDate = startDate;

    const allExMarks: any[] = [];
    groupExams.forEach(ex => {
      const marks = existingMarks.filter(m => m.exam_id === ex.id);
      allExMarks.push(...marks);
    });

    let foundStart = false;
    for (const m of allExMarks) {
      if (m.subject_id === startSubjectId) {
        foundStart = true;
        continue;
      }
      if (foundStart) {
        currentDate = getNextNepaliDate(currentDate);
        newInputs[m.subject_id] = currentDate;
      }
    }
    setRoutineInputs(newInputs);
  };

  const handleAutoFillProgram = (examId: string) => {
    const ex = groupExams.find(e => e.id === examId);
    if (!ex) return;

    const getGroupingKey = (subId: string) => {
      const s = subjects.find(sub => sub.id === subId);
      if (!s || !s.code) return subId;
      const matches = s.code.match(/\d+/);
      const num = matches ? matches[0] : '';
      if (ex.program === 'B.Ed' || ex.program === 'BBS') {
        return num || subId; // Group majors by number
      }
      return s.code.replace(/\s+/g, '').toUpperCase(); // Distinct items for BHM, etc
    };

    // Sort subjects by number first, then by full code string
    const programMarks = [...existingMarks.filter(m => m.exam_id === ex.id)].sort((a, b) => {
      const sA = subjects.find(sub => sub.id === a.subject_id);
      const sB = subjects.find(sub => sub.id === b.subject_id);
      const numA = (sA?.code?.match(/\d+/) || [''])[0];
      const numB = (sB?.code?.match(/\d+/) || [''])[0];
      if (numA !== numB) {
        return numA.localeCompare(numB, undefined, { numeric: true });
      }
      return (sA?.code || '').localeCompare(sB?.code || '');
    });

    const firstWithDateIdx = programMarks.findIndex(m => routineInputs[m.subject_id]);
    if (firstWithDateIdx === -1) {
      setNotificationModal({ 
        show: true, 
        type: 'warning', 
        message: 'Please enter at least one date manually (e.g. 2082/12/01) to start the auto-fill sequence.' 
      });
      return;
    }

    const newInputs = { ...routineInputs };
    let currentDate = routineInputs[programMarks[firstWithDateIdx].subject_id];
    let prevKey = getGroupingKey(programMarks[firstWithDateIdx].subject_id);

    for (let i = firstWithDateIdx + 1; i < programMarks.length; i++) {
      const currentKey = getGroupingKey(programMarks[i].subject_id);
      
      // If key is DIFFERENT, move to next day
      if (currentKey !== prevKey) {
        currentDate = getNextNepaliDate(currentDate);
      }
      
      // Assign date if not already set
      if (!newInputs[programMarks[i].subject_id]) {
        newInputs[programMarks[i].subject_id] = currentDate;
      } else {
        // If it was already set, respect it and update currentDate tracker
        currentDate = newInputs[programMarks[i].subject_id];
      }
      
      prevKey = currentKey;
    }
    setRoutineInputs(newInputs);
  };

  const handleGlobalAutoFill = () => {
    if (!globalStartDate) {
      setNotificationModal({ show: true, type: 'warning', message: 'Please enter a global start date first.' });
      return;
    }

    const newInputs = { ...routineInputs };

    groupExams.forEach(ex => {
      const getGroupingKey = (subId: string) => {
        const s = subjects.find(sub => sub.id === subId);
        if (!s || !s.code) return subId;
        const matches = s.code.match(/\d+/);
        const num = matches ? matches[0] : '';
        if (ex.program === 'B.Ed' || ex.program === 'BBS') {
          return num || subId;
        }
        return s.code.replace(/\s+/g, '').toUpperCase();
      };

      const programMarks = [...existingMarks.filter(m => m.exam_id === ex.id)].sort((a, b) => {
        const sA = subjects.find((sub: any) => sub.id === a.subject_id);
        const sB = subjects.find((sub: any) => sub.id === b.subject_id);
        const numA = (sA?.code?.match(/\d+/) || [''])[0];
        const numB = (sB?.code?.match(/\d+/) || [''])[0];
        if (numA !== numB) {
          return numA.localeCompare(numB, undefined, { numeric: true });
        }
        return (sA?.code || '').localeCompare(sB?.code || '');
      });

      if (programMarks.length === 0) return;

      const firstTheoryIdx = programMarks.findIndex(m => {
        const subjName = subjects.find((s: any) => s.id === m.subject_id)?.name || '';
        return !(subjName.toLowerCase().endsWith(' pr') || subjName.toLowerCase().includes('(pr)') || subjName.toLowerCase().includes('practical'));
      });

      if (firstTheoryIdx === -1) return;

      newInputs[programMarks[firstTheoryIdx].subject_id] = globalStartDate;
      let currentDate = globalStartDate;
      let prevKey = getGroupingKey(programMarks[firstTheoryIdx].subject_id);

      for (let i = firstTheoryIdx + 1; i < programMarks.length; i++) {
        const currentKey = getGroupingKey(programMarks[i].subject_id);
        if (currentKey !== prevKey) {
          currentDate = getNextNepaliDate(currentDate);
        }
        newInputs[programMarks[i].subject_id] = currentDate;
        prevKey = currentKey;
      }
    });

    setRoutineInputs(newInputs);
  };

  const loadExamData = async (exam: any) => {
    let allMarks: any[] = []
    if (exam.group_id) {
      const g = await getExamsByGroup(exam.group_id)
      for (const ex of g) {
        const m = await getExamSubjects(ex.id)
        allMarks = [...allMarks, ...m]
      }
    } else {
      allMarks = await getExamSubjects(exam.id)
    }
    setExistingMarks(allMarks)
    
    // For routine, same logic
    let allRoutine: any[] = []
    if (exam.group_id) {
      const g = await getExamsByGroup(exam.group_id)
      for (const ex of g) {
        const r = await getExamRoutine(ex.id)
        allRoutine = [...allRoutine, ...r]
      }
    } else {
      allRoutine = await getExamRoutine(exam.id)
    }
    setRoutineData(allRoutine)
    
    const inputs: Record<string, string> = {}
    allMarks.forEach((m: any) => { inputs[m.subject_id] = m.exam_date || '' })
    setRoutineInputs(inputs)

    // Populate subject settings
    const settings: Record<string, { selected: boolean, fm: number, pm: number }> = {}
    allMarks.forEach((m: any) => {
      settings[`${m.exam_id}_${m.subject_id}`] = {
        selected: true, // If it exists in exam_subjects, it's selected
        fm: m.full_marks || 100,
        pm: m.pass_marks || 40
      }
    })
    setSubjectSettings(settings)

    const rep = await getMissingMarksReport(exam.id)
    setMissingReport(rep)
  }

  const handleEditClick = async (exam: any) => {
    setEditingExam(exam)
    setProgram(exam.program || '')
    setYearOrSem(exam.year_or_semester || '')
    setExamType(exam.exam_type || '')
    setStartDate(exam.start_date || '')
    setExamName(exam.name || '')
    setExamTime(exam.exam_time || '')
    setExamGroupId(exam.group_id || null)
    if (exam.group_id) {
      const g = await getExamsByGroup(exam.group_id)
      setGroupExams(g)
      setProgramRows(g.map(ex => ({ program: ex.program, yearOrSem: ex.year_or_semester })))
    } else {
      setGroupExams([exam])
      setProgramRows([{ program: exam.program, yearOrSem: exam.year_or_semester }])
    }
    await loadExamData(exam)
    setWizardStep(4)
  }

  const handleBackToList = () => {
    setWizardStep(0)
    setEditingExam(null)
    setExistingMarks([])
    setProgram('')
    setYearOrSem('')
    setExamType('')
    setStartDate('')
    setExamName('')
    setExamTime('')
    setProgramRows([{program: '', yearOrSem: ''}])
    setExamGroupId(null)
    setGroupExams([])
  }

  const handleDeleteClick = async (examId: string, groupId?: string) => {
    const msg = groupId 
      ? 'Are you SURE you want to delete this ENTIRIE SESSION? This will PERMANENTLY remove all programs, subject marks, and student results for this batch.'
      : 'Are you SURE you want to delete this exam? This will PERMANENTLY remove all subject marks and student results for this exam.';

    if (window.confirm(msg)) {
      try {
        if (groupId) {
          const g = await getExamsByGroup(groupId)
          for (const ex of g) {
            await deleteExam(ex.id)
          }
        } else {
          await deleteExam(examId)
        }
        alert('Deleted successfully.')
      } catch (error: any) {
        alert(`Failed to delete: ${error.message}`)
      }
    }
  }

  React.useEffect(() => {
    const activePrograms = programRows
      .map(r => r.program)
      .filter(p => !!p)
    
    // Aggregate unique programs: e.g. "BBS B.Ed MBS"
    const uniquePrograms = Array.from(new Set(activePrograms))
    const pString = uniquePrograms.join(' ')

    if (pString && examType && startDate) {
      const year = new Date(startDate).getFullYear()
      if (!isNaN(year)) {
        setExamName(`${pString} ${examType} ${year}`)
      }
    }
  }, [programRows, examType, startDate])

  const loadTeacherData = async () => {
    const reg = await getTeacherRegistry()
    const profs = await getProfiles()
    setTeacherRegistry(reg)
    setProfiles(profs)
  }

  const handleTabChange = (tab: any) => {
    setActiveTab(tab)
    if (tab === 'teachers') {
      loadTeacherData()
    }
    // Reset wizard and pagination when switching main tabs
    setWizardStep(0)
    setCurrentPage(1)
  }

  const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, formData)
        setNotificationModal({ show: true, type: 'success', message: 'Subject updated successfully!' })
      } else {
        await addSubject(formData)
        setNotificationModal({ show: true, type: 'success', message: 'Subject added successfully!' })
      }
      
      const prog = formData.get('program') as string
      const year = formData.get('semester_or_year') as string
      
      // Auto-switch filters
      setManageProg(prog)
      setManageYear(year)
      
      resetSubjectForm()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const resetSubjectForm = () => {
    setEditingSubject(null)
    setSubName('')
    setSubCode('')
    setSubSem('')
    setSubCat('Compulsory')
    setProgram('')
  }

  const handleSelectSubject = (s: any) => {
    setEditingSubject(s)
    setSubName(s.name)
    setSubCode(s.code)
    setProgram(s.program)
    
    // Extract numeric semester/year
    const m = String(s.semester_or_year).match(/\d+/);
    setSubSem(m ? m[0] : s.semester_or_year)
    
    setSubCat(s.category || 'Compulsory')
    
    // Scroll to form for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteSubject = async (id: string) => {
    const sub = subjects.find(s => s.id === id);
    setConfirmDeleteModal({ 
      show: true, 
      id: id, 
      title: sub ? `${sub.name} (${sub.code})` : 'this subject' 
    });
  }

  const proceedDeleteSubject = async () => {
    if (!confirmDeleteModal.id) return
    try {
      await deleteSubject(confirmDeleteModal.id)
      router.refresh()
      setNotificationModal({ show: true, type: 'success', message: 'Subject deleted successfully!' })
      setConfirmDeleteModal({ show: false, id: null, title: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleBulkAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const text = formData.get('list') as string
    const prog = formData.get('program') as string
    try {
      await bulkAddTeachers(text, prog)
      alert('Teachers added to registry!')
      setIsBulkAdding(false)
      loadTeacherData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSelectTeacher = async (teacher: any) => {
    setSelectedTeacher(teacher)
    const assignments = await getTeacherAssignments(teacher.email, teacher.id)
    setTempAssignments(assignments)
    setSubjectSearch('')
    setMappingProg('')
    setMappingSem('')
    
    // Fetch what's "auto-detected" for this teacher
    const data = await getTeacherDashboardData(teacher.email, teacher.id)
    setActiveExamsForTeacher(data.assignments)
  }

  const handleToggleAssignment = (subjectId: string) => {
    setTempAssignments(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const handleSaveAssignments = async () => {
    if (!selectedTeacher) return
    setIsSavingAssignments(true)
    try {
      await syncTeacherAssignments(selectedTeacher.email, tempAssignments, selectedTeacher.id)
      setTeacherAssignments(tempAssignments)
      alert('Assignments saved!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSavingAssignments(false)
    }
  }

  const handleUpdateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newName = formData.get('full_name') as string
    const newEmail = formData.get('email') as string
    
    try {
      await updateTeacher(editingTeacher.email, { full_name: newName, email: newEmail }, editingTeacher.id)
      alert('Teacher updated!')
      setEditingTeacher(null)
      loadTeacherData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteTeacher = async (email: string, id?: string) => {
    if (window.confirm(`Are you sure you want to remove this teacher? This will also delete their subject assignments.`)) {
      try {
        await deleteTeacher(email, id)
        alert('Teacher removed successfully')
        loadTeacherData()
        setSelectedTeacher(null)
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Step 1: Create or update basic exam info
  const handleSaveBasicInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSavingBasic(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const data = {
      name: fd.get('name') as string,
      exam_type: fd.get('examType') as string,
      start_date: fd.get('start_date') as string,
      end_date: fd.get('end_date') as string,
      result_date: fd.get('result_date') as string,
      status: (fd.get('status') as string) || 'Upcoming',
      exam_time: fd.get('exam_time') as string,
    }

    // Validation: Ensure logical date sequence (Using string comparison for B.S. dates)
    const start = fd.get('start_date') as string
    const end = fd.get('end_date') as string
    const result = fd.get('result_date') as string

    if (!start.includes('/') || !end.includes('/') || !result.includes('/')) {
      alert("Error: Please use YYYY/MM/DD format for B.S. dates.")
      setIsSavingBasic(false)
      return
    }

    if (end < start) {
      alert("Error: Exam End Date cannot be before the Start Date.")
      setIsSavingBasic(false)
      return
    }

    if (result <= end) {
      alert("Error: Result Publication Date must be strictly AFTER the Exam End Date.")
      setIsSavingBasic(false)
      return
    }

    try {
      if (editingExam) {
        if (examGroupId) {
          // Update all in group for shared fields
          const g = await getExamsByGroup(examGroupId)
          for (const ex of g) {
            await updateExamBasicInfo(ex.id, { ...data, program: ex.program, year_or_semester: ex.year_or_semester })
          }
        } else {
          await updateExamBasicInfo(editingExam.id, { ...data, program: programRows[0].program, year_or_semester: programRows[0].yearOrSem })
        }
        setEditingExam({ ...editingExam, ...data })
      } else {
        const { exams, group_id } = await createExamBatch(data, programRows)
        setEditingExam(exams[0])
        setExamGroupId(group_id)
        setGroupExams(exams)

        // Initialize settings for NEW exams with dynamic marks based on rules
        const newSettings: Record<string, { selected: boolean, fm: number, pm: number }> = {}
        exams.forEach(ex => {
          const matchingSubs = subjects.filter((s: any) => s.program === ex.program && s.semester_or_year === ex.year_or_semester)
          
          matchingSubs.forEach((sub: any) => {
            const isYearly = ex.program === 'BBS' || ex.program === 'B.Ed';
            const isSemester = ex.program === 'BHM' || ex.program === 'BIM' || ex.program === 'BITM' || ex.program === 'MBS';
            const isIT = sub.code?.toUpperCase().startsWith('IT') || sub.name?.toUpperCase().includes('COMPUTER');
            
            let fm = 100;
            let pm = 40;

            if (isYearly) {
              if (data.exam_type === 'Final Internal Examination') {
                fm = 100; pm = 35;
              } else {
                fm = 50; pm = 17.5;
              }
            } else if (isSemester) {
              if (isIT) {
                if (data.exam_type === 'Final Internal Examination') {
                  fm = 60; pm = 30;
                } else {
                  fm = 30; pm = 15;
                }
              } else {
                // Management subjects
                if (data.exam_type === 'Final Internal Examination') {
                  fm = 100; pm = 50;
                } else {
                  fm = 50; pm = 25;
                }
              }
            }

            newSettings[`${ex.id}_${sub.id}`] = { selected: true, fm, pm }
          })
        })
        setSubjectSettings(newSettings)
      }
      setWizardStep(2)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSavingBasic(false)
    }
  }

  // Step 2: Save subjects for all in group
  const handleSaveSubjects = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingExam) return
    setIsSavingSubjects(true)
    
    try {
      // Step 1 created groupExams
      for (const ex of groupExams) {
        // Collect subject data from state
        const subData = subjects
          .filter((s: any) => {
            const matchesProg = s.program === ex.program;
            const dbYearNum = (String(s.semester_or_year || '').match(/\d+/) || [''])[0];
            const targetYearNum = (String(ex.year_or_semester || '').match(/\d+/) || [''])[0];
            return matchesProg && dbYearNum === targetYearNum && dbYearNum !== '';
          })
          .filter(s => subjectSettings[`${ex.id}_${s.id}`]?.selected)
          .map(s => {
            const setting = subjectSettings[`${ex.id}_${s.id}`]
            return {
              subject_id: s.id,
              full_marks: setting?.fm || 100,
              pass_marks: setting?.pm || 40,
            }
          })

        await saveExamSubjectsOnly(ex.id, subData)
      }
      
      await loadExamData(editingExam)
      setWizardStep(3)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSavingSubjects(false)
    }
  }


  return (
    <div className={styles.examContainer}>
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'exams' ? styles.active : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          <ClipboardList size={18} /> Manage Exams
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'teachers' ? styles.active : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          <Users size={18} /> Teachers
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'subjects' ? styles.active : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <BookOpen size={18} /> Subjects
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'ledger' ? styles.active : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <FileText size={18} /> Ledger
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'report' ? styles.active : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <BarChart3 size={18} /> Reports
        </button>
      </div>

      {activeTab === 'exams' && (
        <React.Fragment>
          {wizardStep > 0 && wizardStep < 4 && <WizardBar current={wizardStep} />}
          {wizardStep === 4 && editingExam && <WizardBar current={4} />}

          {/* ── STEP 0: Exam List */}
          {wizardStep === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <button
                onClick={() => { 
                  setEditingExam(null); 
                  setProgram(''); 
                  setYearOrSem(''); 
                  setExamType(''); 
                  setStartDate(''); 
                  setExamName(''); 
                  setProgramRows([{program: '', yearOrSem: ''}]);
                  setExamGroupId(null);
                  setGroupExams([]);
                  setWizardStep(1); 
                }}
                className={`${styles.button} ${styles.buttonPrimary}`}
                style={{ padding: '1.25rem 3rem', fontSize: '1.25rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 50, 146, 0.3)' }}
              >
                <span>➕</span> Operate New Exam
              </button>
            </div>
            <div className={styles.card}>
              <h3>Exams</h3>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(() => {
                  const grouped: any[] = [];
                  const seenGroups = new Set();
                  exams.forEach(ex => {
                    if (!ex.group_id) {
                      grouped.push(ex);
                    } else if (!seenGroups.has(ex.group_id)) {
                      seenGroups.add(ex.group_id);
                      const groupPrograms = exams.filter(e => e.group_id === ex.group_id).map(e => e.program)
                      grouped.push({ ...ex, is_group: true, combined_programs: Array.from(new Set(groupPrograms)).join(', ') });
                    }
                  });

                  const totalPages = Math.ceil(grouped.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginated = grouped.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <React.Fragment>
                      {paginated.map(exam => (
                        <div key={exam.id} style={{ border: '1px solid #e5e7eb', padding: '1rem 1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <div>
                            <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{exam.name}</p>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {exam.is_group ? `Programs: ${exam.combined_programs}` : `${exam.program} — ${exam.year_or_semester}`} 
                              &nbsp;|&nbsp; Ends: {new Date(exam.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                            <span className={`${styles.badge} ${styles[`badge${exam.status}`]}`}>{exam.status}</span>
                            <button 
                              onClick={() => handleEditClick(exam)} 
                              className={`${styles.button} ${styles.buttonPrimary}`}
                              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                            >
                              Manage <span>→</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(exam.id, exam.group_id)} 
                              className={`${styles.button} ${styles.buttonSecondary}`}
                              style={{ padding: '0.65rem', border: 'none', background: '#fee2e2', color: '#ef4444' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Pagination Controls */}
                      {grouped.length > itemsPerPage && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                          >Previous</button>
                          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Page <strong>{currentPage}</strong> of {totalPages}</span>
                          <button 
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                          >Next</button>
                        </div>
                      )}
                    </React.Fragment>
                  )
                })()}
                {exams.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                    No exams yet. Click <strong>+ Operate New Exam</strong> to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* ── STEP 1: Basic Info */}
          {wizardStep === 1 && (
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Step 1 — Basic Exam Info</h3>
              <button onClick={handleBackToList} style={{ padding: '0.4rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back to List</button>
            </div>

            <form onSubmit={handleSaveBasicInfo}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>Programs to Include</p>
                  <button type="button" onClick={() => setProgramRows([...programRows, {program: '', yearOrSem: ''}])} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#003292', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>+ Add Program</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {programRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 40px', gap: '0.75rem', alignItems: 'end' }}>
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Program</label>
                        <select className={styles.select} value={row.program} onChange={e => {
                          const nr = [...programRows]; nr[idx].program = e.target.value; nr[idx].yearOrSem = ''; setProgramRows(nr);
                        }} required>
                          <option value="">Select</option>
                          <option value="BBS">BBS</option>
                          <option value="B.Ed">B.Ed</option>
                          <option value="BHM">BHM</option>
                          <option value="BITM">BITM</option>
                          <option value="BIM">BIM</option>
                          <option value="MBS">MBS</option>
                        </select>
                      </div>
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>{row.program && (row.program === 'BHM' || row.program === 'BIM' || row.program === 'BITM' || row.program === 'MBS') ? 'Semester' : 'Year'}</label>
                        <select className={styles.select} value={row.yearOrSem} onChange={e => {
                          const nr = [...programRows]; nr[idx].yearOrSem = e.target.value; setProgramRows(nr);
                        }} required disabled={!row.program}>
                          <option value="">Select</option>
                          {row.program && (() => {
                            const isSem = row.program === 'BHM' || row.program === 'BIM' || row.program === 'BITM' || row.program === 'MBS'
                            const count = row.program === 'MBS' ? 4 : isSem ? 8 : 4
                            const ords = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
                            return [...Array(count)].map((_, i) => { const l = isSem ? `${ords[i]} Sem` : `${ords[i]} Year`; return <option key={i} value={l}>{l}</option> })
                          })()}
                        </select>
                      </div>
                      <button type="button" onClick={() => setProgramRows(programRows.filter((_, i) => i !== idx))} disabled={programRows.length === 1} style={{ height: '38px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label>Exam Type</label>
                  <select className={styles.select} name="examType" value={examType} onChange={e => setExamType(e.target.value)} required>
                    <option value="">Select Type</option>
                    <option value="First Internal Examination">First Internal Examination</option>
                    <option value="Final Internal Examination">Final Internal Examination</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Start Date (B.S.)</label>
                  <input type="text" name="start_date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} required placeholder="YYYY/MM/DD (e.g. 2081/01/15)" />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date (B.S.)</label>
                  <input type="text" name="end_date" className={styles.input} defaultValue={editingExam?.end_date || ''} required placeholder="YYYY/MM/DD" />
                </div>
                <div className={styles.formGroup}>
                  <label>Result Publish Date (B.S.)</label>
                  <input type="text" name="result_date" className={styles.input} defaultValue={editingExam?.result_date || ''} required placeholder="YYYY/MM/DD" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Exam Session Name (Common for all programs)</label>
                  <input type="text" name="name" className={styles.input} value={examName} onChange={e => setExamName(e.target.value)} required placeholder="e.g. First Internal Examination 2081" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Exam Time (e.g. 7:00 AM - 10:00 AM)</label>
                  <input type="text" name="exam_time" className={styles.input} value={examTime} onChange={e => setExamTime(e.target.value)} placeholder="Enter time duration for routine" />
                </div>
              </div>
              <button type="submit" disabled={isSavingBasic} style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', background: isSavingBasic ? '#94a3b8' : '#003292', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                {isSavingBasic ? 'Saving...' : 'Save & Continue → Subjects'}
              </button>
            </form>
          </div>
          )}

          {/* ── STEP 2: Subjects */}
          {wizardStep === 2 && (
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3>Step 2 — Select Subjects</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Confirm subjects for all programs in this session.</p>
                </div>
                <button onClick={() => setWizardStep(1)} style={{ padding: '0.4rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
              </div>

              <form onSubmit={handleSaveSubjects}>
                {groupExams.map(ex => (
                  <ProgramSubjectSection 
                    key={ex.id} 
                    ex={ex} 
                    subjects={subjects} 
                    subjectSettings={subjectSettings} 
                    setSubjectSettings={setSubjectSettings} 
                    examType={examType}
                  />
                ))}
                <button type="submit" disabled={isSavingSubjects} style={{ width: '100%', padding: '0.85rem', background: isSavingSubjects ? '#94a3b8' : '#003292', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                  {isSavingSubjects ? 'Saving...' : 'Save & Continue → Schedule Dates'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 3: Schedule */}
          {wizardStep === 3 && (
          <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Step 3 — Exam Schedule (Dates)</h3>
                <button onClick={() => setWizardStep(2)} style={{ padding: '0.4rem 1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde047' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚡</span> Global Master Auto-fill
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#b45309', fontSize: '0.8rem' }}>Set one single start date and populate it chronologically across ALL programs below instantly.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. 2082/12/05"
                    value={globalStartDate}
                    onChange={e => setGlobalStartDate(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #fcd34d', width: '140px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                  <button 
                    type="button"
                    onClick={handleGlobalAutoFill}
                    style={{ padding: '0.6rem 1.25rem', background: '#d97706', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(217,119,6,0.2)' }}
                    onMouseOver={e => e.currentTarget.style.background = '#b45309'}
                    onMouseOut={e => e.currentTarget.style.background = '#d97706'}
                  >
                    Auto-fill All Programs
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {groupExams.map(ex => {
                   const exMarks = existingMarks.filter(m => m.exam_id === ex.id)
                   if (exMarks.length === 0) return null

                   // Filter unique subjects for UI display (Unique by Normalized Name, Hide Practicals)
                   const uniqueDisplayMarks: any[] = [];
                   const seenNames = new Set();
                   exMarks.forEach(m => {
                     const subjName = m.subjects?.name || '';
                     const normName = subjName.replace(/\s+/g, '').toUpperCase();
                     
                     // Skip Practical subjects for now
                     if (subjName.toLowerCase().endsWith(' pr') || subjName.toLowerCase().includes('(pr)') || subjName.toLowerCase().includes('practical')) {
                       return;
                     }

                     if (!seenNames.has(normName)) {
                       uniqueDisplayMarks.push(m);
                       seenNames.add(normName);
                     }
                   });
                   
                   uniqueDisplayMarks.sort((a, b) => {
                     const codeA = a.subjects?.code || '';
                     const codeB = b.subjects?.code || '';
                     const numA = (codeA.match(/\d+/) || [''])[0];
                     const numB = (codeB.match(/\d+/) || [''])[0];
                     if (numA !== numB) {
                       return numA.localeCompare(numB, undefined, { numeric: true });
                     }
                     return codeA.localeCompare(codeB);
                   });

                   return (
                     <div key={ex.id}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderLeft: '3px solid #003292', paddingLeft: '0.5rem' }}>
                         <h4 style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>{ex.program} — {ex.year_or_semester}</h4>
                         <button 
                           type="button"
                           onClick={() => handleAutoFillProgram(ex.id)}
                           style={{ padding: '0.2rem 0.6rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                         >
                           ⚡ Auto-fill Date
                         </button>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
                         {uniqueDisplayMarks.map((m: any) => (
                          <div key={`${ex.id}-${m.subject_id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{m.subjects?.name}</p>
                              <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{m.subjects?.code}</p>
                            </div>
                             <input 
                               type="text" 
                               placeholder="2081/01/15" 
                               value={routineInputs[m.subject_id] || ''} 
                                onChange={e => {
                                  const val = e.target.value;
                                  const currentSubjCode = m.subjects?.code || '';
                                  const currentSubjName = m.subjects?.name || '';
                                  const normCode = currentSubjCode.replace(/\s+/g, '').toUpperCase();
                                  const normName = currentSubjName.replace(/\s+/g, '').toUpperCase();
                                  
                                  setRoutineInputs(prev => {
                                    const next = { ...prev, [m.subject_id]: val };
                                    // Auto-sync same subject ONLY within the SAME program (ex.id)
                                    if (normCode) {
                                      existingMarks.filter(o => o.exam_id === ex.id).forEach(other => {
                                        const otherCode = (other.subjects?.code || '').replace(/\s+/g, '').toUpperCase();
                                        const otherName = (other.subjects?.name || '').replace(/\s+/g, '').toUpperCase();
                                        if (otherCode === normCode && otherName === normName) {
                                          next[other.subject_id] = val;
                                        }
                                      });
                                    }
                                    return next;
                                  });
                                }} 
                               style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', width: '130px', fontFamily: 'monospace' }} 
                             />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
             
             <div style={{ display: 'flex', gap: '1rem' }}>
               <button 
                 disabled={isSavingRoutine} 
                 onClick={async () => {
                   setIsSavingRoutine(true)
                   try {
                     // Save routine for each exam in the group
                     for (const ex of groupExams) {
                       const exMarks = existingMarks.filter(m => m.exam_id === ex.id)
                       const items = exMarks
                         .map(m => ({ subject_id: m.subject_id, exam_date: routineInputs[m.subject_id] || '' }))
                         .filter(i => i.exam_date.trim() !== '')
                       
                       await saveRoutine(ex.id, items)
                     }
                     
                     await loadExamData(editingExam!)
                     setWizardStep(4)
                   } catch (e: any) { alert(e.message) } finally { setIsSavingRoutine(false) }
                 }} 
                 style={{ 
                   flex: 2, padding: '0.85rem', background: isSavingRoutine ? '#94a3b8' : '#003292', 
                   color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', 
                   fontWeight: 700, fontSize: '1rem' 
                 }}
               >
                 {isSavingRoutine ? 'Saving...' : 'Save & Go to Dashboard →'}
               </button>

               {routineData.length > 0 && (
                 <button 
                   onClick={async () => {
                     try {
                       const endpoint = examGroupId ? '/api/admin/routine/master' : '/api/admin/routine/generate'
                       const payload = examGroupId 
                         ? { group_id: examGroupId }
                         : { 
                             examId: editingExam?.id,
                             examName: editingExam?.name, 
                             routine: routineData,
                             program: editingExam?.program,
                             yearOrSem: editingExam?.year_or_semester,
                             examTime: examTime
                           }

                       const res = await fetch(endpoint, { 
                         method: 'POST', 
                         headers: { 'Content-Type': 'application/json' }, 
                         body: JSON.stringify(payload) 
                       })
                       if (!res.ok) throw new Error('Failed to generate PDF')
                       const blob = await res.blob(); 
                       const url = URL.createObjectURL(blob); 
                       const a = document.createElement('a'); 
                       a.href = url; a.download = examGroupId ? 'master_routine.pdf' : 'routine.pdf'; 
                       document.body.appendChild(a); a.click(); URL.revokeObjectURL(url)
                     } catch (e: any) { alert(e.message) }
                   }} 
                   style={{ 
                     flex: 1, padding: '0.85rem', background: 'white', color: '#0ea5e9', 
                     borderRadius: '10px', border: '2px solid #0ea5e9', cursor: 'pointer', 
                     fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', 
                     justifyContent: 'center', gap: '0.5rem' 
                   }}
                 >
                   📄 {examGroupId ? 'Master Routine' : 'PDF'}
                 </button>
               )}
             </div>
          </div>
          )}

          {/* ── STEP 4: Exam Dashboard (Management Hub) */}
          {wizardStep === 4 && editingExam && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a' }}>{editingExam.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {groupExams.length > 0 ? (
                      groupExams.map(ex => (
                        <span key={ex.id} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{ex.program} {ex.year_or_semester}</span>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{editingExam.program} — {editingExam.year_or_semester}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleBackToList} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← All Exams</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <StepCard num={1} label="Basic Info & Multi-Program Selection" status={examGroupId ? `${groupExams.length} Programs involved` : editingExam.name} color="green" action={() => setWizardStep(1)} actionLabel="Edit" />
                <StepCard num={2} label="Subjects Selection" status={existingMarks.length > 0 ? `${existingMarks.length} total subjects across programs` : 'Not set up'} color={existingMarks.length > 0 ? 'green' : 'yellow'} action={() => setWizardStep(2)} actionLabel={existingMarks.length > 0 ? 'Review' : 'Set Up →'} />
                <StepCard num={3} label="Consolidated Exam Schedule (Dates)" status={routineData.length > 0 ? `${routineData.length} dated slots ready` : 'No dates set'} color={routineData.length > 0 ? 'green' : 'yellow'} action={() => setWizardStep(3)} actionLabel={routineData.length > 0 ? 'Edit' : 'Set Dates →'} />
                <StepCard 
                  num={4} 
                  label="Student List Sync" 
                  status={ledger.some((r: any) => r.exam_id === editingExam.id) ? 'Students synced' : 'Sync needed'} 
                  color={ledger.some((r: any) => r.exam_id === editingExam.id) ? 'green' : 'yellow'} 
                  action={() => window.location.href = '/admin/seat-plan'} 
                  actionLabel="Go to Seat Plan →" 
                />
                <div style={{ 
                  padding: '1.25rem', 
                  border: `1px solid ${missingReport.length === 0 && ledger.some(r => r.exam_id === editingExam.id) ? '#bbf7d0' : '#fef08a'}`, 
                  borderRadius: '12px', 
                  background: missingReport.length === 0 && ledger.some(r => r.exam_id === editingExam.id) ? '#f0fdf4' : '#fefce8' 
                }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', marginBottom: '0.75rem' }}>5. Teachers & Marks Status</p>
                  {missingReport.length > 0 ? (
                    <div style={{ fontSize: '0.85rem' }}>
                      <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Action Required: {missingReport.length} items incomplete</p>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.5)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <ul style={{ paddingLeft: '0', margin: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {missingReport.map((m, i) => (
                            <li key={i} style={{ padding: '0.4rem', borderBottom: i < missingReport.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.subject_name} ({m.program})</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                                <span style={{ color: m.status === 'Sync Needed' ? '#f59e0b' : '#dc2626', fontWeight: 600 }}>{m.status}</span>
                                <span style={{ color: '#64748b' }}>{m.teacher_names}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : <p style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>✅ All subjects across all programs have marks entered.</p>}
                </div>
                  <button
                    onClick={() => { if (missingReport.length > 0) { alert('Cannot publish! Please ensure all teachers have submitted marks.') } else { alert('Bulk Publish feature coming soon! Update individual exam status to Completed in the list for now.') } }}
                    style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', background: missingReport.length > 0 ? '#94a3b8' : '#16a34a', color: 'white', borderRadius: '10px', border: 'none', cursor: missingReport.length > 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  >
                    {missingReport.length > 0 ? `🔒 Cannot Publish — ${missingReport.length} missing` : '🚀 Bulk Publish Exam Results'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                      onClick={() => setWizardStep(5)} // Step 5 for Ledger
                      style={{ padding: '1rem', background: 'white', border: '2px solid #003292', color: '#003292', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      📋 View Ledger
                    </button>
                    <button 
                      onClick={() => setWizardStep(6)} // Step 6 for Reports
                      style={{ padding: '1rem', background: 'white', border: '2px solid #003292', color: '#003292', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      📊 Result Reports
                    </button>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 5 && editingExam && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Results Ledger — {editingExam.name}</h3>
                  <button onClick={() => setWizardStep(4)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back to Dashboard</button>
                </div>
                <LedgerManager exams={groupExams.length > 0 ? groupExams : [editingExam]} />
              </div>
            )}

            {wizardStep === 6 && editingExam && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Result Analysis Reports</h3>
                  <button onClick={() => setWizardStep(4)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Back to Dashboard</button>
                </div>
                <ResultReports exams={groupExams.length > 0 ? groupExams : [editingExam]} />
              </div>
            )}
        </React.Fragment>
      )}

      {/* Premium Confirmation Modal */}
      {confirmDeleteModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '16px',
            width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2',
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.5rem'
            }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.75rem' }}>Delete Subject?</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{confirmDeleteModal.title}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setConfirmDeleteModal({ show: false, id: null, title: '' })}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={proceedDeleteSubject}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Notification Modal (Success / Warning) */}
      {notificationModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white', padding: '2.5rem', borderRadius: '24px',
            width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
            textAlign: 'center', position: 'relative', border: `1px solid ${notificationModal.type === 'success' ? '#f0fdf4' : '#fff7ed'}`
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', 
              background: notificationModal.type === 'success' ? '#f0fdf4' : '#fff7ed',
              color: notificationModal.type === 'success' ? '#22c55e' : '#f59e0b', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', margin: '0 auto 1.5rem',
              boxShadow: `0 0 0 8px ${notificationModal.type === 'success' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)'}`
            }}>
              {notificationModal.type === 'success' ? '✓' : '⚠️'}
            </div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              color: notificationModal.type === 'success' ? '#064e3b' : '#7c2d12', 
              marginBottom: '0.75rem',
              fontWeight: 800
            }}>
              {notificationModal.type === 'success' ? 'Success!' : 'Action Required'}
            </h3>
            <p style={{ color: '#475569', fontSize: '1.05rem', marginBottom: '2.25rem', lineHeight: '1.6' }}>
              {notificationModal.message}
            </p>
            <button 
              onClick={() => setNotificationModal({ ...notificationModal, show: false })}
              style={{ 
                width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', 
                background: notificationModal.type === 'success' ? '#22c55e' : '#f59e0b', 
                color: 'white', fontWeight: 700, cursor: 'pointer',
                fontSize: '1.1rem', transition: 'transform 0.1s active',
                boxShadow: `0 4px 12px ${notificationModal.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}
            >
              {notificationModal.type === 'success' ? 'Great!' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) 3fr', gap: '2rem' }}>
          {/* Teacher Sidebar */}
          <div className={styles.card} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>Teachers</h3>
              <button 
                onClick={() => { setIsBulkAdding(true); setSelectedTeacher(null); }}
                className={`${styles.button} ${styles.buttonPrimary}`}
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
              >
                <span>➕</span> Bulk Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...profiles, ...teacherRegistry.filter(r => !profiles.find(p => p.email === r.email))].sort((a,b) => (a.full_name || '').localeCompare(b.full_name || '')).map(t => {
                const isActive = profiles.find(p => p.email === t.email)
                const isSelected = selectedTeacher?.email === t.email
                return (
                  <div 
                    key={t.email} 
                    onClick={() => handleSelectTeacher(t)}
                    style={{ 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#3b82f6' : '#f1f5f9',
                      background: isSelected ? '#eff6ff' : 'white',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: isSelected ? '#1e40af' : '#1f2937' }}>{t.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingTeacher(t); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem' }}
                        title="Edit Teacher"
                      >
                        ✎
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(t.email, t.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem', color: '#ef4444' }}
                        title="Delete Teacher"
                      >
                        ✖
                      </button>
                    </div>
                  </div>
                )
              })}
              {profiles.length === 0 && teacherRegistry.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No teachers added yet.</div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div className={styles.card}>
            {isBulkAdding ? (
              // ... Bulk Add Form (unchanged logic)
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Bulk Add Teachers</h3>
                  <button onClick={() => setIsBulkAdding(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
                </div>
                <form onSubmit={handleBulkAdd}>
                  <div className={styles.formGroup}>
                    <label>Program</label>
                    <select name="program" className={styles.select} required>
                      <option value="BIM">BIM</option>
                      <option value="BHM">BHM</option>
                      <option value="BBS">BBS</option>
                      <option value="B.Ed">B.Ed</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Teacher List (Format: Name, Email)</label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>One teacher per line. e.g. <br/>John Doe, john@example.com</p>
                    <textarea 
                      name="list" 
                      className={styles.input} 
                      style={{ minHeight: '200px', fontFamily: 'monospace' }} 
                      placeholder="Pusp Raj, pusp@example.com&#10;Hari Lal, hari@example.com"
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} style={{ width: '100%' }}>
                    <span>🚀</span> Import Teacher List
                  </button>
                </form>
              </div>
            ) : editingTeacher ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Edit Teacher Details</h3>
                  <button onClick={() => setEditingTeacher(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
                </div>
                <form onSubmit={handleUpdateTeacher}>
                  <div className={styles.formGroup}>
                    <label>Full Name</label>
                    <input name="full_name" defaultValue={editingTeacher.full_name} className={styles.input} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input name="email" defaultValue={editingTeacher.email} className={styles.input} required />
                  </div>
                  <button type="submit" disabled={isSavingAssignments} className={`${styles.button} ${styles.buttonPrimary}`} style={{ width: '100%', background: '#10b981' }}>
                    <span>💾</span> {isSavingAssignments ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            ) : selectedTeacher ? (
              <div>
                <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.2rem' }}>{selectedTeacher.full_name}</h3>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Assigning subjects for {selectedTeacher.email}</div>
                    </div>
                    {JSON.stringify(teacherAssignments) !== JSON.stringify(tempAssignments) && (
                      <button 
                        onClick={handleSaveAssignments}
                        disabled={isSavingAssignments}
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        style={{ padding: '0.75rem 2rem' }}
                      >
                        <span>💾</span> {isSavingAssignments ? 'Saving...' : 'Save Assignments'}
                      </button>
                    )}
                  </div>

                  {/* Auto-Detection Summary */}
                  {activeExamsForTeacher.length > 0 && (
                    <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '1.5rem' }}>
                      <p style={{ fontWeight: '700', color: '#166534', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>⚡</span> Auto-Detected Exams
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {Array.from(new Set(activeExamsForTeacher.map(a => `${a.examName} (${a.program})`))).map(exam => (
                          <span key={exam} style={{ background: 'white', padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', color: '#15803d', border: '1px solid #dcfce7', fontWeight: '500' }}>
                            {exam}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#166534', marginTop: '0.5rem', opacity: 0.8 }}>
                        The teacher will automatically see these exams in their portal.
                      </p>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Search Subjects</label>
                      <input 
                        type="text" 
                        placeholder="Search by name or code (e.g. IT 307)..." 
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        className={styles.input}
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Program</label>
                      <select 
                        className={styles.select} 
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                        value={mappingProg}
                        onChange={(e) => { setMappingProg(e.target.value); setMappingSem(''); }}
                      >
                        <option value="">All Programs</option>
                        <option value="BIM">BIM</option>
                        <option value="BBS">BBS</option>
                        <option value="BHM">BHM</option>
                        <option value="B.Ed">B.Ed</option>
                      </select>
                    </div>
                    {mappingProg && (
                      <div>
                        <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>{mappingProg === 'BBS' || mappingProg === 'B.Ed' ? 'Year' : 'Semester'}</label>
                        <select 
                          className={styles.select} 
                          style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                          value={mappingSem}
                          onChange={(e) => setMappingSem(e.target.value)}
                        >
                          <option value="">All</option>
                          {mappingProg === 'BBS' || mappingProg === 'B.Ed' ? (
                            [1,2,3,4].map(v => <option key={v} value={v}>Year {v}</option>)
                          ) : (
                            [1,2,3,4,5,6,7,8].map(v => <option key={v} value={v}>Sem {v}</option>)
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {Array.from(new Set(subjects.map(s => s.program))).sort().map(prog => {
                    if (mappingProg && prog !== mappingProg) return null;
                    
                    const progSubs = subjects.filter(s => s.program === prog)
                    if (progSubs.length === 0) return null

                    // Sub-grouping by Normalized Year/Semester
                    const getNumericGroup = (val: string) => {
                      const m = String(val).match(/\d+/);
                      return m ? m[0] : val;
                    };

                    const rawGroups = Array.from(new Set(progSubs.map(s => s.semester_or_year)))
                    const normalizedGroups = Array.from(new Set(rawGroups.map(g => getNumericGroup(g)))).sort((a, b) => Number(a) - Number(b))

                    return (
                      <div key={prog} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🎓</span> {prog} Program
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {normalizedGroups.map(normGroup => {
                            if (mappingSem && getNumericGroup(mappingSem) !== normGroup) return null;
                            
                            const groupSubs = progSubs.filter(s => {
                              const matchesSem = getNumericGroup(s.semester_or_year) === normGroup;
                              const matchesSearch = !subjectSearch || 
                                s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                                s.code.toLowerCase().includes(subjectSearch.toLowerCase());
                              return matchesSem && matchesSearch;
                            })

                            if (groupSubs.length === 0) return null

                            return (
                              <div key={normGroup}>
                                <h5 style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {prog === 'BBS' || prog === 'B.Ed' ? `Year ${normGroup}` : `Semester ${normGroup}`}
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                                  {groupSubs.map(s => {
                                    const isSelected = tempAssignments.includes(s.id)
                                    return (
                                      <label 
                                        key={s.id} 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          padding: '0.75rem', 
                                          border: '1px solid',
                                          borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                                          background: isSelected ? '#eff6ff' : 'white',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          boxShadow: isSelected ? '0 1px 3px 0 rgba(59, 130, 246, 0.1)' : 'none'
                                        }}
                                      >
                                        <div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isSelected ? '#1e40af' : '#334155' }}>{s.name}</div>
                                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.code}</div>
                                        </div>
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected}
                                          onChange={() => handleToggleAssignment(s.id)}
                                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: '#3b82f6' }}
                                        />
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👩‍🏫</div>
                <p>Select a teacher to manage subject assignments or click <strong>+ Bulk Add</strong></p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div className={styles.card}>
            <h3>{editingSubject ? 'Update Subject' : 'Add New Subject'}</h3>
            <form onSubmit={handleAddSubject} style={{ marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Program</label>
                <select 
                  name="program" 
                  className={styles.select} 
                  required
                  value={program}
                  onChange={(e) => {
                    setProgram(e.target.value);
                    setSubSem(''); // Reset semester when program changes
                  }}
                >
                  <option value="" disabled>Select Program</option>
                  <option value="BIM">BIM</option>
                  <option value="BITM">BITM</option>
                  <option value="BHM">BHM</option>
                  <option value="BBS">BBS</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="MBS">MBS</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{program === 'BHM' || program === 'BIM' || program === 'BITM' || program === 'MBS' ? 'Semester' : 'Year'}</label>
                <select 
                  name="semester_or_year" 
                  className={styles.select} 
                  required 
                  value={subSem}
                  onChange={(e) => setSubSem(e.target.value)}
                >
                  <option value="" disabled>Select {program === 'BHM' || program === 'BIM' || program === 'BITM' || program === 'MBS' ? 'Semester' : 'Year'}</option>
                  {program === 'BHM' || program === 'BIM' || program === 'BITM' || program === 'MBS' ? (
                    [...Array(program === 'MBS' ? 4 : 8)].map((_, i) => <option key={i+1} value={i+1}>Semester {i+1}</option>)
                  ) : (
                    [...Array(4)].map((_, i) => <option key={i+1} value={i+1}>Year {i+1}</option>)
                  )}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Subject Name</label>
                <input 
                  name="name" 
                  className={styles.input} 
                  placeholder="e.g. Operating Systems" 
                  required 
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Code</label>
                <input 
                  name="code" 
                  className={styles.input} 
                  placeholder="e.g. IT 307" 
                  required 
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select 
                  name="category" 
                  className={styles.select} 
                  required
                  value={subCat}
                  onChange={(e) => setSubCat(e.target.value)}
                >
                  <option value="Compulsory">Compulsory</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} style={{ flex: 2, background: editingSubject ? '#3b82f6' : '#10b981' }}>
                  <span>{editingSubject ? '💾' : '✨'}</span> {editingSubject ? 'Update Subject' : 'Add Subject'}
                </button>
                {editingSubject && (
                  <button 
                    type="button" 
                    onClick={resetSubjectForm}
                    className={styles.button} 
                    style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Subject Management</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select 
                  className={styles.select} 
                  value={manageProg} 
                  onChange={e => { setManageProg(e.target.value); setManageYear('1'); }}
                  style={{ width: '120px', fontSize: '0.85rem' }}
                >
                  <option value="BIM">BIM</option>
                  <option value="BITM">BITM</option>
                  <option value="BHM">BHM</option>
                  <option value="BBS">BBS</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="MBS">MBS</option>
                </select>
                <select 
                  className={styles.select} 
                  value={manageYear} 
                  onChange={e => setManageYear(e.target.value)}
                  style={{ width: '150px', fontSize: '0.85rem' }}
                >
                  {manageProg === 'BBS' || manageProg === 'B.Ed' ? (
                    [1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)
                  ) : (
                    [...Array(manageProg === 'MBS' ? 4 : 8)].map((_, i) => <option key={i+1} value={i+1}>Semester {i+1}</option>)
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {(!manageProg || !manageYear) ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '15px', border: '2px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Ready to Manage Subjects?</h3>
                  <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
                    Please select a <strong>Program</strong> and <strong>Year/Semester</strong> above to view and manage subjects.
                  </p>
                </div>
              ) : (() => {
                const progSubs = subjects.filter(s => {
                  const matchesProg = s.program === manageProg;
                  const dbYearNum = (String(s.semester_or_year || '').match(/\d+/) || [''])[0];
                  const targetYearNum = (String(manageYear).match(/\d+/) || [''])[0];
                  
                  const matchesYear = dbYearNum === targetYearNum && dbYearNum !== '';
                  
                  return matchesProg && matchesYear;
                }).sort((a, b) => {
                  const order: Record<string, number> = { 'Compulsory': 1, 'Major': 2, 'Minor': 3 };
                  const catA = a.category || 'Compulsory';
                  const catB = b.category || 'Compulsory';
                  return (order[catA] || 99) - (order[catB] || 99);
                })
                if (progSubs.length === 0) return (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                    <p style={{ color: '#64748b' }}>No subjects found for <strong>{manageProg} {manageProg === 'BBS' || manageProg === 'B.Ed' ? 'Year' : 'Semester'} {manageYear}</strong>.</p>
                  </div>
                )
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {progSubs.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => handleSelectSubject(s)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '1rem', 
                          background: editingSubject?.id === s.id ? '#eff6ff' : 'white', 
                          borderRadius: '10px', 
                          border: '1px solid',
                          borderColor: editingSubject?.id === s.id ? '#3b82f6' : '#e2e8f0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: editingSubject?.id === s.id ? '#1e40af' : '#1e293b' }}>{s.name}</div>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '4px', 
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              background: s.category === 'Major' ? '#e0f2fe' : s.category === 'Minor' ? '#fef3c7' : '#f1f5f9',
                              color: s.category === 'Major' ? '#0369a1' : s.category === 'Minor' ? '#92400e' : '#64748b'
                            }}>
                              {s.category || 'Compulsory'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Code: {s.code}</div>
                        </div>
                        <button 
                          onClick={() => handleDeleteSubject(s.id)}
                          className={styles.deleteActionBtn}
                          title="Delete Subject"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <LedgerManager exams={exams} />
      )}

      {activeTab === 'report' && (
        <ResultReports exams={exams} />
      )}
    </div>
  )
}

function WizardBar({ current }: { current: number }) {
  const steps = ['Basic Info', 'Subjects', 'Schedule', 'Dashboard']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '1.5rem', overflowX: 'auto' }}>
      {steps.map((label, i) => {
        const num = i + 1
        const done = current > num
        const active = current === num
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#16a34a' : active ? '#003292' : '#e5e7eb',
                color: done || active ? 'white' : '#6b7280', fontWeight: 700, fontSize: '0.9rem'
              }}>{done ? '✓' : num}</div>
              <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: active ? '#003292' : done ? '#16a34a' : '#6b7280', fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#16a34a' : '#e5e7eb', minWidth: 20, marginBottom: 12 }} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StepCard({ num, label, status, color, action, actionLabel }: any) {
  return (
    <div style={{ padding: '1rem 1.25rem', border: `1px solid ${color === 'green' ? '#bbf7d0' : '#fef08a'}`, borderRadius: '10px', background: color === 'green' ? '#f0fdf4' : '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: color === 'green' ? '#16a34a' : '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{color === 'green' ? '✓' : num}</div>
        <div>
          <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{label}</p>
          <p style={{ fontSize: '0.8rem', color: color === 'green' ? '#16a34a' : '#ca8a04' }}>{status}</p>
        </div>
      </div>
      <button onClick={action} style={{ padding: '0.4rem 0.9rem', background: '#003292', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0 }}>{actionLabel}</button>
    </div>
  )
}

function ProgramSubjectSection({ ex, subjects, subjectSettings, setSubjectSettings, examType }: any) {
  const allSubs = subjects.filter((s: any) => {
    const matchesProg = s.program === ex.program;
    const dbYearNum = (String(s.semester_or_year || '').match(/\d+/) || [''])[0];
    const targetYearNum = (String(ex.year_or_semester || '').match(/\d+/) || [''])[0];
    
    const matchesYear = dbYearNum === targetYearNum && dbYearNum !== '';
    
    return matchesProg && matchesYear;
  });
  
  // Aggressive duplicate filtering (Unique by Name, Hide Practicals)
  const filteredSubs: any[] = [];
  const seenNames = new Set();
  
  allSubs.forEach((s: any) => {
    const subjName = s.name || '';
    const normName = subjName.replace(/\s+/g, '').toUpperCase();
    
    // Skip Practical subjects for now
    if (subjName.toLowerCase().endsWith(' pr') || subjName.toLowerCase().includes('(pr)') || subjName.toLowerCase().includes('practical')) {
      return;
    }

    if (!seenNames.has(normName)) {
      filteredSubs.push(s);
      seenNames.add(normName);
    }
  });

  // Sort by Category: Compulsory -> Major -> Minor
  filteredSubs.sort((a, b) => {
    const order: Record<string, number> = { 'Compulsory': 1, 'Major': 2, 'Minor': 3 };
    const catA = a.category || 'Compulsory';
    const catB = b.category || 'Compulsory';
    return (order[catA] || 99) - (order[catB] || 99);
  });
  
  // Local bulk values for this program section
  const [bulkFM, setBulkFM] = useState(100)
  const [bulkPM, setBulkPM] = useState(40)

  // Update bulk defaults when program or exam type changes
  React.useEffect(() => {
    const isYearly = ex.program === 'BBS' || ex.program === 'B.Ed';
    const isSemester = ex.program === 'BHM' || ex.program === 'BIM' || ex.program === 'MBS';
    
    if (isYearly) {
      if (examType === 'Final Internal Examination') {
        setBulkFM(100); setBulkPM(35);
      } else {
        setBulkFM(50); setBulkPM(17.5);
      }
    } else if (isSemester) {
      // For bulk, we default to Management marks since IT subjects are usually a subset
      if (examType === 'Final Internal Examination') {
        setBulkFM(100); setBulkPM(50);
      } else {
        setBulkFM(50); setBulkPM(25);
      }
    }
  }, [ex.program, examType])

  const handleToggleAll = (checked: boolean) => {
    const newSettings = { ...subjectSettings }
    filteredSubs.forEach((s: any) => {
      if (!newSettings[`${ex.id}_${s.id}`]) {
        newSettings[`${ex.id}_${s.id}`] = { selected: checked, fm: 100, pm: 40 }
      } else {
        newSettings[`${ex.id}_${s.id}`].selected = checked
      }
    })
    setSubjectSettings(newSettings)
  }

  const handleApplyBulkMarks = () => {
    const newSettings = { ...subjectSettings }
    filteredSubs.forEach((s: any) => {
      if (!newSettings[`${ex.id}_${s.id}`]) {
        newSettings[`${ex.id}_${s.id}`] = { selected: true, fm: bulkFM, pm: bulkPM }
      } else {
        newSettings[`${ex.id}_${s.id}`].fm = bulkFM
        newSettings[`${ex.id}_${s.id}`].pm = bulkPM
      }
    })
    setSubjectSettings(newSettings)
  }

  const allSelected = filteredSubs.length > 0 && filteredSubs.every((s: any) => subjectSettings[`${ex.id}_${s.id}`]?.selected)

  return (
    <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '10px' }}>
         <h4 style={{ color: '#003292', margin: 0 }}>{ex.program} — {ex.year_or_semester}</h4>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: '#003292' }}>
              <input type="checkbox" checked={allSelected} onChange={e => handleToggleAll(e.target.checked)} style={{ width: 16, height: 16 }} />
              Tick All
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #bfdbfe', paddingLeft: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FM:</span>
                 <input type="number" value={bulkFM} onChange={e => setBulkFM(Number(e.target.value))} style={{ width: 55, padding: '0.2rem', borderRadius: 4, border: '1px solid #cbd5e1' }} />
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PM:</span>
                 <input type="number" value={bulkPM} onChange={e => setBulkPM(Number(e.target.value))} style={{ width: 55, padding: '0.2rem', borderRadius: 4, border: '1px solid #cbd5e1' }} />
               </div>
               <button type="button" onClick={handleApplyBulkMarks} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#003292', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply</button>
            </div>
         </div>
      </div>

      {filteredSubs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {filteredSubs.map((sub: any) => {
            const config = subjectSettings[`${ex.id}_${sub.id}`] || { selected: false, fm: 100, pm: 40 }
            
            const updateSelf = (part: any) => {
              setSubjectSettings((prev: any) => ({
                ...prev,
                [`${ex.id}_${sub.id}`]: { ...config, ...part }
              }))
            }

            return (
              <div key={`${ex.id}-${sub.id}`} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: config.selected ? '#f8fafc' : 'white', transition: 'all 0.2s', boxShadow: config.selected ? 'inset 0 0 0 1px #003292' : 'none' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    checked={config.selected} 
                    onChange={e => updateSelf({ selected: e.target.checked })} 
                    style={{ marginTop: '0.25rem', width: 17, height: 17 }} 
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', color: config.selected ? '#003292' : '#1e293b' }}>{sub.name}</span>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        padding: '0.1rem 0.35rem', 
                        borderRadius: '4px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: sub.category === 'Major' ? '#e0f2fe' : sub.category === 'Minor' ? '#fef3c7' : '#f1f5f9',
                        color: sub.category === 'Major' ? '#0369a1' : sub.category === 'Minor' ? '#92400e' : '#64748b'
                      }}>
                        {sub.category || 'Compulsory'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {sub.code}</span>
                  </div>
                </label>
                <div style={{ display: 'flex', gap: '1rem', paddingLeft: '1.8rem', opacity: config.selected ? 1 : 0.5 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Full Marks: 
                    <input 
                      type="number" 
                      value={config.fm} 
                      onChange={e => updateSelf({ fm: Number(e.target.value) })} 
                      style={{ width: 60, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} 
                      required 
                      disabled={!config.selected}
                    />
                  </label>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Pass Marks: 
                    <input 
                      type="number" 
                      value={config.pm} 
                      onChange={e => updateSelf({ pm: Number(e.target.value) })} 
                      style={{ width: 60, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} 
                      required 
                      disabled={!config.selected}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>No subjects found for this program. Add them in the "Subjects" tab.</p>
      )}
    </div>
  )
}
