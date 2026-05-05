// Quick test to simulate what the API does and check PDF output
import { readFileSync, writeFileSync } from 'fs';

// We can't directly import TS, so let's simulate the API call via fetch
const students = [
  { roll: 'R1001', name: 'Ram Sharma', program: 'BBS 1st Year' },
  { roll: 'R1002', name: 'Sita Thapa', program: 'BBS 1st Year' },
  { roll: 'R1003', name: 'Hari Poudel', program: 'MBS 1st Year' },
  { roll: 'R1004', name: 'Gita KC', program: 'MBS 1st Year' },
  { roll: 'R1005', name: 'Krishna Bhandari', program: 'BBS 1st Year' },
  { roll: 'R1006', name: 'Laxmi Gurung', program: 'MBS 1st Year' },
];

const config = {
  roomName: 'A02',
  windowBenches: 4,
  doorBenches: 4,
  studentsPerBench: 2,
  examType: 'First Internal Examination'
};

async function testPDF(type) {
  try {
    const response = await fetch('http://localhost:3000/api/admin/seat-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, config, type })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${type}] FAILED with status ${response.status}: ${errorText}`);
      return;
    }

    const buffer = await response.arrayBuffer();
    const filename = `test_${type}.pdf`;
    writeFileSync(filename, Buffer.from(buffer));
    console.log(`[${type}] SUCCESS - saved ${filename} (${buffer.byteLength} bytes)`);
  } catch (err) {
    console.error(`[${type}] ERROR:`, err.message);
  }
}

async function main() {
  console.log('Testing PDF generation...');
  await testPDF('marks');
  await testPDF('desk');
  await testPDF('attendance');
  console.log('Done! Check the PDF files in the project folder.');
}

main();
