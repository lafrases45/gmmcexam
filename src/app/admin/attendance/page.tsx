"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Fingerprint, ArrowUpDown, Calendar as CalendarIcon, UserPlus, Edit2, Clock, LogIn, LogOut, Timer, MapPin } from 'lucide-react';
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

  useEffect(() => {
    const today = new Date();
    const bsToday = adbs.ad2bs(`${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`);
    setSelectedBsDate(`${bsToday.en.year}-${bsToday.en.month.toString().padStart(2, '0')}-${bsToday.en.day.toString().padStart(2, '0')}`);
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
      mapData?.forEach(m => { dict[m.zk_user_id] = m; });
      setMappings(dict);

      // Enrich logs with full name AND dynamic user type from mapping
      const enriched = logData?.map(log => {
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

  const fetchRegistries = useCallback(async () => {
    const { data: t } = await supabase.from('teacher_registry').select('id, full_name').order('full_name');
    const { data: s } = await supabase.from('staff_registry').select('id, full_name').order('full_name');
    setFaculties(t || []);
    setStaff(s || []);
  }, [supabase]);

  useEffect(() => { fetchData(); fetchRegistries(); }, [selectedBsDate, fetchData, fetchRegistries]);

  const userSummaries = useMemo(() => {
    const groups: Record<string, UserSummary> = {};
    logs.forEach(log => {
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
      const ins = sorted.filter(l => l.check_type === 'In');
      const outs = sorted.filter(l => l.check_type === 'Out');
      
      summary.first_in = ins.length > 0 ? ins[0].check_time : (sorted.length > 0 ? sorted[0].check_time : null);
      summary.last_out = outs.length > 0 ? outs[outs.length - 1].check_time : (sorted.length > 1 ? sorted[sorted.length - 1].check_time : null);

      if (summary.first_in && summary.last_out && summary.first_in !== summary.last_out) {
        const diff = new Date(summary.last_out).getTime() - new Date(summary.first_in).getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        summary.total_hours = `${hrs}h ${mins}m`;
      }
      return summary;
    }).sort((a, b) => parseInt(a.zk_user_id) - parseInt(b.zk_user_id));
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
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
              <Fingerprint size={24} />
            </div>
            Daily Attendance
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">GMMC EMIS • Live Tracking</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-500" />
          <NepaliDatePicker value={selectedBsDate} onChange={setSelectedBsDate} options={{ calenderType: 'Nepali', format: 'YYYY-MM-DD' }} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
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
                <td className="px-6 py-3 text-right">
                  <button onClick={() => openModal(s.raw_logs[0])} className="p-2 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all">
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
