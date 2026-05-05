'use client'

import React, { useState, useEffect } from 'react'
import { getLedgerData } from '@/lib/actions/exam-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function LedgerManager({ exams }: { exams: any[] }) {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [ledgerData, setLedgerData] = useState<any[]>([])

  // Filter exams that are finished or published (active for ledger)
  const activeExams = exams.filter(ex => ex.status === 'Finished' || ex.status === 'Published')

  const fetchLedger = async (examId: string) => {
    if (!examId) return
    setLoading(true)
    try {
      const data = await getLedgerData(examId)
      setLedgerData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = (programLedger: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('GUPTESHWOR MAHADEV MULTIPLE CAMPUS', 105, 15, { align: 'center' })
    
    doc.setFontSize(10)
    doc.text('Chhorepatan, Pokhara-17, Kaski', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(programLedger.examName?.toUpperCase() || 'EXAMINATION LEDGER', 105, 28, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Program: ${programLedger.programName} (${programLedger.yearOrSemester})`, 105, 33, { align: 'center' })

    // Table Data
    const tableHeaders = ['SN', 'Roll No', 'Student Name', ...programLedger.subjects.map((s: any) => s.code)]
    const tableRows = programLedger.students.map((st: any, idx: number) => [
      idx + 1,
      st.roll || '—',
      st.name,
      ...programLedger.subjects.map((s: any) => st.marks[s.id] ?? '—')
    ])

    autoTable(doc, {
      startY: 40,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 50, 146], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: 50 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 40 },
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('..........................................', 20, finalY + 25)
    doc.text('Exam Coordinator', 20, finalY + 30)
    
    doc.text('..........................................', 140, finalY + 25)
    doc.text('Campus Chief / Signature', 140, finalY + 30)

    doc.save(`${programLedger.programName}_Ledger.pdf`)
  }

  const handlePrintAll = async () => {
    if (ledgerData.length === 0) return
    for (const p of ledgerData) {
      generatePDF(p)
    }
  }

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Examination Ledger</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Generate and print professional academic ledgers for finished exams.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value)
              fetchLedger(e.target.value)
            }}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">-- Select Exam Session --</option>
            {activeExams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name} ({ex.program})</option>
            ))}
          </select>

          {ledgerData.length > 0 && (
            <button 
              onClick={handlePrintAll}
              style={{ background: '#003292', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🖨️</span> Print All Programs
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ display: 'inline-block', width: '2.5rem', height: '2.5rem', border: '3px solid #e2e8f0', borderTopColor: '#003292', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1.5rem', fontWeight: '600' }}>Fetching ledger data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : ledgerData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {ledgerData.map((prog, idx) => (
            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.25rem' }}>{prog.programName}</h4>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {prog.students.length} Students | {prog.subjects.length} Subjects
                </div>
              </div>
              <button 
                onClick={() => generatePDF(prog)}
                style={{ background: 'white', color: '#003292', border: '1px solid #003292', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f0f4ff')}
                onMouseOut={e => (e.currentTarget.style.background = 'white')}
              >
                Download PDF
              </button>
            </div>
          ))}
        </div>
      ) : selectedExamId ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#fffbeb', borderRadius: '20px', border: '1px solid #fef3c7' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⚠️</div>
          <h3 style={{ color: '#92400e', marginBottom: '0.75rem' }}>Ledger is Blank</h3>
          <p style={{ color: '#b45309', maxWidth: '500px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
            No student results found for this exam. This usually happens if:<br/>
            1. The <strong>Student List</strong> hasn't been synced from the Seat Plan yet.<br/>
            2. Teachers haven't started <strong>entering marks</strong> in their portal.
          </p>
          <button 
            onClick={() => window.location.href = '/admin/seat-plan'}
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#b45309', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
          >
            Go to Seat Plan to Sync Students →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📄</div>
          <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Ready to Generate Ledger?</h3>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>Select an exam session from the dropdown above to view and download program-wise professional ledgers.</p>
        </div>
      )}
    </div>
  )
}
