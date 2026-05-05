import { NextRequest, NextResponse } from 'next/server';
import { getLedgerExcelPath, getLedgerPdfPath, getReportPdfPath } from '@/lib/tempStore';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session');
    const type = searchParams.get('type');
    const customName = searchParams.get('name');

    if (!sessionId || !type) {
      return new NextResponse('Missing session or type parameter', { status: 400 });
    }

    let filePath = '';
    let contentType = '';
    let filename = '';
    
    // Sanitize custom name: remove non-alphanumeric (except underscores and dashes)
    let baseName = customName 
      ? customName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_') 
      : `Board_Exam_${sessionId}`;

    if (type === 'excel') {
      filePath = getLedgerExcelPath(sessionId);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${baseName}.xlsx`;
    } else if (type === 'ledger-pdf') {
      filePath = getLedgerPdfPath(sessionId);
      contentType = 'application/pdf';
      filename = `${baseName}_Mark_Ledger.pdf`;
    } else if (type === 'report-pdf') {
      filePath = getReportPdfPath(sessionId);
      contentType = 'application/pdf';
      filename = `${baseName}_Result_Report.pdf`;
    } else {
      return new NextResponse('Invalid type parameter', { status: 400 });
    }

    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse('File not found or expired', { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);

    // Use 'inline' for PDFs to allow browser preview, 'attachment' for Excel
    const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error('Download Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
