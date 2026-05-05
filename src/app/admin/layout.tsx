'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './admin.module.css';
import { 
  LayoutDashboard, BookOpen, ClipboardList, BarChart3, 
  Users, UserPlus, GraduationCap, Settings, 
  ShieldCheck, Database, Search, Bell, Menu, 
  ChevronLeft, LogOut, FileText, UserCheck, 
  Settings2, Activity, Layout
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isLoginPage) {
        router.push('/admin/login');
      }
      setLoading(false);
    };
    checkSession();
  }, [isLoginPage, router, supabase.auth]);

  if (loading && !isLoginPage) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  if (isLoginPage) return <>{children}</>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const navItems = [
    { category: 'EXAMS', items: [
      { name: 'Board Exams', icon: BookOpen, href: '/admin/board-exams' },
      { name: 'Internal Exams', icon: ClipboardList, href: '/admin/exams' },
      { name: 'Seat Plan', icon: Layout, href: '/admin/seat-plan' },
      { name: 'Results', icon: FileText, href: '/admin/results' },
    ]},
    { category: 'TEACHERS', items: [
      { name: 'Teacher List', icon: Users, href: '/admin/exams?tab=teachers' },
      { name: 'Assign Subjects', icon: UserCheck, href: '/admin/exams?tab=teachers' },
      { name: 'Marks Entry', icon: ClipboardList, href: '/teacher/login' },
    ]},
    { category: 'STUDENTS', items: [
      { name: 'Student List', icon: GraduationCap, href: '/admin/students' },
      { name: 'Student Promotion', icon: UserPlus, href: '/admin/promotion' },
    ]},
    { category: 'REPORTS', items: [
      { name: 'Exam Reports', icon: BarChart3, href: '/admin/exams?tab=report' },
      { name: 'Marks Reports', icon: Activity, href: '/admin/reports' },
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
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div style={{ background: '#3b82f6', padding: '0.5rem', borderRadius: '10px' }}>
            <Database size={24} color="white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2>EMIS</h2>
              <p>Education Management</p>
            </div>
          )}
        </div>

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
          <div className={styles.headerSearch}>
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search students, teachers, exams..." />
          </div>

          <div className={styles.headerActions}>
            <div className={styles.notificationIcon}>
              <Bell size={20} />
              <span className={styles.notificationBadge}>5</span>
            </div>
            
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
