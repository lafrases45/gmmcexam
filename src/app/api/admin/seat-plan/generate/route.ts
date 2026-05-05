import { NextResponse } from 'next/server';
import { createAttendancePDF, createMarksSlipPDF, createDeskLabelsPDF, createDistributionPDF } from '@/lib/pdfUtils';
import { getExamRoutine } from '@/lib/actions/exam-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomResults, examType, examDate, examId, type } = body;

    console.log('=== MULTI-ROOM PDF GENERATION DEBUG ===');
    console.log('Type:', type);
    console.log('Rooms count:', roomResults?.length);
    console.log('Exam Type:', examType);
    console.log('Exam Date:', examDate);
    console.log('Exam ID:', examId);

    if (!roomResults || roomResults.length === 0) {
      return NextResponse.json({ error: 'No room results provided' }, { status: 400 });
    }

    let pdfBuffer;
    let filename;

    switch (type) {
      case 'attendance':
        let programRoutines: Record<string, any[]> = {};
        if (examId) {
          const isSingle = examId.startsWith('single-');
          const id = isSingle ? examId.replace('single-', '') : examId;
          
          const { createClient } = await import('@/lib/supabase/server');
          const supabase = await createClient();
          
          let examsQuery = supabase.from('exams').select('id, program, year_or_semester');
          if (isSingle) {
            examsQuery = examsQuery.eq('id', id);
          } else {
            examsQuery = examsQuery.eq('group_id', id);
          }
          
          const { data: examsData } = await examsQuery;
          
          if (examsData && examsData.length > 0) {
            for (const exam of examsData) {
              const { data: routineData } = await supabase
                .from('exam_subjects')
                .select('subject_id, exam_date, subjects(name, code)')
                .eq('exam_id', exam.id)
                .not('exam_date', 'is', null)
                .order('exam_date', { ascending: true });
                
              const uniqueDates = new Set();
              const filteredRoutine = (routineData || [])
                .filter((d: any) => {
                  const date = d.exam_date?.trim();
                  if (!date || date === '') return false;
                  if (uniqueDates.has(date)) return false;
                  uniqueDates.add(date);
                  return true;
                });
                
              const programLabel = `${exam.program} ${exam.year_or_semester}`;
              programRoutines[programLabel] = filteredRoutine;
            }
          }
        }
        
        console.log('Program Routines Labels:', Object.keys(programRoutines));
        console.log('Room Results Programs:', roomResults.map((r: any) => Array.from(new Set(r.students.map((s: any) => s.program)))));

        pdfBuffer = await createAttendancePDF(roomResults, examDate, programRoutines);
        filename = `attendance_report.pdf`;
        break;
      case 'marks':
        pdfBuffer = await createMarksSlipPDF(roomResults, examType || 'Internal Examination');
        filename = `marks_entry_foils.pdf`;
        break;
      case 'desk':
        pdfBuffer = await createDeskLabelsPDF(roomResults);
        filename = `seat_plan_labels.pdf`;
        break;
      case 'distribution':
        pdfBuffer = await createDistributionPDF(roomResults);
        filename = `room_distribution.pdf`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }
    
    console.log('PDF buffer size:', pdfBuffer?.byteLength || pdfBuffer?.length, 'bytes');
    console.log('=== END DEBUG ===')

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
