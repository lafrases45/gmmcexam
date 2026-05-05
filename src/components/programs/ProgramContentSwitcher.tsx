'use client';

import React, { useState } from 'react';
import styles from '../../app/programs/[slug]/program.module.css';
import CurriculumAccordion from './CurriculumAccordion';
import ProgramGallery from './ProgramGallery';
import { ProgramData } from '@/lib/programsData';
import Link from 'next/link';

interface ProgramContentSwitcherProps {
  program: ProgramData;
}

const ProgramContentSwitcher = ({ program }: ProgramContentSwitcherProps) => {
  const [activeTab, setActiveTab] = useState('curriculum');

  const tabs = [
    { id: 'curriculum', label: 'Syllabus', icon: '📚' },
    { id: 'outcomes', label: 'Outcomes', icon: '🎯' },
    { id: 'careers', label: 'Careers', icon: '🚀' },
    { id: 'facilities', label: 'Facilities', icon: '🏢', hidden: !program.facilities },
    { id: 'gallery', label: 'Gallery', icon: '📸' },
    { id: 'notices', label: 'Notices', icon: '📢' }
  ].filter(t => !t.hidden);

  const renderContent = () => {
    switch (activeTab) {
      case 'curriculum':
        return (
          <div className={styles.sectionFade}>
            <div className={styles.sectionHeaderInner}>
              <h2 className={styles.sectionTitle}>Academic Syllabus</h2>
              {program.syllabusLink && (
                <a href={program.syllabusLink} target="_blank" className={styles.primaryBtn} style={{padding: '0.6rem 1.2rem', fontSize: '0.85rem'}}>
                  📄 TU Syllabus
                </a>
              )}
            </div>
            <p style={{marginBottom: '2rem', opacity: '0.8'}}>{program.curriculumOverview}</p>
            <CurriculumAccordion curriculum={program.curriculum} />
          </div>
        );
      case 'outcomes':
        return (
          <div className={styles.sectionFade}>
            <h2 className={styles.sectionTitle}>Key Learning Outcomes</h2>
            <div className={styles.outcomeList}>
              {program.learningOutcomes.map((outcome, idx) => (
                <div key={idx} className={styles.outcomeItem}>
                  <span style={{fontSize: '1.5rem'}}>🛡️</span>
                  <p>{outcome}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'careers':
        return (
          <div className={styles.sectionFade}>
            <h2 className={styles.sectionTitle}>Career Pathways</h2>
            <div className={styles.careerGrid}>
              {program.careerPathways.map((path, idx) => (
                <div key={idx} className={styles.careerCard}>
                  <span className={styles.careerIcon}>{path.icon}</span>
                  <h4>{path.title}</h4>
                  <p>{path.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'facilities':
        return (
          <div className={styles.sectionFade}>
            <h2 className={styles.sectionTitle}>Learning Facilities</h2>
            <div className={styles.facilityGrid}>
              {program.facilities?.map((fac, idx) => (
                <div key={idx} className={styles.facilityCard}>
                  <h4>{fac.name}</h4>
                  <p>{fac.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className={styles.sectionFade}>
            <ProgramGallery images={program.gallery} />
          </div>
        );
      case 'notices':
        return (
          <div className={styles.sectionFade}>
             <h2 className={styles.sectionTitle}>Notifications Hub</h2>
             <div className={styles.noticeHubPlaceholder}>
                <div className={styles.hubIcon}>📢</div>
                <h3>Official Communications</h3>
                <p>Course-specific notices and university announcements for {program.slug.toUpperCase()} will appear here.</p>
                <Link href="/notices" className={styles.minimalBtn}>Visit Main Notice Board</Link>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.switcherContainer}>
      <div className={styles.switcherTabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.switcherBtn} ${activeTab === tab.id ? styles.switcherActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.switcherIcon}>{tab.icon}</span>
            <span className={styles.switcherLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.switcherContent}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ProgramContentSwitcher;
