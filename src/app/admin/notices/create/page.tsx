'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './create.module.css';

export default function CreateNotice() {
  const [category, setCategory] = useState('General');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileName(e.dataTransfer.files[0].name);
      // If we had the actual file upload logic via a Server Action, we'd assign this file to the input or state
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation for saving to MongoDB + Cloudflare R2 will go here
    alert("Notice UI submitted! (Connection logic to be added later)");
    router.push('/admin/notices');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/notices" style={{ color: 'var(--text-muted)', fontSize: '1.5rem', textDecoration: 'none' }}>&larr;</Link>
        <h1 className="section-title" style={{ margin: 0, textAlign: 'left' }}>Create New Notice</h1>
      </div>

      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Notice Title</label>
            <input type="text" placeholder="Enter notice title..." required />
          </div>

          <div className={styles.formGroup}>
            <label>Notice Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="General">General Notice</option>
              <option value="Program Wise">Program Wise</option>
            </select>
          </div>

          {category === 'Program Wise' && (
            <div className={styles.formGroup}>
              <label>Select Program</label>
              <select required>
                <option value="">Select a specific program</option>
                <option value="BBS">BBS (Bachelor in Business Studies)</option>
                <option value="BITM">BITM (Bachelor in Information Technology Mngmt)</option>
                <option value="MBS">MBS (Master of Business Studies)</option>
                <option value="BHM">BHM (Bachelor of Hotel Management)</option>
                <option value="B.Ed.">B.Ed. (Bachelor in Education)</option>
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <textarea placeholder="Write out the notice content or summary here..."></textarea>
          </div>

          <div className={styles.formGroup}>
            <label>Attach PDF or Image File</label>
            <div 
              className={styles.fileInputWrapper}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".pdf,image/png,image/jpeg,image/webp"
              />
              <div style={{ pointerEvents: 'none' }}>
                <span style={{ fontSize: '2rem' }}>📎</span>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Click to select or drag and drop your file here
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Supports PDF, PNG, JPG, WEBP (Max: 10MB)
                </p>
              </div>
              {fileName && (
                <div className={styles.fileName}>
                  Selected File: {fileName}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link href="/admin/notices" className="btn btn-outline" style={{ display: 'inline-block' }}>Cancel</Link>
            <button type="submit" className="btn btn-primary">Save Notice</button>
          </div>
        </form>
      </div>
    </div>
  );
}
