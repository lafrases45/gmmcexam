'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Download, Sliders, Layout, LayoutGrid, Trash2, CheckSquare, Square, AlertCircle, Users, Save, History, ClipboardList } from 'lucide-react';
import styles from '../admin.module.css';
import { 
  generateSeatPlan, 
  bulkAllocate, 
  getOrderedPrograms,
  Student, 
  Bench, 
  SeatPlanConfig, 
  BulkAllocationResult 
} from '@/lib/seatPlan';
import { PRESET_ROOMS } from '@/lib/constants/rooms';
import { 
  getExams, 
  syncSeatPlanStudents, 
  saveSeatPlan, 
  getSeatPlans, 
  deleteSeatPlan 
} from '@/lib/actions/exam-actions';
import { getBatches, getStudentsByBatch } from '@/lib/actions/student-actions';
import { useBatches } from '@/lib/hooks/useBatches';
import { useAuth } from '@/components/providers/AuthProvider';
import { useExamsData } from '@/lib/hooks/useExamsData';
import { RefreshCw } from 'lucide-react';
import { toast as globalToast } from '@/lib/store/useToastStore';

export default function SeatPlanPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [allocationMode, setAllocationMode] = useState<'single' | 'bulk'>('single');
  const [bulkMode, setBulkMode] = useState<'auto' | 'manual'>('auto');
  const [selectedRoomNames, setSelectedRoomNames] = useState<string[]>([]);
  const [roomColumnMappings, setRoomColumnMappings] = useState<Record<string, string[]>>({});

  const [exams, setExams] = useState<any[]>([]);
  const [groupedExams, setGroupedExams] = useState<any[][]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [savedBatches, setSavedBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Custom UI State
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const ignoreNextGeneration = React.useRef(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') globalToast.success(message);
    else globalToast.error(message);
  };

  const { session } = useAuth();
  const { data: batchesData } = useBatches();
  const { data: examsData, isLoading: isLoadingExams } = useExamsData(session?.user);

  useEffect(() => {
    if (examsData?.exams) {
      const data = examsData.exams;
      setExams(data); // Populate the local exams state for lookups
      
      const groups: Record<string, any[]> = {}
      data.forEach((exam: any) => {
        const id = exam.group_id || `single-${exam.id}`
        if (!groups[id]) groups[id] = []
        groups[id].push(exam)
      })
      setGroupedExams(Object.values(groups))
    }
  }, [examsData]);

  useEffect(() => {
    if (batchesData) setSavedBatches(batchesData);
  }, [batchesData]);
  
  const [config, setConfig] = useState<SeatPlanConfig>({
    roomName: PRESET_ROOMS[0].name,
    windowBenches: PRESET_ROOMS[0].windows,
    doorBenches: PRESET_ROOMS[0].doors,
    studentsPerBench: 2,
    examType: 'First Internal Examination'
  });

  const [allocationResults, setAllocationResults] = useState<BulkAllocationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [quickPaste, setQuickPaste] = useState('');

  // Manual Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeSwapSeat, setActiveSwapSeat] = useState<{ room: string, benchNo: number, side: string, seatIdx: number } | null>(null);

  // Allocation Logic
  useEffect(() => {
    if (ignoreNextGeneration.current) {
      ignoreNextGeneration.current = false;
      return;
    }

    if (allocationMode === 'single') {
      const plan = generateSeatPlan(students, config, roomColumnMappings[config.roomName] || null);
      setAllocationResults([{
        roomName: config.roomName,
        benches: plan,
        studentCount: students.length // This is simplified, actual count might be based on benches
      }]);
    } else {
      // Bulk Mode
      let roomsToUse = [];
      if (bulkMode === 'auto') {
        roomsToUse = PRESET_ROOMS;
      } else {
        roomsToUse = PRESET_ROOMS.filter(r => selectedRoomNames.includes(r.name));
      }
      
      const { results } = bulkAllocate(students, roomsToUse, config.studentsPerBench, roomColumnMappings);
      setAllocationResults(results);
    }
  }, [students, config, allocationMode, bulkMode, selectedRoomNames, roomColumnMappings]);

  // Combined Auto-Allocation Intelligence
  useEffect(() => {
    if (students.length === 0) return;

    // 1. Check if we need to switch from Single to Bulk
    if (allocationMode === 'single') {
      const roomCap = (config.windowBenches + config.doorBenches) * config.studentsPerBench;
      if (students.length > roomCap) {
        setAllocationMode('bulk');
        setBulkMode('auto');
        showToast('Capacity exceeded! Switched to Bulk Allocation.', 'success');
        return; // Stop here, the next render will handle the bulk capacity check
      }
    }

    // 2. Check if we need to switch from 2-per-bench to 3-per-bench
    if (config.studentsPerBench === 2) {
      let currentCapacity = 0;
      if (allocationMode === 'single') {
        currentCapacity = (config.windowBenches + config.doorBenches) * 2;
      } else {
        const roomsToUse = bulkMode === 'auto' 
          ? PRESET_ROOMS 
          : PRESET_ROOMS.filter(r => selectedRoomNames.includes(r.name));
        currentCapacity = roomsToUse.reduce((acc, r) => acc + (r.windows + r.doors) * 2, 0);
      }

      if (students.length > currentCapacity) {
        setConfig(prev => ({ ...prev, studentsPerBench: 3 }));
        showToast('Capacity Warning: 2 per bench is not enough. Switched to 3 per bench.', 'success');
      }
    }
  }, [
    students.length, 
    allocationMode, 
    bulkMode, 
    selectedRoomNames, 
    config.studentsPerBench, 
    config.windowBenches, 
    config.doorBenches
  ]);

  const totalCapacity = useMemo(() => {
    let rooms = [];
    if (allocationMode === 'single') {
      rooms = [{ name: config.roomName, windows: config.windowBenches, doors: config.doorBenches }];
    } else {
      rooms = bulkMode === 'auto' ? PRESET_ROOMS : PRESET_ROOMS.filter(r => selectedRoomNames.includes(r.name));
    }
    return rooms.reduce((acc, r) => acc + (r.windows + r.doors) * config.studentsPerBench, 0);
  }, [config, allocationMode, bulkMode, selectedRoomNames]);

  const totalAssigned = useMemo(() => {
    return allocationResults.reduce((acc, res) => acc + res.benches.reduce((bAcc, b) => bAcc + b.students.filter(s => s !== null).length, 0), 0);
  }, [allocationResults]);

  const studentGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    students.forEach(s => {
      const key = s.major ? `${s.program} - ${s.major}` : s.program;
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups);
  }, [students]);

  const removeStudentGroup = (groupKey: string) => {
    setStudents(prev => prev.filter(s => {
      const key = s.major ? `${s.program} - ${s.major}` : s.program;
      return key !== groupKey;
    }));
  };

  const currentSavedPlan = useMemo(() => {
    return savedPlans.find(p => 
      p.exam_id === selectedGroupId || 
      exams.some(e => e.group_id === selectedGroupId && e.id === p.exam_id)
    );
  }, [savedPlans, selectedGroupId, exams]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedProgram || !selectedTerm) {
      showToast('Please select a program and year before uploading.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

      const importedStudents: Student[] = data.slice(1).map(row => ({
        roll: String(row[0] || ''),
        name: String(row[1] || ''),
        program: `${selectedProgram} ${selectedTerm}`,
        major: row[2] ? String(row[2]) : selectedMajor || undefined
      })).filter(s => s.roll && s.name);

      setStudents(prev => [...prev, ...importedStudents]);
      const target = e.target as HTMLInputElement;
      if (target) target.value = '';
      
      setSelectedProgram('');
      setSelectedTerm('');
      setSelectedMajor('');
      showToast(`${importedStudents.length} students added successfully!`);
    };
    reader.readAsBinaryString(file);
  };

  const generateDummyStudents = (count: number) => {
    const dummy = Array.from({ length: count }, (_, i) => ({
      roll: `D${1000 + i}`,
      name: `Dummy Student ${i + 1}`,
      program: 'BBS 1st Year'
    }));
    setStudents(dummy);
  };

  const handleDownloadPDF = async (type: 'attendance' | 'marks' | 'desk' | 'distribution') => {
    setIsGenerating(type);
    try {
      const selectedExam = exams.find(e => 
        e.id === selectedGroupId || 
        e.group_id === selectedGroupId || 
        `single-${e.id}` === selectedGroupId
      );
      const payload = {
        roomResults: type === 'marks' 
          ? [{ roomName: 'All', students: students, benches: [] }]
          : allocationResults.map(res => ({
              roomName: res.roomName,
              students: res.benches.flatMap(b => b.students).filter((s): s is Student => s !== null),
              benches: res.benches
            })),
        examType: config.examType,
        examDate: selectedExam ? selectedExam.start_date : undefined,
        examId: selectedGroupId,
        type
      };

      const response = await fetch('/api/admin/seat-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  const toggleRoom = (name: string) => {
    setSelectedRoomNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSmartSelect = () => {
    if (students.length === 0) return showToast('Please add students first.', 'error');
    
    // Sort rooms by capacity descending to use fewer rooms
    const sortedRooms = [...PRESET_ROOMS].sort((a, b) => 
      (b.windows + b.doors) - (a.windows + a.doors)
    );
    
    let needed = students.length;
    const selected: string[] = [];
    
    for (const room of sortedRooms) {
      if (needed <= 0) break;
      const cap = (room.windows + room.doors) * config.studentsPerBench;
      selected.push(room.name);
      needed -= cap;
    }
    
    setSelectedRoomNames(selected);
    setAllocationMode('bulk');
    setBulkMode('manual');
    showToast(`Smart selected ${selected.length} rooms to fit all students.`);
  };

  const selectAllRooms = () => setSelectedRoomNames(PRESET_ROOMS.map(r => r.name));
  const clearAllRooms = () => setSelectedRoomNames([]);

  const handleSeatClick = (roomName: string, benchNo: number, side: string, seatIdx: number) => {
    if (!isEditMode) return;

    if (!activeSwapSeat) {
      setActiveSwapSeat({ room: roomName, benchNo, side, seatIdx });
    } else {
      // Execute Swap
      const newResults = [...allocationResults];
      const room1 = newResults.find(r => r.roomName === activeSwapSeat.room);
      const room2 = newResults.find(r => r.roomName === roomName);
      
      if (room1 && room2) {
        const bench1 = room1.benches.find(b => b.benchNo === activeSwapSeat.benchNo && b.side === activeSwapSeat.side);
        const bench2 = room2.benches.find(b => b.benchNo === benchNo && b.side === side);
        
        if (bench1 && bench2) {
          const temp = bench1.students[activeSwapSeat.seatIdx];
          bench1.students[activeSwapSeat.seatIdx] = bench2.students[seatIdx];
          bench2.students[seatIdx] = temp;
          setAllocationResults(newResults);
        }
      }
      setActiveSwapSeat(null);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedGroupId) return showToast('Please select an active exam first.', 'error');
    const selectedExam = exams.find(e => 
      e.id === selectedGroupId || 
      e.group_id === selectedGroupId || 
      `single-${e.id}` === selectedGroupId
    );
    if (!selectedExam) return;

    const performSave = async () => {
      setIsSaving(true);
      try {
        await saveSeatPlan(selectedExam.id, `${selectedExam.name} - Final Layout`, allocationResults);
        const updated = await getSeatPlans();
        setSavedPlans(updated);
        showToast('Seat plan saved as Master Plan!');
      } catch (e: any) {
        showToast(e.message, 'error');
      } finally {
        setIsSaving(false);
      }
    };

    if (currentSavedPlan) {
      setConfirmModal({
        message: 'A saved plan already exists for this exam. Overwrite it?',
        onConfirm: performSave
      });
    } else {
      performSave();
    }
  };

  const handleLoadPlan = (plan: any) => {
    ignoreNextGeneration.current = false; // Allow regeneration so old plans get fixed by new rules

    // 1. Determine density (students per bench) from the first room/bench
    const firstRoom = plan.allocation_data[0];
    const firstBench = firstRoom?.benches?.[0];
    const loadedDensity = firstBench?.students?.length || 2;

    // 2. Determine allocation mode and configuration
    if (plan.allocation_data.length > 1) {
      setAllocationMode('bulk');
      setBulkMode('manual');
      setSelectedRoomNames(plan.allocation_data.map((r: any) => r.roomName));
    } else if (firstRoom) {
      setAllocationMode('single');
      const room = PRESET_ROOMS.find(r => r.name === firstRoom.roomName);
      if (room) {
        setConfig(prev => ({
          ...prev,
          roomName: room.name,
          windowBenches: room.windows,
          doorBenches: room.doors,
          studentsPerBench: loadedDensity
        }));
      }
    }

    // 3. Set config density even if in bulk mode
    setConfig(prev => ({ ...prev, studentsPerBench: loadedDensity }));

    // 3.5 Restore Room Column Mappings from loaded layout
    const mappings: Record<string, string[]> = {};
    plan.allocation_data.forEach((room: any) => {
      const bench = room.benches?.[0];
      if (bench) {
        mappings[room.roomName] = bench.students.map((s: any) => s ? s.program : '');
      }
    });
    setRoomColumnMappings(mappings);

    // 4. Set results and extracted students
    setAllocationResults(plan.allocation_data);
    setSelectedGroupId(plan.exam_id);
    setIsEditMode(false);
    
    const extractedStudents = plan.allocation_data.flatMap((r: any) => 
      r.benches.flatMap((b: any) => b.students).filter((s: any) => s !== null)
    );
    setStudents(extractedStudents);
    
    showToast('Seat plan loaded successfully!');
  };

  const handleDeletePlan = async (id: string) => {
    setConfirmModal({
      message: 'Are you sure you want to delete this saved plan?',
      onConfirm: async () => {
        try {
          await deleteSeatPlan(id);
          setSavedPlans(prev => prev.filter(p => p.id !== id));
          showToast('Seat plan deleted.');
        } catch (e: any) {
          showToast(e.message, 'error');
        }
      }
    });
  };

  return (
    <div className={styles.adminPage}>
      <div className={styles.pageHeader}>
        <h1>Exam Seat Plan Generator</h1>
        <p>Configure layouts and distribute students across multiple rooms.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Capacity Banner */}
          <div style={{ 
            background: totalAssigned > totalCapacity ? '#fef2f2' : '#f0f9ff', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            border: `1px solid ${totalAssigned > totalCapacity ? '#fee2e2' : '#e0f2fe'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                background: totalAssigned > totalCapacity ? '#ef4444' : '#3b82f6', 
                color: 'white', 
                padding: '0.75rem', 
                borderRadius: '8px' 
              }}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#1e293b' }}>Allocation Summary</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                  {totalAssigned} Students assigned across {allocationResults.length} rooms
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: totalAssigned > totalCapacity ? '#ef4444' : '#3b82f6' }}>
                {totalAssigned} / {totalCapacity}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>TOTAL CAPACITY</div>
            </div>
          </div>

          {/* Student Distribution Summary */}
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {studentGroups.map(([group, count]) => (
              <div 
                key={group}
                style={{ 
                  flexShrink: 0, padding: '0.75rem 1rem', background: 'white', 
                  borderRadius: '8px', border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', 
                  flexDirection: 'column', gap: '0.25rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{group}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{count}</div>
              </div>
            ))}
          </div>

          {totalAssigned > totalCapacity && (
            <div style={{ 
              background: '#ef444410', 
              color: '#b91c1c', 
              padding: '1rem', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              fontSize: '0.9rem',
              border: '1px solid #ef444430'
            }}>
              <AlertCircle size={20} />
              <span><strong>Warning:</strong> The selected rooms cannot accommodate all students. Please add more rooms or increase students per bench.</span>
            </div>
          )}

          {/* Multiple Room Previews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {allocationResults.map((result) => (
              <div key={result.roomName} className={styles.card}>
                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}><Layout size={20} /> Room: {result.roomName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={() => {
                        setIsEditMode(!isEditMode);
                        setActiveSwapSeat(null);
                      }}
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.75rem', 
                        borderRadius: '4px', 
                        border: '1px solid #cbd5e1',
                        background: isEditMode ? '#3b82f6' : 'white',
                        color: isEditMode ? 'white' : '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      {isEditMode ? 'Done Editing' : 'Edit Layout'}
                    </button>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {result.benches.flatMap(b => b.students).filter(s => s !== null).length} Students
                    </span>
                  </div>
                </div>

                {/* Column Setup Tool */}
                <div style={{ background: '#f8fafc', padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={16} /> Column Setup:
                  </span>
                  {[0, 1, 2].slice(0, config.studentsPerBench).map(colIdx => (
                    <div key={colIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {config.studentsPerBench === 3 
                          ? (colIdx === 0 ? 'Left' : colIdx === 1 ? 'Middle' : 'Right') 
                          : (colIdx === 0 ? 'Left' : 'Right')}:
                      </label>
                      <select 
                        value={(roomColumnMappings[result.roomName] || [])[colIdx] || ''}
                        onChange={(e) => {
                          const newMapping = [...(roomColumnMappings[result.roomName] || ['', '', ''])];
                          newMapping[colIdx] = e.target.value;
                          setRoomColumnMappings(prev => ({ ...prev, [result.roomName]: newMapping }));
                        }}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: 'white', outline: 'none' }}
                      >
                        <option key="default" value="">Auto (Fallback)</option>
                        {getOrderedPrograms(students).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className={styles.cardContent}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '2rem',
                    background: '#f8fafc',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1'
                  }}>
                    <div>
                      <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.8rem' }}>Window Side</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {result.benches.filter(b => b.side === 'Window').map(bench => (
                          <BenchItem 
                            key={`W-${bench.benchNo}`} 
                            bench={bench} 
                            studentsPerBench={config.studentsPerBench} 
                            onSeatClick={(sIdx) => handleSeatClick(result.roomName, bench.benchNo, 'Window', sIdx)}
                            isEditMode={isEditMode}
                            activeSwapSeat={activeSwapSeat?.room === result.roomName && activeSwapSeat?.benchNo === bench.benchNo && activeSwapSeat?.side === 'Window' ? activeSwapSeat.seatIdx : null}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.8rem' }}>Door Side</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {result.benches.filter(b => b.side === 'Door').map(bench => (
                          <BenchItem 
                            key={`D-${bench.benchNo}`} 
                            bench={bench} 
                            studentsPerBench={config.studentsPerBench} 
                            onSeatClick={(sIdx) => handleSeatClick(result.roomName, bench.benchNo, 'Door', sIdx)}
                            isEditMode={isEditMode}
                            activeSwapSeat={activeSwapSeat?.room === result.roomName && activeSwapSeat?.benchNo === bench.benchNo && activeSwapSeat?.side === 'Door' ? activeSwapSeat.seatIdx : null}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Allocation Mode Switch */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Sliders size={20} /> Allocation Mode</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', padding: '0.25rem', background: '#f1f5f9', borderRadius: '8px', marginBottom: '1rem' }}>
                <button 
                  onClick={() => setAllocationMode('single')}
                  style={{ 
                    flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                    background: allocationMode === 'single' ? 'white' : 'transparent',
                    boxShadow: allocationMode === 'single' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: allocationMode === 'single' ? '600' : '400'
                  }}
                >
                  Single Room
                </button>
                <button 
                  onClick={() => setAllocationMode('bulk')}
                  style={{ 
                    flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                    background: allocationMode === 'bulk' ? 'white' : 'transparent',
                    boxShadow: allocationMode === 'bulk' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: allocationMode === 'bulk' ? '600' : '400'
                  }}
                >
                  Bulk Allocation
                </button>
              </div>

              {allocationMode === 'bulk' && (
                <div style={{ display: 'flex', padding: '0.25rem', background: '#f1f5f9', borderRadius: '8px' }}>
                  <button 
                    onClick={() => setBulkMode('auto')}
                    style={{ 
                      flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: bulkMode === 'auto' ? '#3b82f6' : 'transparent',
                      color: bulkMode === 'auto' ? 'white' : '#64748b',
                    }}
                  >
                    Auto Assign
                  </button>
                  <button 
                    onClick={() => setBulkMode('manual')}
                    style={{ 
                      flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: bulkMode === 'manual' ? '#3b82f6' : 'transparent',
                      color: bulkMode === 'manual' ? 'white' : '#64748b',
                    }}
                  >
                    Manual Select
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Sliders size={20} /> Configuration</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Students Per Bench</label>
                <select 
                  className={styles.formInput}
                  value={config.studentsPerBench}
                  onChange={(e) => setConfig({ ...config, studentsPerBench: parseInt(e.target.value) })}
                >
                  <option value={1}>1 Student</option>
                  <option value={2}>2 Students</option>
                  <option value={3}>3 Students</option>
                </select>
              </div>

              {allocationMode === 'single' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Select Room</label>
                    <select 
                      className={styles.formInput}
                      value={config.roomName}
                      onChange={(e) => {
                        const room = PRESET_ROOMS.find(r => r.name === e.target.value);
                        if (room) {
                          setConfig({ ...config, roomName: room.name, windowBenches: room.windows, doorBenches: room.doors });
                        }
                      }}
                    >
                      {PRESET_ROOMS.map(r => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : bulkMode === 'manual' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Room Selection</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={selectAllRooms} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>All</button>
                      <button onClick={clearAllRooms} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>None</button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    {PRESET_ROOMS.map(room => {
                      const isSelected = selectedRoomNames.includes(room.name);
                      const cap = (room.windows + room.doors) * config.studentsPerBench;
                      return (
                        <div 
                          key={room.name} 
                          onClick={() => toggleRoom(room.name)}
                          style={{ 
                            padding: '0.6rem', borderRadius: '6px', cursor: 'pointer',
                            background: isSelected ? 'white' : 'transparent',
                            border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '600' : '400', color: isSelected ? '#1e40af' : '#475569' }}>{room.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cap: {cap}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: isSelected ? '100%' : '0%', height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={handleSmartSelect}
                    style={{ 
                      width: '100%', marginTop: '0.75rem', padding: '0.6rem', 
                      background: '#3b82f6', color: 'white', border: 'none', 
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
                    }}
                  >
                    <ClipboardList size={16} /> Smart Suggest Rooms
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    System will automatically choose the best rooms to fit your {students.length} students.
                  </p>
                </div>
              )}

              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: totalAssigned >= students.length ? '#f0fdf4' : '#fff7ed', border: `1px solid ${totalAssigned >= students.length ? '#bbf7d0' : '#fed7aa'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: totalAssigned >= students.length ? '#166534' : '#9a3412', fontWeight: 'bold' }}>
                    {totalAssigned >= students.length ? '✓ Enough Capacity' : '⚠️ Need More Space'}
                  </span>
                  <span style={{ color: '#64748b' }}>{totalAssigned} / {students.length}</span>
                </div>
                {totalAssigned < students.length && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: '#9a3412' }}>
                    Missing {students.length - totalAssigned} seats. Select more rooms.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Upload size={20} /> Student List</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Active Exam Context</label>
                <select 
                  value={selectedGroupId} 
                  onChange={e => {
                    setSelectedGroupId(e.target.value);
                    setSelectedProgram('');
                    setSelectedTerm('');
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '2px solid #3b82f644', fontSize: '0.85rem', background: '#f8fafc' }}
                >
                  <option key="default" value="">
                    {isLoadingExams ? '-- Loading Exams... --' : 
                     groupedExams.length === 0 ? '-- No Exams Found --' : 
                     '-- Select Exam Batch --'}
                  </option>
                  {groupedExams.map(group => {
                    const first = group[0];
                    const label = group.length > 1 
                      ? `${first.name} (${group.length} Programs)` 
                      : `${first.name} — ${first.program} ${first.year_or_semester}`;
                    return (
                      <option key={first.group_id || first.id} value={first.group_id || `single-${first.id}`}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p style={{ fontSize: '0.75rem', color: selectedGroupId ? '#10b981' : '#ef4444', marginTop: '0.4rem', fontWeight: '500' }}>
                  {selectedGroupId ? '✓ Exam context active. You can now add students.' : '⚠️ You must select an Active Exam Context before you can add students.'}
                </p>
              </div>

              <div style={{ opacity: selectedGroupId ? 1 : 0.5, pointerEvents: selectedGroupId ? 'auto' : 'none', transition: 'all 0.2s' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Current Program</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select 
                      className={styles.formInput} 
                      value={selectedProgram} 
                      onChange={e => setSelectedProgram(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option key="default" value="">-- Program --</option>
                      {(() => {
                        const currentGroup = groupedExams.find(g => (g[0].group_id || `single-${g[0].id}`) === selectedGroupId) || [];
                        const programs = Array.from(new Set(currentGroup.map(e => e.program)));
                        return programs.map(p => <option key={p} value={p}>{p}</option>);
                      })()}
                    </select>
                    <select 
                      className={styles.formInput} 
                      value={selectedTerm} 
                      onChange={e => setSelectedTerm(e.target.value)}
                      style={{ flex: 1 }}
                      disabled={!selectedProgram}
                    >
                      <option key="default" value="">-- Term --</option>
                      {(() => {
                        const currentGroup = groupedExams.find(g => (g[0].group_id || `single-${g[0].id}`) === selectedGroupId) || [];
                        const terms = currentGroup
                          .filter(e => e.program === selectedProgram)
                          .map(e => e.year_or_semester);
                        return terms.map(t => <option key={t} value={t}>{t}</option>);
                      })()}
                    </select>
                  </div>
                  
                  {selectedProgram === 'B.Ed' && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>B.Ed Major (Optional)</label>
                      <select 
                        className={styles.formInput} 
                        value={selectedMajor} 
                        onChange={e => setSelectedMajor(e.target.value)}
                      >
                        <option value="">-- Select Major (If applicable) --</option>
                        <option value="English">Major English</option>
                        <option value="Nepali">Major Nepali</option>
                        <option value="Health">Major Health</option>
                        <option value="Pop">Major Population</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Quick Paste (Roll, Name)</label>
                  <textarea 
                    placeholder="101, John Doe&#10;102, Jane Smith"
                    value={quickPaste}
                    onChange={e => setQuickPaste(e.target.value)}
                    style={{ width: '100%', height: '80px', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                  <button 
                    onClick={() => {
                      if (!selectedProgram || !selectedTerm) {
                        showToast('Please select a program and year before pasting.', 'error');
                        return;
                      }
                      
                      const lines = quickPaste.split('\n').filter(l => l.trim().length > 0);
                      const parsed: Student[] = lines.map(line => {
                        const parts = line.split(/[,\t]/);
                        return {
                          roll: parts[0]?.trim(),
                          name: parts[1]?.trim() || 'Unknown',
                          program: `${selectedProgram} ${selectedTerm}`,
                          major: selectedMajor || undefined
                        };
                      }).filter(s => s.roll);
                      
                      setStudents(prev => [...prev, ...parsed]);
                      setQuickPaste('');
                      showToast(`${parsed.length} students added from Quick Paste.`);
                    }}
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    Add Pasted Students
                  </button>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>Load from Admissions Registry</label>
                  <select 
                    className={styles.formInput} 
                    value={selectedBatchId} 
                    onChange={e => setSelectedBatchId(e.target.value)}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  >
                    <option key="default" value="">-- Select Admission Batch --</option>
                    {savedBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.total_students} students)</option>
                    ))}
                  </select>
                  <button 
                    onClick={async () => {
                      if (!selectedProgram || !selectedTerm) {
                        showToast('Please select a program and year before loading.', 'error');
                        return;
                      }
                      if (!selectedBatchId) {
                        showToast('Please select a batch.', 'error');
                        return;
                      }
                      
                      const batchStudents = await getStudentsByBatch(selectedBatchId);
                      const parsed: Student[] = batchStudents.map(s => ({
                        roll: s.tu_regd_no || s.id.slice(0,6).toUpperCase(), // Fallback to partial ID if no TU Regd
                        name: s.name,
                        program: `${selectedProgram} ${selectedTerm}`,
                        major: selectedMajor || undefined
                      }));
                      
                      setStudents(prev => [...prev, ...parsed]);
                      setSelectedBatchId('');
                      showToast(`${parsed.length} students loaded from Registry.`);
                    }}
                    style={{ width: '100%', padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    Load Batch Students
                  </button>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#64748b' }}>Or upload from an Excel file:</p>

                  <div style={{ border: '2px dashed #0070f31a', padding: '1rem', textAlign: 'center', borderRadius: '8px', marginBottom: '1rem' }}>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} id="excel-upload" style={{ display: 'none' }} />
                    <label htmlFor="excel-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <FileText size={18} color="#3b82f6" />
                      <span style={{ fontSize: '0.8rem' }}>Upload Excel (Roll, Name, Major)</span>
                    </label>
                  </div>
                </div>


              {students.length > 0 && (
                <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 'bold' }}>Loaded Students</span>
                    <button onClick={() => setStudents([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Clear All</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {studentGroups.map(([groupName, count]) => (
                      <div key={groupName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>{groupName} <strong style={{ color: '#3b82f6' }}>({count})</strong></span>
                        <button 
                          onClick={() => removeStudentGroup(groupName)} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                          title="Remove this group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {students.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                   <h4 style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                     <Users size={16} /> Sync to Teacher Portal
                   </h4>
                   <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>This will link <strong>{students.length}</strong> students to the selected exam.</p>
                   
                   <button 
                     disabled={!selectedGroupId || isSyncing}
                     onClick={async () => {
                       setIsSyncing(true);
                       try {
                         const currentGroup = groupedExams.find(g => (g[0].group_id || `single-${g[0].id}`) === selectedGroupId) || []; for (const exam of currentGroup) { const progStr = `${exam.program} ${exam.year_or_semester}`; const matching = students.filter(s => s.program === progStr); if (matching.length > 0) { await syncSeatPlanStudents(exam.id, matching.map(s => ({ name: s.name, roll: s.roll, major: s.major }))); } }
                         showToast('Successfully synced students to the Teacher Portal!');
                       } catch (e: any) {
                         showToast(e.message, 'error');
                       } finally {
                         setIsSyncing(false);
                       }
                     }}
                     style={{ width: '100%', padding: '0.5rem', background: !selectedGroupId || isSyncing ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: !selectedGroupId || isSyncing ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                   >
                     {isSyncing ? 'Syncing...' : 'Sync Students Database'}
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Export Card */}
          <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.cardHeader}>
              <h3><Download size={20} /> Export & Generate PDFs</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div 
                  className={`export-card ${(!students.length || isGenerating) ? 'disabled' : ''}`}
                  onClick={() => students.length > 0 && !isGenerating && handleDownloadPDF('attendance')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: '600' }}>
                      <FileText size={20} /> Attendance Sheet
                    </div>
                    {isGenerating === 'attendance' && <span className="loader-spinner"></span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                    Generate signature sheets for students to sign on exam days. Includes all dates.
                  </div>
                </div>

                <div 
                  className={`export-card ${(!students.length || isGenerating) ? 'disabled' : ''}`}
                  onClick={() => students.length > 0 && !isGenerating && handleDownloadPDF('marks')}
                  style={{ '--hover-color': '#10b981' } as any}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: '600' }}>
                      <ClipboardList size={20} /> Marks Slip
                    </div>
                    {isGenerating === 'marks' && <span className="loader-spinner" style={{ borderTopColor: '#10b981' }}></span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                    Generate theory and practical grading slips for the examination department.
                  </div>
                </div>

                <div 
                  className={`export-card ${(!students.length || isGenerating) ? 'disabled' : ''}`}
                  onClick={() => students.length > 0 && !isGenerating && handleDownloadPDF('distribution')}
                  style={{ '--hover-color': '#f59e0b' } as any}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: '600' }}>
                      <Users size={20} /> Room Distribution
                    </div>
                    {isGenerating === 'distribution' && <span className="loader-spinner" style={{ borderTopColor: '#f59e0b' }}></span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                    Generate a summary showing roll numbers allocated to each room for notice boards.
                  </div>
                </div>

                <div 
                  className={`export-card ${(!students.length || isGenerating) ? 'disabled' : ''}`}
                  onClick={() => students.length > 0 && !isGenerating && handleDownloadPDF('desk')}
                  style={{ '--hover-color': '#8b5cf6' } as any}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', fontWeight: '600' }}>
                      <LayoutGrid size={20} /> Desk Visuals
                    </div>
                    {isGenerating === 'desk' && <span className="loader-spinner" style={{ borderTopColor: '#8b5cf6' }}></span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                    Generate visual map representations of the desk arrangements for classrooms.
                  </div>
                </div>
              </div>

              {allocationResults.length > 0 && selectedGroupId && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className={styles.submitBtn} 
                    onClick={handleSavePlan} 
                    disabled={isSaving}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.3)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    <Save size={18} /> 
                    {isSaving ? 'Saving to Database...' : (currentSavedPlan ? 'Update Seat Plan' : 'Save Seat Plan')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Saved Plans Card */}
    <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><History size={20} /> Saved Plans</h3>
            </div>
            <div className={styles.cardContent}>
              {savedPlans.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>No saved plans found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {savedPlans.map(plan => {
                    // Find if this plan belongs to the currently selected group/exam
                    const isCurrentPlan = plan.exam_id === selectedGroupId || 
                      exams.some(e => (e.group_id === selectedGroupId || e.id === selectedGroupId) && e.id === plan.exam_id);
                    
                    return (
                      <div 
                        key={plan.id}
                        style={{ 
                          padding: '0.75rem', 
                          background: isCurrentPlan ? '#f0f9ff' : '#f8fafc', 
                          borderRadius: '8px', 
                          border: `1px solid ${isCurrentPlan ? '#3b82f644' : '#e2e8f0'}`,
                          fontSize: '0.85rem',
                          position: 'relative'
                        }}
                      >
                        {isCurrentPlan && <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#3b82f6', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Active</div>}
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>{plan.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                          {plan.exams?.name} • {new Date(plan.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleLoadPlan(plan)}
                            style={{ flex: 1, padding: '0.35rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Load
                          </button>
                          <button 
                            onClick={() => handleDeletePlan(plan.id)}
                            style={{ padding: '0.35rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* CUSTOM UI COMPONENTS */}
      {confirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'white', padding: '1.5rem', borderRadius: '12px',
            width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Confirm Action</h4>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setConfirmModal(null)}
                style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .export-card {
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .export-card:hover:not(.disabled) {
          border-color: var(--hover-color, #3b82f6);
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }
        .export-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8fafc;
        }
        .loader-spinner {
          border: 2px solid #e2e8f0;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }
      ` }} />
      </div>
    </div>
  );
}

function BenchItem({ 
  bench, 
  studentsPerBench, 
  onSeatClick, 
  isEditMode, 
  activeSwapSeat 
}: { 
  bench: Bench, 
  studentsPerBench: number, 
  onSeatClick?: (idx: number) => void,
  isEditMode?: boolean,
  activeSwapSeat?: number | null
}) {
  return (
    <div style={{ 
      background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '4px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.25rem', textAlign: 'center' }}>B{bench.benchNo}</div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {Array.from({ length: studentsPerBench }).map((_, i) => {
          const student = bench.students[i];
          const isActive = activeSwapSeat === i;
          
          return (
            <div 
              key={i} 
              onClick={() => onSeatClick?.(i)}
              style={{ 
                flex: 1, height: '28px', 
                background: isActive ? '#3b82f644' : (student ? '#ebf5ff' : '#f8fafc'),
                border: `1px solid ${isActive ? '#3b82f6' : (student ? '#3b82f644' : '#e2e8f0')}`,
                borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', color: student ? '#1e40af' : '#cbd5e1', fontWeight: student ? '600' : '400',
                cursor: isEditMode ? 'pointer' : 'default',
                transition: 'all 0.1s'
              }}
              title={student ? `${student.name} (${student.program})` : 'Empty'}
            >
              {student ? student.roll : '-'}
            </div>
          );
        })}
      </div>
    </div>
  );
}


