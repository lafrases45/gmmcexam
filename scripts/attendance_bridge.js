const ZKLib = require('node-zklib');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const ZKT_IP = '192.168.1.82';
const ZKT_PORT = 4370;
const SYNC_INTERVAL = 60000; // 1 minute
const BATCH_SIZE = 500;

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAttendance() {
  let zkInstance = new ZKLib(ZKT_IP, ZKT_PORT, 10000, 4000);
  
  try {
    console.log(`\n[${new Date().toISOString()}] Starting Sync...`);
    await zkInstance.createSocket();
    console.log('Connected to device.');

    const logs = await zkInstance.getAttendances();
    const rawLogs = logs.data || [];
    console.log(`Fetched ${rawLogs.length} logs from device.`);

    if (rawLogs.length === 0) {
      await zkInstance.disconnect();
      return;
    }

    // Pre-fetch all mappings to avoid per-log queries
    const { data: mappings } = await supabase
      .from('attendance_users_map')
      .select('zk_user_id, teacher_id, student_id');
    
    const mappingDict = {};
    mappings?.forEach(m => {
      mappingDict[m.zk_user_id] = m;
    });

    // Process in batches
    for (let i = 0; i < rawLogs.length; i += BATCH_SIZE) {
      const batch = rawLogs.slice(i, i + BATCH_SIZE);
      const logEntries = batch.map(log => {
        const zkId = log.deviceUserId.toString();
        const map = mappingDict[zkId];
        
        // Map ZKT attType to 'In' or 'Out'
        // 0 = In, 1 = Out, 2 = Break Out, 3 = Break In, 4 = OT In, 5 = OT Out
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

      const { error } = await supabase
        .from('attendance_logs')
        .upsert(logEntries, {
          onConflict: 'zk_user_id, check_time'
        });

      if (error) {
        console.error(`Batch ${i/BATCH_SIZE + 1} Error:`, error.message);
      } else {
        process.stdout.write(`.`); // Progress indicator
      }
    }

    console.log('\nSync completed successfully.');
    await zkInstance.disconnect();
  } catch (e) {
    console.error('\nBridge Error:', e.message);
  } finally {
    // Schedule next run
    setTimeout(syncAttendance, SYNC_INTERVAL);
  }
}

console.log('ZKT Attendance Bridge Initialized.');
syncAttendance();
