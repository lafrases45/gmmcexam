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
  ArrowUpRight, MoreHorizontal, Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();

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
        <p>Here&apos;s what&apos;s happening with your institution today.</p>
      </div>

      {/* Top Stats Row */}
      <div className={styles.dashboardGrid}>
        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.5rem', borderRadius: '10px' }}>
              <ClipboardList size={20} />
            </div>
            <MoreHorizontal size={16} color="#94a3b8" />
          </div>
          <h4>Total Exams</h4>
          <p>{internalStats.totalExams + boardExams.length}</p>
          <Link href="/admin/internal-exams">View all exams &rarr;</Link>
        </div>

        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ background: '#fff7ed', color: '#f97316', padding: '0.5rem', borderRadius: '10px' }}>
              <Clock size={20} />
            </div>
            <MoreHorizontal size={16} color="#94a3b8" />
          </div>
          <h4>Pending Marks Entry</h4>
          <p>28</p>
          <Link href="/admin/internal-exams?tab=teachers">View pending &rarr;</Link>
        </div>

        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ background: '#f0fdf4', color: '#22c55e', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <MoreHorizontal size={16} color="#94a3b8" />
          </div>
          <h4>Teachers Registered</h4>
          <p>{teacherCount}</p>
          <Link href="/admin/teachers">View teachers &rarr;</Link>
        </div>

        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ background: '#f5f3ff', color: '#8b5cf6', padding: '0.5rem', borderRadius: '10px' }}>
              <TrendingUp size={20} />
            </div>
            <MoreHorizontal size={16} color="#94a3b8" />
          </div>
          <h4>Results Published</h4>
          <p>18</p>
          <Link href="/admin/results">View results &rarr;</Link>
        </div>

        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ background: '#fdf2f8', color: '#ec4899', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <MoreHorizontal size={16} color="#94a3b8" />
          </div>
          <h4>Total Students</h4>
          <p>{studentCount.toLocaleString()}</p>
          <Link href="/admin/students">View students &rarr;</Link>
        </div>
      </div>

      {/* Middle Row: Today's Tasks, Recent Activity, Upcoming Exams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Today's Tasks */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckSquare size={20} color="#1e293b" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Today&apos;s Tasks</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { task: 'Enter marks for BBS 2nd Year - Internal Exam', priority: 'High', color: '#ef4444' },
              { task: 'Review and publish BBS 1st Year results', priority: 'Medium', color: '#f59e0b' },
              { task: 'Publish BBS 4th Year Board Exam results', priority: 'Low', color: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid #cbd5e1', borderRadius: '6px' }} />
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', margin: 0 }}>{item.task}</p>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: item.color + '10', color: item.color, borderRadius: '4px' }}>{item.priority}</span>
              </div>
            ))}
          </div>
          <Link href="#" style={{ display: 'block', marginTop: '1.5rem', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>View all tasks &rarr;</Link>
        </div>

        {/* Recent Activity */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={20} color="#1e293b" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Activity</h3>
            </div>
            <Link href="#" style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { user: 'Ram Sharma', action: 'submitted marks for', subject: 'BBS 2nd Year - Business Statistics', time: '10 min ago' },
              { user: 'Admin', action: 'published results for', subject: 'BBS 1st Year', time: '1 hour ago' },
              { user: 'Admin', action: 'created new internal exam', subject: 'BBS 2nd Year - Mid Term', time: '3 hours ago' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', margin: 0, color: '#1e293b', lineHeight: '1.4' }}>
                    <strong>{item.user}</strong> {item.action} <span style={{ color: '#64748b' }}>{item.subject}</span>
                  </p>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Demographics */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} color="#1e293b" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Student Demographics</h3>
            </div>
            <Link href="/admin/admissions" style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ethnicData.length > 0 ? ethnicData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{item.name}</p>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                  {item.count} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>students</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No demographic data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Chart, Quick Actions, System Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '1.5rem' }}>
        {/* Marks Entry Overview (Chart Mockup) */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>Marks Entry Overview</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Simple SVG Donut Chart */}
            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
              <svg width="140" height="140" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#22c55e" strokeWidth="4" strokeDasharray="62 100" strokeDashoffset="0" transform="rotate(-90 20 20)" />
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeDasharray="24 100" strokeDashoffset="-62" transform="rotate(-90 20 20)" />
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#ef4444" strokeWidth="4" strokeDasharray="14 100" strokeDashoffset="-86" transform="rotate(-90 20 20)" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>62%</p>
                <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Completed</p>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#64748b' }}>● Completed</span>
                <span style={{ fontWeight: 700 }}>62%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#f59e0b' }}>● In Progress</span>
                <span style={{ fontWeight: 700 }}>24%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#ef4444' }}>● Not Started</span>
                <span style={{ fontWeight: 700 }}>14%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <Link href="/admin/internal-exams" style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '16px', textDecoration: 'none' }}>
                <Plus size={18} color="#22c55e" />
                <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#166534' }}>Create Exam</p>
             </Link>
             <Link href="/admin/internal-exams?tab=teachers" style={{ padding: '1rem', background: '#eff6ff', borderRadius: '16px', textDecoration: 'none' }}>
                <Users size={18} color="#3b82f6" />
                <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#1e40af' }}>Assign Subjects</p>
             </Link>
             <Link href="/teacher/login" style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '16px', textDecoration: 'none' }}>
                <CheckSquare size={18} color="#8b5cf6" />
                <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#5b21b6' }}>Enter Marks</p>
             </Link>
             <Link href="/admin/results" style={{ padding: '1rem', background: '#fff7ed', borderRadius: '16px', textDecoration: 'none' }}>
                <ArrowUpRight size={18} color="#f97316" />
                <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#9a3412' }}>Publish Results</p>
             </Link>
          </div>
        </div>

        {/* System Status */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>System Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Database size={16} color="#64748b" />
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Database</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>● Connected</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={16} color="#64748b" />
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Security (RLS)</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>● Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Save size={16} color="#64748b" />
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Backups</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Last: 2h ago</span>
            </div>
          </div>
          <button onClick={handleBackup} disabled={isBackingUp} style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
            {isBackingUp ? 'Processing...' : 'Run Manual Backup'}
          </button>
      </div>
    </div>
  </div>
  );
}

