"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useBoardExamStore } from '@/lib/boardExamStore';
import { useEffect, useState } from 'react';

export default function OutputPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const router = useRouter();
  const clearSession = useBoardExamStore(state => state.clearSession);

  // Fallback state logic to prevent flash on invalid session
  const [isValid, setIsValid] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const students = useBoardExamStore(state => state.students);
  const subjects = useBoardExamStore(state => state.subjects);
  const metadata = useBoardExamStore(state => state.metadata);

  useEffect(() => {
    if (!sessionId) {
      setIsValid(false);
    }
  }, [sessionId]);

  if (!isValid) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Invalid Session</h2>
        <button onClick={() => router.push('/board-exam/upload')} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Start New Exam
        </button>
      </div>
    );
  }

  const fileNameBase = metadata 
    ? `${metadata.program}_${metadata.part}_Year_${metadata.examYear}`.replace(/\s+/g, '_')
    : '';

  const handleDownload = async (type: string, filename: string) => {
    try {
      setDownloading(type);
      const response = await fetch('/api/board-exam/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData: { metadata, subjects, students },
          type,
          customName: filename
        })
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename + (type === 'excel' ? '.xlsx' : '.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleStartNew = () => {
    clearSession();
    router.push('/board-exam/upload');
  };

  return (
    <div className="space-y-8">
      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-green-900">Files Generated Successfully</h2>
            <p className="text-sm text-green-700">Your mark ledgers and result report are ready for download.</p>
          </div>
        </div>
        <button onClick={handleStartNew} className="px-5 py-2.5 bg-white border border-green-200 text-green-800 font-medium rounded-lg hover:bg-green-50 transition shadow-sm">
          Start New Exam
        </button>
      </div>

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Excel Ledger */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center text-center hover:shadow-md transition">
          <div className="w-16 h-16 mb-4 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Mark Ledger (Excel)</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Formatted mark ledger with all student data, colors, and styling.</p>
          <button 
            onClick={() => handleDownload('excel', fileNameBase)} 
            disabled={!!downloading}
            className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading === 'excel' ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            Download .xlsx
          </button>
        </div>

        {/* Card 2: PDF Ledger */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center text-center hover:shadow-md transition">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Mark Ledger (PDF)</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Printable mark ledger in landscape PDF format (A3 size recommended).</p>
          <button 
            onClick={() => handleDownload('ledger-pdf', fileNameBase + '_Mark_Ledger')} 
            disabled={!!downloading}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading === 'ledger-pdf' ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            Download PDF
          </button>
        </div>

        {/* Card 3: Report PDF */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center text-center hover:shadow-md transition">
          <div className="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Result Report (PDF)</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Official result summary report with statistics and best students (A4 size).</p>
          <button 
            onClick={() => handleDownload('report-pdf', fileNameBase + '_Result_Report')} 
            disabled={!!downloading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading === 'report-pdf' ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            Download Report
          </button>
        </div>
      </div>

      {/* Preview removed for production compatibility */}
    </div>
  );
}
