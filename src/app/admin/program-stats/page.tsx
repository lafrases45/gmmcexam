'use client';
import Link from 'next/link';
import { BarChart3, GraduationCap } from 'lucide-react';

const PROGRAM_GROUPS = [
  { id: 'bbs',      label: 'BBS',       color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'bed',      label: 'B.Ed.',     color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'bhm',      label: 'BHM',       color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'bim-bitm', label: 'BIM/BITM',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'mbs',      label: 'MBS',       color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
];

export default function ProgramStatsIndex() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={32} color="#6366f1" /> Program Statistics
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>Select a program to view detailed student demographics and breakdown.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {PROGRAM_GROUPS.map(prog => (
          <Link 
            href={`/admin/program-stats/${prog.id}`} 
            key={prog.id}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: prog.bg,
              border: `1px solid ${prog.border}`,
              borderRadius: '16px',
              padding: '2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 10px 20px ${prog.color}20`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
            >
              <div style={{ background: 'white', padding: '1rem', borderRadius: '50%', color: prog.color, boxShadow: `0 4px 10px ${prog.color}20` }}>
                <GraduationCap size={32} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: prog.color }}>{prog.label}</h2>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', background: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
                View Report &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
