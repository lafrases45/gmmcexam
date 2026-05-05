'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../notices/create/create.module.css';

export default function CreateDocument() {
  const [category, setCategory] = useState('Audit Report');
  const [customCategory, setCustomCategory] = useState('');
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
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Document UI submitted! (Ready for MongoDB integration)");
    router.push('/admin/documents');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/documents" style={{ color: 'var(--text-muted)', fontSize: '1.5rem', textDecoration: 'none' }}>&larr;</Link>
        <h1 className="section-title" style={{ margin: 0, textAlign: 'left' }}>Upload Document</h1>
      </div>

      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Document Title</label>
            <input type="text" placeholder="e.g. Audit Report 2023" required />
          </div>

          <div className={styles.formGroup}>
            <label>Detailed Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="Audit Report">Audit Report</option>
              <option value="Annual Report">Annual Report</option>
              <option value="SSR">SSR (Self Study Report)</option>
              <option value="Custom">Create Custom Category...</option>
            </select>
          </div>

          {category === 'Custom' && (
            <div className={styles.formGroup}>
              <label>Define Category Name</label>
              <input 
                type="text" 
                placeholder="Type a new category name... (e.g. Tracers Report)" 
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Published Year (Used for chronological sorting)</label>
            <input type="number" placeholder="2023" defaultValue={new Date().getFullYear()} required />
          </div>

          <div className={styles.formGroup}>
            <label>Attach PDF File</label>
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
                accept=".pdf"
                required
              />
              <div style={{ pointerEvents: 'none' }}>
                <span style={{ fontSize: '2rem' }}>📄</span>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Click to select or drag and drop your PDF here
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Only PDF files are supported
                </p>
              </div>
              {fileName && (
                <div className={styles.fileName}>
                  Selected PDF: {fileName}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link href="/admin/documents" className="btn btn-outline" style={{ display: 'inline-block' }}>Cancel</Link>
            <button type="submit" className="btn btn-primary">Upload Document</button>
          </div>
        </form>
      </div>
    </div>
  );
}
