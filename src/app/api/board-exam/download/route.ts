import { NextRequest, NextResponse } from 'next/server';
import { generateLedgerExcel, generateLedgerPdf, generateResultReportPdf } from '@/lib/fileGenerators';

export async function POST(req: NextRequest) {
  try {
    const { sessionData, type, customName } = await req.json();

    if (!sessionData || !type) {
      return new NextResponse('Missing sessionData or type parameter', { status: 400 });
    }

    const { metadata, subjects, students } = sessionData;

    let fileBuffer: Buffer;
    let contentType = '';
    let filename = '';
    
    // Sanitize custom name
    let baseName = customName 
      ? customName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_') 
      : `Board_Exam`;

    if (type === 'excel') {
      fileBuffer = await generateLedgerExcel(metadata, subjects, students);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${baseName}.xlsx`;
    } else if (type === 'ledger-pdf') {
      fileBuffer = await generateLedgerPdf(metadata, subjects, students);
      contentType = 'application/pdf';
      filename = `${baseName}_Mark_Ledger.pdf`;
    } else if (type === 'report-pdf') {
      fileBuffer = await generateResultReportPdf(metadata, subjects, students);
      contentType = 'application/pdf';
      filename = `${baseName}_Result_Report.pdf`;
    } else {
      return new NextResponse('Invalid type parameter', { status: 400 });
    }

    // Use 'inline' for PDFs to allow browser preview, 'attachment' for Excel
    const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Download Error:', error);
    return new NextResponse('Internal Server Error: ' + error.message, { status: 500 });
  }
}
