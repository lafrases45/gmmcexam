'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from '../../app/programs/[slug]/program.module.css';

interface ProgramGalleryProps {
  images: string[];
}

const ProgramGallery = ({ images }: ProgramGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className={styles.gallerySection}>
      <h2 className={styles.sectionTitle}>Campus Life & Facilities</h2>
      <div className={styles.galleryGrid}>
        {images.map((src, index) => (
          <div 
            key={index} 
            className={styles.galleryItem}
            onClick={() => setSelectedImage(src)}
          >
            <Image 
              src={src} 
              alt={`Gallery image ${index + 1}`} 
              width={400} 
              height={300} 
              className={styles.galleryImage}
            />
            <div className={styles.galleryHover}>
              <span>🔍 View Full Size</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className={styles.lightbox} onClick={() => setSelectedImage(null)}>
          <div className={styles.lightboxContent}>
            <button className={styles.closeBtn} onClick={() => setSelectedImage(null)}>✕</button>
            <Image 
              src={selectedImage} 
              alt="Full size view" 
              width={1200} 
              height={800} 
              className={styles.fullImage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramGallery;
