import { NextResponse } from 'next/server';
import { createRoutinePDF } from '@/lib/pdfUtils';

export async function POST(req: Request) {
  try {
    const { examName, routine, program, yearOrSem, examTime } = await req.json();

    if (!routine || routine.length === 0) {
      return NextResponse.json({ error: 'No routine data provided' }, { status: 400 });
    }

    const pdfBuffer = await createRoutinePDF(examName, routine, program, yearOrSem, examTime);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="exam_routine.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Routine PDF Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
