'use client';

import React, { useState } from 'react';
import styles from '../../app/programs/[slug]/program.module.css';

interface ProgramQueryFormProps {
  programName: string;
}

const ProgramQueryForm: React.FC<ProgramQueryFormProps> = ({ programName }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      query: formData.get('query'),
      program: programName
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) setStatus('success');
      else setStatus('error');
    } catch (err) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.successMessage}>
        <h3>Thank you!</h3>
        <p>Your query regarding {programName} has been sent. We will get back to you shortly.</p>
        <button onClick={() => setStatus('idle')} className={styles.secondaryBtn}>Send another query</button>
      </div>
    );
  }

  return (
    <div id="query-form" className={styles.formCard}>
      <h3 className={styles.navTitle}>Inquiry & Apply</h3>
      <p className={styles.mb4}>Have questions about {programName}? Send us a message.</p>
      
      <form onSubmit={handleSubmit} className={styles.queryForm}>
        <div className={styles.formGroup}>
          <label>Full Name</label>
          <input type="text" name="name" required placeholder="John Doe" />
        </div>
        <div className={styles.formGroup}>
          <label>Email Address</label>
          <input type="email" name="email" required placeholder="john@example.com" />
        </div>
        <div className={styles.formGroup}>
          <label>Phone Number</label>
          <input type="tel" name="phone" required placeholder="+977-9800000000" />
        </div>
        <div className={styles.formGroup}>
          <label>Your Message / Question</label>
          <textarea name="query" required rows={4} placeholder="Tell us more about your academic goals..."></textarea>
        </div>
        
        <button 
          type="submit" 
          className={styles.primaryBtn} 
          disabled={status === 'loading'}
          style={{width: '100%', marginTop: '1rem'}}
        >
          {status === 'loading' ? 'Sending...' : 'Send Inquiry'}
        </button>
        
        {status === 'error' && (
          <p style={{color: '#e53e3e', fontSize: '0.9rem', marginTop: '0.5rem'}}>
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  );
};

export default ProgramQueryForm;
