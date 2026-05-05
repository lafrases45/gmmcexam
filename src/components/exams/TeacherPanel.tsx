'use client'

import React, { useState, useEffect, useRef } from 'react'
import { submitMarks, getSubjectResults, getExamSubjects } from '@/lib/actions/exam-actions'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export default function TeacherPanel({ initialExams, initialAssignments }: { initialExams: any[], initialAssignments: any[] }) {
  const [exams, setExams] = useState(initialExams)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [selectedExamName, setSelectedExamName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [activeExamId, setActiveExamId] = useState('')

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [savingState, setSavingState] = useState<Record<string, 'saving' | 'saved' | 'error' | ''>>({})
  const [showGuide, setShowGuide] = useState(false)
  const router = useRouter()

  // Realtime subscription - Optimized to avoid global "thundering herd" refreshes
  useEffect(() => {
    const supabase = createBrowserClient()
    
    // Listen for structure changes (new exams/subjects) - infrequent, so refresh is fine
    const structureChannel = supabase
      .channel('teacher-structure')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_subjects' }, () => router.refresh())
      .subscribe()

    // Listen for result changes ONLY for the active subject
    let resultsChannel: any = null
    if (activeExamId && selectedSubject) {
      resultsChannel = supabase
        .channel(`results-${activeExamId}-${selectedSubject}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'results',
          filter: `exam_id=eq.${activeExamId}`
        }, (payload: any) => {
          // Only refresh if the subject matches AND it's not our own change 
          // (Actually, checking subject_id in filter is better but Supabase filters have limits, 
          // so we check payload in the handler)
          if (payload.new && payload.new.subject_id === selectedSubject) {
            // We don't router.refresh() here because it's too heavy.
            // Instead, we just re-fetch the specific student list.
            refreshStudents()
          }
        })
        .subscribe()
    }

    return () => {
      supabase.removeChannel(structureChannel)
      if (resultsChannel) supabase.removeChannel(resultsChannel)
    }
  }, [activeExamId, selectedSubject, router])

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('gmmc_teacher_guide_seen')
    if (!hasSeenGuide) {
      setShowGuide(true)
    }
  }, [])

  const dismissGuide = () => {
    localStorage.setItem('gmmc_teacher_guide_seen', 'true')
    setShowGuide(false)
  }
  
  const availableExamNames = [...new Set(assignments.map(a => a.examName))]
  const availablePrograms = [...new Set(assignments
    .filter(a => a.examName === selectedExamName)
    .map(a => a.program)
  )]
  const availableSubjects = assignments
    .filter(a => a.examName === selectedExamName && a.program === selectedProgram)
    .map(a => ({ id: a.subjectId, name: a.subjectName, code: a.subjectCode, examId: a.examId }))

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const activeExamIdRef = useRef(activeExamId)
  const selectedSubjectRef = useRef(selectedSubject)

  useEffect(() => {
    activeExamIdRef.current = activeExamId
    selectedSubjectRef.current = selectedSubject
  }, [activeExamId, selectedSubject])

  const refreshStudents = async () => {
    const eid = activeExamIdRef.current
    const sid = selectedSubjectRef.current
    if (eid && sid) {
      const data = await getSubjectResults(eid, sid)
      setStudents(data)
    }
  }

  useEffect(() => {
    setExams(initialExams)
    setAssignments(initialAssignments)
  }, [initialExams, initialAssignments])

  // Fetch students when final selection is complete
  useEffect(() => {
    if (activeExamId && selectedSubject) {
      setLoading(true)
      getSubjectResults(activeExamId, selectedSubject).then(data => {
        setStudents(data)
        setLoading(false)
      }).catch(err => {
        console.error(err)
        setLoading(false)
      })
    } else {
      setStudents([])
    }
  }, [activeExamId, selectedSubject])

  const handleSubjectChange = (subId: string) => {
    setSelectedSubject(subId)
    const sub = availableSubjects.find(s => s.id === subId)
    if (sub) setActiveExamId(sub.examId)
  }

  const getCountdownStatus = (exam: any) => {
    // Note: Accurate B.S. countdown requires a full calendar library.
    // For now, we display the B.S. date directly to the teacher.
    const today = new Date().toLocaleDateString(); // This is A.D.
    
    // Simplistic comparison for status badges
    if (exam.status === 'Completed') return { text: `Result Published`, priority: 'low' }
    if (exam.status === 'Ongoing') return { text: `Ongoing`, priority: 'high' }
    
    return { text: `Ends: ${exam.end_date}`, priority: 'medium' }
  }

  const handleMarkBlur = async (studentName: string, value: string, originalValue: string | null) => {
    if (!value || value === originalValue?.toString()) return // Skip if empty or unchanged

    const marks = Number(value)
    if (isNaN(marks)) return

    setSavingState(prev => ({ ...prev, [studentName]: 'saving' }))
    try {
      await submitMarks(activeExamId, selectedSubject, studentName, marks)
      setSavingState(prev => ({ ...prev, [studentName]: 'saved' }))
      
      // Update local state so it doesn't view it as 'changed' if clicked again
      setStudents(prev => prev.map(s => s.student_name === studentName ? { ...s, marks } : s))

      setTimeout(() => {
        setSavingState(prev => ({ ...prev, [studentName]: '' }))
      }, 2500)
    } catch (err) {
      console.error(err)
      setSavingState(prev => ({ ...prev, [studentName]: 'error' }))
    }
  }

  // Reset dependent fields
  const handleExamNameChange = (val: string) => {
    setSelectedExamName(val)
    setSelectedProgram('')
    setSelectedSubject('')
    setActiveExamId('')
  }

  const handleProgramChange = (val: string) => {
    setSelectedProgram(val)
    setSelectedSubject('')
    setActiveExamId('')
  }

  const handleQuickSelect = (assignment: any) => {
    setSelectedExamName(assignment.examName)
    setSelectedProgram(assignment.program)
    setSelectedSubject(assignment.subjectId)
    setActiveExamId(assignment.examId)
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Simple Onboarding Guide for Non-Techy Teachers */}
        {showGuide && (
          <div style={{ 
            background: '#fff7ed', 
            border: '2px solid #fdba74', 
            borderRadius: '16px', 
            padding: '1.5rem',
            position: 'relative',
            animation: 'slideIn 0.5s ease-out'
          }}>
            <button 
              onClick={dismissGuide}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9a3412' }}
            >
              ✕
            </button>
            <h3 style={{ color: '#9a3412', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👋</span> Welcome to your Digital Marks Ledger
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>1️⃣</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Pick a Subject</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Click on any blue "Enter Marks" box below to see your students.</div>
              </div>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>2️⃣</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Type the Marks</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Enter the scores directly into the boxes next to each student's name.</div>
              </div>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>3️⃣</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>No Save Button!</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>The system saves <strong>automatically</strong> every time you finish typing a score. Look for the green "✓ Saved" checkmark.</div>
              </div>
            </div>
            <button 
              onClick={dismissGuide}
              style={{ marginTop: '1.5rem', background: '#9a3412', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
            >
              I Understand, Let's Start
            </button>
          </div>
        )}
        
        {/* Top Deadlines Section (Mobile Friendly Flex) */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span> Active Exam Deadlines
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {(() => {
              const grouped: any[] = [];
              const seenGroups = new Set();
              
              exams.forEach(ex => {
                const groupKey = ex.group_id || ex.name;
                if (!seenGroups.has(groupKey)) {
                  seenGroups.add(groupKey);
                  const relatedProgs = exams
                    .filter(e => (e.group_id && e.group_id === ex.group_id) || (!ex.group_id && e.name === ex.name))
                    .map(e => e.program);
                  const uniqueProgs = Array.from(new Set(relatedProgs)).join(', ');
                  grouped.push({ ...ex, displayPrograms: uniqueProgs });
                }
              });

              return grouped.map(exam => {
                const status = getCountdownStatus(exam)
                const priorityColors = {
                  urgent: { bg: '#fff1f2', text: '#be123c', border: '#fb7185', blink: true },
                  high: { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' },
                  medium: { bg: '#fffbf1', text: '#f59e0b', border: '#fcd34d' },
                  low: { bg: '#f0fdf4', text: '#10b981', border: '#86efac' }
                }
                const color = priorityColors[status.priority as keyof typeof priorityColors] || priorityColors.low
                const isUrgent = (color as any).blink;

                return (
                  <div 
                    key={exam.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1.25rem', 
                      background: color.bg, 
                      borderRadius: '12px', 
                      border: `1px solid ${color.border}`, 
                      transition: 'all 0.2s',
                      animation: isUrgent ? 'pulse-border 1.5s infinite' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <strong style={{ color: color.text, fontSize: '1rem' }}>{exam.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: color.text, fontWeight: '500', opacity: 0.8 }}>{exam.displayPrograms}</span>
                    </div>
                    <span style={{ 
                      background: isUrgent ? '#e11d48' : color.bg, 
                      color: isUrgent ? 'white' : color.text, 
                      border: `1px solid ${isUrgent ? '#be123c' : color.border}`, 
                      padding: '0.5rem 1rem', 
                      borderRadius: '999px', 
                      fontSize: '0.85rem', 
                      fontWeight: '700', 
                      whiteSpace: 'nowrap',
                      animation: isUrgent ? 'blink-text 1s infinite' : 'none'
                    }}>
                      {status.text}
                    </span>
                  </div>
                )
              });
            })()}
            <style>{`
              @keyframes pulse-border {
                0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); border-color: #fb7185; }
                70% { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); border-color: #e11d48; }
                100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); border-color: #fb7185; }
              }
              @keyframes blink-text {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
            `}</style>
            {exams.length === 0 && <div style={{ color: '#64748b', fontSize: '0.9rem' }}>No active exams assigned to you.</div>}
          </div>
        </div>

          {/* Action Panel */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✍️</span> Marks Entry Portal
          </h2>
          
          {assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ color: '#64748b' }}>No active exam sessions found for your assigned subjects.</p>
            </div>
          ) : (
            <>
              {/* Quick Select Section */}
              {!selectedSubject && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Marks Entry Tasks
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {assignments.map((a, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleQuickSelect(a)}
                        style={{ 
                          padding: '1rem', 
                          background: '#f1f5f9', 
                          borderRadius: '12px', 
                          cursor: 'pointer',
                          border: '1px solid #e2e8f0',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                        onMouseOver={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                        onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#3b82f6' }}>{a.program}</div>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{a.subjectName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.examName}</div>
                        <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', color: '#3b82f6', fontWeight: '700', fontSize: '0.8rem' }}>Enter Marks →</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>1. Select Exam</label>
                  <select 
                    style={{ padding: '0.875rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#334155', outline: 'none' }} 
                    value={selectedExamName} 
                    onChange={e => handleExamNameChange(e.target.value)}
                  >
                    <option value="">-- Choose Exam --</option>
                    {availableExamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>2. Select Program</label>
                  <select 
                    style={{ padding: '0.875rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#334155', outline: 'none' }} 
                    disabled={!selectedExamName}
                    value={selectedProgram} 
                    onChange={e => handleProgramChange(e.target.value)}
                  >
                    <option value="">-- Choose Program --</option>
                    {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>3. Select Subject</label>
                  <select 
                    style={{ padding: '0.875rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#334155', outline: 'none' }} 
                    disabled={!selectedProgram}
                    value={selectedSubject} 
                    onChange={e => handleSubjectChange(e.target.value)}
                  >
                    <option value="">-- Choose Subject --</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '2rem 0' }} />

              {activeExamId && selectedSubject && (
                <div>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                      <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <p style={{ marginTop: '1rem' }}>Loading student roster...</p>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : students.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="marks-table" style={{ width: '100%', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px' }}>SN</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px', whiteSpace: 'nowrap' }}>Roll No</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Name</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marks Scored</th>
                            <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => {
                            const state = savingState[student.student_name];
                            return (
                              <tr key={student.student_name} className="student-row" style={{ background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                <td data-label="SN" style={{ padding: '1rem', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>
                                  {index + 1}
                                </td>
                                <td data-label="Roll No" style={{ padding: '1rem', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {student.student_roll || '—'}
                                </td>
                                <td data-label="Student" style={{ padding: '1rem', fontWeight: '600', color: '#334155' }}>
                                  {student.student_name}
                                </td>
                                <td data-label="Marks" style={{ padding: '1rem' }}>
                                  <input 
                                    type="number" 
                                    defaultValue={student.marks ?? ''} 
                                    placeholder="e.g. 85"
                                    onBlur={(e) => handleMarkBlur(student.student_name, e.target.value, student.marks)}
                                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '100px', fontSize: '1rem', outline: 'none' }}
                                    onFocus={e => (e.target.style.border = '1px solid #3b82f6')}
                                  />
                                </td>
                                <td data-label="Status" style={{ padding: '1rem', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>
                                  {state === 'saving' && <span style={{ color: '#f59e0b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>⋯ Saving</span>}
                                  {state === 'saved' && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>✓ Saved</span>}
                                  {state === 'error' && <span style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>! Failed</span>}
                                  {!state && student.marks !== null && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Recorded</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <style>{`
                        @media (max-width: 640px) {
                          .marks-table thead { display: none; }
                          .marks-table .student-row { 
                            display: block; 
                            margin-bottom: 1rem; 
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            background: white !important;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
                          }
                          .marks-table td { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center;
                            padding: 0.75rem 1rem !important;
                            border-radius: 0 !important;
                            border-bottom: 1px solid #f1f5f9;
                          }
                          .marks-table td:last-child { border-bottom: none; }
                          .marks-table td:before {
                            content: attr(data-label);
                            font-weight: 600;
                            color: #64748b;
                            font-size: 0.75rem;
                            text-transform: uppercase;
                          }
                          .marks-table input {
                            text-align: right;
                          }
                        }
                      `}</style>
                      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        Tip: Marks are automatically saved when you click or tap outside of the input box.
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
                      <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '0.5rem' }}>No Students Configured</h3>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                        The Administrator has not provided a student list for this subject yet. Please contact the Admin to configure the student registry for this exam.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
