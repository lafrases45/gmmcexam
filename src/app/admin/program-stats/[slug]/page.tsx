'use client';
import { useEffect, useState, Fragment, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, GraduationCap, Printer, RefreshCw, Download, FileText } from 'lucide-react';
import reportStyles from './report.module.css';

const PROGRAM_GROUPS = [
  { id: 'bbs',      label: 'BBS',       prefixes: ['BBS'],         color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'bed',      label: 'B.Ed.',     prefixes: ['B.ED.', 'B.ED', 'BED'], color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'bhm',      label: 'BHM',       prefixes: ['BHM'],         color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'bim-bitm', label: 'BIM/BITM', prefixes: ['BITM', 'BIM'], color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'mbs',      label: 'MBS',       prefixes: ['MBS'],         color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
];

const YEAR_ORDER = [
  '1st Year','2nd Year','3rd Year','4th Year',
  '1st Semester','2nd Semester','3rd Semester','4th Semester',
  '5th Semester','6th Semester','7th Semester','8th Semester',
  '1st Sem','2nd Sem','3rd Sem','4th Sem',
  '5th Sem','6th Sem','7th Sem','8th Sem',
];

const ETHNIC_CATEGORIES = ['Dalit','EDJ','Janajati','Madhesi','Other'];

function matchesGroup(batchName: string, prefixes: string[]): boolean {
  const upper = batchName.toUpperCase().trim();
  return prefixes.some(p => {
    const up = p.toUpperCase();
    return upper.startsWith(up + ' ') || upper.startsWith(up + '-') || upper === up;
  });
}

function extractYear(batchName: string): string {
  const upper = batchName.toUpperCase();
  for (const y of YEAR_ORDER) {
    if (upper.includes(y.toUpperCase())) return y;
  }
  return 'Other';
}

function isGenderMale(g: string): boolean { return ['male','m'].includes(g.toLowerCase()); }
function isGenderFemale(g: string): boolean { return ['female','f'].includes(g.toLowerCase()); }

function normalizeBatchName(name: string): string {
  // Remove major info in parentheses like "(Major English)" or " (English)"
  let normalized = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  
  // Remove trailing sections like " A", " B", " C", " Sec A", " Section B"
  normalized = normalized.replace(/\s+(?:Sec\s+|Section\s+)?[A-Z]$/i, '').trim();
  
  // Specifically for common majors if they are appended to the string
  const majorsToStrip = ['English', 'Nepali', 'Health', 'Math', 'Population', 'Pop'];
  for (const m of majorsToStrip) {
    const regex = new RegExp(`\\s+${m}$`, 'i');
    normalized = normalized.replace(regex, '').trim();
  }
  
  return normalized;
}

const thStyle: React.CSSProperties = { padding: '0.75rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', color: '#475569', borderRight: '1px solid #e2e8f0' };
const tdStyle: React.CSSProperties = { padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid #f1f5f9', color: '#1e293b', borderRight: '1px solid #e2e8f0' };

export default function ProgramStatsDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const selectedGroup = PROGRAM_GROUPS.find(g => g.id === slug);

  const [students, setStudents] = useState<{ gender: string; ethnic_group: string; batchName: string; major?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!selectedGroup) {
      router.push('/admin');
      return;
    }

    async function fetchData() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('admission_students')
        .select('gender, ethnic_group, major, admission_batches!inner(name)');

      if (data) {
        const allStudents = data.map((s: any) => ({
          gender: s.gender || '',
          ethnic_group: s.ethnic_group || 'Other',
          batchName: s.admission_batches?.name || '',
          major: s.major || '',
        }));

        const filtered = allStudents.filter((s: { batchName: string }) => matchesGroup(s.batchName, selectedGroup?.prefixes || []));
        setStudents(filtered);
      }
      setIsLoading(false);
    }
    
    fetchData();
  }, [slug, selectedGroup, router]);

  // Memoize Cross-Tabulation Data Structure to prevent heavy processing on every render
  const { tableData, activeBatches } = useMemo(() => {
    const data: Record<string, Record<string, { male: number; female: number }>> = {};
    
    // Group students by normalized batch name to merge sections/majors
    students.forEach(s => {
      const b = normalizeBatchName(s.batchName);
      const e = ETHNIC_CATEGORIES.includes(s.ethnic_group) ? s.ethnic_group : 'Other';
      
      if (!data[b]) {
         data[b] = {};
         ETHNIC_CATEGORIES.forEach(cat => data[b][cat] = { male: 0, female: 0 });
      }

      if (isGenderMale(s.gender)) data[b][e].male++;
      else if (isGenderFemale(s.gender)) data[b][e].female++;
    });

    // Get active batches and sort them logically
    const sortedBatches = Object.keys(data).sort((a, b) => {
      const yearA = extractYear(a);
      const yearB = extractYear(b);
      const indexA = YEAR_ORDER.indexOf(yearA);
      const indexB = YEAR_ORDER.indexOf(yearB);
      
      if (indexA !== indexB) return indexA - indexB;

      // If same year/semester, sort by name (usually contains year like 2082)
      return b.localeCompare(a); 
    });

    return { tableData: data, activeBatches: sortedBatches };
  }, [students]);

  if (!selectedGroup) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the report.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedGroup.label} - Demographics Report</title>
          <style>
            body { 
              font-family: 'Inter', system-ui, sans-serif; 
              color: #0f172a;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              margin: 1cm;
              size: landscape;
            }
            /* Override the inline display:none for the campus header */
            .print-only-header {
              display: block !important;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Slight delay to ensure rendering is complete before popping the print dialog
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch('/api/admin/program-stats/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programLabel: selectedGroup.label,
          tableData,
          activeBatches,
          ethnicCategories: ETHNIC_CATEGORIES,
          totalStudents: students.length
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedGroup.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_stats_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className={reportStyles.container}>
        <div className={reportStyles.topHeader}>
          <button 
            onClick={() => router.back()} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, padding: '0.5rem' }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div className={reportStyles.buttonGroup}>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isDownloading || isLoading || students.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', cursor: (isDownloading || isLoading || students.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', opacity: (isDownloading || isLoading || students.length === 0) ? 0.7 : 1 }}
            >
              {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />} 
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button 
              onClick={handlePrint} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            >
              <Printer size={18} /> Print Official Report
            </button>
          </div>
        </div>

        <div id="printable-report" className={reportStyles.reportCard}>
          
          {/* Print-Only Campus Header */}
          <div className="print-only-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#000', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Gauradaha Multiple Campus</h2>
            <p style={{ fontSize: '14px', color: '#333', margin: '0 0 5px 0' }}>Gauradaha-1, Jhapa, Koshi Province, Nepal</p>
            <p style={{ fontSize: '14px', color: '#333', margin: '0 0 15px 0' }}>Estd: 2064 B.S. | QAA Certified by UGC Nepal</p>
            <div style={{ borderBottom: '2px solid #000', width: '100%' }}></div>
          </div>

          <div className={reportStyles.reportTitleSection}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{selectedGroup.label} Ethnic Report (Demographics)</h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>Total Active Students: <strong style={{ color: selectedGroup.color, fontSize: '1.1rem' }}>{students.length}</strong></p>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', color: '#94a3b8' }}>
              <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '1rem' }} />
              <p>Gathering statistics...</p>
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>No student records found for {selectedGroup.label}.</div>
          ) : (
            <div className={reportStyles.tableWrapper} style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={thStyle}>Year / Level</th>
                    {ETHNIC_CATEGORIES.map(cat => (
                      <th key={cat} colSpan={2} style={{ ...thStyle, textAlign: 'center', background: '#f1f5f9' }}>{cat}</th>
                    ))}
                    <th colSpan={3} style={{ ...thStyle, textAlign: 'center', background: '#e2e8f0', color: '#0f172a' }}>Total</th>
                  </tr>
                  <tr>
                    {ETHNIC_CATEGORIES.map(cat => (
                      <Fragment key={cat}>
                        <th style={{ ...thStyle, textAlign: 'center', color: '#3b82f6', fontSize: '0.7rem', padding: '0.5rem' }}>M</th>
                        <th style={{ ...thStyle, textAlign: 'center', color: '#ec4899', fontSize: '0.7rem', padding: '0.5rem' }}>F</th>
                      </Fragment>
                    ))}
                    <th style={{ ...thStyle, textAlign: 'center', color: '#3b82f6', background: '#e2e8f0', fontSize: '0.7rem', padding: '0.5rem' }}>M</th>
                    <th style={{ ...thStyle, textAlign: 'center', color: '#ec4899', background: '#e2e8f0', fontSize: '0.7rem', padding: '0.5rem' }}>F</th>
                    <th style={{ ...thStyle, textAlign: 'center', fontWeight: 800, background: '#e2e8f0', fontSize: '0.7rem', padding: '0.5rem', color: '#0f172a' }}>T</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBatches.map(batch => {
                    let rowTotalM = 0;
                    let rowTotalF = 0;
                    return (
                      <tr key={batch}>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#475569' }}>{batch}</td>
                        {ETHNIC_CATEGORIES.map(cat => {
                          const m = tableData[batch][cat].male;
                          const f = tableData[batch][cat].female;
                          rowTotalM += m;
                          rowTotalF += f;
                          return (
                            <Fragment key={cat}>
                              <td style={{ ...tdStyle, textAlign: 'center', color: m ? '#1e293b' : '#cbd5e1' }}>{m || '-'}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: f ? '#1e293b' : '#cbd5e1' }}>{f || '-'}</td>
                            </Fragment>
                          );
                        })}
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#3b82f6' }}>{rowTotalM || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#ec4899' }}>{rowTotalF || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, background: '#f1f5f9', color: '#0f172a' }}>{rowTotalM + rowTotalF || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800, background: '#f1f5f9' }}>Grand Total</td>
                    {ETHNIC_CATEGORIES.map(cat => {
                      let colTotalM = 0;
                      let colTotalF = 0;
                      activeBatches.forEach(b => {
                        colTotalM += tableData[b][cat].male;
                        colTotalF += tableData[b][cat].female;
                      });
                      return (
                        <Fragment key={cat}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, background: '#f8fafc', color: '#3b82f6' }}>{colTotalM || '-'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, background: '#f8fafc', color: '#ec4899' }}>{colTotalF || '-'}</td>
                        </Fragment>
                      );
                    })}
                    {/* Grand Grand Total */}
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, background: '#e2e8f0', color: '#3b82f6' }}>
                      {activeBatches.reduce((acc, b) => acc + ETHNIC_CATEGORIES.reduce((s, c) => s + tableData[b][c].male, 0), 0)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, background: '#e2e8f0', color: '#ec4899' }}>
                      {activeBatches.reduce((acc, b) => acc + ETHNIC_CATEGORIES.reduce((s, c) => s + tableData[b][c].female, 0), 0)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, background: '#cbd5e1', fontSize: '1.1rem', color: '#0f172a' }}>
                      {students.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
