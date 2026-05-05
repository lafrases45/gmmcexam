import Link from 'next/link';
import { 
  LayoutGrid, GraduationCap, Users, UserCog, ClipboardCheck, 
  ScrollText, CalendarDays, Wallet, Receipt, Calculator, 
  Package, Library, Settings, Bell, Search, LogOut,
  ChevronRight, Activity, ShieldCheck, Database
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const activeModules = [
    { title: 'Admin Panel', description: 'Core system administration and oversight', icon: <UserCog size={20} />, path: '/admin', color: '#1e40af' },
    { title: 'Teacher Portal', description: 'Marks entry and subject management', icon: <Users size={20} />, path: '/teacher/login', color: '#0369a1' },
    { title: 'Internal Exam', description: 'Internal assessment and routine setup', icon: <ScrollText size={20} />, path: '/admin/exams', color: '#4338ca' },
    { title: 'Board Exam', description: 'TU marksheet extraction and verification', icon: <ClipboardCheck size={20} />, path: '/admin/board-exams', color: '#0f766e' },
    { title: 'Seat Plan', description: 'Automated seating and room allocation', icon: <LayoutGrid size={20} />, path: '/admin/seat-plan', color: '#b91c1c' },
  ];

  const quickStats = [
    { label: 'Active Students', value: '1,284', change: '+12%', icon: <GraduationCap size={16} /> },
    { label: 'Current Sessions', value: '04', change: 'Stable', icon: <Activity size={16} /> },
    { label: 'System Health', value: '99.9%', change: 'Optimal', icon: <ShieldCheck size={16} /> },
  ];

  return (
    <main className={styles.emisContainer}>
      {/* Top Header Bar */}
      <header className={styles.topNav}>
        <div className={styles.navLeft}>
          <div className={styles.logoBox}>
            <div className={styles.logoIcon}>G</div>
            <div className={styles.logoText}>
              <h1>GMMC EMIS</h1>
              <span>Enterprise Management Information System</span>
            </div>
          </div>
        </div>
        <div className={styles.navRight}>
          <div className={styles.searchBar}>
            <Search size={16} />
            <input type="text" placeholder="Search modules..." />
          </div>
          <button className={styles.navIconBtn}><Bell size={18} /></button>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}>PC</div>
          </div>
        </div>
      </header>

      <div className={styles.mainLayout}>
        {/* Main Content Area */}
        <div className={styles.dashboardContent}>
          <div className={styles.welcomeHeader}>
            <div>
              <h2>Dashboard Overview</h2>
              <p>Welcome back, Administrator. System is operating at peak performance.</p>
            </div>
            <div className={styles.dateDisplay}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Statistics Bar */}
          <div className={styles.statsGrid}>
            {quickStats.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <div className={styles.statIcon}>{stat.icon}</div>
                <div className={styles.statData}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <div className={styles.statValueRow}>
                    <span className={styles.statValue}>{stat.value}</span>
                    <span className={styles.statChange}>{stat.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Active Modules Grid */}
          <section className={styles.moduleGridSection}>
            <div className={styles.sectionHeader}>
              <h3>Active Management Modules</h3>
              <Link href="/admin" className={styles.viewAll}>View All Systems <ChevronRight size={14} /></Link>
            </div>
            <div className={styles.moduleGrid}>
              {activeModules.map((module) => (
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

          {/* Infrastructure Preview */}
          <section className={styles.infraSection}>
            <div className={styles.sectionHeader}>
              <h3>System Infrastructure (Upcoming)</h3>
            </div>
            <div className={styles.infraGrid}>
              {['Accounts', 'Inventory', 'Payroll', 'HRM', 'Library', 'Attendance'].map((item) => (
                <div key={item} className={styles.infraItem}>
                  <div className={styles.infraDot}></div>
                  <span>{item}</span>
                  <span className={styles.lockedBadge}>Locked</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Agency Footer */}
      <footer className={styles.emisFooter}>
        <div className={styles.footerLeft}>
          <p>© {new Date().getFullYear()} Gupteshwor Mahadev Multiple Campus — Institutional EMIS Division</p>
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
