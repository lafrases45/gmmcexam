"use client";
export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBoardExamStore, EthnicGroup } from '@/lib/boardExamStore';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/store/useToastStore';

const ETHNIC_OPTIONS: EthnicGroup[] = ["Janajati", "Madeshi", "Dalits", "EDJ", "Others"];
const GENDER_OPTIONS = ["M", "F", "Other"];

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdQuery = searchParams.get('session');
  
  const { sessionId, metadata, subjects, students, updateStudent, setSession, setStudents } = useBoardExamStore();
  
  const [editingRoll, setEditingRoll] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [majorFilter, setMajorFilter] = useState<string>('All');
  const supabase = createClient();

  // Auto-detect majors on mount if B.Ed
  useEffect(() => {
    if (metadata?.program === 'B.Ed' && students.length > 0 && students.some(s => !s.major || s.major === 'General')) {
      const updatedStudents = students.map(st => {
        // Only skip if already assigned a specific major
        if (st.major && st.major !== 'General') return st;

        let engCount = 0;
        let nepCount = 0;
        
        Object.keys(st.marks).forEach(code => {
          const c = code.toUpperCase().replace(/\s/g, '');
          // Check for English indicators
          if (c.includes('ENG') || c.includes('ENGL')) engCount++;
          // Check for Nepali indicators
          if (c.includes('NEP') || c.includes('NEPA')) nepCount++;
        });
        
        let major = 'General';
        if (engCount > nepCount) major = 'Major English';
        else if (nepCount > engCount) major = 'Major Nepali';
        
        return { ...st, major };
      });

      // Only update if something actually changed to avoid unnecessary re-renders
      const hasChanges = updatedStudents.some((s, i) => s.major !== students[i].major);
      if (hasChanges) {
        setStudents(updatedStudents);
      }
    }
  }, [metadata?.program, students, setStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => majorFilter === 'All' || s.major === majorFilter);
  }, [students, majorFilter]);

  // Bulk edit
  const [bulkEthnicValue, setBulkEthnicValue] = useState<EthnicGroup | "">("");
  const [bulkGenderValue, setBulkGenderValue] = useState<string>("");

  // Check valid session
  if (!sessionId || sessionId !== sessionIdQuery) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Session not found or expired</h2>
        <button onClick={() => router.push('/board-exam/upload')} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Go back to Upload
        </button>
      </div>
    );
  }

  const emptyEthnicCount = filteredStudents.filter(s => !s.ethnic).length;

  const startEdit = (student: any) => {
    setEditingRoll(student.rollNo);
    setEditForm({ ...student });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditForm((prev: any) => {
      const next = { ...prev };
      
      if (field.startsWith('marks.')) {
        const subjectCode = field.split('.')[1];
        let numVal: number | "AB" = value;
        if (value.toUpperCase() === 'AB') numVal = 'AB';
        else numVal = value === '' ? 0 : parseInt(value, 10);
        
        next.marks = { ...next.marks, [subjectCode]: numVal };

        // Recalculate total, percent, result
        const m = Object.values(next.marks);
        const total = m.reduce((acc: number, val) => acc + (val === "AB" ? 0 : (val as number)), 0);
        const fullMarks = subjects.length * 100 || 500;
        const percent = parseFloat(((total / fullMarks) * 100).toFixed(2));
        
        let result = "Passed";
        if (m.includes("AB")) {
          result = "Fail & Partly Absent";
        } else if (m.some(val => (val as number) < 35)) {
          result = "Failed";
        }

        next.total = total;
        next.percent = percent;
        next.result = result;
      } else {
        next[field] = value;
      }
      return next;
    });
  };

  const saveEdit = () => {
    if (editingRoll) {
      updateStudent(editingRoll, editForm);
      setEditingRoll(null);
    }
  };

  const downloadTemplate = () => {
    const data = filteredStudents.map((s, idx) => ({
      "SN": idx + 1,
      "Roll No": s.rollNo,
      "Name": s.name,
      "Gender": s.gender,
      "Ethnic Group": s.ethnic
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `GMMC_Template_${metadata?.program}_${metadata?.part}.xlsx`);
  };

  const saveToSupabase = async (status: 'Draft' | 'Final') => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('board_exams')
        .upsert({
          id: sessionId,
          metadata,
          students,
          subjects,
          status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select();

      if (error) throw error;
      
      if (data?.[0]) {
        // Ensure store and URL stay in sync
        setSession(data[0].id, metadata!, subjects, students);
      }
      
      return true;
    } catch (err: any) {
      setError("Error saving to database: " + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcelImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        let updateCount = 0;
        // Map by Index (Row 1 -> Student 1, etc.)
        students.forEach((student, index) => {
          const row = json[index];
          if (!row) return;

          const updates: any = {};
          
          // Map Gender (Only if not empty in Excel)
          const excelGender = row.Gender || row.Sex || row.gender || row.sex;
          if (excelGender) {
            const g = excelGender.toString().trim().toUpperCase()[0];
            if (g === 'M' || g === 'F') updates.gender = g;
          }

          // Map Ethnic (Only if not empty in Excel)
          const excelEthnic = row.Ethnic || row["Ethnic Group"] || row.ethnic || row.Category;
          if (excelEthnic) {
            const eStr = excelEthnic.toString().trim();
            // Validate against options
            if (ETHNIC_OPTIONS.includes(eStr as EthnicGroup)) {
              updates.ethnic = eStr as EthnicGroup;
            }
          }

          if (Object.keys(updates).length > 0) {
            updateStudent(student.rollNo, updates);
            updateCount++;
          }
        });

        setError('');
        toast.success(`Finished processing. Updated ${updateCount} student records based on Excel rows.`);
      } catch (err: any) {
        setError(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleGenerate = async () => {
    if (emptyEthnicCount > 0) {
      setError(`Please fill ethnic data for all students (${emptyEthnicCount} remaining).`);
      return;
    }
    setError('');
    setIsGenerating(true);

    const saved = await saveToSupabase('Final');
    if (!saved) {
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/board-exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sessionData: { 
            metadata: {
              ...metadata,
              // Update program name to include major if filtered
              program: majorFilter === 'All' ? metadata?.program : `${metadata?.program} (${majorFilter})`
            }, 
            subjects, 
            students: filteredStudents 
          }
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      router.push(`/board-exam/output?session=${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-500 block text-xs">Program</span><span className="font-semibold text-gray-800">{metadata?.program}</span></div>
          <div><span className="text-gray-500 block text-xs">Part</span><span className="font-semibold text-gray-800">{metadata?.part} Year</span></div>
          <div><span className="text-gray-500 block text-xs">Exam Year</span><span className="font-semibold text-gray-800">{metadata?.examYear}</span></div>
          <div><span className="text-gray-500 block text-xs">Students Extracted</span><span className="font-semibold text-gray-800">{students.length}</span></div>
        </div>
        <div className="flex items-center gap-3">
          {metadata?.program === 'B.Ed' && (
            <div className="flex items-center gap-2 mr-4 border-r pr-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter Major</span>
              <select 
                value={majorFilter} 
                onChange={e => setMajorFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">All Students</option>
                <option value="Major English">Major English</option>
                <option value="Major Nepali">Major Nepali</option>
                <option value="General">General</option>
              </select>
            </div>
          )}
          <button onClick={() => router.push('/board-exam/upload')} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50 transition">
            Back
          </button>
          <button 
            onClick={() => saveToSupabase('Draft')}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-5 py-2 text-sm font-medium rounded text-white shadow-sm transition
              ${isGenerating || emptyEthnicCount > 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isGenerating ? 'Generating...' : 'Save & Generate'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded border border-red-200">{error}</div>}

      {/* Excel Bulk Import Controls */}
      <div className="flex justify-end items-center gap-3">
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          1. Download Template
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 cursor-pointer transition shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          2. Upload Edited Excel
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleExcelImport(file);
            }} 
          />
        </label>
      </div>

      <div className="text-right text-[10px] text-gray-500 italic mt-[-15px]">
        * Row 1 in Excel matches Student 1 in the table below. Empty cells will not overwrite existing data.
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto max-h-[70vh]">
        <table className="w-full text-[12px] text-left relative border-collapse">
          <thead className="bg-gray-100 border-b sticky top-0 z-10 font-bold text-gray-700">
            <tr>
              <th className="px-2 py-2 text-center w-8">S.N.</th>
              <th className="px-2 py-2">Full Name</th>
              <th className="px-2 py-2 text-blue-600">Ethnic *</th>
              <th className="px-1 py-2 text-center">Sex</th>
              <th className="px-2 py-2">Roll No</th>
              <th className="px-2 py-2">TU Regd</th>
              <th className="px-2 py-2">Major</th>
              {subjects.map(s => (
               <th key={s.code} className="px-2 py-2 text-center border-x whitespace-nowrap" title={s.name}>{s.code}</th>
              ))}
              <th className="px-2 py-2 text-center border-x whitespace-nowrap">Total</th>
              <th className="px-1 py-2 text-center border-x whitespace-nowrap">%</th>
              <th className="px-2 py-2 border-x whitespace-nowrap">Result</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map((student) => {
              const isEditing = editingRoll === student.rollNo;
              const rowData = isEditing ? editForm : student;

              // Background colors
              let bgClass = "hover:bg-gray-50";
              if (!isEditing) {
                if (student.result === 'Passed') bgClass = "bg-[#C6EFCE]/30 hover:bg-[#C6EFCE]/50";
                else if (student.result === 'Failed') bgClass = "bg-red-50 hover:bg-red-100";
                else if (student.result === 'Fail & Partly Absent') bgClass = "bg-[#FCE4D6]/40 hover:bg-[#FCE4D6]/60";
              }

              return (
                <tr key={student.rollNo} className={`transition-colors ${bgClass}`}>
                  <td className="px-2 py-2 text-center border-r">{rowData.sn}</td>
                  <td className="px-2 py-2 font-semibold border-r whitespace-normal min-w-[120px]">
                    {isEditing ? <input type="text" value={rowData.name} onChange={e => handleEditChange('name', e.target.value)} className="w-full px-1 py-0.5 border rounded text-[12px]" /> : rowData.name}
                  </td>
                  <td className="px-2 py-2 border-r whitespace-nowrap">
                    {isEditing ? (
                      <select value={rowData.ethnic} onChange={e => handleEditChange('ethnic', e.target.value)} className="w-full px-1 py-0.5 border rounded text-[12px] text-blue-700 bg-blue-50">
                        <option value="">-</option>
                        {ETHNIC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <span className={rowData.ethnic ? "text-gray-800" : "text-red-500 font-bold"}>{rowData.ethnic || "MISSING"}</span>
                    )}
                  </td>
                  <td className="px-1 py-2 text-center border-r whitespace-nowrap">
                    {isEditing ? (
                      <select value={rowData.gender} onChange={e => handleEditChange('gender', e.target.value)} className="w-full px-0 py-0.5 border rounded text-[12px]">
                        <option value="">-</option>
                        {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      rowData.gender || "-"
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] border-r whitespace-nowrap">
                    {isEditing ? <input type="text" value={rowData.rollNo} onChange={e => handleEditChange('rollNo', e.target.value)} className="w-full px-1 py-0.5 border rounded text-[12px]" /> : rowData.rollNo}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-gray-500 border-r whitespace-nowrap">
                    {isEditing ? <input type="text" value={rowData.tuRegd} onChange={e => handleEditChange('tuRegd', e.target.value)} className="w-full px-1 py-0.5 border rounded text-[12px]" /> : rowData.tuRegd}
                  </td>
                  <td className="px-2 py-2 border-r whitespace-nowrap text-gray-500 font-medium">
                    {rowData.major || "-"}
                  </td>
                  
                  {/* Marks */}
                  {subjects.map(s => {
                    const mark = rowData.marks[s.code];
                    let cellBg = "";
                    let cellText = "";
                    if (!isEditing) {
                      if (mark === "AB") { cellBg = "bg-gray-200"; cellText = "text-gray-500 font-medium"; }
                      else if (typeof mark === "number" && mark < 35) { cellBg = "bg-yellow-100"; cellText = "text-red-600 font-bold"; }
                    }

                    return (
                      <td key={s.code} className={`px-0.5 py-1 text-center border-x ${cellBg} ${cellText}`}>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={mark} 
                            onChange={e => handleEditChange(`marks.${s.code}`, e.target.value)} 
                            className="w-8 px-0 py-0.5 text-center border rounded text-[9px]" 
                          />
                        ) : (
                          <span className="w-8 inline-block">{mark}</span>
                        )}
                      </td>
                    );
                  })}

                   <td className="px-2 py-2 text-center font-bold border-x whitespace-nowrap">{rowData.total}</td>
                  <td className="px-1 py-2 text-center text-gray-500 border-r whitespace-nowrap">{rowData.percent.toFixed(1)}</td>
                  <td className="px-2 py-2 border-r whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold 
                      ${rowData.result === 'Passed' ? 'bg-green-100 text-green-800' : 
                        rowData.result === 'Failed' ? 'bg-red-100 text-red-800' : 
                        'bg-orange-100 text-orange-800'}`}>
                      {rowData.result}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-0.5 bg-green-50 rounded" title="Save">✓</button>
                        <button onClick={() => setEditingRoll(null)} className="text-gray-500 hover:text-gray-700 p-0.5 bg-gray-100 rounded" title="Cancel">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(student)} className="text-blue-600 hover:text-blue-800 text-[9px] px-1 py-0.5 border border-blue-200 rounded hover:bg-blue-50 transition">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Action Bar (Sticky) */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t p-4 mt-6 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] rounded-t-xl">
        <div className="text-sm text-gray-500">
          Make sure to fill all Ethnic fields before generating.
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/board-exam/upload')} className="px-6 py-2.5 text-gray-600 border rounded-md hover:bg-gray-50 transition">
            Back
          </button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || emptyEthnicCount > 0}
            className={`px-8 py-2.5 font-semibold rounded-md text-white shadow-sm transition
              ${isGenerating || emptyEthnicCount > 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isGenerating ? 'Generating...' : 'Save & Generate (Next Step)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading verify panel...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
