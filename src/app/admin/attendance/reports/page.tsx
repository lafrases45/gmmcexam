"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FileText, ChevronLeft, ChevronRight, Download, ClipboardList, X, Printer } from 'lucide-react';
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
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [printMode, setPrintMode] = useState<'none' | 'summary' | 'all-individuals' | 'single-individual'>('none');
  const [selectedFacultyForPrint, setSelectedFacultyForPrint] = useState<any | null>(null);

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
      const { data: tData } = await supabase.from('teacher_registry').select('id, full_name');
      const { data: sData } = await supabase.from('staff_registry').select('id, full_name');
      const combined = [
        ...(tData || []).map((f: any) => ({ ...f, type: 'Teacher' })),
        ...(sData || []).map((f: any) => ({ ...f, type: 'Staff' }))
      ];
      setFaculty(combined);

      // Calculate AD range for the selected BS month
      const startAd = adbs.bs2ad(`${selectedYear}/${selectedMonth}/1`);
      let lastDay = 32;
      let endAd = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${lastDay}`);
      while (endAd.year === 0 && lastDay > 28) {
        lastDay--;
        endAd = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${lastDay}`);
      }

      const start = new Date(startAd.year, startAd.month - 1, startAd.day, 0, 0, 0).toISOString();
      const end = new Date(endAd.year, endAd.month - 1, endAd.day, 23, 59, 59).toISOString();

      const { data: logData } = await supabase.from('attendance_logs')
        .select('user_id, check_time, zk_user_id')
        .gte('check_time', start)
        .lte('check_time', end);
      
      const enrichedLogs = (logData || []).map(log => {
        const d = new Date(log.check_time);
        const bs = adbs.ad2bs(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`);
        return {
          ...log,
          bsYear: bs.en.year,
          bsMonth: bs.en.month,
          bsDay: bs.en.day
        };
      });
      setLogs(enrichedLogs);

      const { data: mapData } = await supabase.from('attendance_users_map').select('*');
      setMappings(mapData || []);

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

  // Handle URL param for auto-printing faculty
  useEffect(() => {
    if (faculty.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const autoId = searchParams.get('id');
      if (autoId) {
        const found = faculty.find((f: any) => f.id === autoId);
        if (found) {
          setSelectedFacultyForPrint(found);
          setPrintMode('single-individual');
        }
      }
    }
  }, [faculty]);

  const getStatus = (facultyId: string, day: number) => {
    const mapping = mappings.find(m => m.teacher_id === facultyId || m.staff_id === facultyId);
    const zid = mapping?.zk_user_id;

    // 1. Check for logs FIRST (Present)
    const hasLog = logs.find((log: any) => {
      const logZid = log.zk_user_id ? String(log.zk_user_id) : null;
      const mappingZid = zid ? String(zid) : null;
      
      const idMatch = log.user_id === facultyId || (mappingZid && logZid === mappingZid);
      return idMatch && log.bsYear === selectedYear && log.bsMonth === selectedMonth && log.bsDay === day;
    });
    if (hasLog) return 'P';

    // 2. Check for Holiday
    const isHoliday = holidays.find((h: any) => h.bs_year === selectedYear && h.bs_month === selectedMonth && h.bs_day === day);
    if (isHoliday) return 'H';

    // 3. Check for Weekend
    try {
      const adDate = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${day}`);
      const dateObj = new Date(adDate.year, adDate.month - 1, adDate.day);
      if (dateObj.getDay() === 6 || dateObj.getDay() === 0) return 'S'; // Saturday & Sunday
    } catch (e) { return '-'; }

    // 4. Default to Absent
    return 'A';
  };

  return (
    <div className={`max-w-[100vw] overflow-x-hidden bg-slate-50 min-h-screen ${printMode !== 'none' ? '' : 'p-6'}`}>
      <div className="flex justify-between items-center mb-8 p-6 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <FileText size={20} />
            </div>
            Monthly Ledger
          </h1>
          <p className="text-slate-500 font-bold text-[10px] mt-0.5">Official Institutional Attendance Report</p>
        </div>

         <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 no-print">
          <button 
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(y => y - 1);
              } else {
                setSelectedMonth(m => m - 1);
              }
            }} 
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-all"
          >
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <div className="flex flex-col items-center min-w-[110px]">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSelectedYear(y => y - 1)} className="text-[9px] font-black text-slate-300 hover:text-blue-600">-</button>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{selectedYear} BS</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="text-[9px] font-black text-slate-300 hover:text-blue-600">+</button>
            </div>
            <span className="text-sm font-black text-slate-800">{NEPALI_MONTHS[selectedMonth - 1]}</span>
          </div>
          <button 
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(y => y + 1);
              } else {
                setSelectedMonth(m => m + 1);
              }
            }} 
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-all"
          >
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPrintMode('summary'); setTimeout(() => window.print(), 100); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Printer size={14} />
            Print Summary
          </button>
          <button
            onClick={() => { setPrintMode('all-individuals'); setTimeout(() => window.print(), 100); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Printer size={14} />
            Print All Individuals
          </button>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className={`bg-white shadow-xl shadow-slate-200/50 border border-white overflow-hidden matrix-container ${printMode === 'none' ? 'rounded-3xl' : ''}`}>
        <div className="hidden print:block text-center mb-6 border-b-2 border-slate-900 pb-3">
          <h2 className="text-sm font-bold tracking-[0.2em] text-slate-600 uppercase mb-1">Gupteshowor Mahadev Multiple Campus</h2>
          <p className="text-[10px] font-black uppercase mb-3">Pokhara 17, Chhorepatan, Nepal</p>
          <h1 className="text-xl font-black uppercase border-y border-slate-900 py-1.5 inline-block px-8">Staff Monthly Attendance Ledger</h1>
          <div className="flex justify-between mt-4 text-[10px] font-black uppercase">
            <span>Fiscal Year: {selectedYear} BS</span>
            <span>Reporting Month: {NEPALI_MONTHS[selectedMonth-1]}</span>
            <span>Printed: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse print:text-[7px]">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 min-w-[180px]">Faculty Member</th>
                {monthDays.map((d: number) => (
                  <th key={d} className="px-1 py-3 text-center text-[9px] font-black text-slate-400 border-r border-slate-100 min-w-[30px]">
                    {d.toString().padStart(2, '0')}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/30">Total</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 no-print">Indiv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={monthDays.length + 2} className="px-6 py-20 text-center text-slate-400 italic">Syncing with official calendar...</td></tr>
              ) : faculty.map((f: any) => {
                let presentCount = 0;
                return (
                  <tr key={f.id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-4 py-2.5 whitespace-nowrap font-black text-[10px] text-slate-800 border-r border-slate-100 transition-all">
                      {f.full_name}
                    </td>
                    {monthDays.map((d: number) => {
                      const status = getStatus(f.id, d);
                      if (status === 'P') presentCount++;
                      return (
                        <td key={d} className={`px-0.5 py-2.5 text-center text-[9px] font-black border-r border-slate-50/50 ${
                          status === 'P' ? 'text-emerald-500 bg-emerald-50/5' : 
                          status === 'A' ? 'text-rose-400 bg-rose-50/10' : 
                          status === 'H' ? 'text-amber-500 bg-amber-50/10' : 
                          status === 'S' ? 'text-slate-300 bg-slate-50/50' : 'text-slate-100'
                        }`}>
                          {status}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center font-black text-[10px] text-blue-600 bg-blue-50/30">
                      {presentCount}
                    </td>
                    <td className="px-4 py-2 text-center no-print">
                      <button 
                        onClick={() => { 
                          setSelectedFacultyForPrint(f);
                          setPrintMode('single-individual');
                          setTimeout(() => window.print(), 100);
                        }} 
                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-all"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="hidden print:flex justify-between mt-20 px-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-900 pt-2 font-black uppercase text-xs">Prepared By</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-900 pt-2 font-black uppercase text-xs">Verified By</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-900 pt-2 font-black uppercase text-xs">Campus Chief / Authorized</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-8 px-4 no-print">
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Present (P)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-rose-500 rounded-lg shadow-lg shadow-rose-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Absent (A)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-amber-500 rounded-lg shadow-lg shadow-amber-100"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Holiday (H)</span></div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-slate-300 rounded-lg"></div><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Weekend (S)</span></div>
      </div>

      {(printMode === 'all-individuals' || printMode === 'single-individual') && (
        <div className="hidden print:block text-slate-900">
          {(printMode === 'all-individuals' ? faculty : [selectedFacultyForPrint]).map((f: any, fIdx: number) => {
            if (!f) return null;
            let totalMinutes = 0;
            return (
              <div key={f.id} className={`${fIdx > 0 ? 'page-break-before-always' : ''} pt-2 max-h-[287mm] overflow-hidden`}>
                <div className="text-center mb-3">
                  <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase mb-0.5">Gupteshowor Mahadev Multiple Campus</h2>
                  <p className="text-[8px] font-black uppercase mb-2">Pokhara 17, Chhorepatan, Nepal</p>
                  <h1 className="text-sm font-black uppercase border-y border-slate-900 py-0.5 inline-block px-8">Monthly Attendance Ledger</h1>
                </div>

                <div className="flex justify-between items-end mb-2 px-2">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase">Month : <span className="ml-2 font-black">{NEPALI_MONTHS[selectedMonth-1]} {selectedYear}</span></p>
                    <p className="text-[9px] font-bold uppercase">Staff Name : <span className="ml-2 font-black">{f.full_name} [{mappings.find(m => m.teacher_id === f.id || m.staff_id === f.id)?.zk_user_id || 'N/A'}]</span></p>
                  </div>
                  
                  <table className="w-[35%] text-[7px] border-collapse border border-slate-900">
                    <thead className="bg-slate-50">
                      <tr className="text-center font-black uppercase">
                        <th className="border border-slate-900 p-0.5">Work</th>
                        <th className="border border-slate-900 p-0.5">S/H</th>
                        <th className="border border-slate-900 p-0.5">Pres</th>
                        <th className="border border-slate-900 p-0.5">Abs</th>
                      </tr>
                    </thead>
                    <tbody className="font-black text-center">
                      <tr>
                        <td className="border border-slate-900 p-1">
                          {monthDays.length - monthDays.filter(d => {
                            const ad = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${d}`);
                            const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                            return dateObj.getDay() === 6 || dateObj.getDay() === 0;
                          }).length}
                        </td>
                        <td className="border border-slate-900 p-1">{monthDays.filter(d => {
                            const ad = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${d}`);
                            const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                            return dateObj.getDay() === 6 || dateObj.getDay() === 0;
                          }).length}</td>
                        <td className="border border-slate-900 p-1">{monthDays.filter(d => getStatus(f.id, d) === 'P').length}</td>
                        <td className="border border-slate-900 p-1">{monthDays.filter(d => getStatus(f.id, d) === 'A').length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <table className="w-full text-[8px] border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-50 font-black text-center uppercase">
                      <th className="p-0.5 border border-slate-900 w-5">SN</th>
                      <th className="p-0.5 border border-slate-900 w-14">Date</th>
                      <th className="p-0.5 border border-slate-900 w-20">Day</th>
                      <th className="p-0.5 border border-slate-900">Time In</th>
                      <th className="p-0.5 border border-slate-900">Time Out</th>
                      <th className="p-0.5 border border-slate-900 w-12">Hrs</th>
                      <th className="p-0.5 border border-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDays.map((day: number, idx: number) => {
                      const ad = adbs.bs2ad(`${selectedYear}/${selectedMonth}/${day}`);
                      const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      
                      const mapping = mappings.find(m => m.teacher_id === f.id || m.staff_id === f.id);
                      const zid = mapping?.zk_user_id;
                      const userLogs = logs.filter((log: any) => {
                        const logZid = log.zk_user_id ? String(log.zk_user_id) : null;
                        const mappingZid = zid ? String(zid) : null;
                        
                        const idMatch = log.user_id === f.id || (mappingZid && logZid === mappingZid);
                        return idMatch && log.bsYear === selectedYear && log.bsMonth === selectedMonth && log.bsDay === day;
                      }).sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime());

                      const timeIn = userLogs.length > 0 ? new Date(userLogs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                      const timeOut = userLogs.length >= 2 ? new Date(userLogs[userLogs.length-1].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                      
                      let workedMs = 0;
                      if (userLogs.length >= 2) workedMs = new Date(userLogs[userLogs.length-1].check_time).getTime() - new Date(userLogs[0].check_time).getTime();
                      const workedHrs = workedMs > 0 ? Math.floor(workedMs / 3600000) : 0;
                      const workedMins = workedMs > 0 ? Math.floor((workedMs % 3600000) / 60000) : 0;
                      if (workedMs > 0) totalMinutes += (workedHrs * 60) + workedMins;

                      const status = getStatus(f.id, day);
                      const statusMap: Record<string, string> = { 'P': 'Present', 'A': 'Absent', 'H': 'Holiday', 'S': 'Weekend' }; 

                      return (
                        <tr key={day} className="text-center h-5">
                          <td className="p-0.5 border border-slate-900">{idx + 1}</td>
                          <td className="p-0.5 border border-slate-900">{day}/{selectedMonth}/{selectedYear}</td>
                          <td className="p-0.5 border border-slate-900 text-left pl-1">{dayName}</td>
                          <td className="p-0.5 border border-slate-900">{timeIn}</td>
                          <td className="p-0.5 border border-slate-900">{timeOut}</td>
                          <td className="p-0.5 border border-slate-900 font-bold">{workedMs > 0 ? `${workedHrs}:${workedMins.toString().padStart(2, '0')}` : '-'}</td>
                          <td className="p-0.5 border border-slate-900 uppercase font-bold text-[7px]">{statusMap[status] || status}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-black text-center uppercase">
                      <td colSpan={5} className="p-1 border border-slate-900 text-right pr-4">Total Monthly Hours</td>
                      <td className="p-1 border border-slate-900">{Math.floor(totalMinutes / 60)}:{(totalMinutes % 60).toString().padStart(2, '0')}</td>
                      <td className="p-1 border border-slate-900"></td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 flex justify-between px-10 no-print-section">
                  <div className="text-center"><div className="w-28 border-t-2 border-slate-900 pt-0.5 font-black uppercase text-[7px]">Prepared By</div></div>
                  <div className="text-center"><div className="w-28 border-t-2 border-slate-900 pt-0.5 font-black uppercase text-[7px]">Checked By</div></div>
                  <div className="text-center"><div className="w-28 border-t-2 border-slate-900 pt-0.5 font-black uppercase text-[7px]">Authorized</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { 
            size: ${printMode === 'summary' ? 'A4 landscape' : 'A4 portrait'}; 
            margin: 5mm; 
          }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .page-break-before-always { page-break-before: always !important; }
          
          ${printMode === 'summary' ? `
            .matrix-container { 
              display: block !important; 
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              box-shadow: none !important; 
              border: none !important; 
              padding: 0 !important;
              margin: 0 !important;
            }
          ` : `
            .matrix-container { display: none !important; }
          `}

          /* Force hide all possible UI elements */
          nav, aside, header, footer, .sidebar, .navbar, .top-nav, button:not(.print-only) { display: none !important; }
          
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
