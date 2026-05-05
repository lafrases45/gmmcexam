import { NextRequest, NextResponse } from 'next/server';
import { getExamsByGroup, getExamRoutine } from '@/lib/actions/exam-actions';
import { createMasterRoutinePDF } from '@/lib/pdfUtils';

export async function POST(req: NextRequest) {
  try {
    const { group_id } = await req.json();
    if (!group_id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const exams = await getExamsByGroup(group_id);
    if (!exams.length) {
      return NextResponse.json({ error: 'No exams found in group' }, { status: 404 });
    }

    const groupSubjectsData: Record<string, any[]> = {};
    for (const ex of exams) {
      const routine = await getExamRoutine(ex.id);
      groupSubjectsData[ex.id] = routine;
    }

    const pdfBytes = await createMasterRoutinePDF(
      exams[0].name, // Using the first exam's name as the session name
      exams,
      groupSubjectsData
    );

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="master_routine_${exams[0].name.replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Master Routine API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
