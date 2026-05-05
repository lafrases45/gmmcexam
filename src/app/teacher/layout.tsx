'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './teacher.module.css';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Facilitator');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const isLoginPage = pathname === '/teacher/login';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session && !isLoginPage) {
        router.push('/teacher/login');
      }

      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          const { data: reg } = await supabase.from('teacher_registry').select('full_name').eq('email', session.user.email).single();
          if (reg?.full_name) setUserName(reg.full_name);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [isLoginPage, router]);

  if (loading && !isLoginPage) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#003292', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  // If it's the login page, just show the login content without the topbar/structure
  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/teacher/login');
  };

  return (
    <div className={styles.teacherLayout} style={{ background: '#f1f5f9', minHeight: '100vh' }}>
      {/* Sidebar removed for full-width 'Admin' style UI */}
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className={styles.mainContent} style={{ marginLeft: 0, width: '100%' }}>
        <header className={styles.topbar} style={{ 
          background: '#003292', 
          color: 'white', 
          padding: '0.75rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'none' // Hidden by default, shown in CSS for mobile
              }}
              className="mobile-hamburger"
            >
              ☰
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, letterSpacing: '0.05em' }}>GMMC FACULTY</h2>
            <nav className="desktop-nav" style={{ display: 'flex', gap: '1.5rem', marginLeft: '1rem' }}>
              <Link href="/teacher" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', opacity: 0.9 }}>Dashboard</Link>
              <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', opacity: 0.7 }}>View Website</Link>
            </nav>
          </div>
          
          <div className="desktop-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{userName}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Academic Faculty</div>
            </div>
            <button 
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Logout
            </button>
          </div>
        </header>
        <div className={styles.contentWrapper}>
          {children}
        </div>

        <div style={{
          position: 'fixed',
          top: 0,
          left: isMobileMenuOpen ? 0 : '-100%',
          width: '280px',
          height: '100%',
          background: 'white',
          zIndex: 1000,
          transition: 'left 0.3s ease',
          boxShadow: '10px 0 30px rgba(0,0,0,0.1)',
          padding: '2rem'
        }}>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
          >✕</button>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#003292', margin: 0 }}>Menu</h2>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>{userName}</div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Link href="/teacher" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: '600', fontSize: '1.1rem' }}>Dashboard</Link>
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: '600', fontSize: '1.1rem' }}>View Website</Link>
            <button onClick={handleLogout} style={{ marginTop: '2rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: '700' }}>Logout</button>
          </nav>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .mobile-hamburger { display: block !important; }
            .desktop-nav { display: none !important; }
            .desktop-user-info { display: none !important; }
          }
        `}</style>
      </main>
    </div>
  );
}
