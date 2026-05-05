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

  const metadata = useBoardExamStore(state => state.metadata);
  const fileNameBase = metadata 
    ? `${metadata.program}_${metadata.part}_Year_${metadata.examYear}`.replace(/\s+/g, '_')
    : '';

  const excelUrl = `/api/board-exam/download?session=${sessionId}&type=excel&name=${fileNameBase}`;
  const ledgerPdfUrl = `/api/board-exam/download?session=${sessionId}&type=ledger-pdf&name=${fileNameBase}`;
  const reportPdfUrl = `/api/board-exam/download?session=${sessionId}&type=report-pdf&name=${fileNameBase}`;

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
          <a href={excelUrl} download className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download .xlsx
          </a>
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
          <a href={ledgerPdfUrl} download className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </a>
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
          <a href={reportPdfUrl} download className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition inline-flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Report
          </a>
        </div>
      </div>

      {/* Optional Preview Pane */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col" style={{ height: '600px' }}>
        <div className="bg-gray-50 border-b px-4 py-3 font-medium text-sm text-gray-700 flex justify-between items-center">
          <span>Report Preview</span>
          <a href={reportPdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
        </div>
        <iframe src={reportPdfUrl} className="w-full flex-1 bg-gray-100" title="Report PDF Preview" />
      </div>
    </div>
  );
}
