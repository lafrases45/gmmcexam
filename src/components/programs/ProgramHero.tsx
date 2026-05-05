import React from 'react';
import Image from 'next/image';
import styles from '../../app/programs/[slug]/program.module.css';

interface ProgramHeroProps {
  title: string;
  image: string;
  duration: string;
  affiliation: string;
}

const ProgramHero: React.FC<ProgramHeroProps> = ({ title, image, duration, affiliation }) => {
  return (
    <section className={styles.hero}>
      <Image 
        src={image} 
        alt={title} 
        fill 
        className={styles.heroImage} 
        priority
      />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <span className={styles.heroBadge}>Academic Excellence</span>
        <h1 className={styles.heroTitle}>{title}</h1>
        <div className={styles.quickFacts}>
          <div className={styles.factItem}>
            <span className={styles.factLabel}>Duration</span>
            <span className={styles.factValue}>{duration}</span>
          </div>
          <div className={styles.factItem}>
            <span className={styles.factLabel}>Affiliation</span>
            <span className={styles.factValue}>{affiliation}</span>
          </div>
          <div className={styles.factItem}>
            <span className={styles.factLabel}>Campus</span>
            <span className={styles.factValue}>GMMC Pokhara</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProgramHero;
