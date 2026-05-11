'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addScholarship } from '@/lib/actions/scholarship-actions';
import { toast } from '@/lib/store/useToastStore';
import { Search, UserPlus, Trash2, Database, GraduationCap, Edit, History, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ScholarshipManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState('2081/082');

  const [formData, setFormData] = useState({
    student_id: '',
    percentage: 100,
    is_waiver: false,
    amount: 0,
    remarks: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchRecords();
  }, [fiscalYear]);

  const fetchRecords = async () => {
    setRecordsLoading(true);
    const { data, error } = await supabase
      .from('scholarships')
      .select(`
        id,
        amount,
        percentage,
        is_waiver,
        fiscal_year,
        admission_students (
          name,
          roll_no,
          admission_batches (name)
        )
      `)
      .eq('fiscal_year', fiscalYear)
      .order('created_at', { ascending: false });
    
    if (data) setRecords(data);
    setRecordsLoading(false);
  };

  const searchStudents = async () => {
    if (search.length < 2) return;
    setLoading(true);
    const { data } = await supabase
      .from('admission_students')
      .select('id, name, roll_no, admission_batches(name)')
      .or(`name.ilike.%${search}%,roll_no.ilike.%${search}%`)
      .limit(10);
    setStudents(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) return toast.error('Please select a student');
    
    try {
      await addScholarship({
        ...formData,
        fiscal_year: fiscalYear,
        percentage: formData.is_waiver ? undefined : Number(formData.percentage)
      });
      toast.success('Record saved successfully');
      setFormData({ ...formData, student_id: '', amount: 0, remarks: '' });
      setSearch('');
      setStudents([]);
      fetchRecords();
    } catch (error) {
      toast.error('Failed to save record');
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const { error } = await supabase.from('scholarships').delete().eq('id', id);
    if (!error) {
      toast.success('Record deleted');
      fetchRecords();
    } else {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            Scholarship Record Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage student financial aid, percentages, and budget allocations.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
          <Calendar size={18} className="text-slate-400 ml-2" />
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="bg-transparent font-bold text-slate-700 outline-none pr-4"
          >
            <option value="2081/082">B.S. 2081/082</option>
            <option value="2080/081">B.S. 2080/081</option>
            <option value="2079/080">B.S. 2079/080</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
              <UserPlus size={18} className="text-blue-600" /> 
              Add Scholarship Record
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Search Student</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (e.target.value.length >= 2) searchStudents();
                      else setStudents([]);
                    }}
                    placeholder="Type name or roll number..."
                    className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                  />
                  {loading && <div className="absolute right-4 top-3.5 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />}
                </div>
                
                {students.length > 0 && (
                  <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden divide-y bg-slate-50 max-h-48 overflow-y-auto shadow-inner">
                    {students.map(s => (
                      <button 
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, student_id: s.id });
                          setSearch(`${s.name} (${s.roll_no})`);
                          setStudents([]);
                        }}
                        className={`w-full text-left p-3 text-sm hover:bg-white transition-colors ${formData.student_id === s.id ? 'bg-white border-l-4 border-blue-600' : ''}`}
                      >
                        <div className="font-bold text-slate-700">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.roll_no} • {s.admission_batches?.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Type</label>
                  <select 
                    value={formData.is_waiver ? 'waiver' : 'percentage'}
                    onChange={(e) => setFormData({ ...formData, is_waiver: e.target.value === 'waiver' })}
                    className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="waiver">Waiver</option>
                  </select>
                </div>
                {!formData.is_waiver && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Grant %</label>
                    <select 
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
                      className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      {[100, 75, 50, 25].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Amount (NPR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">Rs.</span>
                  <input 
                    type="number" 
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                <Database size={18} /> Save Record
              </button>
            </form>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <History size={18} className="text-blue-400" /> Quick Stats
            </h3>
            <p className="text-slate-400 text-xs mb-6">Real-time summary for {fiscalYear}</p>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-sm">Total Records</span>
                <span className="font-bold">{records.length}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-sm">Budget Utilized</span>
                <span className="font-bold text-blue-400">Rs. {records.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}</span>
              </div>
            </div>
            <Link href="/admin/reports/scholarships" className="mt-8 block w-full bg-white/10 text-center py-3 rounded-xl text-sm font-bold hover:bg-white/20 transition-all">
              Generate Official Report →
            </Link>
          </div>
        </div>

        {/* Right Column: List (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Recent Records</h2>
            <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
              Live Feed
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="px-6 py-4">Student & Program</th>
                  <th className="px-6 py-4">Benefit</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {recordsLoading ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-400">Loading records...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">No records found for this fiscal year.</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{r.admission_students?.name}</div>
                        <div className="text-xs text-slate-500">{r.admission_students?.roll_no} • {r.admission_students?.admission_batches?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${r.is_waiver ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                          {r.is_waiver ? 'Waiver' : `${r.percentage}% Grant`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-700">
                        Rs. {Number(r.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteRecord(r.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
