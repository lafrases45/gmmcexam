"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBoardExamStore } from '@/lib/boardExamStore';

export default function UploadPage() {
  const router = useRouter();
  const setSession = useBoardExamStore(state => state.setSession);
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    examYear: new Date().getFullYear().toString(),
    program: 'BBS',
    part: 'First',
    enrollmentYear: (new Date().getFullYear() - 1).toString(),
    resultPublishedDate: '',
    examDate: ''
  });

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }
    
    if (!formData.examYear || !formData.enrollmentYear || !formData.resultPublishedDate || !formData.examDate) {
      setError('Please fill in all the required exam details (Exam Year, Enrollment Year, Result Date, and Exam Date Range).');
      return;
    }
    
    setIsLoading(true);
    setError('');

    const data = new FormData();
    data.append('file', file);
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    try {
      const res = await fetch('/api/board-exam/extract', {
        method: 'POST',
        body: data
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to extract data');
      }

      setSession(result.sessionId, result.metadata, result.subjects, result.students);
      router.push(`/board-exam/verify?session=${result.sessionId}`);
      
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload TU Marksheet</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Drag and Drop Zone */}
        <div 
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".pdf" 
            className="hidden" 
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-gray-600">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </div>
            <p className="text-xs text-gray-500">TU Marksheet PDF (Max 50MB)</p>
          </div>
          {file && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border shadow-sm text-sm font-medium text-gray-700">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Metadata Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Exam Year</label>
            <input type="text" name="examYear" value={formData.examYear} onChange={handleChange} placeholder="e.g. 2082" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Program</label>
            <select name="program" value={formData.program} onChange={handleChange} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="BBS">BBS</option>
              <option value="B.Ed">B.Ed</option>
              <option value="BITM">BITM</option>
              <option value="BIM">BIM</option>
              <option value="BHM">BHM</option>
              <option value="MBS">MBS</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Year/Part</label>
            <select name="part" value={formData.part} onChange={handleChange} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="First">First</option>
              <option value="Second">Second</option>
              <option value="Third">Third</option>
              <option value="Fourth">Fourth</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Enrollment Year (Batch)</label>
            <input type="text" name="enrollmentYear" value={formData.enrollmentYear} onChange={handleChange} placeholder="e.g. 2080" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Result Published Date</label>
            <input type="text" name="resultPublishedDate" value={formData.resultPublishedDate} onChange={handleChange} placeholder="e.g. 2082/05/06" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Exam Date Range</label>
            <input type="text" name="examDate" value={formData.examDate} onChange={handleChange} placeholder="e.g. 2082/02/06 to 14" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button 
            type="submit" 
            disabled={isLoading || !file}
            className={`px-6 py-2.5 rounded-md font-medium text-white transition-colors
              ${isLoading || !file ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting Data...
              </span>
            ) : 'Extract Data'}
          </button>
        </div>
      </form>
    </div>
  );
}
