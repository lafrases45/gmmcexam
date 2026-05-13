'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getScholarshipReport(fiscalYear: string) {
  const supabase = await createClient();
  
  // Fetch scholarships with student program info via batches
  const { data, error } = await supabase
    .from('scholarships')
    .select(`
      percentage,
      is_waiver,
      amount,
      admission_students (
        admission_batches (
          name
        )
      )
    `)
    .eq('fiscal_year', fiscalYear);

  if (error) throw error;

  // Process data for the report
  const programs = ['BBS/B.Ed', 'BHM', 'BIM', 'MBS'];
  const report: Record<string, any> = {};
  let grandTotalBudget = 0;

  programs.forEach(p => {
    report[p] = { '100%': 0, '75%': 0, '50%': 0, '25%': 0, 'Waiver': 0, 'Total': 0 };
  });

  data.forEach(item => {
    // Nested access to batch name
    const batchName = (item.admission_students as any)?.admission_batches?.name || '';
    let mappedProgram = 'BBS/B.Ed';
    
    if (batchName.includes('BHM')) mappedProgram = 'BHM';
    else if (batchName.includes('BIM') || batchName.includes('BITM')) mappedProgram = 'BIM';
    else if (batchName.includes('MBS')) mappedProgram = 'MBS';
    else if (batchName.includes('BBS') || batchName.includes('B.Ed')) mappedProgram = 'BBS/B.Ed';

    if (report[mappedProgram]) {
      if (item.is_waiver) {
        report[mappedProgram]['Waiver']++;
      } else if (item.percentage) {
        report[mappedProgram][`${item.percentage}%`]++;
      }
      report[mappedProgram]['Total']++;
      grandTotalBudget += Number(item.amount);
    }
  });

  return {
    report,
    grandTotalBudget
  };
}

export async function addScholarship(data: {
  student_id: string;
  fiscal_year: string;
  percentage?: number;
  is_waiver?: boolean;
  amount: number;
  remarks?: string;
  semester_or_year?: string;
  scholarship_type?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('scholarships').insert(data);
  if (error) throw error;
  revalidatePath('/admin/scholarships');
  return { success: true };
}
