'use client';

import React, { useState } from 'react';
import styles from '../../app/programs/[slug]/program.module.css';
import { CurriculumItem } from '@/lib/programsData';

interface CurriculumAccordionProps {
  curriculum: CurriculumItem[];
}

const CurriculumAccordion: React.FC<CurriculumAccordionProps> = ({ curriculum }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className={styles.accordion}>
      {curriculum.map((item, index) => (
        <div 
          key={index} 
          className={`${styles.accordionItem} ${activeIndex === index ? styles.accordionActive : ''}`}
        >
          <button 
            className={styles.accordionHeader} 
            onClick={() => toggleAccordion(index)}
          >
            <span>{item.year || item.semester}</span>
            <span className={styles.arrow}>{activeIndex === index ? '−' : '+'}</span>
          </button>
          <div className={styles.accordionContent}>
            <div className={styles.subjectList}>
              {item.subjects.map((subject, subIndex) => (
                <div key={subIndex} className={styles.subject}>
                  {subject}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CurriculumAccordion;
