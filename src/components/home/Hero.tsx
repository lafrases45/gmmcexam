'use client';
import { useState, useEffect } from 'react';
import styles from './Hero.module.css';
import Image from 'next/image';

const slideData = [
  {
    image: '/images/Campus-photo.jpg',
    title: 'Welcome to GMMC',
    subtitle: 'Quality Education for all'
  },
  {
    image: '/images/Main Banner/1.png',
    title: 'Academic Excellence',
    subtitle: 'Nurturing the next generation of leaders'
  },
  {
    image: '/images/Main Banner/2.png',
    title: 'Modern Infrastructure',
    subtitle: 'State-of-the-art facilities for better learning'
  },
  {
    image: '/images/Main Banner/3.png',
    title: 'QAA Certified Institution',
    subtitle: 'Quality assurance you can trust'
  }
];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 6000); // 6 seconds for each slide
    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slideData.length);
      setIsAnimating(false);
    }, 500); // Small delay to sync with CSS
  };

  const handlePrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + slideData.length) % slideData.length);
      setIsAnimating(false);
    }, 500);
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>
      <div className={styles.imageContainer}>
        {slideData.map((slide, idx) => (
          <Image 
            key={slide.image}
            src={slide.image} 
            alt={`GMMC Slide ${idx + 1}`} 
            fill 
            priority={idx === 0} 
            className={`${styles.heroImg} ${idx === currentIndex ? styles.activeSlide : styles.inactiveSlide}`}
          />
        ))}
      </div>
      
      <button className={`${styles.navArrow} ${styles.prev}`} onClick={handlePrev} aria-label="Previous Slide">
        &#10094;
      </button>
      <button className={`${styles.navArrow} ${styles.next}`} onClick={handleNext} aria-label="Next Slide">
        &#10095;
      </button>

      <div className="container">
        <div className={`${styles.content} ${isAnimating ? styles.contentFade : ''}`}>
          <h1 className={`${styles.title} ${idxToAnim(currentIndex)}`}>
            {slideData[currentIndex].title}
          </h1>
          <p className={styles.subtitle}>
            {currentIndex === 0 ? (
              <em style={{ fontStyle: 'italic', fontWeight: '500' }}>{slideData[currentIndex].subtitle}</em>
            ) : (
              slideData[currentIndex].subtitle
            )}
          </p>
          <div className={styles.cta}>
            <button className="btn btn-primary">Our Programs</button>
            <button className="btn btn-outline" style={{ borderColor: 'white', color: 'white' }}>Learn More</button>
          </div>
        </div>
      </div>

    </section>
  );
};

// Helper to trigger specific animation classes
const idxToAnim = (idx: number) => {
  return styles.slideUp;
};

export default Hero;
