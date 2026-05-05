'use client'

import React, { useState } from 'react'

export default function ResultReports({ exams }: { exams: any[] }) {
  const [selectedExamId, setSelectedExamId] = useState('')
  
  // Static Analytics Mockup (since user just wanted a tab for it now)
  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Result Analysis Reports</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Detailed performance analytics and pass/fail statistics.</p>
        </div>
        
        <select 
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">-- Select Exam Session --</option>
          {exams.filter(ex => ex.status === 'Published').map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name} ({ex.program})</option>
          ))}
        </select>
      </div>

      {!selectedExamId ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: '#f8fafc', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📊</div>
          <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Analytical Overview</h3>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>Select a published exam to view performance charts, topper lists, and pass percentage reports.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pass Percentage</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#064e3b' }}>84.5%</div>
            <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.5rem' }}>↑ 4% from last exam</div>
          </div>
          
          <div style={{ padding: '1.5rem', background: '#eff6ff', borderRadius: '16px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Top Scorer</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a' }}>Aarya Sapkota</div>
            <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.5rem' }}>Average Score: 92.4</div>
          </div>

          <div style={{ padding: '1.5rem', background: '#fef2f2', borderRadius: '16px', border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Highest Failure Rate</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7f1d1d' }}>Business Statistics</div>
            <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem' }}>15 students failed</div>
          </div>
        </div>
      )}
    </div>
  )
}
