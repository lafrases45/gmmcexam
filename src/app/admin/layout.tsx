'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePrefetchData } from '@/lib/hooks/usePrefetchData';
import styles from './admin.module.css';
import { LayoutDashboard, BookOpen, ClipboardList, BarChart3, Users, UserPlus, GraduationCap, Settings, ShieldCheck, Database, Search, Bell, Menu, ChevronLeft, LogOut, FileText, UserCheck, Settings2, Activity, Layout, X, Clock, Calendar } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { session, loading } = useAuth();
  usePrefetchData();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [showFallback, setShowFallback] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Fallback timeout for session check
  useEffect(() => {
    let timer: any;
    if (loading && !session && !isLoginPage) {
      timer = setTimeout(() => {
        setShowFallback(true);
      }, 8000); // 8 seconds timeout
    } else {
      setShowFallback(false);
    }
    return () => clearTimeout(timer);
  }, [loading, session, isLoginPage]);

  useEffect(() => {
    if (!loading && !session && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [session, loading, isLoginPage, router]);

  // Only show the full-screen spinner on the initial load when there's no session yet.
  if (loading && !session && !isLoginPage) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '300px' }}>
          <div style={{ width: '45px', height: '45px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div>
            <p style={{ color: '#1e293b', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Verifying Session</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Please wait while we secure your connection...</p>
          </div>
          
          {showFallback && (
            <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', width: '100%' }}
              >
                Reload Page
              </button>
              <button 
                onClick={() => router.push('/admin/login')}
                style={{ padding: '0.6rem 1.2rem', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const navItems = [
    { category: 'EXAMS', items: [
      { name: 'Board Exams', icon: BookOpen, href: '/admin/board-exams' },
      { name: 'Internal Exams', icon: ClipboardList, href: '/admin/internal-exams' },
      { name: 'Seat Plan', icon: Layout, href: '/admin/seat-plan' },

    ]},
    { category: 'ATTENDANCE', items: [
      { name: 'Live Dashboard', icon: Clock, href: '/admin/attendance' },
      { name: 'Monthly Ledger', icon: FileText, href: '/admin/attendance/reports' },
      { name: 'Holiday Setup', icon: Calendar, href: '/admin/attendance/holidays' },
    ]},
    { category: 'TEACHERS', items: [
      { name: 'Teacher List', icon: Users, href: '/admin/internal-exams?tab=teachers' },
      { name: 'Assign Subjects', icon: UserCheck, href: '/admin/internal-exams?tab=teachers' },
    ]},
    { category: 'STUDENTS', items: [
      { name: 'Admissions', icon: UserPlus, href: '/admin/admissions' },
      { name: 'Student List', icon: GraduationCap, href: '/admin/students' },
      { name: 'Student Promotion', icon: UserPlus, href: '/admin/promotion' },
    ]},
    { category: 'REPORTS', items: [
      { name: 'Admission Analysis', icon: Activity, href: '/admin/admission-analysis' },
      { name: 'Exam Reports', icon: BarChart3, href: '/admin/internal-exams?tab=report' },
      { name: 'Marks Reports', icon: Activity, href: '/admin/reports' },
      { name: 'Program Statistics', icon: BarChart3, href: '/admin/program-stats' },
      { name: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    ]},
    { category: 'SYSTEM', items: [
      { name: 'Backup & Recovery', icon: Database, href: '/admin?tab=system' },
      { name: 'Settings', icon: Settings, href: '/admin/settings' },
    ]},
    { category: 'ADMINISTRATION', items: [
      { name: 'Role Management', icon: ShieldCheck, href: '/admin/roles' },
      { name: 'User Management', icon: Settings2, href: '/admin/users' },
    ]}
  ];

  return (
    <div className={`${styles.adminLayout} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Mobile Overlay */}
      <div 
        className={`${styles.sidebarOverlay} ${isMobileOpen ? styles.mobileOpen : ''}`} 
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        <Link href="/" className={styles.sidebarLogo} style={{ textDecoration: 'none' }}>
          <div style={{ background: '#3b82f6', padding: '0.5rem', borderRadius: '10px' }}>
            <Database size={24} color="white" />
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1 }}>
              <h2>EMIS</h2>
              <p>Education Management</p>
            </div>
          )}
          <button className={styles.mobileCloseBtn} onClick={(e) => { e.preventDefault(); setIsMobileOpen(false); }}>
            <X size={24} />
          </button>
        </Link>

        <nav className={styles.sidebarNav}>
          <Link href="/admin" className={`${styles.sidebarLink} ${pathname === '/admin' ? styles.active : ''}`}>
            <LayoutDashboard size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          {navItems.map((cat, idx) => (
            <div key={idx}>
              {!isCollapsed && <div className={styles.navCategory}>{cat.category}</div>}
              {cat.items.map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href} 
                  className={`${styles.sidebarLink} ${pathname === item.href ? styles.active : ''}`}
                >
                  <item.icon size={18} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.collapseBtn} onClick={() => setIsCollapsed(!isCollapsed)}>
            <ChevronLeft size={20} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className={styles.mobileMenuBtn} onClick={() => setIsMobileOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                <Users size={20} color="#64748b" />
              </div>
              <div className={styles.userInfo}>
                <h4>Admin User</h4>
                <p>Super Admin</p>
              </div>
            </div>

            <button className={styles.logoutBtn} onClick={handleLogout} style={{ marginLeft: '1rem' }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
