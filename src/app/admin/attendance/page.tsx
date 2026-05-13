"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fingerprint, ArrowUpDown, Calendar as CalendarIcon, UserPlus, Edit2, Clock, LogIn, LogOut, Timer, MapPin, FileText, ClipboardList } from 'lucide-react';
// @ts-ignore
import adbs from 'ad-bs-converter';
// @ts-ignore
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';

interface AttendanceLog {
  id: string;
  user_id: string | null;
  zk_user_id: string | null;
  user_type: string | null;
  check_time: string;
  check_type: string | null;
  device_id: string;
  status: string;
  full_name?: string;
  dynamic_user_type?: string;
}

interface RegistryItem { id: string; full_name: string; }
interface Mapping { zk_user_id: string; full_name: string; teacher_id: string | null; staff_id: string | null; }

interface UserSummary {
  zk_user_id: string;
  full_name: string;
  user_type: string;
  first_in: string | null;
  last_out: string | null;
  total_hours: string;
  raw_logs: AttendanceLog[];
}

export default function AttendancePage() {
  const router = useRouter();
  const supabase = createClient();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [faculties, setFaculties] = useState<RegistryItem[]>([]);
  const [staff, setStaff] = useState<RegistryItem[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [mappingRole, setMappingRole] = useState<'Teacher' | 'Staff'>('Teacher');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedBsDate, setSelectedBsDate] = useState('');
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});
  const [syncing, setSyncing] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState<boolean | null>(null);
  
  // New States for Monthly Individual Ledger
  const [viewMode, setViewMode] = useState<'daily' | 'monthly-individual'>('daily');
  const [reportMonth, setReportMonth] = useState(1);
  const [reportYear, setReportYear] = useState(2081);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [personalLogs, setPersonalLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    const today = new Date();
    const bsToday = adbs.ad2bs(`${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`);
    setSelectedBsDate(`${bsToday.en.year}-${bsToday.en.month.toString().padStart(2, '0')}-${bsToday.en.day.toString().padStart(2, '0')}`);
    setReportYear(bsToday.en.year);
    setReportMonth(bsToday.en.month);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedBsDate) return;
    setLoading(true);
    try {
      const [y, m, d] = selectedBsDate.split('-').map(Number);
      const ad = adbs.bs2ad(`${y}/${m}/${d}`);
      const start = new Date(ad.year, ad.month - 1, ad.day, 0, 0, 0).toISOString();
      const end = new Date(ad.year, ad.month - 1, ad.day, 23, 59, 59).toISOString();

      const { data: logData } = await supabase.from('attendance_logs').select('*').gte('check_time', start).lte('check_time', end);
      const { data: mapData } = await supabase.from('attendance_users_map').select('*');

      const dict: Record<string, Mapping> = {};
      mapData?.forEach((m: any) => { dict[m.zk_user_id] = m; });
      setMappings(dict);

      // Enrich logs with full name AND dynamic user type from mapping
      const enriched = logData?.map((log: any) => {
        const map = dict[log.zk_user_id || ''];
        return { 
          ...log, 
          full_name: map?.full_name,
          dynamic_user_type: map ? (map.staff_id ? 'Staff' : map.teacher_id ? 'Teacher' : 'Student') : log.user_type 
        };
      });
      setLogs(enriched || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedBsDate, supabase]);

  const fetchPersonalLedger = useCallback(async () => {
    if (!selectedFacultyId) return;
    setLoading(true);
    try {
      const startAd = adbs.bs2ad(`${reportYear}/${reportMonth}/1`);
      let lastDay = 32;
      let endAd = adbs.bs2ad(`${reportYear}/${reportMonth}/${lastDay}`);
      while (endAd.year === 0 && lastDay > 28) {
        lastDay--;
        endAd = adbs.bs2ad(`${reportYear}/${reportMonth}/${lastDay}`);
      }

      const start = new Date(startAd.year, startAd.month - 1, startAd.day, 0, 0, 0).toISOString();
      const end = new Date(endAd.year, endAd.month - 1, endAd.day, 23, 59, 59).toISOString();

      // Find the zk_user_id for this faculty
      const zid = Object.keys(mappings).find((key: string) => 
        mappings[key].teacher_id === selectedFacultyId || 
        mappings[key].staff_id === selectedFacultyId
      );

      if (!zid) {
        setPersonalLogs([]);
        return;
      }

      const { data } = await supabase.from('attendance_logs')
        .select('*')
        .eq('zk_user_id', zid)
        .gte('check_time', start)
        .lte('check_time', end)
        .order('check_time', { ascending: true });
      
      setPersonalLogs(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [reportYear, reportMonth, selectedFacultyId, mappings, supabase]);

  useEffect(() => {
    if (viewMode === 'daily') fetchData();
  }, [viewMode, selectedBsDate, fetchData]);

  useEffect(() => {
    if (viewMode === 'monthly-individual') fetchPersonalLedger();
  }, [viewMode, reportYear, reportMonth, selectedFacultyId, fetchPersonalLedger]);

  // Memoize date picker options to prevent unnecessary re-renders of the component
  const nepaliDatePickerOptions = useMemo(() => ({ 
    calenderType: 'Nepali', 
    format: 'YYYY-MM-DD' 
  } as any), []);

  const fetchRegistries = useCallback(async () => {
    const { data: t } = await supabase.from('teacher_registry').select('id, full_name').order('full_name');
    const { data: s } = await supabase.from('staff_registry').select('id, full_name').order('full_name');
    setFaculties(t || []);
    setStaff(s || []);
  }, [supabase]);

  const checkDeviceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/zkt/status');
      const data = await res.json();
      setDeviceOnline(data.connected);
    } catch (e) {
      setDeviceOnline(false);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch('/api/zkt/sync', { method: 'POST' });
      // Refresh data after a short delay to allow logs to arrive
      setTimeout(() => {
        fetchData();
        checkDeviceStatus();
      }, 2000);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  }, [fetchData, checkDeviceStatus]);

  useEffect(() => { 
    fetchRegistries();
    checkDeviceStatus();
    triggerSync();
    
    const interval = setInterval(checkDeviceStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchRegistries, checkDeviceStatus, triggerSync]);

  const NEPALI_MONTHS = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

  const userSummaries = useMemo(() => {
    const groups: Record<string, UserSummary> = {};
    logs.forEach((log: any) => {
      const zid = log.zk_user_id || 'unknown';
      if (!groups[zid]) {
        groups[zid] = {
          zk_user_id: zid,
          full_name: log.full_name || 'Unassigned User',
          user_type: log.dynamic_user_type || 'Unknown',
          first_in: null,
          last_out: null,
          total_hours: '0h 0m',
          raw_logs: []
        };
      }
      groups[zid].raw_logs.push(log);
    });

    return Object.values(groups).map(summary => {
      const sorted = [...summary.raw_logs].sort((a, b) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime());
      const ins = sorted.filter((l: any) => l.check_type === 'In');
      const outs = sorted.filter((l: any) => l.check_type === 'Out');
      
      summary.first_in = ins.length > 0 ? ins[0].check_time : (sorted.length > 0 ? sorted[0].check_time : null);
      summary.last_out = outs.length > 0 ? outs[outs.length - 1].check_time : (sorted.length > 1 ? sorted[sorted.length - 1].check_time : null);

      if (summary.first_in && summary.last_out && summary.first_in !== summary.last_out) {
        const diff = new Date(summary.last_out).getTime() - new Date(summary.first_in).getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        summary.total_hours = `${hrs}h ${mins}m`;
      }
      return summary;
    }).sort((a, b) => {
      const idA = parseInt(a.zk_user_id) || 0;
      const idB = parseInt(b.zk_user_id) || 0;
      return idA - idB;
    });
  }, [logs]);

  const openModal = (log: AttendanceLog) => {
    setSelectedLog(log);
    const existing = mappings[log.zk_user_id || ''];
    if (existing) {
      setMappingRole(existing.staff_id ? 'Staff' : 'Teacher');
      setSelectedEntityId(existing.staff_id || existing.teacher_id || '');
    } else {
      setMappingRole('Teacher');
      setSelectedEntityId('');
    }
    setShowMapModal(true);
  };

  const handleSave = async () => {
    if (!selectedLog || !selectedEntityId) return;
    const entity = (mappingRole === 'Teacher' ? faculties : staff).find(x => x.id === selectedEntityId);
    await supabase.from('attendance_users_map').upsert({
      zk_user_id: selectedLog.zk_user_id,
      full_name: entity?.full_name || '',
      teacher_id: mappingRole === 'Teacher' ? selectedEntityId : null,
      staff_id: mappingRole === 'Staff' ? selectedEntityId : null
    });
    await supabase.from('attendance_logs').update({ user_id: selectedEntityId, user_type: mappingRole }).eq('zk_user_id', selectedLog.zk_user_id);
    setShowMapModal(false);
    fetchData();
  };

  return (
    <div className="p-4 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 bg-white/50 p-1 rounded-2xl border border-slate-200 mb-2 no-print">
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${viewMode === 'daily' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Daily Tracker
            </button>
            <button 
              onClick={() => setViewMode('monthly-individual')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${viewMode === 'monthly-individual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Personal Ledger
            </button>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
              <Fingerprint size={24} />
            </div>
            {viewMode === 'daily' ? 'Daily Attendance' : 'Personal Monthly Ledger'}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GMMC EMIS • {viewMode === 'daily' ? 'Live Tracking' : 'Institutional Record'}</p>
            {deviceOnline !== null && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${deviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className={`text-[9px] font-black uppercase tracking-tighter ${deviceOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Device {deviceOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
            {syncing && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase text-blue-600 animate-pulse">Syncing...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 no-print">
          {viewMode === 'daily' ? (
            <>
              <button 
                onClick={triggerSync}
                disabled={syncing}
                className={`px-4 py-2 rounded-2xl shadow-md border flex items-center gap-2 font-bold text-sm transition-all ${syncing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'}`}
              >
                <Clock size={16} className={syncing ? 'animate-spin' : 'text-blue-500'} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <Link 
                href="/admin/attendance/reports"
                className="bg-indigo-600 px-4 py-2 rounded-2xl shadow-md border border-indigo-500 flex items-center gap-2 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
              >
                <ClipboardList size={16} /> Monthly Ledger
              </Link>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 flex items-center gap-2">
                <CalendarIcon size={16} className="text-blue-500" />
                <NepaliDatePicker value={selectedBsDate} onChange={setSelectedBsDate} options={nepaliDatePickerOptions} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <select 
                value={reportYear} 
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 font-bold text-sm outline-none"
              >
                {[2080, 2081, 2082, 2083].map(y => <option key={y} value={y}>{y} BS</option>)}
              </select>
              <select 
                value={reportMonth} 
                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 font-bold text-sm outline-none"
              >
                {NEPALI_MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
              <select 
                value={selectedFacultyId} 
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 font-bold text-sm outline-none min-w-[200px]"
              >
                <option value="">Select Employee...</option>
                <optgroup label="Faculty">
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                </optgroup>
                <optgroup label="Staff">
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </optgroup>
              </select>
              <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Print Ledger
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {viewMode === 'daily' ? (
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Member & Identity</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timings (In → Out)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Duration</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={4} className="py-16 text-center text-slate-300 text-xs font-bold italic">Refreshing database...</td></tr> : userSummaries.map((s) => (
                <tr key={s.zk_user_id} className="hover:bg-blue-50/20 transition-all group">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${s.full_name !== 'Unassigned User' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {s.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm leading-tight">{s.full_name}</div>
                        <div className="text-[9px] font-black uppercase tracking-wider flex items-center gap-2">
                          <span className="text-slate-400">ID {s.zk_user_id}</span>
                          <span className={`px-1.5 py-0.5 rounded-md ${s.user_type === 'Teacher' ? 'bg-blue-50 text-blue-500' : s.user_type === 'Staff' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>{s.user_type}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-black">
                      <div className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                        <LogIn size={10} className="text-blue-500" />
                        {s.first_in ? new Date(s.first_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                      <div className="text-slate-300">→</div>
                      <div className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                        <LogOut size={10} className="text-amber-500" />
                        {s.last_out && s.last_out !== s.first_in ? new Date(s.last_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                        <Clock size={12} className="text-blue-600" /> {s.total_hours}
                      </div>
                      {s.total_hours !== '0h 0m' && (
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (parseInt(s.total_hours) / 8) * 100)}%` }}></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        setSelectedFacultyId((faculties.find(f => f.full_name === s.full_name) || staff.find(f => f.full_name === s.full_name))?.id || '');
                        setViewMode('monthly-individual');
                      }} 
                      className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                      title="View Personal Monthly Ledger"
                    >
                      <FileText size={16} />
                    </button>
                    <button onClick={() => openModal(s.raw_logs[0])} className="p-2 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest text-center">
                <tr>
                  <th className="p-4 border border-slate-800">S.N</th>
                  <th className="p-4 border border-slate-800 text-left">Emplye Name</th>
                  <th className="p-4 border border-slate-800">Date</th>
                  <th className="p-4 border border-slate-800">Time In</th>
                  <th className="p-4 border border-slate-800">Time Out</th>
                  <th className="p-4 border border-slate-800">Total Hrs</th>
                  <th className="p-4 border border-slate-800">OT</th>
                  <th className="p-4 border border-slate-800">Status</th>
                  <th className="p-4 border border-slate-800">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center font-bold text-sm">
                {!selectedFacultyId ? (
                  <tr><td colSpan={9} className="py-20 text-slate-300 italic">Please select an employee to view their ledger...</td></tr>
                ) : Array.from({ length: 32 }).map((_, idx) => {
                  const day = idx + 1;
                  let ad;
                  try { ad = adbs.bs2ad(`${reportYear}/${reportMonth}/${day}`); } catch(e) { return null; }
                  if (ad.year === 0) return null;
                  
                  const dayLogs = personalLogs.filter(log => {
                    const lDate = new Date(log.check_time);
                    const bsLog = adbs.ad2bs(`${lDate.getFullYear()}/${lDate.getMonth() + 1}/${lDate.getDate()}`);
                    return bsLog.en.year === reportYear && bsLog.en.month === reportMonth && bsLog.en.day === day;
                  });

                  const timeIn = dayLogs.length > 0 ? new Date(dayLogs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  const timeOut = dayLogs.length >= 2 ? new Date(dayLogs[dayLogs.length-1].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  
                  let workedMs = 0;
                  if (dayLogs.length >= 2) workedMs = new Date(dayLogs[dayLogs.length-1].check_time).getTime() - new Date(dayLogs[0].check_time).getTime();
                  const workedHrs = workedMs > 0 ? (workedMs / 3600000).toFixed(2) : '-';

                  const dateObj = new Date(ad.year, ad.month - 1, ad.day);
                  const isWeekend = dateObj.getDay() === 6; // Saturday
                  const status = dayLogs.length > 0 ? 'Present' : (isWeekend ? 'Weekend' : 'Absent');

                  return (
                    <tr key={day} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 border border-slate-100 text-slate-400">{day}</td>
                      <td className="p-3 border border-slate-100 text-left text-slate-900">{(faculties.find(f => f.id === selectedFacultyId) || staff.find(f => f.id === selectedFacultyId))?.full_name}</td>
                      <td className="p-3 border border-slate-100">{reportMonth}/{day}</td>
                      <td className="p-3 border border-slate-100 text-blue-600">{timeIn}</td>
                      <td className="p-3 border border-slate-100 text-blue-600">{timeOut}</td>
                      <td className="p-3 border border-slate-100">{workedHrs}</td>
                      <td className="p-3 border border-slate-100 text-slate-300">-</td>
                      <td className={`p-3 border border-slate-100 ${status === 'Present' ? 'text-emerald-600' : status === 'Absent' ? 'text-rose-500' : 'text-amber-500'}`}>{status}</td>
                      <td className="p-3 border border-slate-100 text-slate-300"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full border border-white animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Identity Control</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6">Hardware ID: #{selectedLog?.zk_user_id}</p>
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {['Teacher', 'Staff'].map(r => (
                  <button key={r} onClick={() => { setMappingRole(r as any); setSelectedEntityId(''); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${mappingRole === r ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{r}</button>
                ))}
              </div>
              <select className="w-full bg-slate-50 border-slate-200 border-2 p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm" value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)}>
                <option value="">-- Select {mappingRole} --</option>
                {(mappingRole === 'Teacher' ? faculties : staff).map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}
              </select>
              <div className="flex gap-3">
                <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all" onClick={handleSave}>Save</button>
                <button className="flex-1 py-4 rounded-2xl font-black text-slate-400 text-xs hover:bg-slate-100 transition-all" onClick={() => setShowMapModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`.ndp-nepali-calendar { border-radius: 1.5rem !important; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important; padding: 0.5rem !important; } #nepali-datepicker { border: none !important; font-weight: 800 !important; color: #334155 !important; cursor: pointer !important; width: 110px !important; outline: none !important; font-size: 0.9rem !important; }`}</style>
    </div>
  );
}
