const ZKLib = require('node-zklib');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const ZKT_IP = '192.168.1.82';
const ZKT_PORT = 4370;
const BASE_SYNC_INTERVAL = 60000; // 1 minute
const MAX_SYNC_INTERVAL = 300000; // 5 minutes max backoff
const BATCH_SIZE = 500;

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const http = require('http');

let lastSyncTime = 'Never';
let isSyncing = false;
let syncStatus = 'Initialized';

async function updateDeviceStatus(status, errorMessage = null) {
  syncStatus = status;
  try {
    await supabase
      .from('device_status')
      .upsert({
        id: ZKT_IP,
        status: status,
        last_seen: new Date().toISOString(),
        error_message: errorMessage
      });
  } catch (err) {
    console.error('Failed to update device status in DB:', err.message);
  }
}

let zkInstance = null;
let isConnected = false;

async function processLog(log) {
  try {
    const zkId = log.deviceUserId.toString();
    const { data: mapping } = await supabase
      .from('attendance_users_map')
      .select('teacher_id, student_id, staff_id')
      .eq('zk_user_id', zkId)
      .single();

    let type = 'In';
    if (log.attType === 1 || log.attType === 2 || log.attType === 5) type = 'Out';

    const logEntry = {
      zk_user_id: zkId,
      check_time: new Date(log.recordTime).toISOString(),
      check_type: type,
      status: 'Synced',
      device_id: ZKT_IP,
      user_id: mapping ? (mapping.teacher_id || mapping.staff_id || mapping.student_id) : null,
      user_type: mapping ? (mapping.teacher_id ? 'Teacher' : mapping.staff_id ? 'Staff' : 'Student') : null
    };

    await supabase.from('attendance_logs').upsert(logEntry, { onConflict: 'zk_user_id, check_time' });
    lastSyncTime = new Date().toLocaleString();
    console.log(`[RealTime] Synced log for ID ${zkId} (${type})`);
  } catch (err) {
    console.error('Real-time processing error:', err.message);
  }
}

async function startWorker() {
  if (zkInstance) {
    try { await zkInstance.disconnect(); } catch (e) {}
  }

  zkInstance = new ZKLib(ZKT_IP, ZKT_PORT, 10000, 4000);
  
  try {
    console.log(`\n[${new Date().toISOString()}] Connecting to device...`);
    await zkInstance.createSocket();
    isConnected = true;
    await updateDeviceStatus('Online');
    console.log('Connected. Starting Real-time listener and initial sync...');

    // 1. Start Real-time Listener (Biometric Hardware Events)
    await zkInstance.getRealTimeLogs((log) => {
      processLog(log);
    });

    // 2. Perform Initial Full Sync
    await syncAttendance(true);

    // 3. Listen for Sync Requests from Cloud (Supabase Realtime)
    console.log('Subscribing to cloud sync requests...');
    supabase
      .channel('device_sync')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'device_status',
        filter: `id=eq.${ZKT_IP}` 
      }, async (payload) => {
        if (payload.new.sync_requested === true) {
          console.log('[Cloud] Sync requested via database flag');
          await syncAttendance(true);
          // Reset the flag
          await supabase
            .from('device_status')
            .update({ sync_requested: false })
            .eq('id', ZKT_IP);
        }
      })
      .subscribe();

    // 4. Keep-alive / Health Check every 30s
    const healthCheck = setInterval(async () => {
      try {
        await zkInstance.getInfo(); 
      } catch (e) {
        console.log('Device connection lost. Reconnecting...');
        clearInterval(healthCheck);
        isConnected = false;
        await updateDeviceStatus('Offline', 'Connection lost');
        startWorker(); // Reconnect
      }
    }, 30000);

  } catch (e) {
    console.error('Connection failed:', e.message);
    await updateDeviceStatus('Error', e.message);
    setTimeout(startWorker, 10000); // Retry in 10s
  }
}

async function syncAttendance(force = false) {
  if (isSyncing && !force) return;
  isSyncing = true;
  
  try {
    console.log('Performing full sync...');
    const logs = await zkInstance.getAttendances();
    const rawLogs = (logs.data || []).reverse();
    console.log(`Fetched ${rawLogs.length} logs. Processing...`);

    if (rawLogs.length > 0) {
      const { data: mappings } = await supabase.from('attendance_users_map').select('*');
      const mappingDict = {};
      mappings?.forEach(m => { mappingDict[m.zk_user_id] = m; });

      for (let i = 0; i < rawLogs.length; i += BATCH_SIZE) {
        const batch = rawLogs.slice(i, i + BATCH_SIZE);
        const logEntries = batch.map(log => {
          const zkId = log.deviceUserId.toString();
          const map = mappingDict[zkId];
          let type = 'In';
          if (log.attType === 1 || log.attType === 2 || log.attType === 5) type = 'Out';
          return {
            zk_user_id: zkId,
            check_time: new Date(log.recordTime).toISOString(),
            check_type: type,
            status: 'Synced',
            device_id: ZKT_IP,
            user_id: map ? (map.teacher_id || map.staff_id || map.student_id) : null,
            user_type: map ? (map.teacher_id ? 'Teacher' : map.staff_id ? 'Staff' : 'Student') : null
          };
        });
        await supabase.from('attendance_logs').upsert(logEntries, { onConflict: 'zk_user_id, check_time' });
      }
      lastSyncTime = new Date().toLocaleString();
      console.log('Full sync completed.');
    }
  } catch (e) {
    console.error('Sync Error:', e.message);
  } finally {
    isSyncing = false;
  }
}

// HTTP Server remains the same but calls syncAttendance(true)
const server = http.createServer((req, res) => {
  if (req.url === '/sync' && req.method === 'POST') {
    syncAttendance(true);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Full sync triggered' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>GMMC Attendance Control</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #f0f2f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 350px; text-align: center; }
        .status { font-size: 1.5rem; font-weight: bold; margin: 1rem 0; color: ${syncStatus === 'Online' ? '#10b981' : '#ef4444'}; }
        .info { font-size: 0.9rem; color: #64748b; margin-bottom: 2rem; }
        button { background: #3b82f6; color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%; transition: transform 0.2s; }
        button:hover { transform: scale(1.02); }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Attendance Sync</h1>
        <div class="status">${syncStatus}</div>
        <div class="info">Last Sync: ${lastSyncTime}<br>Mode: Real-time Listening</div>
        <button id="syncBtn" onclick="triggerSync()">Force Full Sync</button>
        <p id="msg" style="margin-top: 1rem; font-size: 0.8rem; color: #3b82f6;"></p>
      </div>
      <script>
        function triggerSync() {
          const btn = document.getElementById('syncBtn');
          btn.disabled = true;
          document.getElementById('msg').innerText = 'Syncing...';
          fetch('/sync', { method: 'POST' }).then(() => { setTimeout(() => { location.reload(); }, 3000); });
        }
      </script>
    </body>
    </html>
  `);
});

server.listen(4000, () => {
  console.log('Desktop Dashboard available at http://localhost:4000');
});

startWorker();
