import React from 'react';
import styles from './contact.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact - Gupteshwor Mahadev Multiple Campus',
  description: 'Reach out to GMMC Pokhara. Administration contact, campus location, and route map.',
};

const ContactPage = () => {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Get In Touch</h1>
          <p className={styles.subtitle}>Direct Communication with our Campus Administration</p>
        </div>
      </section>

      <main className={styles.mainLayout}>
        <div className={styles.contactPanel}>
          {/* Information Side */}
          <div className={styles.infoSection}>
            <h2>Communication Hub</h2>
            
            <div className={styles.contactDetail}>
              <span className={styles.label}>Campus Administration</span>
              <a href="tel:+977061455677" className={styles.value}>+977-061-455677</a>
            </div>

            <div className={styles.contactDetail}>
              <span className={styles.label}>Official Email</span>
              <a href="mailto:gupteshwormmc@gmail.com" className={styles.value}>gupteshwormmc@gmail.com</a>
            </div>

            <div className={styles.contactDetail}>
              <span className={styles.label}>Postal Address</span>
              <address className={styles.value} style={{fontStyle: 'normal'}}>
                Pokhara-17, Chhorepatan<br />
                Kaski, Gandaki Province, Nepal
              </address>
            </div>

            <div className={styles.contactDetail}>
               <span className={styles.label}>Campus Hours</span>
               <span className={styles.value}>Sun - Fri: 6:00 AM - 5:00 PM</span>
            </div>
          </div>

          {/* Image/Map Guide Side */}
          <div className={styles.imageSection}>
            <div className={styles.imageBadge}>Campus Access Guide</div>
            <Image 
              src="/images/contact/campus-route.png" 
              alt="GMMC Campus Route from Highway" 
              width={800} 
              height={600} 
              className={styles.arrivalImage} 
            />
          </div>
        </div>

        {/* Map Section */}
        <div className={styles.mapHeader}>
          <h3>Interactive Campus Map</h3>
          <p style={{color: '#718096', marginTop: '1rem'}}>Zoom in to explore the exact campus premises and surrounding amenities.</p>
        </div>

        <section className={styles.fullMapWrapper}>
           <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3516.357125345638!2d83.9555!3d28.1888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3995950d8888888b%3A0x6b8b8b8b8b8b8b8b!2sGupteshwor+Mahadev+Multiple+Campus!5e0!3m2!1sen!2snp!4v1712620000000!5m2!1sen!2snp" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </section>
      </main>

      {/* Social Rail */}
      <footer className={styles.socialRail}>
        <a href="https://facebook.com/gmmc" target="_blank" className={styles.socialIconLink}>Facebook</a>
        <a href="https://linkedin.com/school/gmmc" target="_blank" className={styles.socialIconLink}>LinkedIn</a>
        <a href="https://instagram.com/gmmc" target="_blank" className={styles.socialIconLink}>Instagram</a>
        <a href="https://youtube.com/gmmc" target="_blank" className={styles.socialIconLink}>YouTube</a>
      </footer>
    </div>
  );
};

export default ContactPage;
