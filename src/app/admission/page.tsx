'use client';
import { useState } from 'react';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import styles from "./admission.module.css";
import { submitAdmissionForm } from "./actions";

export default function Admission() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('');
    
    const formData = new FormData(e.currentTarget);
    const result = await submitAdmissionForm(formData);
    
    setStatusMessage(result.message);
    setIsSubmitting(false);
    if (result.success) {
      e.currentTarget.reset();
    }
  };

  return (
    <div>
      <Navbar />
      <main className="container">
        <section className={styles.admissionSection}>
          <div className={styles.header}>
            <h1 className="section-title">Online Admission Application</h1>
            <p>Please fill out the form below to apply for admission at GMMC. Our team will review your application and contact you soon.</p>
            {statusMessage && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: statusMessage.includes('successfully') ? '#e8f5e9' : '#ffebee', color: statusMessage.includes('successfully') ? '#2e7d32' : '#c62828', borderRadius: '4px', fontWeight: 600 }}>
                {statusMessage}
              </div>
            )}
          </div>

          <form className={styles.admissionForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <h3>Personal Information</h3>
              <div className={styles.grid}>
                <div className={styles.inputField}>
                  <label>Full Name</label>
                  <input type="text" name="fullName" placeholder="Entry your full name" required />
                </div>
                <div className={styles.inputField}>
                  <label>Email Address</label>
                  <input type="email" name="email" placeholder="example@mail.com" required />
                </div>
                <div className={styles.inputField}>
                  <label>Phone Number</label>
                  <input type="tel" name="phone" placeholder="+977-98XXXXXXXX" required />
                </div>
                <div className={styles.inputField}>
                  <label>Date of Birth</label>
                  <input type="date" name="dob" required />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <h3>Academic Selection</h3>
              <div className={styles.grid}>
                <div className={styles.inputField}>
                  <label>Interested Program</label>
                  <select name="program" required>
                    <option value="">Select a program</option>
                    <option value="bbs">Bachelor in Business Studies (BBS)</option>
                    <option value="bitm">Bachelor in Information Technology Management (BITM)</option>
                    <option value="mbs">Master of Business Studies (MBS)</option>
                    <option value="bhm">Bachelor of Hotel Management (BHM)</option>
                    <option value="bed">Bachelor in Education (B.Ed.)</option>
                  </select>
                </div>
                <div className={styles.inputField}>
                  <label>Previous Education (e.g., +2, SLC)</label>
                  <input type="text" name="previousEducation" placeholder="School/College Name" required />
                </div>
              </div>
            </div>

            <div className={styles.formAction}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <p className={styles.note}>By submitting, you agree to our terms and conditions.</p>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
