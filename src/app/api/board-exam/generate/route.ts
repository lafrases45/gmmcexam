import { NextRequest, NextResponse } from 'next/server';
import { readSessionJson } from '@/lib/tempStore';
import { generateLedgerExcel, generateLedgerPdf, generateResultReportPdf } from '@/lib/fileGenerators';
import { getLedgerExcelPath, getLedgerPdfPath, getReportPdfPath } from '@/lib/tempStore';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, sessionData } = await req.json();

    if (!sessionId || !sessionData) {
      return NextResponse.json({ error: 'Session ID and data are required' }, { status: 400 });
    }

    const { metadata, subjects, students } = sessionData;

    if (!metadata || !subjects || !students) {
      return NextResponse.json({ error: 'Invalid session data payload' }, { status: 400 });
    }

    // Paths
    const excelPath = getLedgerExcelPath(sessionId);
    const ledgerPdfPath = getLedgerPdfPath(sessionId);
    const reportPdfPath = getReportPdfPath(sessionId);

    // Generate files
    await Promise.all([
      generateLedgerExcel(metadata, subjects, students, excelPath),
      generateLedgerPdf(metadata, subjects, students, ledgerPdfPath),
      generateResultReportPdf(metadata, subjects, students, reportPdfPath)
    ]);

    return NextResponse.json({
      excelUrl: `/api/board-exam/download?session=${sessionId}&type=excel`,
      ledgerPdfUrl: `/api/board-exam/download?session=${sessionId}&type=ledger-pdf`,
      reportPdfUrl: `/api/board-exam/download?session=${sessionId}&type=report-pdf`
    });

  } catch (error: any) {
    console.error('File Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate files: ' + error.message }, { status: 500 });
  }
}
