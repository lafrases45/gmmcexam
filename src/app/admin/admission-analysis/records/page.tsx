'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ETHNIC_OPTIONS, EthnicGroup, Gender } from '@/lib/studentAnalysisUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Batch {
  id: string;
  name: string;
  created_at: string;
  total_students: number;
  summary: any;
}

interface Student {
  id: string;
  name: string;
  gender: Gender;
  ethnic_group: EthnicGroup;
  tu_regd_no: string;
  batch_id: string;
}

export default function AdmissionRecords() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admission_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setBatches(data);
    setLoading(false);
  };

  const fetchBatchDetails = async (batch: Batch) => {
    setSelectedBatch(batch);
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from('admission_students')
      .select('*')
      .eq('batch_id', batch.id);

    if (!error) setStudents(data);
    setLoadingStudents(false);
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entire admission record?')) return;
    
    const { error } = await supabase
      .from('admission_batches')
      .delete()
      .eq('id', id);

    if (!error) {
      setBatches(batches.filter(b => b.id !== id));
      if (selectedBatch?.id === id) setSelectedBatch(null);
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const downloadPDFForBatch = async (batch: Batch, doc?: jsPDF, startNewPage = false) => {
    const isNewDoc = !doc;
    const activeDoc = doc || new jsPDF();
    
    if (startNewPage) activeDoc.addPage();
    
    const title = `Admission Analysis: ${batch.name}`;
    const date = new Date(batch.created_at).toLocaleDateString();

    activeDoc.setFontSize(16);
    activeDoc.text(title, 14, 20);
    activeDoc.setFontSize(10);
    activeDoc.text(`Batch Date: ${date}`, 14, 28);

    // Summary Table
    activeDoc.setFontSize(12);
    activeDoc.text("Demographic Summary", 14, 38);
    
    const summaryRows = ETHNIC_OPTIONS.map(opt => [
      opt,
      batch.summary[opt]?.M || 0,
      batch.summary[opt]?.F || 0,
      batch.summary[opt]?.Total || 0
    ]);
    summaryRows.push([
      { content: 'Grand Total', styles: { fontStyle: 'bold' } },
      { content: batch.summary.Total.M, styles: { fontStyle: 'bold' } },
      { content: batch.summary.Total.F, styles: { fontStyle: 'bold' } },
      { content: batch.summary.Total.Total, styles: { fontStyle: 'bold', textColor: [0, 100, 255] } }
    ]);

    autoTable(activeDoc, {
      startY: 42,
      head: [['Ethnic Category', 'Male', 'Female', 'Total']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Students
    const { data: batchStudents } = await supabase
      .from('admission_students')
      .select('*')
      .eq('batch_id', batch.id);

    if (batchStudents && batchStudents.length > 0) {
      const finalY = (activeDoc as any).lastAutoTable.finalY || 100;
      activeDoc.setFontSize(12);
      activeDoc.text("Student List", 14, finalY + 15);

      const studentRows = batchStudents.map((s, idx) => [
        idx + 1,
        s.name,
        s.gender === 'M' ? 'Male' : 'Female',
        s.ethnic_group,
        s.tu_regd_no || '-'
      ]);

      autoTable(activeDoc, {
        startY: finalY + 20,
        head: [['S.N.', 'Name', 'Gender', 'Ethnic Group', 'TU Regd No']],
        body: studentRows,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8 }
      });
    }

    if (isNewDoc) {
      activeDoc.save(`${batch.name}_Report.pdf`);
    }
  };

  const downloadBulkReports = async () => {
    if (selectedIds.length === 0) return;
    
    const doc = new jsPDF();
    const selectedBatches = batches.filter(b => selectedIds.includes(b.id));
    
    for (let i = 0; i < selectedBatches.length; i++) {
      await downloadPDFForBatch(selectedBatches[i], doc, i > 0);
    }
    
    doc.save(`Bulk_Admission_Report_${new Date().getTime()}.pdf`);
  };

  if (loading) return <div className="p-8 text-center">Loading records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="section-title" style={{ margin: 0 }}>Saved Admission Records</h1>
        <div className="flex gap-4 items-center">
          {selectedIds.length > 0 && (
            <button 
              onClick={downloadBulkReports}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Selected ({selectedIds.length})
            </button>
          )}
          <a href="/admin/admission-analysis" className="text-blue-600 hover:underline text-sm font-medium">
            &larr; Back to Analysis
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-lg font-semibold">Recent Batches</h2>
            {batches.length > 0 && (
              <button 
                onClick={() => setSelectedIds(selectedIds.length === batches.length ? [] : batches.map(b => b.id))}
                className="text-xs text-blue-600 hover:underline"
              >
                {selectedIds.length === batches.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          {batches.length === 0 ? (
            <p className="p-4 bg-white rounded-xl border text-gray-500 italic">No saved records yet.</p>
          ) : (
            batches.map((batch) => (
              <div 
                key={batch.id}
                onClick={() => fetchBatchDetails(batch)}
                className={`p-4 rounded-xl border cursor-pointer transition shadow-sm flex items-start gap-3 ${
                  selectedBatch?.id === batch.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                <input 
                  type="checkbox"
                  checked={selectedIds.includes(batch.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelection(batch.id); }}
                  className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{batch.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(batch.created_at).toLocaleDateString()} • {batch.total_students} Students
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBatch(batch.id); }}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Batch Details */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedBatch ? (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed rounded-2xl text-gray-400">
              <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Select a batch from the left to view details</p>
            </div>
          ) : (
            <>
              {/* Summary View */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedBatch.name} - Summary</h2>
                  <button 
                    onClick={() => downloadPDFForBatch(selectedBatch)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition border"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
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
                          <td className="p-3">{selectedBatch.summary[opt]?.M || 0}</td>
                          <td className="p-3">{selectedBatch.summary[opt]?.F || 0}</td>
                          <td className="p-3 font-semibold">{selectedBatch.summary[opt]?.Total || 0}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold border-t-2">
                        <td className="p-3">Grand Total</td>
                        <td className="p-3">{selectedBatch.summary.Total.M}</td>
                        <td className="p-3">{selectedBatch.summary.Total.F}</td>
                        <td className="p-3 text-blue-600">{selectedBatch.summary.Total.Total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Students List */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h2 className="text-lg font-semibold mb-4">Student List</h2>
                {loadingStudents ? (
                  <div className="text-center p-8">Loading students...</div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 border-b font-bold sticky top-0">
                        <tr>
                          <th className="p-2 w-10 text-center">S.N.</th>
                          <th className="p-2">Name</th>
                          <th className="p-2 w-16">Gender</th>
                          <th className="p-2">Ethnic Group</th>
                          <th className="p-2">TU Regd No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {students.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="p-2 text-center text-gray-400">{idx + 1}</td>
                            <td className="p-2 font-medium">{s.name}</td>
                            <td className="p-2">{s.gender === 'M' ? 'Male' : 'Female'}</td>
                            <td className="p-2">{s.ethnic_group}</td>
                            <td className="p-2 font-mono">{s.tu_regd_no || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
