"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useBoardExamStore } from '@/lib/boardExamStore';

export default function BoardExamsAdmin() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const { setSession } = useBoardExamStore();

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    setLoading(true);
    const { data, error } = await supabase
      .from('board_exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setExams(data || []);
    setLoading(false);
  }

  async function deleteExam(id: string) {
    if (!confirm("Are you sure you want to delete this exam record? This cannot be undone.")) return;

    const { error } = await supabase
      .from('board_exams')
      .delete()
      .eq('id', id);

    if (error) alert("Error deleting: " + error.message);
    else fetchExams();
  }

  const handleEdit = (exam: any) => {
    // Set the store state
    setSession(exam.id, exam.metadata, exam.subjects, exam.students);
    // Redirect to verify page with the ID
    router.push(`/board-exam/verify?session=${exam.id}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Exam Management System</h1>
          <p className="text-blue-600 font-bold mt-1 text-lg">Board Exam Management System</p>
        </div>
        <Link href="/board-exam/upload" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg hover:-translate-y-0.5 active:translate-y-0">
          + Add Board Exam
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading records...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
          <p className="text-gray-500 text-lg">No board exam records found.</p>
          <Link href="/board-exam/upload" className="text-blue-600 font-medium hover:underline mt-2 inline-block">
            Upload your first PDF to get started
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 font-bold text-gray-700">Exam Details</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-center">Students</th>
                <th className="px-6 py-4 font-bold text-gray-700">Status</th>
                <th className="px-6 py-4 font-bold text-gray-700">Date Saved</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{exam.metadata.program} - {exam.metadata.part} Year</div>
                    <div className="text-xs text-gray-500">Exam Year: {exam.metadata.examYear} | Batch: {exam.metadata.enrollmentYear}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold border border-blue-100">
                      {exam.students.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${exam.status === 'Final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(exam.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => handleEdit(exam)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                    >
                      Edit / View
                    </button>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
