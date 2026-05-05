import React from 'react';
import { notFound } from 'next/navigation';
import { programsData } from '@/lib/programsData';
import ProgramHero from '@/components/programs/ProgramHero';
import ProgramContentSwitcher from '@/components/programs/ProgramContentSwitcher';
import styles from './program.module.css';
import Link from 'next/link';
import Image from 'next/image';

interface ProgramPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(programsData).map((slug) => ({
    slug,
  }));
}

const ProgramPage = async ({ params }: ProgramPageProps) => {
  const { slug } = await params;
  const program = programsData[slug];

  if (!program) {
    notFound();
  }

  const programKeys = Object.keys(programsData);
  const currentIndex = programKeys.indexOf(slug);
  const nextProgram = programsData[programKeys[(currentIndex + 1) % programKeys.length]];
  const prevProgram = programsData[programKeys[(currentIndex - 1 + programKeys.length) % programKeys.length]];

  return (
    <div className={styles.container}>
      <ProgramHero 
        title={program.title}
        image={program.heroImage}
        duration={program.duration}
        affiliation={program.affiliation}
      />

      <div className={styles.breadcrumbWrapper}>
        <div className={styles.breadcrumb}>
           <Link href="/">Home</Link>
           <span>/</span>
           <Link href="/programs">Programs</Link>
           <span>/</span>
           <span className={styles.current}>{program.slug.toUpperCase()}</span>
        </div>
      </div>

      <main className={styles.coursePageMain}>
        {/* SIDEBAR: Persistent Coordinator Identity */}
        <aside className={styles.sidebar}>
          <div className={styles.coordinatorCard}>
             <div className={styles.coordImgWrapper}>
                <Image 
                  src={program.coordinatorImage || '/images/coordinators/placeholder.jpg'} 
                  alt={program.coordinatorName}
                  width={300}
                  height={350}
                  className={styles.coordImg}
                  priority
                />
             </div>
             <div className={styles.coordBrief}>
                <h4 className={styles.coordName}>{program.coordinatorName}</h4>
                <p className={styles.coordTitle}>Program Coordinator</p>
                <div className={styles.coordActions}>
                   <a href={`tel:${program.coordinatorContact.phone}`} className={styles.actionBtn}>📞 Call</a>
                   <a href={`mailto:${program.coordinatorContact.email}`} className={styles.actionBtn}>✉️ Email</a>
                </div>
             </div>
          </div>

          <Link href="/contact" className={styles.primaryBtn} style={{width: '100%', marginTop: '2rem', textAlign: 'center'}}>
            Admissions Open
          </Link>
        </aside>

        {/* CONTENT BODY: Fixed Overview -> Dynamic Switcher */}
        <div className={styles.contentBody}>
          <header className={styles.sectionFade}>
            <h2 className={styles.sectionTitle}>Program Hub</h2>
            <div className={styles.textBlock}>
              <p style={{marginBottom: '2rem', fontSize: '1.2rem', color: 'var(--primary-blue)', fontWeight: '600', lineHeight: '1.6'}}>
                {program.shortDescription}
              </p>
              
              <div className={styles.messageCard} style={{marginBottom: '3rem'}}>
                <div className={styles.messageContent}>
                   <p style={{fontStyle: 'italic', color: '#2d3748', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.8'}}>
                     "{program.coordinatorMessage}"
                   </p>
                   <div style={{borderTop: '1px solid #edf2f7', paddingTop: '1rem', fontWeight: '800', color: 'var(--primary-blue)'}}>
                     - Message from the Coordinator
                   </div>
                </div>
              </div>
            </div>
          </header>

          {/* DYNAMIC SWITCHER: All specialized content lives here */}
          <ProgramContentSwitcher program={program} />

          {/* NAVIGATION: Quick cycle through degrees */}
          <div className={styles.nextPrevNav}>
             <Link href={`/programs/${prevProgram.slug}`} className={styles.navBox}>
                <span className={styles.navLabel}>← Previous</span>
                <span className={styles.navName}>{prevProgram.title.split('(')[0]}</span>
             </Link>
             <Link href={`/programs/${nextProgram.slug}`} className={styles.navBox} style={{textAlign: 'right'}}>
                <span className={styles.navLabel}>Next Degree →</span>
                <span className={styles.navName}>{nextProgram.title.split('(')[0]}</span>
             </Link>
          </div>

          <section className={styles.ctaSection} style={{borderRadius: '24px'}}>
             <h2 style={{color: 'white', marginBottom: '1rem', fontSize: '2rem'}}>Ready to join GMMC?</h2>
             <p style={{color: 'rgba(255,255,255,0.8)', marginBottom: '2rem'}}>Start your journey toward academic excellence in {program.title}.</p>
             <Link href="/contact" className={styles.primaryBtn} style={{background: 'white', color: 'var(--primary-blue)'}}>Expression of Interest</Link>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ProgramPage;
