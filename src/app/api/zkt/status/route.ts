import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ZKT_IP = '192.168.1.82';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('device_status')
      .select('*')
      .eq('id', ZKT_IP)
      .single();

    if (error) {
      return NextResponse.json({ connected: false, error: error.message }, { status: 200 });
    }

    // Consider the device "Offline" if it hasn't been seen in the last 10 minutes
    const lastSeen = new Date(data.last_seen);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const isStale = lastSeen < tenMinutesAgo;

    return NextResponse.json({ 
      connected: data.status === 'Online' && !isStale,
      status: data.status,
      lastSeen: data.last_seen,
      error: data.error_message || (isStale ? 'Status data is stale (Worker might be down)' : null)
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 });
  }
}
