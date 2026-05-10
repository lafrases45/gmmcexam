'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { guessEthnicGroup, guessGender, EthnicGroup, Gender, ETHNIC_OPTIONS, GENDER_OPTIONS } from '@/lib/studentAnalysisUtils';

interface Student {
  sn: number;
  name: string;
  gender: Gender | '';
  ethnic: EthnicGroup | '';
  tuRegd?: string;
}

export default function AdmissionAnalysis() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isLoadedFromDb, setIsLoadedFromDb] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      let allBatches: any[] = [];
      const { data: batches } = await supabase.from('admission_batches').select('id, name, total_students').order('created_at', { ascending: false });
      if (batches) {
        setBatchesList(batches);
        allBatches = batches;
      }

      const params = new URLSearchParams(window.location.search);
      const batchId = params.get('batchId');
      if (batchId) {
        setSelectedBatchId(batchId);
        await loadBatchData(batchId, allBatches, supabase);
      }
    };
    fetchInitial();
  }, []);

  const loadBatchData = async (batchId: string, availableBatches: any[], supabaseClient: any) => {
    try {
      setIsUploading(true);
      setError('');
      const batch = availableBatches.find((b: any) => b.id === batchId) || (await supabaseClient.from('admission_batches').select('name').eq('id', batchId).single()).data;
      if (batch) setBatchName(batch.name);

      const { data: stds, error: fetchErr } = await supabaseClient.from('admission_students').select('*').eq('batch_id', batchId);
      if (fetchErr) throw fetchErr;

      const parsed: Student[] = stds.map((s: any, idx: number) => ({
        sn: idx + 1,
        name: s.name,
        gender: s.gender as Gender,
        ethnic: s.ethnic_group as EthnicGroup,
        tuRegd: s.tu_regd_no || s.roll_no || ''
      }));

      setStudents(parsed);
      setIsLoadedFromDb(true);
    } catch (err: any) {
      setError('Error loading batch: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDropdownChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBatchId(val);
    if (!val) {
      setStudents([]);
      setIsLoadedFromDb(false);
      setBatchName('');
      return;
    }
    const { createClient } = await import('@/lib/supabase/client');
    await loadBatchData(val, batchesList, createClient());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    if (file.type === 'application/pdf') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admission/analyze', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to extract PDF');
        setStudents(data.students);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parsedStudents: Student[] = data.map((row, idx) => {
          // Flexible name detection and ensure it's a string
          let rawName = row['Student Name'] || row.Name || row['Full Name'] || row.name || '';
          const name = rawName.toString().trim();
          
          // Flexible gender detection
          const rawGender = row.Gender || row.Sex || row.gender || row.sex;
          let gender = parseGender(rawGender);
          
          // Flexible ethnic detection
          const rawEthnic = row.Ethnicity || row.Ethnic || row['Ethnic Group'] || row.ethnic || row.Category;
          let ethnic = parseEthnic(rawEthnic);

          // Fallback to guessing if missing
          if (!gender && name) gender = guessGender(name);
          if (!ethnic && name) ethnic = guessEthnicGroup(name);

          return {
            sn: idx + 1,
            name,
            gender: gender || '',
            ethnic: ethnic || '',
            tuRegd: row['TU Registration Number'] || row['Registration No.'] || row['Registration No'] || row['TU Registration'] || row['TU Reg. No.'] || row['TU Reg No'] || row['TU Reg.'] || row.Regd || row['TU Regd'] || row.tuRegd || row.Registration || row.Roll || row['Roll No'] || row.roll || '',
          };
        });

        setStudents(parsedStudents);
      } catch (err: any) {
        setError('Error parsing file: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseGender = (val: any): Gender | '' => {
    if (!val) return '';
    const s = val.toString().trim().toUpperCase();
    if (s === 'MALE' || s === 'M') return 'M';
    if (s === 'FEMALE' || s === 'F') return 'F';
    return '';
  };

  const parseEthnic = (val: any): EthnicGroup | '' => {
    if (!val) return '';
    const e = val.toString().trim();
    // Case-insensitive check
    const matched = ETHNIC_OPTIONS.find(opt => opt.toLowerCase() === e.toLowerCase());
    if (matched) return matched;
    
    // Support plural "Others" -> "Other"
    if (e.toLowerCase() === 'others') return 'Other';
    if (e.toLowerCase() === 'dalits') return 'Dalit';

    return '';
  };

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    const title = "Admission Data Analysis Report";
    const date = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${date}`, 14, 28);

    // 1. Summary Table
    doc.setFontSize(14);
    doc.text("Admission Summary", 14, 40);
    
    const summaryRows = ETHNIC_OPTIONS.map(opt => [
      opt,
      summary[opt].M,
      summary[opt].F,
      summary[opt].Total
    ]);
    summaryRows.push([
      { content: 'Grand Total', styles: { fontStyle: 'bold' } },
      { content: summary.Total.M, styles: { fontStyle: 'bold' } },
      { content: summary.Total.F, styles: { fontStyle: 'bold' } },
      { content: summary.Total.Total, styles: { fontStyle: 'bold', textColor: [0, 100, 255] } }
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Ethnic Category', 'Male', 'Female', 'Total']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // 2. Student List
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.text("Student Details", 14, finalY + 15);

    const studentRows = students.map(s => [
      s.sn,
      s.name,
      s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : '-',
      s.ethnic || '-',
      s.tuRegd || '-'
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['S.N.', 'Name', 'Gender', 'Ethnic Group', 'TU Regd No']],
      body: studentRows,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] },
      styles: { fontSize: 8 }
    });

    doc.save(`GMMC_Admission_Report_${date.replace(/\//g, '-')}.pdf`);
  };

  const deleteStudent = (idx: number) => {
    const newStudents = [...students];
    newStudents.splice(idx, 1);
    // Re-index SN
    const reindexed = newStudents.map((s, i) => ({ ...s, sn: i + 1 }));
    setStudents(reindexed);
  };

  const updateStudent = (idx: number, field: keyof Student, value: any) => {
    const newStudents = [...students];
    newStudents[idx] = { ...newStudents[idx], [field]: value };
    setStudents(newStudents);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [batchName, setBatchName] = useState('');

  const saveToDatabase = async () => {
    if (!batchName.trim()) {
      setError('Please provide a Batch Name before saving.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // 1. Create the batch
      const { data: batch, error: batchError } = await supabase
        .from('admission_batches')
        .insert({
          name: batchName,
          total_students: students.length,
          summary: summary
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Insert students
      const studentData = students.map(s => ({
        batch_id: batch.id,
        name: s.name,
        gender: s.gender,
        ethnic_group: s.ethnic,
        tu_regd_no: s.tuRegd
      }));

      const { error: studentError } = await supabase
        .from('admission_students')
        .insert(studentData);

      if (studentError) throw studentError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    const counts: any = {
      Total: { M: 0, F: 0, Total: 0 },
    };
    
    // Initialize all ethnic options
    ETHNIC_OPTIONS.forEach(opt => {
      counts[opt] = { M: 0, F: 0, Total: 0 };
    });

    students.forEach((s) => {
      const g = s.gender as Gender;
      const e = s.ethnic as EthnicGroup;

      if (e && g) {
        counts[e][g]++;
        counts[e].Total++;
        counts.Total[g]++;
        counts.Total.Total++;
      }
    });

    return counts;
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="section-title" style={{ margin: 0, textAlign: 'left' }}>Admission Data Analysis</h1>
        <a 
          href="/admin/admission-analysis/records"
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          View Saved Records
        </a>
      </div>

      {/* Upload or Select Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
        {isLoadedFromDb ? (
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-blue-800">Analyzing Batch: {batchName}</h2>
              <p className="text-sm text-gray-500">Data loaded directly from the admissions registry.</p>
            </div>
            <button 
              onClick={() => { setIsLoadedFromDb(false); setStudents([]); setSelectedBatchId(''); setBatchName(''); window.history.replaceState({}, '', '/admin/admission-analysis'); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Analyze a Different Batch
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4">Select Batch for Analysis</h2>
            <div className="flex gap-4 items-center mb-6">
              <select 
                value={selectedBatchId} 
                onChange={handleDropdownChange}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 w-full max-w-md outline-none"
              >
                <option value="">-- Choose an Existing Batch --</option>
                {batchesList.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.total_students} students)</option>
                ))}
              </select>
            </div>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold tracking-wider">OR UPLOAD NEW</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <h2 className="text-md font-semibold mb-4 text-gray-700">Upload Student List (PDF or Excel)</h2>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {isUploading && <span className="text-sm text-blue-600">Processing...</span>}
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-4 text-xs text-gray-500 italic">
              * Supported columns for Excel: Name, Gender (M/F), Ethnic Group (Dalit, EDJ, Janajati, Other). PDF extraction will try to guess values.
            </p>
          </>
        )}
      </div>

      {students.length > 0 && (
        <>
          {/* Summary Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Admission Summary</h2>
              <div className="flex gap-3 items-center">
                {!isLoadedFromDb && (
                  <input 
                    type="text"
                    placeholder="Enter Batch Name (e.g. BBS 2026)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                  />
                )}
                <button 
                  onClick={downloadPDFReport}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition shadow-sm border"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
                {!isLoadedFromDb && (
                  <button 
                    onClick={saveToDatabase}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition shadow-sm ${saveSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : saveSuccess ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Results'}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left border-b">
                    <th className="p-3 font-semibold">Ethnic Category</th>
                    <th className="p-3 font-semibold">Male</th>
                    <th className="p-3 font-semibold">Female</th>
                    <th className="p-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ETHNIC_OPTIONS.map((opt) => (
                    <tr key={opt}>
                      <td className="p-3 font-medium">{opt}</td>
                      <td className="p-3">{summary[opt].M}</td>
                      <td className="p-3">{summary[opt].F}</td>
                      <td className="p-3 font-semibold">{summary[opt].Total}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-3">Grand Total</td>
                    <td className="p-3">{summary.Total.M}</td>
                    <td className="p-3">{summary.Total.F}</td>
                    <td className="p-3 text-blue-600">{summary.Total.Total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Student List Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Verify Student Data</h2>
              <span className="text-sm text-gray-500">{students.length} Students</span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 border-b font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-12 text-center">S.N.</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Gender</th>
                    <th className="p-2">Ethnic Group</th>
                    <th className="p-2">TU Regd No</th>
                    <th className="p-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 text-center">{student.sn}</td>
                      <td className="p-2 font-medium">{student.name}</td>
                      <td className="p-2">
                        <select
                          value={student.gender}
                          onChange={(e) => updateStudent(idx, 'gender', e.target.value)}
                          className={`border rounded px-1 py-1 bg-white ${!student.gender ? 'border-red-500' : ''}`}
                        >
                          <option value="">Select</option>
                          {GENDER_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g === 'M' ? 'Male (M)' : 'Female (F)'}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={student.ethnic}
                          onChange={(e) => updateStudent(idx, 'ethnic', e.target.value)}
                          className={`border rounded px-1 py-1 bg-white ${!student.ethnic ? 'border-red-500' : ''}`}
                        >
                          <option value="">Select</option>
                          {ETHNIC_OPTIONS.map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-gray-500 font-mono text-xs">{student.tuRegd || '-'}</td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => deleteStudent(idx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition"
                          title="Delete Student"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
