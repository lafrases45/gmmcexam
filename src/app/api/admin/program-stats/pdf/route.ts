import { NextResponse } from 'next/server';
import { createProgramStatsPDF } from '@/lib/pdfUtils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programLabel, tableData, activeBatches, ethnicCategories, totalStudents } = body;

    const pdfBuffer = await createProgramStatsPDF(
      programLabel,
      tableData,
      activeBatches,
      ethnicCategories,
      totalStudents
    );

    const filename = `${programLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_stats_report.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Program Stats PDF Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
