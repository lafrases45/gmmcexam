"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Download, ArrowLeft, Calendar, Printer, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
// @ts-ignore
import adbs from 'ad-bs-converter';

interface MonthlyStats {
  zk_user_id: string;
  full_name: string;
  designation: string;
  office_time: string;
  open_days: number;
  leave_days: number;
  present_days: number;
  daily_req_hrs: number;
  monthly_req_hrs: number;
  worked_hrs: number;
  overtime_hrs: number;
  shortage_hrs: number;
  incomplete_days: number;
  remarks: string;
}

interface UserMap {
  zk_user_id: string;
  full_name: string;
  staff_id: string | null;
  teacher_id: string | null;
  designation_nepali?: string;
  individual_office_time?: string;
}

export default function MonthlyAttendanceReport() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [bsYear, setBsYear] = useState(2081);
  const [bsMonth, setBsMonth] = useState(1);
  const [userMaps, setUserMaps] = useState<UserMap[]>([]);
  const [unmappedIds, setUnmappedIds] = useState<string[]>([]);
  const [manualData, setManualData] = useState<Record<string, {leave: number, remarks: string}>>({});
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [currentHolidays, setCurrentHolidays] = useState<string[]>([]);
  const [monthSummary, setMonthSummary] = useState({ total: 0, weekends: 0, holidays: 0, open: 0 });
  const [allUserLogs, setAllUserLogs] = useState<Record<string, any[]>>({});
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [selectedUserForDaily, setSelectedUserForDaily] = useState<MonthlyStats | null>(null);

  const calculateDailyHours = (timeStr: string) => {
    try {
      const cleanStr = timeStr.toLowerCase().replace(/\s+/g, ' ');
      let parts: string[] = [];
      
      if (cleanStr.includes(' to ')) parts = cleanStr.split(' to ');
      else if (cleanStr.includes('-')) parts = cleanStr.split('-');
      else return 7;
      
      if (parts.length !== 2) return 7;

      const parseTime = (t: string, isEnd: boolean) => {
        t = t.trim();
        let [hrs, mins] = t.split(':').map(val => parseInt(val));
        if (isNaN(hrs)) hrs = parseInt(t);
        if (isNaN(hrs)) return null;
        if (isNaN(mins)) mins = 0;
        
        const hasAm = t.includes('am');
        const hasPm = t.includes('pm');

        if (hasPm && hrs < 12) hrs += 12;
        else if (hasAm && hrs === 12) hrs = 0;
        else if (!hasAm && !hasPm) {
          // Heuristic: 
          // If it's the end time and hrs is 1-7, it's definitely PM (13-19)
          // If it's the start time and hrs is 6-11, it's likely AM
          // If it's the start time and hrs is 1-5, it's likely PM (e.g. afternoon shift)
          if (isEnd && hrs >= 1 && hrs <= 11) hrs += 12;
          else if (!isEnd && hrs >= 1 && hrs <= 5) hrs += 12;
        }
        
        return hrs + (mins / 60);
      };

      const start = parseTime(parts[0], false);
      const end = parseTime(parts[1], true);

      if (start === null || end === null) return 7;
      
      let diff = end - start;
      if (diff <= 0) diff += 24; 
      
      // If result is still 23 (e.g. 6am to 5am), and they probably meant 6am to 5pm
      if (diff > 14) diff -= 12; 

      return Math.round(diff * 10) / 10;
    } catch {
      return 7;
    }
  };

  // Setup current BS date on load
  useEffect(() => {
    const today = new Date();
    const bsToday = adbs.ad2bs(`${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`);
    setBsYear(bsToday.en.year);
    setBsMonth(bsToday.en.month);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startAd = adbs.bs2ad(`${bsYear}/${bsMonth}/1`);
      // Find actual last day of Nepali month
      let lastDay = 32;
      let endAd = adbs.bs2ad(`${bsYear}/${bsMonth}/${lastDay}`);
      while (endAd.year === 0 && lastDay > 28) {
        lastDay--;
        endAd = adbs.bs2ad(`${bsYear}/${bsMonth}/${lastDay}`);
      }
      
      const start = new Date(startAd.year, startAd.month - 1, startAd.day, 0, 0, 0).toISOString();
      const end = new Date(endAd.year, endAd.month - 1, endAd.day, 23, 59, 59).toISOString();

      const { data: logData } = await supabase.from('attendance_logs').select('*').gte('check_time', start).lte('check_time', end);
      const { data: mapData } = await supabase.from('attendance_users_map').select('*');
      const { data: holidayData } = await supabase.from('holidays').select('*');
      
      // Normalize holidays to YYYY-MM-DD for reliable matching
      const holidayDates = new Set(holidayData?.map((h: any) => {
        const d = new Date(h.holiday_date);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }) || []);
      
      // Filter holidays for THIS selected month
      const thisMonthHolidays = holidayData?.filter((h: any) => {
        const hDate = new Date(h.holiday_date);
        return hDate >= new Date(start) && hDate <= new Date(end);
      }).map((h: any) => h.title) || [];
      setCurrentHolidays(thisMonthHolidays);

      setUserMaps(mapData || []);
      
      if (logData && mapData) {
        const mappedIds = new Set(mapData.map((m: any) => m.zk_user_id));
        const allIds = new Set(logData.map((l: any) => l.zk_user_id));
        const unmapped = Array.from(allIds)
          .filter((id: any) => !mappedIds.has(id))
          .sort((a: any, b: any) => parseInt(a) - parseInt(b)) as string[];
        setUnmappedIds(unmapped);
      }

      // Sort mapped users by ID
      const sortedMapData = (mapData || []).sort((a: any, b: any) => parseInt(a.zk_user_id) - parseInt(b.zk_user_id));
      setUserMaps(sortedMapData);

      // 3. Process Data
      const userLogs: Record<string, any[]> = {};
      logData?.forEach((log: any) => {
        if (!userLogs[log.zk_user_id]) userLogs[log.zk_user_id] = [];
        userLogs[log.zk_user_id].push(log);
      });

      const processedStats: MonthlyStats[] = sortedMapData.map((map: any) => {
        const logs = userLogs[map.zk_user_id] || [];
        const daysWithLogs: Record<string, any[]> = {};
        logs.forEach((l: any) => {
          const d = new Date(l.check_time).toDateString();
          if (!daysWithLogs[d]) daysWithLogs[d] = [];
          daysWithLogs[d].push(l);
        });

        let totalWorkedMs = 0;
        let incompleteCount = 0;
        Object.values(daysWithLogs).forEach((dayLogs: any) => {
          if (dayLogs.length < 2) {
            incompleteCount++;
          } else {
            const sorted = dayLogs.sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime());
            const first = new Date(sorted[0].check_time);
            const last = new Date(sorted[sorted.length - 1].check_time);
            totalWorkedMs += (last.getTime() - first.getTime());
          }
        });

        // Dynamic Open Days Calculation
        let openDays = 0;
        for (let d = 1; d <= lastDay; d++) {
          const ad = adbs.bs2ad(`${bsYear}/${bsMonth}/${d}`);
          const dateObj = new Date(ad.year, ad.month - 1, ad.day);
          const adString = `${ad.year}-${ad.month.toString().padStart(2, '0')}-${ad.day.toString().padStart(2, '0')}`;
          
          const isSaturday = dateObj.getDay() === 6;
          const isSunday = dateObj.getDay() === 0;
          const isHoliday = holidayDates.has(adString);
          
          const isWeekend = bsYear >= 2083 ? (isSaturday || isSunday) : isSaturday;
          
          if (!isWeekend && !isHoliday) {
            openDays++;
          }
        }

        const workedHrs = Math.round((totalWorkedMs / 3600000) * 10) / 10;
        const officeTime = map.individual_office_time || '10:00 - 5:00';
        const dailyTarget = calculateDailyHours(officeTime);
        const monthlyReq = openDays * dailyTarget;

        // Check if any worked days were actually weekends or holidays
        let offDayWorkCount = 0;
        Object.keys(daysWithLogs).forEach((dateStr: string) => {
          const dateObj = new Date(dateStr);
          const bsDate = adbs.ad2bs(`${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`);
          const isSat = dateObj.getDay() === 6;
          const isSun = dateObj.getDay() === 0;
          const adStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
          const isWeekend = bsDate.en.year >= 2083 ? (isSat || isSun) : isSat;
          const isHoliday = holidayDates.has(adStr);
          
          if (isWeekend || isHoliday) {
            offDayWorkCount++;
          }
        });

        // Update Summary State (once is enough)
        if (map.zk_user_id === sortedMapData[0].zk_user_id) {
          let total = 0; let wkd = 0; let hld = 0;
          for (let d = 1; d <= 32; d++) {
            const ad = adbs.bs2ad(`${bsYear}/${bsMonth}/${d}`);
            if (ad.year === 0) break;
            total++;
            const dateObj = new Date(ad.year, ad.month - 1, ad.day);
            const isSat = dateObj.getDay() === 6;
            const isSun = dateObj.getDay() === 0;
            const adStr = `${ad.year}-${ad.month.toString().padStart(2, '0')}-${ad.day.toString().padStart(2, '0')}`;
            if (bsYear >= 2083 ? (isSat || isSun) : isSat) wkd++;
            else if (holidayDates.has(adStr)) hld++;
          }
          setMonthSummary({ total, weekends: wkd, holidays: hld, open: openDays });
        }
        
        const overtimeHrs = Math.round(Math.max(0, workedHrs - monthlyReq) * 100) / 100;
        const shortageHrs = Math.round(Math.max(0, monthlyReq - workedHrs) * 100) / 100;
        
        const autoRemarks = offDayWorkCount > 0 ? `Incl. ${offDayWorkCount} off-day(s) work. ` : '';
        const userRemarks = manualData[map.zk_user_id]?.remarks || '';

        return {
          zk_user_id: map.zk_user_id,
          full_name: map.full_name,
          designation: map.designation_nepali || 'Staff',
          office_time: officeTime,
          open_days: openDays,
          leave_days: manualData[map.zk_user_id]?.leave || 0,
          present_days: Object.keys(daysWithLogs).length,
          daily_req_hrs: dailyTarget,
          monthly_req_hrs: monthlyReq,
          worked_hrs: workedHrs,
          overtime_hrs: overtimeHrs,
          shortage_hrs: shortageHrs,
          incomplete_days: incompleteCount,
          remarks: `${autoRemarks}${userRemarks}`
        };
      });

      setAllUserLogs(userLogs);
      setDaysInMonth(lastDay);
      setStats(processedStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [bsYear, bsMonth, supabase, manualData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nepaliMonths = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

  const handleUpdateUserMap = async (map: UserMap) => {
    // Explicitly conflict on zk_user_id to ensure updates work correctly
    const { error } = await supabase.from('attendance_users_map').upsert(map, { onConflict: 'zk_user_id' });
    if (!error) {
      fetchData();
    } else {
      console.error('Update Error:', error);
    }
  };

  const handleManualChange = (userId: string, field: 'leave' | 'remarks', value: any) => {
    setManualData(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { leave: 0, remarks: '' }),
        [field]: value
      }
    }));
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen print-container-root print:min-h-0 print:h-auto print:bg-white print:p-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&display=swap');
        :root { font-family: 'Noto Sans Devanagari', sans-serif; }
        @media print {
          @page { size: landscape; margin: 8mm 10mm; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .no-print, nav, aside, header, footer, button { display: none !important; }
          .print-container-root { 
            display: block !important; 
            width: 100% !important; 
            height: auto !important;
            max-width: none !important;
            margin: 0 !important; 
            padding: 0 !important; 
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            font-size: 7.2pt !important; 
            color: black !important;
            border: 2px solid black !important;
          }
          tr { page-break-inside: avoid !important; }
          thead { display: table-header-group !important; }
          th, td { 
            border: 1px solid black !important; 
            padding: 3px 2px !important; 
            line-height: 1.1 !important;
            word-break: normal !important;
          }
          th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; font-weight: 900 !important; }
          .font-ledger { font-family: 'Times New Roman', serif !important; }
          .page-break-before-always { page-break-before: always !important; }
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-in.slide-in-from-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>

      {/* Institutional Print Header - Letterhead Style */}
      <div className="hidden print:block text-center mb-4 border-b-2 border-black pb-2">
          <h1 className="text-3xl font-serif font-black tracking-tight uppercase text-black mb-0.5">Gupteshowor Mahdev Multiple Campus</h1>
          <p className="text-[10pt] font-bold text-slate-700 tracking-wide">
            Pokhara-17, Chhorepatan, Nepal | 
            <span className="mx-2 text-black">Month: {nepaliMonths[bsMonth-1]} {bsYear} B.S.</span> | 
            <span className="ml-2 text-black font-black uppercase">Institutional Open Days: {monthSummary.open}</span>
          </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all mb-2 font-bold text-xs uppercase tracking-widest">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <FileText size={28} />
            </div>
            Monthly Attendance Report
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <Calendar size={16} className="text-indigo-500" />
            <select value={bsYear} onChange={e => setBsYear(parseInt(e.target.value))} className="bg-transparent font-bold text-slate-700 outline-none text-sm">
              {[2080, 2081, 2082, 2083, 2084, 2085].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={bsMonth} onChange={e => setBsMonth(parseInt(e.target.value))} className="bg-transparent font-bold text-slate-700 outline-none text-sm">
              {nepaliMonths.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      <div className="mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 no-print">
        <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">General Report Remarks (Upside Remarks)</label>
        <textarea 
          className="w-full bg-slate-50 border-slate-100 border-2 p-4 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-sm"
          placeholder="Enter any general notes or remarks for this month's report here..."
          value={generalRemarks}
          onChange={(e) => setGeneralRemarks(e.target.value)}
          rows={2}
        />
      </div>

      {stats.length > 0 && (
        <div className="mb-8 bg-indigo-950 text-indigo-100 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden no-print">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-8 items-center border-r border-indigo-800 pr-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Total Days</p>
                <p className="text-3xl font-black">{monthSummary.total}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Weekends</p>
                <p className="text-3xl font-black">{monthSummary.weekends}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Holidays</p>
                <p className="text-3xl font-black text-rose-400">{monthSummary.holidays}</p>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Institutional Holidays Identified</p>
              <div className="flex flex-wrap gap-2">
                {currentHolidays.length > 0 ? currentHolidays.map((h: any) => (
                  <span key={h} className="px-3 py-1 bg-indigo-900 border border-indigo-800 rounded-full text-[10px] font-bold text-indigo-200">
                    ✦ {h}
                  </span>
                )) : <span className="text-xs text-indigo-500 italic">No official holidays this month</span>}
              </div>
            </div>

            <div className="bg-white/10 p-6 rounded-3xl border border-white/10 text-center min-w-[180px] backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Actual Open Days</p>
              <p className="text-4xl font-black text-emerald-400">{monthSummary.open}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Calendar size={150} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 print:border-0 print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse main-ledger font-ledger">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-center print:bg-slate-100 print:text-black">
                <th className="p-3 border-r border-slate-800">क्र.सं.</th>
                <th className="p-3 border-r border-slate-800">नाम थर</th>
                <th className="p-3 border-r border-slate-800">पद</th>
                <th className="p-3 border-r border-slate-800">समय</th>
                <th className="p-3 border-r border-slate-800">लक्षित दिन</th>
                <th className="p-3 border-r border-slate-800">हाजिर दिन</th>
                <th className="p-3 border-r border-slate-800">बिदा</th>
                <th className="p-3 border-r border-slate-800">दैनिक लक्षित</th>
                <th className="p-3 border-r border-slate-800">कुल लक्षित</th>
                <th className="p-3 border-r border-slate-800">कुल हाजिर</th>
                <th className="p-3 border-r border-slate-800">बढी (OT)</th>
                <th className="p-3 border-r border-slate-800">अपुग</th>
                <th className="p-3">कैफियत</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={13} className="p-20 text-center italic text-slate-400">Loading metrics...</td></tr>
              ) : stats.map((s: any, i: number) => (
                <tr 
                  key={s.zk_user_id} 
                  className={`hover:bg-indigo-50/50 transition-all text-center cursor-pointer ${selectedUserForDaily?.zk_user_id === s.zk_user_id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
                  onClick={() => setSelectedUserForDaily(s)}
                >
                  <td className="p-3 text-xs font-bold text-slate-400 border-r border-slate-50">{i + 1}</td>
                  <td className="p-3 text-sm font-black text-slate-800 border-r border-slate-50 text-left">{s.full_name}</td>
                  <td className="p-3 text-[10px] font-bold text-slate-500 border-r border-slate-50">{s.designation}</td>
                  <td className="p-3 text-[10px] font-bold text-slate-600 border-r border-slate-50 whitespace-nowrap">{s.office_time}</td>
                  <td className="p-3 text-sm font-black text-slate-800 border-r border-slate-50">{s.open_days}</td>
                  <td className="p-3 text-sm font-black text-indigo-600 border-r border-slate-50">{s.present_days}</td>
                  <td className="p-3 text-sm font-black text-slate-400 border-r border-slate-50">{s.leave_days || '-'}</td>
                  <td className="p-3 text-sm font-bold text-slate-500 border-r border-slate-50">{s.daily_req_hrs.toFixed(2)}</td>
                  <td className="p-3 text-sm font-bold text-slate-500 border-r border-slate-50">{s.monthly_req_hrs.toFixed(2)}</td>
                  <td className="p-3 text-sm font-black text-slate-900 border-r border-slate-50">{s.worked_hrs.toFixed(2)}</td>
                  <td className="p-3 text-sm text-overtime border-r border-slate-50">{s.overtime_hrs > 0 ? s.overtime_hrs.toFixed(2) : '-'}</td>
                  <td className="p-3 text-sm text-shortage border-r border-slate-50">{s.shortage_hrs > 0 ? s.shortage_hrs.toFixed(2) : '-'}</td>
                  <td className="p-3 text-[10px] font-bold text-slate-400 italic text-left">{s.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Ledger Side Panel - Right Side */}
      {selectedUserForDaily && (
        <div className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col no-print animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-950 text-white">
            <div>
              <h2 className="text-lg font-black">{selectedUserForDaily.full_name}</h2>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{selectedUserForDaily.designation}</p>
            </div>
            <button onClick={() => setSelectedUserForDaily(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-tighter">
                  <tr>
                    <th className="p-2 border-r border-slate-700">Date</th>
                    <th className="p-2 border-r border-slate-700">Day</th>
                    <th className="p-2 border-r border-slate-700">In</th>
                    <th className="p-2 border-r border-slate-700">Out</th>
                    <th className="p-2 border-r border-slate-700">Hrs</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const ad = adbs.bs2ad(`${bsYear}/${bsMonth}/${day}`);
                    const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                    const adStr = `${ad.year}-${ad.month.toString().padStart(2, '0')}-${ad.day.toString().padStart(2, '0')}`;
                    const dateString = dateObj.toDateString();
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    const logs = allUserLogs[selectedUserForDaily.zk_user_id]?.filter((l: any) => new Date(l.check_time).toDateString() === dateString).sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime()) || [];
                    
                    const timeIn = logs.length > 0 ? new Date(logs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
                    const timeOut = logs.length >= 2 ? new Date(logs[logs.length-1].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
                    
                    let workedMs = 0;
                    if (logs.length >= 2) {
                      workedMs = new Date(logs[logs.length-1].check_time).getTime() - new Date(logs[0].check_time).getTime();
                    }
                    const workedHrs = workedMs > 0 ? (workedMs / 3600000).toFixed(2) : '-';
                    
                    const isSat = dateObj.getDay() === 6;
                    const isSun = dateObj.getDay() === 0;
                    const isWeekend = bsYear >= 2083 ? (isSat || isSun) : isSat;
                    const isHoliday = currentHolidays.includes(adStr) || currentHolidays.includes(adStr);

                    let status = 'Absent';
                    let statusColor = 'text-rose-500';
                    if (logs.length >= 2) {
                      status = 'Present';
                      statusColor = 'text-emerald-600';
                    } else if (logs.length === 1) {
                      status = 'Incomplete';
                      statusColor = 'text-amber-500';
                    } else if (isWeekend) {
                      status = 'Weekend';
                      statusColor = 'text-slate-400';
                    } else if (isHoliday) {
                      status = 'Holiday';
                      statusColor = 'text-indigo-400';
                    }

                    return (
                      <tr key={day} className={`hover:bg-slate-50 ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                        <td className="p-2 border-r border-slate-100 font-bold">{bsMonth}/{day}</td>
                        <td className="p-2 border-r border-slate-100 text-slate-500">{dayName}</td>
                        <td className="p-2 border-r border-slate-100 text-indigo-600 font-bold">{timeIn}</td>
                        <td className="p-2 border-r border-slate-100 text-indigo-600 font-bold">{timeOut}</td>
                        <td className="p-2 border-r border-slate-100 font-black">{workedHrs}</td>
                        <td className={`p-2 font-black text-[9px] ${statusColor}`}>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-2">Detailed Remarks</h3>
              <p className="text-xs text-slate-600 italic">
                Daily time logs are processed based on the first and last punch-in/out recorded on the device for each specific date.
              </p>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-white">
            <button 
              onClick={() => {
                window.print();
              }}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
              <Printer size={18} /> Print Daily Ledger
            </button>
          </div>
        </div>
      )}

      {/* Individual Daily Ledger - Print Version Only */}
      {selectedUserForDaily && (
        <div className="hidden print:block mt-12 pt-12 border-t-2 border-black page-break-before-always">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-serif font-black uppercase mb-1">Individual Staff Attendance Ledger</h1>
            <p className="text-sm font-bold">
              Name: {selectedUserForDaily.full_name} | Post: {selectedUserForDaily.designation} | Month: {nepaliMonths[bsMonth-1]} {bsYear}
            </p>
          </div>
          
          <table className="w-full text-[9pt] border-collapse border-2 border-black">
            <thead>
              <tr className="bg-slate-100 font-black uppercase">
                <th className="p-2 border border-black">S.N</th>
                <th className="p-2 border border-black">Date</th>
                <th className="p-2 border border-black">Day</th>
                <th className="p-2 border border-black">Time In</th>
                <th className="p-2 border border-black">Time Out</th>
                <th className="p-2 border border-black">Total Hrs</th>
                <th className="p-2 border border-black">Status</th>
                <th className="p-2 border border-black">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const ad = adbs.bs2ad(`${bsYear}/${bsMonth}/${day}`);
                const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                const adStr = `${ad.year}-${ad.month.toString().padStart(2, '0')}-${ad.day.toString().padStart(2, '0')}`;
                const dateString = dateObj.toDateString();
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const logs = allUserLogs[selectedUserForDaily.zk_user_id]?.filter((l: any) => new Date(l.check_time).toDateString() === dateString).sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime()) || [];
                const timeIn = logs.length > 0 ? new Date(logs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                const timeOut = logs.length >= 2 ? new Date(logs[logs.length-1].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                let workedMs = 0;
                if (logs.length >= 2) workedMs = new Date(logs[logs.length-1].check_time).getTime() - new Date(logs[0].check_time).getTime();
                const workedHrs = workedMs > 0 ? (workedMs / 3600000).toFixed(2) : '-';
                const isSat = dateObj.getDay() === 6;
                const isSun = dateObj.getDay() === 0;
                const isWeekend = bsYear >= 2083 ? (isSat || isSun) : isSat;
                const isHoliday = currentHolidays.includes(adStr);
                let status = logs.length >= 2 ? 'Present' : (isWeekend ? 'Weekend' : (isHoliday ? 'Holiday' : 'Absent'));
                
                return (
                  <tr key={day} className="text-center">
                    <td className="p-1 border border-black">{day}</td>
                    <td className="p-1 border border-black">{bsYear}/{bsMonth}/{day}</td>
                    <td className="p-1 border border-black">{dayName}</td>
                    <td className="p-1 border border-black font-bold">{timeIn}</td>
                    <td className="p-1 border border-black font-bold">{timeOut}</td>
                    <td className="p-1 border border-black font-bold">{workedHrs}</td>
                    <td className="p-1 border border-black uppercase text-[8pt] font-black">{status}</td>
                    <td className="p-1 border border-black w-24"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 no-print">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
            <RefreshCw size={24} className="text-indigo-600" />
            Device Mappings & Base Settings
          </h2>
          {unmappedIds.length > 0 && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-wrap gap-2">
              <span className="text-xs font-bold text-rose-900 w-full mb-1">New Device IDs Found:</span>
              {unmappedIds.map((id: any) => (
                <button key={id} onClick={() => handleUpdateUserMap({ zk_user_id: id, full_name: `User ${id}`, staff_id: null, teacher_id: null, designation_nepali: '', individual_office_time: '10:00 - 5:00' })} className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-100">Map {id}</button>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase font-black border-b border-slate-100">
                  <th className="pb-4 pl-2">ID</th>
                  <th className="pb-4">Name</th>
                  <th className="pb-4">Designation (Padh)</th>
                  <th className="pb-4 text-center">Office Time</th>
                  <th className="pb-4 text-center">Leave</th>
                  <th className="pb-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {userMaps.map((map: any) => (
                  <tr key={map.zk_user_id} className="group">
                    <td className="py-4 pl-2 font-black text-slate-400">{map.zk_user_id}</td>
                    <td>
                      <input className="w-full bg-transparent border-b border-transparent group-hover:border-slate-100 outline-none font-bold text-slate-800" value={map.full_name} onChange={e => setUserMaps(prev => prev.map((u: any) => u.zk_user_id === map.zk_user_id ? {...u, full_name: e.target.value} : u))} onBlur={() => handleUpdateUserMap(map)} />
                    </td>
                    <td>
                      <input className="w-full bg-transparent border-b border-transparent group-hover:border-slate-100 outline-none font-bold text-slate-600" value={map.designation_nepali || ''} placeholder="e.g. Campus Chief" onChange={e => setUserMaps(prev => prev.map((u: any) => u.zk_user_id === map.zk_user_id ? {...u, designation_nepali: e.target.value} : u))} onBlur={() => handleUpdateUserMap(map)} />
                    </td>
                    <td className="text-center">
                      <input className="w-24 bg-white border border-slate-100 rounded px-2 py-1 text-center font-bold text-indigo-600" value={map.individual_office_time || '10:00 - 5:00'} onChange={e => setUserMaps(prev => prev.map((u: any) => u.zk_user_id === map.zk_user_id ? {...u, individual_office_time: e.target.value} : u))} onBlur={() => handleUpdateUserMap(map)} />
                    </td>
                    <td className="text-center">
                      <input type="number" className="w-12 bg-slate-100 rounded px-1 py-1 text-center font-bold" value={manualData[map.zk_user_id]?.leave || 0} onChange={e => handleManualChange(map.zk_user_id, 'leave', parseInt(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="w-full bg-transparent outline-none italic text-slate-400" placeholder="Remarks..." value={manualData[map.zk_user_id]?.remarks || ''} onChange={e => handleManualChange(map.zk_user_id, 'remarks', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        {/* Print Summary Footer */}
        <div className="hidden print:block mt-8">
          <div className="grid grid-cols-2 gap-8 items-end">
            <div className="border-2 border-slate-900 p-6 rounded-xl">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-400">Institutional Month Audit</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[8pt] font-black uppercase text-slate-500">Total Days</p>
                  <p className="text-lg font-black text-black">{monthSummary.total}</p>
                </div>
                <div>
                  <p className="text-[8pt] font-black uppercase text-slate-500">Weekends</p>
                  <p className="text-lg font-black text-black">{monthSummary.weekends}</p>
                </div>
                <div>
                  <p className="text-[8pt] font-black uppercase text-slate-500">Holidays</p>
                  <p className="text-lg font-black text-black">{monthSummary.holidays}</p>
                </div>
              </div>
              {currentHolidays.length > 0 && (
                <p className="mt-4 text-[9pt] font-bold text-slate-700">Official Holidays: {currentHolidays.join(', ')}</p>
              )}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-[10pt] font-black uppercase tracking-tighter text-black">Actual Open Days</p>
                <p className="text-3xl font-black text-indigo-700">{monthSummary.open}</p>
              </div>
            </div>

            <div className="text-center pb-2">
              <div className="w-64 border-t-2 border-slate-900 pt-2 mx-auto">
                <p className="font-black text-sm uppercase tracking-[0.2em] text-black">Verified By</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Campus Administration Office</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
