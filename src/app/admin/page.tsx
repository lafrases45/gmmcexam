'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useBoardExamStore } from '@/lib/boardExamStore';
import { exportSystemData, restoreSystemData } from '@/lib/actions/exam-actions';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { toast } from '@/lib/store/useToastStore';
import { 
  Save, RefreshCw, ShieldCheck, CheckCircle, 
  Layout, ClipboardList, Users, BookOpen, 
  Plus, Search, ArrowRight, Clock, Calendar, 
  CheckSquare, TrendingUp, Database, Shield,
  ArrowUpRight, MoreHorizontal, Activity, GraduationCap
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [genderStats, setGenderStats] = useState({ male: 0, female: 0 });
  const [allStudentsData, setAllStudentsData] = useState<{ gender: string; ethnic_group: string; batchName: string }[]>([]);
  const [isProgramLoading, setIsProgramLoading] = useState(true);
  const [selectedProgramGroup, setSelectedProgramGroup] = useState<string | null>(null);
  const router = useRouter();

  const PROGRAM_GROUPS = [
    { id: 'bbs',      label: 'BBS',       prefixes: ['BBS'],         color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    { id: 'bed',      label: 'B.Ed.',     prefixes: ['B.ED', 'BED'], color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
    { id: 'bhm',      label: 'BHM',       prefixes: ['BHM'],         color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    { id: 'bim-bitm', label: 'BIM/BITM',  prefixes: ['BITM', 'BIM'], color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
    { id: 'mbs',      label: 'MBS',       prefixes: ['MBS'],         color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  ];

  const YEAR_ORDER = [
    '1st Year','2nd Year','3rd Year','4th Year',
    '1st Semester','2nd Semester','3rd Semester','4th Semester',
    '5th Semester','6th Semester','7th Semester','8th Semester',
  ];
  const ETHNIC_CATEGORIES = ['Dalit','EDJ','Janajati','Madhesi','Other'];

  function matchesGroup(batchName: string, prefixes: string[]): boolean {
    const upper = batchName.toUpperCase().trim();
    return prefixes.some(p => upper.startsWith(p.toUpperCase() + ' ') || upper === p.toUpperCase());
  }

  function extractYear(batchName: string): string {
    for (const y of YEAR_ORDER) {
      if (batchName.includes(y)) return y;
    }
    return 'Other';
  }

  function isGenderMale(g: string): boolean { return ['male','m'].includes(g.toLowerCase()); }
  function isGenderFemale(g: string): boolean { return ['female','f'].includes(g.toLowerCase()); }

  useEffect(() => {
    async function fetchStudentStats() {
      const supabase = createClient();
      const { data } = await supabase
        .from('admission_students')
        .select('gender, ethnic_group, admission_batches!inner(name)');

      const students: { gender: string; ethnic_group: string; batchName: string }[] =
        (data || []).map((s: any) => ({
          gender: s.gender || '',
          ethnic_group: s.ethnic_group || 'Other',
          batchName: s.admission_batches?.name || '',
        }));

      setAllStudentsData(students);
      setGenderStats({
        male: students.filter((s) => isGenderMale(s.gender)).length,
        female: students.filter((s) => isGenderFemale(s.gender)).length,
      });
      setIsProgramLoading(false);
    }
    fetchStudentStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map RPC data to component variables
  const boardExams = stats?.board_exams || [];
  const internalStats = {
    totalExams: stats?.internal_exams?.length || 0,
    activeExams: stats?.internal_exams?.filter((e: any) => e.status === 'Ongoing').length || 0
  };
  const teacherCount = stats?.teacher_count || 0;
  const studentCount = stats?.student_stats?.total || 0;
  
  const colors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#64748b', '#06b6d4', '#f43f5e'];
  const ethnicData = stats?.student_stats?.ethnic_groups?.map((eg: any, i: number) => ({
    ...eg,
    color: colors[i % colors.length]
  })) || [];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} />
        <p>Optimizing Dashboard...</p>
      </div>
    );
  }

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const data = await exportSystemData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GMMC_EMIS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem('last_emis_backup', JSON.stringify(data));
      toast.success('System backup completed! File downloaded.');
    } catch (err: any) {
      toast.error('Backup failed: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const confirmRestore = confirm("CRITICAL: This will replace ALL current data with the backup. Proceed?");
    if (!confirmRestore) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await restoreSystemData(backup);
      toast.success('System recovery complete!');
      router.refresh();
    } catch (err: any) {
      toast.error('Restore failed: ' + err.message);
    } finally {
      setIsRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className={styles.pageHeader}>
        <h1>Welcome back, Admin 👋</h1>
        <p>Here&apos;s an overview of your active students and examination status.</p>
      </div>

      {/* 1. Active Students Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="#3b82f6" /> Active Students Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '16px', color: '#3b82f6' }}>
                <GraduationCap size={32} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active</p>
                <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{studentCount.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '16px', color: '#22c55e' }}>
                <Users size={32} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Male</p>
                <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>
                  {genderStats.male || '-'}
                </h3>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#fdf2f8', padding: '1.25rem', borderRadius: '16px', color: '#ec4899' }}>
                <Users size={32} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Female</p>
                <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>
                  {genderStats.female || '-'}
                </h3>
              </div>
            </div>
          </div>

        </div>

        {/* Program Wise Student Statistics */}
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={20} color="#6366f1" />
              Program Wise Student Statistics
            </h3>
            <Link href="/admin/students" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              View Registry <ArrowRight size={14} />
            </Link>
          </div>

          {isProgramLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Loading program statistics...</span>
            </div>
          ) : (() => {
            // Compute per-program summaries
            const summaries = PROGRAM_GROUPS.map(grp => {
              const students = allStudentsData.filter(s => matchesGroup(s.batchName, grp.prefixes));
              return {
                ...grp,
                total: students.length,
                male: students.filter(s => isGenderMale(s.gender)).length,
                female: students.filter(s => isGenderFemale(s.gender)).length,
              };
            });

            // Compute detail view for selected program
            const selectedGroup = PROGRAM_GROUPS.find(g => g.id === selectedProgramGroup);
            const detailStudents = selectedGroup
              ? allStudentsData.filter(s => matchesGroup(s.batchName, selectedGroup.prefixes))
              : [];

            // Year/Semester rows
            const yearMap: Record<string, { total: number; male: number; female: number }> = {};
            detailStudents.forEach(s => {
              const label = extractYear(s.batchName);
              if (!yearMap[label]) yearMap[label] = { total: 0, male: 0, female: 0 };
              yearMap[label].total++;
              if (isGenderMale(s.gender)) yearMap[label].male++;
              else if (isGenderFemale(s.gender)) yearMap[label].female++;
            });
            const yearRows = YEAR_ORDER.filter(y => yearMap[y]).map(y => ({ label: y, ...yearMap[y] }));

            // Ethnic rows
            const ethnicMap: Record<string, { male: number; female: number; total: number }> = {};
            ETHNIC_CATEGORIES.forEach(e => { ethnicMap[e] = { male: 0, female: 0, total: 0 }; });
            detailStudents.forEach(s => {
              const key = ETHNIC_CATEGORIES.includes(s.ethnic_group) ? s.ethnic_group : 'Other';
              ethnicMap[key].total++;
              if (isGenderMale(s.gender)) ethnicMap[key].male++;
              else if (isGenderFemale(s.gender)) ethnicMap[key].female++;
            });
            const ethnicRows = ETHNIC_CATEGORIES.map(e => ({ category: e, ...ethnicMap[e] }));

            const thStyle: React.CSSProperties = { padding: '0.85rem 1.1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
            const tdStyle: React.CSSProperties = { padding: '0.8rem 1.1rem', fontSize: '0.88rem', fontWeight: 600, borderBottom: '1px solid #f1f5f9' };

            return (
              <>
                {/* Program Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: selectedProgramGroup ? '1.5rem' : 0 }}>
                  {summaries.map(prog => {
                    const isActive = selectedProgramGroup === prog.id;
                    return (
                      <div
                        key={prog.id}
                        onClick={() => setSelectedProgramGroup(isActive ? null : prog.id)}
                        style={{
                          background: isActive ? prog.bg : 'white',
                          border: isActive ? `2px solid ${prog.color}` : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? `0 4px 16px ${prog.color}30` : '0 2px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: prog.color }}>{prog.label}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: isActive ? prog.color : prog.bg, color: isActive ? 'white' : prog.color, padding: '0.2rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                            {isActive ? '✕ Close' : 'View More'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                            <span>Total</span>
                            <strong style={{ color: '#0f172a' }}>{prog.total}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                            <span>Male</span>
                            <strong style={{ color: '#3b82f6' }}>{prog.male}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                            <span>Female</span>
                            <strong style={{ color: '#ec4899' }}>{prog.female}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detail Panel */}
                {selectedProgramGroup && selectedGroup && (
                  <div style={{ background: 'white', borderRadius: '16px', border: `1px solid ${selectedGroup.border}`, overflow: 'hidden', boxShadow: `0 4px 20px ${selectedGroup.color}15` }}>
                    <div style={{ background: selectedGroup.bg, padding: '1rem 1.25rem', borderBottom: `1px solid ${selectedGroup.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <GraduationCap size={18} color={selectedGroup.color} />
                      <span style={{ fontWeight: 700, color: selectedGroup.color, fontSize: '0.95rem' }}>{selectedGroup.label} — Detailed Breakdown</span>
                    </div>

                    {detailStudents.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No students found for this program.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

                        {/* Year/Semester Table */}
                        <div style={{ borderRight: '1px solid #f1f5f9' }}>
                          <div style={{ padding: '0.85rem 1.1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year / Semester</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ ...thStyle, textAlign: 'left', color: '#475569' }}>Level</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#3b82f6' }}>M</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#ec4899' }}>F</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#475569' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {yearRows.length === 0 ? (
                                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                              ) : yearRows.map(row => (
                                <tr key={row.label} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <td style={{ ...tdStyle, color: '#1e293b' }}>{row.label}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', color: '#3b82f6' }}>{row.male}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', color: '#ec4899' }}>{row.female}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{row.total}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bae6fd' }}>
                                <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 800, color: '#0369a1' }}>Total</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>{yearRows.reduce((s,r)=>s+r.male,0)}</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#ec4899' }}>{yearRows.reduce((s,r)=>s+r.female,0)}</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{yearRows.reduce((s,r)=>s+r.total,0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Ethnic Table */}
                        <div>
                          <div style={{ padding: '0.85rem 1.1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ethnic Category</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ ...thStyle, textAlign: 'left', color: '#475569' }}>Category</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#3b82f6' }}>M</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#ec4899' }}>F</th>
                                <th style={{ ...thStyle, textAlign: 'center', color: '#475569' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ethnicRows.map(row => (
                                <tr key={row.category} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <td style={{ ...tdStyle, color: '#1e293b' }}>{row.category}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', color: '#3b82f6' }}>{row.male}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', color: '#ec4899' }}>{row.female}</td>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{row.total}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bae6fd' }}>
                                <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 800, color: '#0369a1' }}>Grand Total</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>{ethnicRows.reduce((s,r)=>s+r.male,0)}</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#ec4899' }}>{ethnicRows.reduce((s,r)=>s+r.female,0)}</td>
                                <td style={{ ...tdStyle, borderBottom: 'none', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{ethnicRows.reduce((s,r)=>s+r.total,0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* 2. Internal Exam Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={24} color="#8b5cf6" /> Internal Exam
          </h2>
          <Link href="/admin/internal-exams" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6', background: '#f5f3ff', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} className="hover:bg-purple-100">
            View Internal Reports <ArrowRight size={16} />
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Internal Exams</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{internalStats.totalExams}</h3>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: '#64748b' }}>
                <ClipboardList size={20} />
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Appeared</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>-</h3>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: '#64748b' }}>
                <Users size={20} />
              </div>
            </div>
            <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Data compiling from ledgers</p>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pending Marks</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>
                  {internalStats.activeExams} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>exams</span>
                </h3>
              </div>
              <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '10px', color: '#ef4444' }}>
                <Clock size={20} />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Board Exam Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={24} color="#f97316" /> Board Exam
          </h2>
          <Link href="/admin/board-exams" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f97316', background: '#fff7ed', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} className="hover:bg-orange-100">
            View Board Reports <ArrowRight size={16} />
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Board Exams</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{boardExams.length}</h3>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: '#64748b' }}>
                <BookOpen size={20} />
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Appeared</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>-</h3>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: '#64748b' }}>
                <Users size={20} />
              </div>
            </div>
            <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Data compiling from ledgers</p>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pending Results</p>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>-</h3>
              </div>
              <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '10px', color: '#f59e0b' }}>
                <Clock size={20} />
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

