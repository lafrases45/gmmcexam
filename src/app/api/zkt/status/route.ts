// Forced refresh: 2026-05-11 13:26
import { NextResponse } from 'next/server';
import net from 'net';

const ZKT_IP = '192.168.1.82';
const ZKT_PORT = 4370;

export async function GET() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(2500); // 2.5 second timeout

    socket.on('connect', () => {
      socket.destroy();
      resolve(NextResponse.json({ connected: true }, { status: 200 }));
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(NextResponse.json({ connected: false, error: 'Timeout' }, { status: 200 }));
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve(NextResponse.json({ connected: false, error: err.message }, { status: 200 }));
    });

    socket.connect(ZKT_PORT, ZKT_IP);
  });
}
