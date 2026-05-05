import Link from 'next/link';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          <div className={styles.footerInfo}>
            <div className={styles.logo}>GMMC</div>
            <p className={styles.description}>
              Gupteshwor Mahadev Multiple Campus is a community-driven institution affiliated with Tribhuvan University, committed to delivering affordable education.
            </p>
            <div className={styles.contactInfo}>
              <p>📍 Chhorepatan-17, Pokhara, Nepal</p>
              <p>📞 +977-61-460117</p>
              <p>✉️ gupteshwormmc@gmail.com</p>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <h3>Quick Links</h3>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/programs">Academic Programs</Link></li>
              <li><Link href="/notices">Latest Notices</Link></li>
              <li><Link href="/gallery">Gallery</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className={styles.footerLinks}>
            <h3>Programs</h3>
            <ul>
              <li><Link href="/programs/bbs">BBS</Link></li>
              <li><Link href="/programs/bitm">BITM</Link></li>
              <li><Link href="/programs/mbs">MBS</Link></li>
              <li><Link href="/programs/bhm">BHM</Link></li>
              <li><Link href="/programs/bed">B.Ed.</Link></li>
            </ul>
          </div>

          <div className={styles.newsletter}>
            <h3>Newsletter</h3>
            <p>Subscribe to get latest updates and notices.</p>
            <form className={styles.form}>
              <input type="email" placeholder="Your Email" />
              <button type="submit" className="btn btn-primary">Subscribe</button>
            </form>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2026 Gupteshwor Mahadev Multiple Campus. All rights reserved.</p>
          <div className={styles.bottomLinks}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
