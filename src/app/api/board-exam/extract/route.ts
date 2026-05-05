import { NextRequest, NextResponse } from 'next/server';
import { parsePdfBuffer } from '@/lib/pdfParser';
// import { writeSessionJson } from '@/lib/tempStore';
import { ExamMetadata } from '@/lib/boardExamStore';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract file
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Extract metadata
    const metadata: ExamMetadata = {
      examYear: (formData.get('examYear') as string) || '',
      program: (formData.get('program') as string) || '',
      part: (formData.get('part') as string) || '',
      enrollmentYear: (formData.get('enrollmentYear') as string) || '',
      resultPublishedDate: (formData.get('resultPublishedDate') as string) || '',
      examDate: (formData.get('examDate') as string) || ''
    };

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const { students, subjects } = await parsePdfBuffer(buffer);

    if (students.length === 0) {
      return NextResponse.json({ error: 'Could not extract student data from the PDF. Make sure it is a valid TU Marksheet.' }, { status: 400 });
    }

    // Generate Session ID
    const sessionId = crypto.randomUUID();

    // Prepare JSON for temp store
    const sessionData = {
      sessionId,
      metadata,
      subjects,
      students
    };

    // Save to temp file - Disabled for Cloudflare
    // await writeSessionJson(sessionId, sessionData);

    // Return session data to client
    return NextResponse.json(sessionData);
  } catch (error: any) {
    console.error('PDF Extraction Error:', error);
    return NextResponse.json({ error: 'Failed to extract data: ' + error.message }, { status: 500 });
  }
}
