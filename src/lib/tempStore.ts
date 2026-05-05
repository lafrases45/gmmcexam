import fs from 'fs/promises';
import path from 'path';

const TMP_DIR = path.join(process.cwd(), 'tmp');

// Ensure the tmp directory exists
async function ensureTmpDir() {
  try {
    await fs.access(TMP_DIR);
  } catch {
    await fs.mkdir(TMP_DIR, { recursive: true });
  }
}

export async function writeSessionJson(sessionId: string, data: any): Promise<void> {
  await ensureTmpDir();
  const filePath = path.join(TMP_DIR, `board-exam-${sessionId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readSessionJson(sessionId: string): Promise<any | null> {
  const filePath = path.join(TMP_DIR, `board-exam-${sessionId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null; // File does not exist or invalid JSON
  }
}

export function getLedgerExcelPath(sessionId: string): string {
  return path.join(TMP_DIR, `ledger-${sessionId}.xlsx`);
}

export function getLedgerPdfPath(sessionId: string): string {
  return path.join(TMP_DIR, `ledger-${sessionId}.pdf`);
}

export function getReportPdfPath(sessionId: string): string {
  return path.join(TMP_DIR, `report-${sessionId}.pdf`);
}
