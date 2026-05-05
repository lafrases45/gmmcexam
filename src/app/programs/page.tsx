import React from 'react';
import { programsData } from '@/lib/programsData';
import Link from 'next/link';
import Image from 'next/image';
import styles from './[slug]/program.module.css';

const ProgramsLanding = () => {
  const programs = Object.values(programsData);

  return (
    <div className={styles.container}>
      <section className={styles.hero} style={{height: '40vh', minHeight: '300px'}}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Academic Excellence</span>
          <h1 className={styles.heroTitle} style={{fontSize: '3.5rem'}}>Academic Programs</h1>
          <p style={{fontSize: '1.2rem', opacity: '0.9', maxWidth: '700px', margin: '0 auto'}}>
            Explore our diverse range of world-class educational courses at GMMC.
          </p>
        </div>
      </section>

      <main className={styles.hubLandingMain}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '3rem'}}>
          {programs.map((program) => (
            <Link href={`/programs/${program.slug}`} key={program.slug} style={{textDecoration: 'none'}}>
              <div className={styles.formCard} style={{padding: '0', overflow: 'hidden', height: '100%', transition: 'all 0.4s ease', borderTop: 'none', borderBottom: '6px solid var(--primary-blue)'}}>
                <div style={{position: 'relative', width: '100%', height: '220px', overflow: 'hidden'}}>
                   <Image 
                     src={program.heroImage} 
                     alt={program.title} 
                     fill 
                     style={{objectFit: 'cover'}} 
                   />
                   <div style={{position: 'absolute', top: '1rem', right: '1rem', background: 'var(--accent-blue)', color: 'white', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '700'}}>
                     {program.duration}
                   </div>
                </div>
                <div style={{padding: '2rem'}}>
                  <h3 style={{fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '1rem', fontFamily: 'var(--font-outfit)'}}>{program.title}</h3>
                  <p style={{color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem'}}>
                    {program.shortDescription}
                  </p>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{color: 'var(--secondary-blue)', fontWeight: '700'}}>Details →</span>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600'}}>TU Affiliated</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <section className={styles.ctaSection} style={{padding: '5rem 2rem'}}>
        <h2 className={styles.ctaTitle} style={{fontSize: '2.5rem'}}>Start Your Journey Today</h2>
        <p className={styles.ctaText}>Join thousands of students who are building their future at GMMC.</p>
        <div className={styles.ctaButtons}>
          <Link href="/admission" className={styles.primaryBtn}>Apply Now</Link>
          <Link href="/contact" className={styles.primaryBtn} style={{background: 'transparent', border: '2px solid white', color: 'white'}}>Contact Us</Link>
        </div>
      </section>
    </div>
  );
};

export default ProgramsLanding;
