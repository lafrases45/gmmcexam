import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ZKT_IP = '192.168.1.82';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Set the sync_requested flag to true. 
    // The local background worker will see this change and trigger the hardware sync.
    const { error } = await supabase
      .from('device_status')
      .update({ sync_requested: true })
      .eq('id', ZKT_IP);
    
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Sync signal sent to local worker.' 
    });
  } catch (err: any) {
    console.error('Failed to signal sync:', err.message);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to signal sync. Check database connection.' 
    }, { status: 500 });
  }
}
