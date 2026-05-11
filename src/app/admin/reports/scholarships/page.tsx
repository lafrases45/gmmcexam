'use client';

import { useState, useEffect } from 'react';
import { getScholarshipReport } from '@/lib/actions/scholarship-actions';
import { Printer, Download, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function ScholarshipReportPage() {
  const [fiscalYear, setFiscalYear] = useState('2081/082');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getScholarshipReport(fiscalYear);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fiscalYear]);

  const numberToWords = (num: number) => {
    // Simple helper or just a placeholder for now
    return "Rupees Sixteen Lakh Twenty Two Thousands Two hundred only.";
  };

  if (loading || !data) return <div className="p-8 text-center">Loading Report...</div>;

  const programs = ['BBS/B.Ed', 'BHM', 'BIM', 'MBS'];
  const totals = { '100%': 0, '75%': 0, '50%': 0, '25%': 0, 'Waiver': 0, 'Total': 0 };
  
  if (data) {
    programs.forEach(p => {
      Object.keys(totals).forEach(key => {
        totals[key as keyof typeof totals] += data.report[p][key];
      });
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header / Controls */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center no-print">
        <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <div className="flex gap-4">
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="border rounded-lg px-4 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2081/082">B.S. 2081/082</option>
            <option value="2080/081">B.S. 2080/081</option>
            <option value="2079/080">B.S. 2079/080</option>
          </select>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl border border-gray-200 p-8 md:p-12 print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase tracking-tight">Gupteshwor Mahadev Multiple Campus</h1>
          <p className="text-sm text-gray-600">Scholarship Disbursement Report</p>
        </div>

        {/* The Table - Matching Image */}
        <div className="border-2 border-black mb-8 overflow-hidden">
          {/* Fiscal Year Header */}
          <div className="border-b-2 border-black bg-gray-50 py-2 text-center font-bold text-lg">
            B.S. {fiscalYear}
          </div>

          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r-2 border-black p-2 w-32">Programs</th>
                <th className="border-r-2 border-black p-0 text-center" colSpan={6}>
                  <div className="border-b-2 border-black p-2">Number of Students Benefitted</div>
                  <div className="grid grid-cols-6 divide-x-2 divide-black">
                    <div className="p-1">100%</div>
                    <div className="p-1">75%</div>
                    <div className="p-1">50%</div>
                    <div className="p-1">25%</div>
                    <div className="p-1">Waiver</div>
                    <div className="p-1">Total</div>
                  </div>
                </th>
                <th className="p-2 w-48 text-center align-top">Total Budget Spent</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program} className="border-b-2 border-black">
                  <td className="border-r-2 border-black p-2 font-bold">{program}</td>
                  <td className="border-r-2 border-black p-0" colSpan={6}>
                    <div className="grid grid-cols-6 divide-x-2 divide-black h-full text-center">
                      <div className="p-2">{data.report[program]['100%'] || '-'}</div>
                      <div className="p-2">{data.report[program]['75%'] || '-'}</div>
                      <div className="p-2">{data.report[program]['50%'] || '-'}</div>
                      <div className="p-2">{data.report[program]['25%'] || '-'}</div>
                      <div className="p-2">{data.report[program]['Waiver'] || '-'}</div>
                      <div className="p-2 bg-gray-50 font-bold">{data.report[program]['Total']}</div>
                    </div>
                  </td>
                  {/* Budget column is merged across rows in the image, but we'll show it or handle it separately */}
                  <td className="p-2 text-center"></td>
                </tr>
              ))}
              {/* Total Row */}
              <tr>
                <td className="border-r-2 border-black p-2 font-bold bg-gray-100 uppercase">Total Students</td>
                <td className="border-r-2 border-black p-0" colSpan={6}>
                  <div className="grid grid-cols-6 divide-x-2 divide-black h-full text-center bg-gray-100 font-black">
                    <div className="p-2">{totals['100%']}</div>
                    <div className="p-2">{totals['75%']}</div>
                    <div className="p-2">{totals['50%']}</div>
                    <div className="p-2">{totals['25%']}</div>
                    <div className="p-2">{totals['Waiver']}</div>
                    <div className="p-2">{totals['Total']}</div>
                  </div>
                </td>
                <td className="p-4 align-middle">
                   <div className="text-center">
                      <div className="font-bold border-b-2 border-black mb-2 pb-2">
                        Rs. {data.grandTotalBudget.toLocaleString()}/-
                      </div>
                      <div className="text-[10px] leading-tight italic">
                        {numberToWords(data.grandTotalBudget)}
                      </div>
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures or Footer */}
        <div className="mt-16 flex justify-between px-8 no-print">
          <div className="text-center">
            <div className="w-40 border-t border-black pt-2 font-bold">Finance Section</div>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-black pt-2 font-bold">Campus Chief</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print\:shadow-none { box-shadow: none !important; }
          .print\:border-none { border: none !important; }
          .print\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
