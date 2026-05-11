import Link from 'next/link';

export default function BoardExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold text-sm transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Board Exam Management</h1>
        </div>
        <nav className="text-xs sm:text-sm text-gray-500 flex gap-2">
          <span>Upload</span>
          <span>→</span>
          <span>Verify Data</span>
          <span>→</span>
          <span className="font-bold text-blue-600">Download Outputs</span>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
