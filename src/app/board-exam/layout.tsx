export default function BoardExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Board Exam Management</h1>
        <nav className="text-sm text-gray-500 flex gap-2">
          <span>Upload</span>
          <span>→</span>
          <span>Verify Data</span>
          <span>→</span>
          <span>Download Outputs</span>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
