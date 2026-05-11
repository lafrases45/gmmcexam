import Link from 'next/link';
import { 
  LayoutGrid, GraduationCap, Users, UserCog, ClipboardCheck, 
  ScrollText, CalendarDays, Wallet, Receipt, Calculator, 
  Package, Library, Settings, Bell, Search, LogOut,
  ChevronRight, Activity, ShieldCheck, Database,
  Briefcase, BarChart3, ShieldAlert, Cpu, Network,
  Globe, Landmark, Rocket, Award, Info
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const corePortals = [
    { title: 'Admin Panel', description: 'Institutional oversight & student registry', icon: <UserCog size={20} />, path: '/admin', color: '#1e40af' },
    { title: 'Teacher Portal', description: 'Marks entry and subject management', icon: <Users size={20} />, path: '/teacher/login', color: '#0369a1' },
    { title: 'Official Login', description: 'Secure access for staff and faculty', icon: <ShieldCheck size={20} />, path: '/login', color: '#4338ca' },
  ];

  const campusCells = [
    { title: 'Placement Cell', id: 'placement', icon: <Briefcase size={18} />, color: '#10b981' },
    { title: 'EMIS Cell', id: 'emis', icon: <Database size={18} />, color: '#3b82f6', path: 'https://app.emis.com.np/dashboard' },
    { title: 'IQAC Cell', id: 'iqac', icon: <Award size={18} />, color: '#f59e0b' },
    { title: 'GRM Cell', id: 'grm', icon: <ShieldAlert size={18} />, color: '#ef4444' },
    { title: 'RMC Cell', id: 'rmc', icon: <Network size={18} />, color: '#8b5cf6' },
    { title: 'HEMIS', id: 'hemis', icon: <Globe size={18} />, color: '#06b6d4', path: 'https://hemis.gmmc.edu.np/login' },
    { title: 'EOC Cell', id: 'eoc', icon: <Cpu size={18} />, color: '#ec4899' },
    { title: 'PIC Cell', id: 'pic', icon: <Rocket size={18} />, color: '#f97316' },
  ];

  const scholarships = [
    { title: 'Indigent Scholarship 2082', deadline: '2082-06-15', status: 'Upcoming' },
    { title: 'Merit-Based Support (Sem-I)', deadline: '2082-05-30', status: 'Ongoing' },
    { title: 'Campus Excellence Award', deadline: '2082-07-01', status: 'Pending' },
  ];

  return (
    <main className={styles.emisContainer}>
      {/* Top Header Bar */}
      <header className={styles.topNav}>
        <div className={styles.navLeft}>
          <div className={styles.logoBox}>
            <div className={styles.logoIcon}>IMS</div>
            <div className={styles.logoText}>
              <h1>Internal Management System</h1>
              <span>Gupteshwor Mahadev Multiple Campus</span>
            </div>
          </div>
        </div>
        <div className={styles.navRight}>
          <div className={styles.searchBar}>
            <Search size={16} />
            <input type="text" placeholder="Search portals..." />
          </div>
          <button className={styles.navIconBtn}><Bell size={18} /></button>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}>G</div>
          </div>
        </div>
      </header>

      <div className={styles.mainLayout}>
        <div className={styles.dashboardContent}>
          <div className={styles.welcomeHeader}>
            <div>
              <h2>IMS Gateway</h2>
              <p>Unified access point for campus cells, faculty portals, and institutional governance.</p>
            </div>
            <div className={styles.dateDisplay}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className={styles.layoutGrid}>
            {/* Left Column: Modules and Cells */}
            <div className={styles.primaryColumn}>
              {/* 1. Core Portals */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Management Portals</h3>
                </div>
                <div className={styles.moduleGrid}>
                  {corePortals.map((module) => (
                    <Link key={module.title} href={module.path} className={styles.moduleCard}>
                      <div className={styles.moduleIcon} style={{ background: `${module.color}10`, color: module.color }}>
                        {module.icon}
                      </div>
                      <div className={styles.moduleInfo}>
                        <h4>{module.title}</h4>
                        <p>{module.description}</p>
                      </div>
                      <ChevronRight size={16} className={styles.cardArrow} />
                    </Link>
                  ))}
                </div>
              </section>

              {/* 2. Campus Cells */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Specialized Campus Cells</h3>
                </div>
                <div className={styles.cellGrid}>
                  {campusCells.map((cell) => (
                    <Link 
                      key={cell.id} 
                      href={cell.path || `/login?cell=${cell.id}`} 
                      target={cell.path ? "_blank" : undefined}
                      className={styles.cellCard}
                    >
                      <div className={styles.cellIcon} style={{ background: cell.color + '15', color: cell.color }}>
                        {cell.icon}
                      </div>
                      <div className={styles.cellInfo}>
                        <span className={styles.cellTitle}>{cell.title}</span>
                        <span className={styles.cellLogin}>{cell.path ? 'External Dashboard' : 'Access Panel'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Scholarship and Notices */}
            <div className={styles.secondaryColumn}>
              {/* 3. Scholarships */}
              <section className={styles.sideSection}>
                <div className={styles.sectionHeader}>
                  <h3>Scholarship Reports</h3>
                  <Link href="/admin/scholarships" className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
                <div className={styles.scholarshipList}>
                  {['2081/082', '2080/081', '2079/080'].map((year) => (
                    <Link key={year} href="/admin/reports/scholarships" className={styles.scholarshipItem}>
                      <div className={styles.scholarshipInfo}>
                        <strong>Fiscal Year {year}</strong>
                        <span>Institutional Benefit Report</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              </section>

              {/* 4. Quick Actions */}
              <section className={styles.sideSection}>
                <div className={styles.sectionHeader}>
                  <h3>Quick Support</h3>
                  <Info size={18} className="text-gray-400" />
                </div>
                <div className={styles.supportCard}>
                  <p>Need assistance with cell credentials or module access?</p>
                  <button className={styles.supportBtn}>Contact IT Desk</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.emisFooter}>
        <div className={styles.footerLeft}>
          <p>© {new Date().getFullYear()} Gupteshwor Mahadev Multiple Campus — IMS Department</p>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.developerCredit}>
            <span>Lead Architect:</span>
            <strong>Puspa Chaulagai</strong>
          </div>
        </div>
      </footer>
    </main>
  );
}
