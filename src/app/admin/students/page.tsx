'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createBatch, deleteBatch, getStudentsByBatch, deleteStudent, promoteStudents, saveNameKnowledge, getNameKnowledge } from '@/lib/actions/student-actions'
import { useBatches } from '@/lib/hooks/useBatches'
import { useQueryClient } from '@tanstack/react-query'
import { Users, Upload, Trash2, BarChart3, GraduationCap, ClipboardList, ArrowUpCircle, Search, CheckCircle2, XCircle, FileSpreadsheet, RefreshCw, Sliders, Edit } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/lib/store/useToastStore'
import * as XLSX from 'xlsx'

// Heuristic Guessing Helpers
const guessGender = (fullName: string): string => {
  const firstName = fullName.trim().toUpperCase().split(/\s+/)[0];
  const femaleIndicators = [
    "KUMARI", "DEVI", "MAYA", "LALITA", "SITA", "GITA", "RITA", "ANITA", "SUNITA", 
    "BINITA", "PRATIKSHYA", "SUSHMA", "POOJA", "REKHA", "AKRITI", "SONY", "SONI", 
    "ANJALI", "ANU", "SABINA", "BINA", "ALINA", "ALISHA", "ANISHA", "AAYUSHA", "AASHIKA", "ASMITA", "BISHNU", "DIKSHYA", "MONIKA"
  ];
  
  // 1. Direct match with common female names or middle names
  if (femaleIndicators.some(ind => firstName === ind || fullName.toUpperCase().includes(" " + ind))) return "Female";
  
  // 2. Names ending in 'I' are almost always female in Nepal
  if (firstName.endsWith("I")) return "Female";
  
  // 3. Names ending in 'A' are often female, but we exclude common male exceptions
  const maleANames = ["SUMAN", "ROSAN", "ROSHAN", "ROHAN", "JEEVAN", "KIRAN", "SURYA", "KRISHNA", "RAMA", "BISHAL"];
  if (firstName.endsWith("A") && !maleANames.includes(firstName)) return "Female";

  return "Male";
};

const guessEthnicGroup = (fullName: string): string => {
  const nameParts = fullName.trim().toUpperCase().split(/\s+/);
  const surname = nameParts[nameParts.length - 1];
  const lastTwo = nameParts.length >= 2 ? `${nameParts[nameParts.length - 2]} ${nameParts[nameParts.length - 1]}` : "";
  
  // Normalize by removing dots and spaces for comparison
  const normalizedSurname = surname.replace(/\./g, "").trim();
  const normalizedLastTwo = lastTwo.replace(/\./g, "").replace(/\s+/g, "").trim();

  const categories: Record<string, string[]> = {
    "EDJ": ["TAMANG", "CHAMAR", "LAMA"],
    "Janajati": ["GURUNG", "MAGAR", "RAI", "LIMBU", "SHERPA", "NEWAR", "SHRESTHA", "MAHARJAN", "SHAKYA", "BAJRACHARYA", "THAKALI", "THARU", "GHARTI", "PUN", "BHUJEL"],
    "Dalit": ["BK", "PARIYAR", "NEPALI", "SUNAR", "KAMI", "DAMAI", "SARKI", "GAHATRAJ"],
    "Madhesi": ["GUPTA", "JHA", "YADAV", "MAHATO", "SAH", "SINGH", "THAKUR", "PRASAD", "MANDAL", "CHAUDHARY"],
    "Other": [
      "THAPA", "PAUDEL", "POUDEL", "ADHIKARI", "ARYAL", "BASTOLA", "BHANDARI", "BHATTA", "BHATTARAI", "DAHAL", "DEVKOTA", "GAUTAM", "GHIMIRE", "JOSHI", "KOIRALA", "LAMSAL", "NEUPANE", "PANT", "POKHREL", "POKHAREL", "REGMI", "RIJAL", "SHARMA", "SUBEDI", "TIWARI", "UPADHYAYA", "WAGLE",
      "KC", "BASNET", "BISTA", "BOHARA", "CHAND", "CHHETRI", "HAMAL", "KARKI", "KHATRI", "KHADKA", "KUNWAR", "MAHAT", "RANA", "RAWAL", "ROKAYA", "SHAH", "SHAHI", "THAKURI"
    ]
  };

  for (const [group, names] of Object.entries(categories)) {
    if (names.includes(normalizedSurname) || names.includes(normalizedLastTwo)) return group;
  }
  return "Other";
};

export default function StudentRegistry() {
  const { data: batches = [], isLoading } = useBatches()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'registry' | 'promotion'>('registry')
  
  // Registry State
  const [showUpload, setShowUpload] = useState(false)
  const [uploadMode, setUploadMode] = useState<'paste' | 'excel'>('paste')
  
  // Batch Config
  const [selectedProg, setSelectedProg] = useState('BBS')
  const [selectedYear, setSelectedYear] = useState('1st Year')
  const [selectedAcadYear, setSelectedAcadYear] = useState('2082')
  const [selectedSec, setSelectedSec] = useState('A')
  
  const PROGRAMS = ['BTIM', 'BHM', 'BIM', 'MBS', 'BBS', 'B.Ed.']
  const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester']
  const SECTIONS = ['A', 'B']

  // B.Ed. helpers — defined before batchName which depends on isBEd
  const isBEd = selectedProg === 'B.Ed.' || selectedProg.toUpperCase().startsWith('B.ED')
  const sectionMajor = (sec: string) => sec === 'A' ? 'English' : 'Nepali'

  // For B.Ed., batch is shared between sections — no section letter in name
  const batchName = isBEd
    ? `${selectedProg} ${selectedYear} ${selectedAcadYear}`
    : `${selectedProg} ${selectedYear} ${selectedAcadYear} ${selectedSec}`

  const [tsvData, setTsvData] = useState('')   // Section A (or all for non-B.Ed.)
  const [tsvDataB, setTsvDataB] = useState('') // Section B (B.Ed. only)
  const [isUploading, setIsUploading] = useState(false)
  const [reviewData, setReviewData] = useState<any[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, { gender: string, ethnic_group: string }>>({})

  useEffect(() => {
    loadKnowledge()
  }, [])

  const loadKnowledge = async () => {
    try {
      const data = await getNameKnowledge()
      const dict: Record<string, any> = {}
      data.forEach((item: any) => {
        dict[item.name_key.toLowerCase()] = { gender: item.gender, ethnic_group: item.ethnic_group }
      })
      setKnowledgeBase(dict)
    } catch (e) {
      console.error("Failed to load knowledge", e)
    }
  }

  // (isBEd and sectionMajor are defined earlier, above batchName)

  const processInput = (rawRows: any[]) => {
    const autoMajor = isBEd ? sectionMajor(selectedSec) : ''
    const processed = rawRows.map(row => {
      const uppercaseName = row.name.toUpperCase().trim()
      const nameKey = uppercaseName.toLowerCase()
      const learned = knowledgeBase[nameKey]
      
      return {
        ...row,
        name: uppercaseName,
        // Manual input overrides learned knowledge, which overrides AI guess
        gender: row.gender || learned?.gender || guessGender(uppercaseName),
        ethnic_group: row.ethnic_group || learned?.ethnic_group || guessEthnicGroup(uppercaseName),
        major: row.major || autoMajor
      }
    })

    // --- Deduplication: remove duplicate roll_no and duplicate names ---
    const seenRollNos = new Set<string>()
    const seenNames = new Set<string>()
    const duplicatesRemoved: string[] = []

    const deduplicated = processed.filter(row => {
      const rollKey = (row.roll_no || '').trim().toLowerCase()
      const nameKey = (row.name || '').trim().toLowerCase()

      // Check roll_no duplicate (only if roll_no is non-empty)
      if (rollKey && seenRollNos.has(rollKey)) {
        duplicatesRemoved.push(`${row.name} (Roll: ${row.roll_no})`)
        return false
      }
      // Check name duplicate
      if (nameKey && seenNames.has(nameKey)) {
        duplicatesRemoved.push(`${row.name} (duplicate name)`)
        return false
      }

      if (rollKey) seenRollNos.add(rollKey)
      if (nameKey) seenNames.add(nameKey)
      return true
    })

    if (duplicatesRemoved.length > 0) {
      toast.warning(`Removed ${duplicatesRemoved.length} duplicate(s): ${duplicatesRemoved.slice(0, 3).join(', ')}${duplicatesRemoved.length > 3 ? ` +${duplicatesRemoved.length - 3} more` : ''}`)
    }

    // Automatically sort by Roll No numerically/alphanumerically
    // Sort: for B.Ed. — English section first (by roll no), then Nepali section (by roll no)
    //       For all other programs — sort by roll no only
    deduplicated.sort((a, b) => {
      if (isBEd) {
        const majorOrder = (m: string) => (m === 'English' ? 0 : 1)
        const majorDiff = majorOrder(a.major) - majorOrder(b.major)
        if (majorDiff !== 0) return majorDiff
      }
      return String(a.roll_no || '').localeCompare(String(b.roll_no || ''), undefined, { numeric: true })
    })

    setReviewData(deduplicated)
    setIsReviewing(true)
  }

  const handlePasteInput = () => {
    if (!tsvData.trim()) return toast.warning("Please paste student data")
    const rows = tsvData.trim().split('\n').map(r => {
      const cols = r.split('\t')
      return {
        name: cols[0]?.trim(),
        roll_no: cols[1]?.trim() || '',
        gender: cols[2]?.trim() || '',
        ethnic_group: cols[3]?.trim() || '',
        tu_regd_no: cols[4]?.trim() || '',
        batch_year: parseInt(selectedAcadYear) || null,
        section: selectedSec || '',
        major: isBEd ? sectionMajor(selectedSec) : ''
      }
    }).filter(r => r.name)
    processInput(rows)
  }

  const handleExcelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const bstr = event.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      
      // Read as array of arrays to strictly enforce column order
      // Col 1: Name, Col 2: Roll No, Col 3: Gender, Col 4: Ethnic Group
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      
      const rows = data.map((row, idx) => {
        // Skip the header row if the first cell looks like a "Name" header
        if (idx === 0 && typeof row[0] === 'string' && row[0].toLowerCase().includes('name')) return null;
        
        return {
          name: String(row[0] || '').trim(),
          roll_no: String(row[1] || '').trim(),
          gender: String(row[2] || '').trim(),
          ethnic_group: String(row[3] || '').trim(),
          tu_regd_no: String(row[4] || '').trim(),
          batch_year: parseInt(selectedAcadYear) || null,
          section: selectedSec || '',
          major: isBEd ? sectionMajor(selectedSec) : ''
        }
      }).filter(r => r && r.name && r.name !== 'undefined' && r.name !== 'null')
      
      processInput(rows as any[])
    }
    reader.readAsBinaryString(file)
  }

  const handleFinalUpload = async () => {
    setIsUploading(true)
    try {
      // 1. Save to Registry — B.Ed. uses append mode (one shared batch per class)
      await createBatch(batchName, reviewData, isBEd)
      
      // 2. Learn from this batch (deduplicate to prevent cardinality violation)
      const knowledgeMap = new Map()
      reviewData.forEach(r => {
        const key = r.name.toLowerCase().trim()
        knowledgeMap.set(key, {
          name_key: key,
          gender: r.gender,
          ethnic_group: r.ethnic_group
        })
      })
      const knowledgeToSave = Array.from(knowledgeMap.values())
      
      await saveNameKnowledge(knowledgeToSave)
      
      toast.success(`Successfully created ${batchName} and updated knowledge base!`)
      setTsvData('')
      setReviewData([])
      setIsReviewing(false)
      setShowUpload(false)
      loadKnowledge() // Refresh local knowledge
      queryClient.invalidateQueries({ queryKey: ['admission-batches'] })
    } catch (e: any) {
      if (e.message?.includes('unique constraint') || e.message?.includes('duplicate key')) {
        toast.error("Error: Duplicate Roll No detected! Roll numbers must be unique across the entire database.")
      } else {
        toast.error("Error: " + e.message)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const updateReviewRow = (index: number, field: string, value: string) => {
    const next = [...reviewData]
    next[index] = { ...next[index], [field]: value }
    setReviewData(next)
  }

  const deleteReviewRow = (index: number) => {
    setReviewData(prev => prev.filter((_, i) => i !== index))
  }

  const addReviewRow = () => {
    setReviewData(prev => [...prev, {
      name: '',
      roll_no: '',
      gender: 'Female',
      ethnic_group: 'Other',
      tu_regd_no: '',
      batch_year: parseInt(selectedAcadYear) || null,
      section: selectedSec,
      major: isBEd ? sectionMajor(selectedSec) : ''
    }])
    // Scroll the table to the bottom so the new row is visible
    setTimeout(() => {
      const tableEl = document.getElementById('review-table-scroll')
      if (tableEl) tableEl.scrollTop = tableEl.scrollHeight
    }, 50)
  }

  const handleDeleteBatch = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the batch "${name}" and ALL its students?`)) {
      try {
        await deleteBatch(id)
        toast.success("Batch deleted successfully")
        queryClient.invalidateQueries({ queryKey: ['admission-batches'] })
      } catch (e: any) {
        toast.error("Error deleting: " + e.message)
      }
    }
  }

  const handleEditBatch = async (batch: any) => {
    try {
      const students = await getStudentsByBatch(batch.id)
      setReviewData(students)
      
      const p = PROGRAMS.find(x => batch.name.includes(x)) || 'BBS'
      const y = YEARS.find(x => batch.name.includes(x)) || '1st Year'
      const s = SECTIONS.find(x => batch.name.endsWith(' ' + x)) || 'A'
      const matchYear = batch.name.match(/\d{4}/)
      const acadYear = matchYear ? matchYear[0] : '2082'

      setSelectedProg(p)
      setSelectedYear(y)
      setSelectedAcadYear(acadYear)
      setSelectedSec(s)

      setShowUpload(true)
      setIsReviewing(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      toast.error("Error loading batch for edit: " + e.message)
    }
  }

  // Promotion State
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [destProg, setDestProg] = useState('BBS')
  const [destYear, setDestYear] = useState('2nd Year')
  const [destAcadYear, setDestAcadYear] = useState('2083')
  const [destSec, setDestSec] = useState('A')

  const [sourceStudents, setSourceStudents] = useState<any[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isPromoting, setIsPromoting] = useState(false)
  
  const newBatchName = `${destProg} ${destYear} ${destAcadYear} ${destSec}`

  useEffect(() => {
    if (selectedSourceId) {
      loadSourceStudents(selectedSourceId)
    } else {
      setSourceStudents([])
      setSelectedStudentIds(new Set())
    }
  }, [selectedSourceId])

  const loadSourceStudents = async (id: string) => {
    setIsLoadingStudents(true)
    try {
      const data = await getStudentsByBatch(id)
      setSourceStudents(data)
      setSelectedStudentIds(new Set(data.map((s: any) => s.id)))
      
      const sourceBatch = batches.find((b: any) => b.id === id)
      if (sourceBatch) {
        const parts = sourceBatch.name.split(' ')
        // Try to auto-increment year
        if (parts[1] === '1st') setDestYear('2nd Year')
        else if (parts[1] === '2nd') setDestYear('3rd Year')
        else if (parts[1] === '3rd') setDestYear('4th Year')
        
        setDestProg(parts[0] || 'BBS')
        setDestAcadYear(String(Number(parts[2]) + 1 || '2083'))
        setDestSec(parts[3] || 'A')
      }
    } catch (e: any) {
      toast.error("Failed to load students")
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedStudentIds(next)
  }


  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Mark ${studentName} as Drop-out and delete from current list?`)) {
      try {
        await deleteStudent(studentId)
        setSourceStudents(prev => prev.filter(s => s.id !== studentId))
        const next = new Set(selectedStudentIds)
        next.delete(studentId)
        setSelectedStudentIds(next)
        toast.success(`${studentName} removed from registry`)
      } catch (e: any) {
        toast.error("Failed to delete student")
      }
    }
  }

  const handleExcelSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        const activeIdentifiers = new Set(data.map(row => String(row.Roll || row['Roll No'] || row.Name || row['Regd No'] || '').toLowerCase().trim()))
        
        const newSelection = new Set<string>()
        sourceStudents.forEach(s => {
          if (
            activeIdentifiers.has(s.name.toLowerCase().trim()) || 
            activeIdentifiers.has(s.roll_no?.toLowerCase().trim()) ||
            activeIdentifiers.has(s.tu_regd_no?.toLowerCase().trim())
          ) {
            newSelection.add(s.id)
          }
        })

        setSelectedStudentIds(newSelection)
        toast.success(`Matched ${newSelection.size} students from Excel list`)
      } catch (err) {
        toast.error("Error parsing Excel file")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handlePromote = async () => {
    if (!newBatchName.trim()) return toast.warning("Please enter a new batch name")
    if (selectedStudentIds.size === 0) return toast.warning("Please select at least one student to upgrade")

    setIsPromoting(true)
    try {
      await promoteStudents(selectedSourceId, newBatchName, Array.from(selectedStudentIds))
      toast.success(`Successfully upgraded ${selectedStudentIds.size} students to ${newBatchName}!`)
      setActiveTab('registry')
      queryClient.invalidateQueries({ queryKey: ['admission-batches'] })
    } catch (e: any) {
      toast.error("Promotion failed: " + e.message)
    } finally {
      setIsPromoting(false)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return sourceStudents
    return sourceStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.tu_regd_no.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sourceStudents, searchQuery])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.75rem)', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Users size={32} color="#3b82f6" /> Admissions Registry
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>Manage student batches, demographics, and academic upgrades.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setActiveTab(activeTab === 'registry' ? 'promotion' : 'registry')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeTab === 'promotion' ? '#f1f5f9' : '#0f172a', color: activeTab === 'promotion' ? '#475569' : 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            {activeTab === 'promotion' ? <Users size={18} /> : <ArrowUpCircle size={18} />} 
            {activeTab === 'promotion' ? 'Back to Registry' : 'Upgrade Students'}
          </button>
          
          {activeTab === 'registry' && (
            <button 
              onClick={() => setShowUpload(!showUpload)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              <Upload size={18} /> {showUpload ? 'Cancel Upload' : 'Upload New Batch'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'registry' ? (
        <>
          {showUpload && (
            <div className="animate-in slide-in-from-top-4 duration-300" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              
              {/* Batch Configuration */}
              <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>Program</label>
                  <select value={selectedProg} onChange={e => setSelectedProg(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}>
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>Year/Semester</label>
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>Batch (Year)</label>
                  <input 
                    type="number" 
                    value={selectedAcadYear} 
                    onChange={e => setSelectedAcadYear(e.target.value)} 
                    placeholder="e.g. 2082"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1' }}>Section</label>
                  <select value={selectedSec} onChange={e => setSelectedSec(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}>
                    {SECTIONS.map(s => (
                      <option key={s} value={s}>
                        {isBEd ? (s === 'A' ? 'A — English Major' : 'B — Nepali Major') : s}
                      </option>
                    ))}
                  </select>
                </div>
                {isBEd && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '0.1rem' }}>
                    <div style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', background: selectedSec === 'A' ? '#eff6ff' : '#fdf4ff', border: `1px solid ${selectedSec === 'A' ? '#93c5fd' : '#d8b4fe'}`, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1rem' }}>{selectedSec === 'A' ? '🇬🇧' : '🇳🇵'}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedSec === 'A' ? '#1d4ed8' : '#7c3aed' }}>
                        {selectedSec === 'A' ? 'English Major' : 'Nepali Major'}
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ flex: 2, background: 'white', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px dashed #0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minHeight: '40px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Batch:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0c4a6e' }}>{batchName}</strong>
                  {isBEd && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef9c3', color: '#854d0e', padding: '0.15rem 0.5rem', borderRadius: '20px', border: '1px solid #fde68a' }}>
                      ⚡ Shared — both sections merge here
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: isReviewing ? 'none' : 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Mode Selector & Instructions */}
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <button 
                      onClick={() => setUploadMode('paste')}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: uploadMode === 'paste' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: uploadMode === 'paste' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none' }}
                    >
                      Quick Paste
                    </button>
                    <button 
                      onClick={() => setUploadMode('excel')}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: uploadMode === 'excel' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: uploadMode === 'excel' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none' }}
                    >
                      Excel File
                    </button>
                  </div>

                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={18} color="#3b82f6" /> {uploadMode === 'paste' ? 'Paste Logic' : 'Excel Mapping'}
                  </h3>
                  
                  {uploadMode === 'paste' ? (
                    <>
                      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Copy 2 columns from Excel and paste. System will auto-guess gender/ethnic.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {['Student Name', 'Roll No'].map((col, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#1e293b', fontWeight: 600 }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{i + 1}</div>
                            {col}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6', marginBottom: '1rem' }}>
                        Upload a file with columns for Name and Roll No.
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                        Supported extensions: .xlsx, .xls, .csv
                      </div>
                    </>
                  )}
                  <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.7rem', color: '#166534', marginTop: '1rem' }}>
                    <strong>Note:</strong> You will review and verify auto-guessed data in the next step.
                  </div>
                </div>

                {/* Main Action Area */}
                <div>
                  {uploadMode === 'paste' ? (
                    isBEd ? (
                      // B.Ed.: two side-by-side paste areas
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          {/* Section A — English */}
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#1d4ed8' }}>
                              <span style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>Section A</span>
                              🇬🇧 English Major
                            </label>
                            <textarea
                              rows={10}
                              placeholder={'Ram Sharma\t79-5001\nSita Nepal\t79-5002'}
                              value={tsvData}
                              onChange={e => setTsvData(e.target.value)}
                              style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #93c5fd', fontFamily: 'monospace', outline: 'none', background: '#f8fbff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginTop: '0.25rem' }}>{tsvData.trim().split('\n').filter(Boolean).length} student(s) pasted</div>
                          </div>

                          {/* Section B — Nepali */}
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#7c3aed' }}>
                              <span style={{ background: '#fdf4ff', border: '1px solid #d8b4fe', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>Section B</span>
                              🇳🇵 Nepali Major
                            </label>
                            <textarea
                              rows={10}
                              placeholder={'Hari Adhikari\t79-5020\nKamala Thapa\t79-5021'}
                              value={tsvDataB}
                              onChange={e => setTsvDataB(e.target.value)}
                              style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #d8b4fe', fontFamily: 'monospace', outline: 'none', background: '#fdf8ff', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: '0.25rem' }}>{tsvDataB.trim().split('\n').filter(Boolean).length} student(s) pasted</div>
                          </div>
                        </div>

                        {/* Combined preview button */}
                        <button
                          onClick={() => {
                            const parseSection = (raw: string, sec: string, maj: string) =>
                              raw.trim().split('\n').map(r => {
                                const cols = r.split('\t')
                                return {
                                  name: cols[0]?.trim(),
                                  roll_no: cols[1]?.trim() || '',
                                  gender: cols[2]?.trim() || '',
                                  ethnic_group: cols[3]?.trim() || '',
                                  tu_regd_no: cols[4]?.trim() || '',
                                  batch_year: parseInt(selectedAcadYear) || null,
                                  section: sec,
                                  major: maj
                                }
                              }).filter(r => r.name)

                            const rowsA = tsvData.trim() ? parseSection(tsvData, 'A', 'English') : []
                            const rowsB = tsvDataB.trim() ? parseSection(tsvDataB, 'B', 'Nepali') : []
                            const combined = [...rowsA, ...rowsB]
                            if (!combined.length) return toast.warning('Please paste at least one student')
                            processInput(combined)
                          }}
                          style={{ width: '100%', padding: '1rem', background: '#003292', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <CheckCircle2 size={18} /> Preview &amp; Verify Data ({(tsvData.trim().split('\n').filter(Boolean).length) + (tsvDataB.trim().split('\n').filter(Boolean).length)} students) →
                        </button>
                      </div>
                    ) : (
                      // Non-B.Ed.: original single paste area
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Paste Name &amp; Roll No</label>
                        <textarea
                          rows={10}
                          placeholder={'Ram Sharma\t101\nSita Nepal\t102'}
                          value={tsvData}
                          onChange={e => setTsvData(e.target.value)}
                          style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #3b82f6', fontFamily: 'monospace', outline: 'none', background: 'white', fontSize: '0.85rem', resize: 'vertical' }}
                        />
                        <button
                          onClick={handlePasteInput}
                          style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: '#003292', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
                        >
                          Preview &amp; Verify Data →
                        </button>
                      </div>
                    )
                  ) : (
                    <div style={{ padding: '3rem 2rem', border: '2px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center' }}>
                      <div style={{ background: '#eff6ff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#3b82f6' }}>
                        <Upload size={32} />
                      </div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Choose Excel File</h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Batch Name: <strong>{batchName}</strong></p>
                      
                      <label style={{ display: 'inline-block', padding: '0.75rem 2rem', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                        Browse Files
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelInput} style={{ display: 'none' }} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Table Section */}
              {isReviewing && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Manual Verification Required</h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Review the auto-guessed gender and ethnic groups for {reviewData.length} students.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => setIsReviewing(false)}
                        style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleFinalUpload}
                        disabled={isUploading}
                        style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {isUploading ? 'Saving...' : <><CheckCircle2 size={16} /> Confirm & Save Batch</>}
                      </button>
                    </div>
                  </div>

                  <div id="review-table-scroll" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Student Name</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Roll No</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Gender (Verify)</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Ethnic Group (Verify)</th>
                          {isBEd && <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0369a1' }}>Section</th>}
                          {isBEd && <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Major</th>}
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewData.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input 
                                value={row.name} 
                                onChange={e => updateReviewRow(idx, 'name', e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input 
                                value={row.roll_no} 
                                onChange={e => updateReviewRow(idx, 'roll_no', e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#64748b', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select 
                                value={row.gender} 
                                onChange={e => updateReviewRow(idx, 'gender', e.target.value)}
                                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '100px', fontSize: '0.8rem', background: row.gender === 'Female' ? '#fdf2f8' : '#eff6ff' }}
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select 
                                value={row.ethnic_group} 
                                onChange={e => updateReviewRow(idx, 'ethnic_group', e.target.value)}
                                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '120px', fontSize: '0.8rem' }}
                              >
                                {['Janajati', 'Dalit', 'Madhesi', 'EDJ', 'Other'].map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </td>
                            {isBEd && (
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <select
                                  value={row.section || 'A'}
                                  onChange={e => {
                                    const sec = e.target.value
                                    updateReviewRow(idx, 'section', sec)
                                    updateReviewRow(idx, 'major', sec === 'A' ? 'English' : 'Nepali')
                                  }}
                                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none', width: '90px', fontSize: '0.8rem', background: row.section === 'A' ? '#eff6ff' : '#fdf4ff', color: row.section === 'A' ? '#1d4ed8' : '#7c3aed', fontWeight: 700 }}
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                </select>
                              </td>
                            )}
                            {isBEd && (
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <select
                                  value={row.major || ''}
                                  onChange={e => updateReviewRow(idx, 'major', e.target.value)}
                                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #c4b5fd', outline: 'none', width: '100px', fontSize: '0.8rem', background: row.major === 'English' ? '#eff6ff' : '#fdf4ff', color: row.major === 'English' ? '#1d4ed8' : '#7c3aed', fontWeight: 700 }}
                                >
                                  <option value="English">🇬🇧 English</option>
                                  <option value="Nepali">🇳🇵 Nepali</option>
                                </select>
                              </td>
                            )}
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => deleteReviewRow(idx)}
                                title="Remove this student"
                                style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Add Missing Student Button */}
                  <button
                    onClick={addReviewRow}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      margin: '0.75rem auto 0',
                      padding: '0.55rem 1.5rem',
                      background: 'white',
                      border: '2px dashed #94a3b8',
                      borderRadius: '10px',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#3b82f6'
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#475569'
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'white'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>+</span>
                    Add Missing Student
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Batch Name</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Students</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Created</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Quick Actions</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.85rem', textAlign: 'right' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto 1rem' }} /> Loading batches...</td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>No student batches uploaded yet.</td></tr>
                ) : batches.map((batch: any) => (
                  <tr key={batch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.4rem', borderRadius: '8px' }}>
                          <GraduationCap size={16} />
                        </div>
                        {batch.name}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', fontWeight: 500 }}>
                      {batch.total_students}
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(batch.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/admin/admission-analysis?batchId=${batch.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: '#fdf2f8', color: '#db2777', padding: '0.3rem 0.6rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
                          <BarChart3 size={12} /> Analysis
                        </Link>
                        <Link href={`/admin/internal-exams`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: '#f0fdf4', color: '#16a34a', padding: '0.3rem 0.6rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
                          <ClipboardList size={12} /> Setup Exam
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleEditBatch(batch)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                          title="Edit Batch"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBatch(batch.id, batch.name)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                          title="Delete Batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="animate-in fade-in duration-500">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: '#1e293b' }}>Semester Update</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Current Status Card */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</span>
              </div>
              <div style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Batch:</label>
                  <select 
                    value={selectedSourceId}
                    onChange={e => setSelectedSourceId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', appearance: 'none', background: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") no-repeat right 0.75rem center/1.2rem' }}
                  >
                    <option value="">Select Batch</option>
                    {batches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* These are for visual match with image, but logically we use the Batch Select */}
                <div style={{ marginBottom: '1.5rem', opacity: 0.5 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Program Name:</label>
                  <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>
                    <option>Select Program</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem', opacity: 0.5 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Semester:</label>
                  <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>
                    <option>Select Semester</option>
                  </select>
                </div>

                <div style={{ marginBottom: '2rem', opacity: 0.5 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Section:</label>
                  <select disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>
                    <option>Select Section</option>
                  </select>
                </div>

                <button 
                  disabled={!selectedSourceId}
                  style={{ background: '#0284c7', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Search Student
                </button>
              </div>
            </div>

            {/* To Be Status Card */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Be Status</span>
              </div>
              <div style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Batch Year:</label>
                  <input 
                    type="number" 
                    value={destAcadYear}
                    onChange={e => setDestAcadYear(e.target.value)}
                    placeholder="e.g. 2083"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Program Name:</label>
                  <select 
                    value={destProg}
                    onChange={e => setDestProg(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', appearance: 'none', background: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") no-repeat right 0.75rem center/1.2rem' }}
                  >
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Semester:</label>
                  <select 
                    value={destYear}
                    onChange={e => setDestYear(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', appearance: 'none', background: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") no-repeat right 0.75rem center/1.2rem' }}
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Section:</label>
                  <select 
                    value={destSec}
                    onChange={e => setDestSec(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', appearance: 'none', background: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") no-repeat right 0.75rem center/1.2rem' }}
                  >
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    disabled={isPromoting || !selectedSourceId}
                    onClick={handlePromote}
                    style={{ flex: 2, background: isPromoting || !selectedSourceId ? '#94a3b8' : '#0284c7', color: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isPromoting ? 'Processing...' : 'Upgrade Semester'}
                  </button>
                  <label style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                    <FileSpreadsheet size={16} /> Excel Sync
                    <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleExcelSync} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Table */}
          {sourceStudents.length > 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500" style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Student Selection</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    {selectedStudentIds.size} students will be upgraded to <strong>{newBatchName}</strong>
                  </p>
                </div>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', width: '40px' }}></th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Roll No</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Section</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.8rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s: any) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedStudentIds.has(s.id) ? '#f0fdf4' : 'white' }}>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.has(s.id)}
                            onChange={() => toggleStudent(s.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{s.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontSize: '0.8rem', fontWeight: 700 }}>{s.roll_no || 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{s.section || 'Default'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}
                            title="Mark as Drop-out"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
