"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download } from 'lucide-react';
// @ts-ignore
import adbs from 'ad-bs-converter';

const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export default function AttendanceReportPage() {
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState(2081);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthDays, setMonthDays] = useState<number[]>([]);

  useEffect(() => {
    const today = new Date();
    const bsToday = adbs.ad2bs(`${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`);
    setSelectedYear(bsToday.en.year);
    setSelectedMonth(bsToday.en.month);
  }, []);

  // Calculate days in the current month using "Official" ad-bs-converter mapping
  useEffect(() => {
    const days: number[] = [];
    for (let d = 1; d <= 32; d++) {
      try {
        const ad = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${d}`);
        if (ad) days.push(d);
      } catch (e) {
        break; // Stop when date is invalid
      }
    }
    setMonthDays(days);
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: facultyData } = await supabase.from('teacher_registry').select('id, full_name');
      setFaculty(facultyData || []);

      const { data: logData } = await supabase.from('attendance_logs').select('user_id, check_time');
      setLogs(logData || []);

      const { data: holidayData } = await supabase.from('holidays').select('*');
      setHolidays(holidayData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const getStatus = (facultyId: string, day: number) => {
    const isHoliday = holidays.find(h => h.bs_year === selectedYear && h.bs_month === selectedMonth && h.bs_day === day);
    if (isHoliday) return 'H';

    try {
      const adDate = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${day}`);
      const dateObj = new Date(adDate.year, adDate.month - 1, adDate.day);
      if (dateObj.getDay() === 6 || dateObj.getDay() === 0) return 'S'; // Saturday & Sunday
    } catch (e) { return '-'; }

    const hasLog = logs.find(log => {
      if (log.user_id !== facultyId) return false;
      const logDate = new Date(log.check_time);
      const bsLog = adbs.ad2bs(`${logDate.getFullYear()}/${logDate.getMonth() + 1}/${logDate.getDate()}`);
      return bsLog.en.year === selectedYear && bsLog.en.month === selectedMonth && bsLog.en.day === day;
    });

    if (hasLog) return 'P';
    
    const today = new Date();
    try {
      const adDateForDay = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${day}`);
      const checkDate = new Date(adDateForDay.year, adDateForDay.month - 1, adDateForDay.day);
      if (checkDate < today) return 'A';
    } catch(e) {}

    return '-';
  };

  return (
    <div className="p-6 max-w-[100vw] overflow-x-hidden bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={24} />
            </div>
            Monthly Ledger
          </h1>
          <p className="text-slate-500 font-medium mt-1">Official Institutional Attendance Report</p>
        </div>

        <div className="flex items-center gap-6 bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100">
          <button onClick={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div className="flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedYear} BS</span>
            <span className="text-lg font-black text-slate-800">{NEPALI_MONTHS[selectedMonth - 1]}</span>
          </div>
          <button onClick={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          <Download size={18} />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="sticky left-0 bg-slate-50 z-20 px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 min-w-[240px]">Faculty Member</th>
                {monthDays.map(d => (
                  <th key={d} className="px-2 py-5 text-center text-[10px] font-black text-slate-400 border-r border-slate-100 min-w-[40px]">
                    {d.toString().padStart(2, '0')}
                  </th>
                ))}
                <th className="px-6 py-5 text-center text-[11px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/30">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={monthDays.length + 2} className="px-6 py-20 text-center text-slate-400 italic">Syncing with official calendar...</td></tr>
              ) : faculty.map((f) => {
                let presentCount = 0;
                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-8 py-4 whitespace-nowrap font-black text-slate-800 border-r border-slate-100 transition-all">
                      {f.full_name}
                    </td>
                    {monthDays.map(d => {
                      const status = getStatus(f.id, d);
                      if (status === 'P') presentCount++;
                      return (
                        <td key={d} className={`px-1 py-4 text-center text-xs font-black border-r border-slate-50/50 ${
                          status === 'P' ? 'text-emerald-500 bg-emerald-50/10' : 
                          status === 'A' ? 'text-rose-500 bg-rose-50/20' : 
                          status === 'H' ? 'text-amber-500 bg-amber-50/20' : 
                          status === 'S' ? 'text-slate-400 bg-slate-100/50' : 'text-slate-100'
                        }`}>
                          {status}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center font-black text-blue-600 bg-blue-50/30">
                      {presentCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-8 px-4">
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Present (P)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-rose-500 rounded-lg shadow-lg shadow-rose-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Absent (A)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-amber-500 rounded-lg shadow-lg shadow-amber-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Holiday (H)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-slate-300 rounded-lg"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Weekend (S)</span></div>
      </div>
    </div>
  );
}
