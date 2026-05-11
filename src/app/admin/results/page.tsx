'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/AuthProvider'
import { useExamsData } from '@/lib/hooks/useExamsData'
import { RefreshCw, FileText, BarChart3, ChevronLeft } from 'lucide-react'
import styles from '../admin.module.css'

const LedgerManager = dynamic(() => import('@/components/exams/LedgerManager'), { ssr: false })
const ResultReports = dynamic(() => import('@/components/exams/ResultReports'), { ssr: false })

export default function ResultsPage() {
  const { session } = useAuth()
  const { data, isLoading, error } = useExamsData(session?.user)
  const [view, setView] = useState<'selection' | 'ledger' | 'reports'>('selection')

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <RefreshCw size={32} className="animate-spin text-blue-500" />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading Results Dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '16px' }}>
        <p>Error loading examination data. Please refresh the page.</p>
      </div>
    )
  }

  const exams = data?.exams || []

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Results & Analytics</h1>
          <p style={{ color: '#64748b' }}>Manage student marks, generate institutional ledgers, and analyze performance.</p>
        </div>
        {view !== 'selection' && (
          <button 
            onClick={() => setView('selection')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
          >
            <ChevronLeft size={18} /> Back to Hub
          </button>
        )}
      </div>

      {view === 'selection' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div 
            onClick={() => setView('ledger')}
            style={{ 
              background: 'white', padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', cursor: 'pointer',
              transition: 'all 0.3s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: '60px', height: '60px', background: '#eff6ff', color: '#3b82f6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>Examination Ledger</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Generate comprehensive tabulations of student marks across all subjects. Professional PDF output for official records.
            </p>
          </div>

          <div 
            onClick={() => setView('reports')}
            style={{ 
              background: 'white', padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', cursor: 'pointer',
              transition: 'all 0.3s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: '60px', height: '60px', background: '#ecfdf5', color: '#10b981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <BarChart3 size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>Analysis Reports</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Visualize pass/fail ratios, GPA distribution, and subject-wise performance. Export individual student marksheets.
            </p>
          </div>
        </div>
      )}

      {view === 'ledger' && <LedgerManager exams={exams} />}
      {view === 'reports' && <ResultReports exams={exams} />}
    </div>
  )
}
