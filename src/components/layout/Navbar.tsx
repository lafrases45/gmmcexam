'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
   const [isProgramsOpen, setIsProgramsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className="container">
        <div className={styles.navbarWrapper}>
          <Link href="/" className={styles.logo}>
            <Image 
              src="/images/logo.png" 
              alt="GMMC Logo" 
              width={400} 
              height={70} 
              className={styles.logoImage}
              priority
            />
          </Link>

          <div className={`${styles.navLinks} ${isOpen ? styles.activeMenu : ''}`}>
            <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
            <Link href="/about" onClick={() => setIsOpen(false)}>About Us</Link>
            <div 
              className={styles.dropdown} 
              onMouseEnter={() => setIsProgramsOpen(true)} 
              onMouseLeave={() => setIsProgramsOpen(false)}
            >
              <button 
                className={styles.dropdownBtn} 
                onClick={() => setIsProgramsOpen(!isProgramsOpen)}
              >
                Programs <span className={`${styles.caret} ${isProgramsOpen ? styles.caretUp : ''}`}>▼</span>
              </button>
              <div className={`${styles.dropdownContent} ${isProgramsOpen ? styles.showDropdown : ''}`}>
                <Link href="/programs/bbs" onClick={() => setIsOpen(false)}>BBS</Link>
                <Link href="/programs/bed" onClick={() => setIsOpen(false)}>B.Ed.</Link>
                <Link href="/programs/mbs" onClick={() => setIsOpen(false)}>MBS</Link>
                <Link href="/programs/bitm" onClick={() => setIsOpen(false)}>BITM</Link>
                <Link href="/programs/bhm" onClick={() => setIsOpen(false)}>BHM</Link>
              </div>
            </div>
            <Link href="/notices" onClick={() => setIsOpen(false)}>Notices</Link>
            
            <div className={styles.dropdown} onMouseEnter={() => setIsDropdownOpen(true)} onMouseLeave={() => setIsDropdownOpen(false)}>
              <button className={styles.dropdownBtn} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                Downloads <span className={`${styles.caret} ${isDropdownOpen ? styles.caretUp : ''}`}>▼</span>
              </button>
              <div className={`${styles.dropdownContent} ${isDropdownOpen ? styles.showDropdown : ''}`}>
                <Link href="/downloads" onClick={() => { setIsOpen(false); setIsDropdownOpen(false); }}>All Downloads</Link>
                <Link href="/downloads/audit-report" onClick={() => { setIsOpen(false); setIsDropdownOpen(false); }}>Audit Reports</Link>
                <Link href="/downloads/annual-report" onClick={() => { setIsOpen(false); setIsDropdownOpen(false); }}>Annual Reports</Link>
                <Link href="/downloads/ssr" onClick={() => { setIsOpen(false); setIsDropdownOpen(false); }}>SSR Reports</Link>
              </div>
            </div>

            <Link href="/contact" onClick={() => setIsOpen(false)}>Contact</Link>
            <Link href="/admission" className={styles.admissionBtn} onClick={() => setIsOpen(false)}>Admission</Link>
          </div>

          <div className={styles.mobileMenuBtn} onClick={() => setIsOpen(!isOpen)}>
            <span className={isOpen ? styles.cross1 : ''}></span>
            <span className={isOpen ? styles.cross2 : ''}></span>
            <span className={isOpen ? styles.cross3 : ''}></span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
