import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // This endpoint acts as a signal that the user has finalized the verification 
    // and is ready to view the output. The actual file generation is handled 
    // on-demand by the /api/board-exam/download endpoint.
    
    return NextResponse.json({ 
      success: true, 
      message: 'Generation signal received',
      sessionId 
    });
  } catch (error: any) {
    console.error('Board Exam Generation Placeholder Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
