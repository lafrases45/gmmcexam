"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, Trash2, ShieldAlert } from 'lucide-react';
// @ts-ignore
import adbs from 'ad-bs-converter';

const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export default function HolidaySetupPage() {
  const supabase = createClient();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [bsYear, setBsYear] = useState(2081);
  const [bsMonth, setBsMonth] = useState(1);
  const [bsDay, setBsDay] = useState(1);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
    setHolidays(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSaveHoliday = async () => {
    try {
      const adDate = adbs.bs2ad(`${bsYear}/${bsMonth}/${bsDay}`);
      const adString = `${adDate.year}-${adDate.month.toString().padStart(2, '0')}-${adDate.day.toString().padStart(2, '0')}`;

      const payload = {
        title,
        holiday_date: adString,
        bs_year: bsYear,
        bs_month: bsMonth,
        bs_day: bsDay
      };

      if (editingHoliday) {
        const { error } = await supabase.from('holidays').update(payload).eq('id', editingHoliday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('holidays').insert(payload);
        if (error) throw error;
      }
      
      setShowAddModal(false);
      setEditingHoliday(null);
      setTitle('');
      fetchHolidays();
    } catch (e: any) {
      alert('Error saving holiday: ' + e.message);
    }
  };

  const openEditModal = (h: any) => {
    setEditingHoliday(h);
    setTitle(h.title);
    setBsYear(h.bs_year);
    setBsMonth(h.bs_month);
    setBsDay(h.bs_day);
    setShowAddModal(true);
  };

  const closeAndReset = () => {
    setShowAddModal(false);
    setEditingHoliday(null);
    setTitle('');
    // Optionally reset date to default or keep current
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    await supabase.from('holidays').delete().eq('id', id);
    fetchHolidays();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-rose-600" />
            Institutional Holiday Setup
          </h1>
          <p className="text-gray-500">Define holidays for the Nepali Fiscal Year</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
        >
          <Plus size={20} />
          Add Holiday
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Holiday Title</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nepali Date (BS)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">English Date (AD)</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading holidays...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No holidays defined yet.</td></tr>
            ) : holidays.map((h: any) => (
              <tr key={h.id} className="hover:bg-rose-50/30 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">{h.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {h.bs_day} {NEPALI_MONTHS[h.bs_month - 1]}, {h.bs_year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{h.holiday_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                  <button onClick={() => openEditModal(h)} className="text-slate-400 hover:text-indigo-600 p-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Calendar size={18} />
                  </button>
                  <button onClick={() => deleteHoliday(h.id)} className="text-rose-400 hover:text-rose-600 p-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-white">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="text-rose-600" />
              {editingHoliday ? 'Edit Holiday' : 'Add Institutional Holiday'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Holiday Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Dashain Festival"
                  className="w-full bg-slate-50 border-slate-100 border-2 p-4 rounded-2xl focus:border-rose-500 focus:bg-white outline-none transition-all font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Year</label>
                  <input type="number" className="w-full bg-slate-50 border-slate-100 border-2 p-4 rounded-2xl outline-none font-bold" value={bsYear} onChange={e => setBsYear(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Month</label>
                  <select className="w-full bg-slate-50 border-slate-100 border-2 p-4 rounded-2xl outline-none font-bold" value={bsMonth} onChange={e => setBsMonth(parseInt(e.target.value))}>
                    {NEPALI_MONTHS.map((m: string, i: number) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Day</label>
                  <input type="number" className="w-full bg-slate-50 border-slate-100 border-2 p-4 rounded-2xl outline-none font-bold" value={bsDay} onChange={e => setBsDay(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-50"
                  onClick={handleSaveHoliday}
                  disabled={!title}
                >
                  {editingHoliday ? 'Update' : 'Save'} Holiday
                </button>
                <button className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all" onClick={closeAndReset}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
