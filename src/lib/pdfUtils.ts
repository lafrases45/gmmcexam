import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Bench, Student } from './seatPlan';
import fs from 'fs';
import path from 'path';

const CAMPUS_NAME = "Gupteshwor Mahadev Multiple Campus Pokhara-17, Chhorepatan";

// ─── ATTENDANCE SHEET ──────────────────────────────────────────────────────────
// One page per room+program combination. Multiple rooms = multiple pages.
export async function createAttendancePDF(
  roomResults: { roomName: string, students: Student[] }[], 
  examDate?: string, 
  programRoutines: Record<string, any[]> = {}
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Use Portrait for more rows
  const PAGE_W = 595;
  const PAGE_H = 842;

  // Column definitions (x-coordinates for vertical lines)
  // Total usable width 30 to 560
  const cols = [30, 60, 115, 230, 285, 340, 395, 450, 505, 560];
  const rowHeight = 18;

  for (const { roomName, students } of roomResults) {
    const programs = Array.from(new Set(students.map(s => s.program)));
    if (programs.length === 0) continue;

      for (const program of programs) {
        const programStudents = students.filter(s => s.program === program);
        
        // Sort by roll number (robust numeric-aware sort)
        programStudents.sort((a, b) => {
          const numA = parseInt(a.roll.replace(/\D/g, ''), 10);
          const numB = parseInt(b.roll.replace(/\D/g, ''), 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
          }
          return a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' });
        });

        const routine = programRoutines[program] || [];

        // Dynamic columns based on routine length (min 1, max 6)
        const numDates = Math.max(1, Math.min(6, routine.length || (examDate ? 1 : 0)));
        const programCols = [30, 60, 115];
        for (let i = 0; i <= numDates; i++) {
          programCols.push(230 + (i * 55));
        }

        const drawHeader = (p: any) => {
          let hy = PAGE_H - 30;
          
          // 1. Professional Header
          const title1 = "Gupteshwor Mahadev Multiple Campus";
          const w1 = boldFont.widthOfTextAtSize(title1, 14);
          p.drawText(title1, { x: (PAGE_W - w1) / 2, y: hy, size: 14, font: boldFont });
          hy -= 14;
          
          const title2 = "Chhorepatan 17, Pokhara";
          const w2 = font.widthOfTextAtSize(title2, 9);
          p.drawText(title2, { x: (PAGE_W - w2) / 2, y: hy, size: 9, font: font });
          hy -= 12;
          
          const title3 = "Department of Examination";
          const w3 = boldFont.widthOfTextAtSize(title3, 12);
          p.drawText(title3, { x: (PAGE_W - w3) / 2, y: hy, size: 12, font: boldFont });
          hy -= 16;

          const subTitle = `Exam Attendance Sheet`;
          const subWidth = boldFont.widthOfTextAtSize(subTitle, 11);
          p.drawText(subTitle, { x: (PAGE_W - subWidth) / 2, y: hy, size: 11, font: boldFont });
          hy -= 16;
          
          p.drawText(`Room: ${roomName}   |   Class: ${program}`, { x: 30, y: hy, size: 10, font });
          hy -= 14;

          // Table Header
          const headerTopY = hy + 12;
          
          p.drawText('S.N.', { x: 35, y: hy, size: 9, font: boldFont });
          p.drawText('Roll No', { x: 62, y: hy, size: 9, font: boldFont });
          p.drawText('Student Name', { x: 120, y: hy, size: 9, font: boldFont });
          
          for (let d = 0; d < numDates; d++) {
            const rItem = routine[d];
            let rawDate = '...................';
            
            if (rItem?.exam_date) {
              rawDate = rItem.exam_date;
            } else if (d === 0 && examDate) {
              rawDate = examDate;
            }
            
            // Draw the date centered in the column (width is 55)
            const dw = boldFont.widthOfTextAtSize(rawDate, 8);
            p.drawText(rawDate, { x: 230 + (d * 55) + (55 - dw) / 2, y: hy + 2, size: 8, font: boldFont });
          }
          
          // Header bottom line
          const headerBottomY = hy - 6;
          p.drawLine({ start: { x: programCols[0], y: headerTopY }, end: { x: programCols[programCols.length - 1], y: headerTopY }, thickness: 1 });
          p.drawLine({ start: { x: programCols[0], y: headerBottomY }, end: { x: programCols[programCols.length - 1], y: headerBottomY }, thickness: 1 });
          
          return { hy: headerBottomY - 15, currentTopY: headerTopY }; // Return Y positions
        };

        let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        let { hy: y, currentTopY } = drawHeader(page);

        programStudents.forEach((s, i) => {
          if (y < 40) {
            // Draw closing vertical lines for the old page
            programCols.forEach(xPos => {
              page.drawLine({ start: { x: xPos, y: currentTopY }, end: { x: xPos, y: y + 15 }, thickness: 1 });
            });
            
            page = pdfDoc.addPage([PAGE_W, PAGE_H]);
            const fresh = drawHeader(page);
            y = fresh.hy;
            currentTopY = fresh.currentTopY;
          }

          page.drawText(`${i + 1}`, { x: 35, y, size: 9, font });
          page.drawText(s.roll, { x: 62, y, size: 9, font });
          page.drawText(s.name.length > 20 ? s.name.substring(0, 18) + '..' : s.name, { x: 120, y, size: 9, font });
          
          const rowBottomY = y - 6;
          page.drawLine({ start: { x: programCols[0], y: rowBottomY }, end: { x: programCols[programCols.length - 1], y: rowBottomY }, thickness: 0.5 });
          
          y -= rowHeight;
        });

        // Check space for 3 summary rows + Coordinator Signature (approx 85 units needed)
        if (y < 85) {
          // Draw closing vertical lines for the old page
          programCols.forEach(xPos => {
            page.drawLine({ start: { x: xPos, y: currentTopY }, end: { x: xPos, y: y + rowHeight - 8 }, thickness: 1 });
          });
          
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          const fresh = drawHeader(page);
          y = fresh.hy;
          currentTopY = fresh.currentTopY;
        }

        // Draw Summary Rows
        const drawSummaryRow = (label: string) => {
          // Place label right-aligned in the 'Student Name' column
          const labelW = boldFont.widthOfTextAtSize(label, 9);
          page.drawText(label, { x: programCols[3] - labelW - 5, y, size: 9, font: boldFont });
          
          const rowBottomY = y - 6;
          page.drawLine({ start: { x: programCols[0], y: rowBottomY }, end: { x: programCols[programCols.length - 1], y: rowBottomY }, thickness: 0.5 });
          y -= rowHeight;
        };

        drawSummaryRow('Total Present');
        drawSummaryRow('Total Absent');
        drawSummaryRow('Invigilator Sign');

        // Draw final vertical lines for this list
        programCols.forEach(xPos => {
          page.drawLine({ start: { x: xPos, y: currentTopY }, end: { x: xPos, y: y + rowHeight - 6 }, thickness: 1 });
        });

      // Add Exam Coordinator signature at the bottom right
      y -= 30;
      const sigText = 'Exam Coordinator';
      const sigW = boldFont.widthOfTextAtSize(sigText, 11);
      const sigX = PAGE_W - sigW - 35;
      
      page.drawText('................................', { x: sigX - 10, y: y + 15, size: 11, font });
      page.drawText(sigText, { x: sigX, y, size: 11, font: boldFont });
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);
  return await pdfDoc.save();
}

// ─── ROUTINE PDF ───────────────────────────────────────────────────────────────
export async function createRoutinePDF(
  examName: string,
  routine: { exam_date: string, subjects: { name: string, code: string } }[],
  program?: string,
  yearOrSem?: string,
  examTime?: string
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const today = new Date();
  const publishDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');

  let y = PAGE_H - 40;

  // ── 1. Institutional Letterhead (Fixed)
  const campusTitle = 'GUPTESHWOR MAHADEV MULTIPLE CAMPUS';
  const campusW = boldFont.widthOfTextAtSize(campusTitle, 17);
  page.drawText(campusTitle, { x: (PAGE_W - campusW) / 2, y, size: 17, font: boldFont });
  y -= 18;

  const addrTitle = 'Chhorepatan, Pokhara -17';
  const addrW = font.widthOfTextAtSize(addrTitle, 11);
  page.drawText(addrTitle, { x: (PAGE_W - addrW) / 2, y, size: 11, font });
  y -= 22;

  const deptTitle = 'Department of Examination';
  const deptW = boldFont.widthOfTextAtSize(deptTitle, 14);
  page.drawText(deptTitle, { x: (PAGE_W - deptW) / 2, y, size: 14, font: boldFont });
  page.drawLine({ start: { x: (PAGE_W - deptW) / 2, y: y - 2 }, end: { x: (PAGE_W + deptW) / 2, y: y - 2 }, thickness: 1 });
  y -= 40;

  // ── 2. Date and Notice Line
  page.drawText(`Date: ${publishDate}`, { x: PAGE_W - 140, y, size: 11, font });
  y -= 40;

  const noticeText = 'Notice!               Notice!!               Notice!!!';
  const noticeW = font.widthOfTextAtSize(noticeText, 12);
  page.drawText(noticeText, { x: (PAGE_W - noticeW) / 2, y, size: 12, font });
  y -= 35;

  const subjectHeader = `Subject: About Internal Examination`;
  const subjectW = boldFont.widthOfTextAtSize(subjectHeader, 12);
  page.drawText(subjectHeader, { x: (PAGE_W - subjectW) / 2, y, size: 12, font: boldFont });
  y -= 30;

  // ── 3. Body Text
  page.drawText('Dear Students,', { x: 50, y, size: 11, font });
  y -= 20;

  const bodyLine = `This is to notify all the students of ${program || ''} ${yearOrSem || ''} that your internal examinations is going to be held as per`;
  page.drawText(bodyLine, { x: 50, y, size: 11, font });
  y -= 15;
  page.drawText('the schedule given below. So, you are requested to prepare your best for the examinations.', { x: 50, y, size: 11, font });
  y -= 30;

  // ── 4. Exam Time
  if (examTime) {
    page.drawText('Exam time:', { x: 50, y, size: 11, font: boldFont });
    y -= 20;
    page.drawText(`For ${program || ''} ${yearOrSem || ''}  ${examTime}`, { x: 50, y, size: 11, font: boldFont });
    y -= 30;
  }

  // ── 5. Routine Table
  const col1X = 50;   // S.N.
  const col2X = 90;   // Date
  const col3X = 220;  // Code
  const col4X = 300;  // Subject
  const tableRight = PAGE_W - 50;
  
  // Table Header
  const headerY = y;
  page.drawRectangle({ x: 50, y: y - 5, width: tableRight - 50, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0,0,0), borderWidth: 1 });
  page.drawText('Date', { x: col2X, y, size: 10, font: boldFont });
  page.drawText('Programs', { x: (col3X + tableRight) / 2 - 20, y, size: 10, font: boldFont });
  
  // Vertical lines for header
  page.drawLine({ start: { x: col2X - 5, y: headerY + 17 }, end: { x: col2X - 5, y: headerY - 5 }, thickness: 1 });
  page.drawLine({ start: { x: col3X - 5, y: headerY + 17 }, end: { x: col3X - 5, y: headerY - 5 }, thickness: 1 });
  
  y -= 25;

  // Program Sub-header
  const subHeaderY = y;
  const tableWidth = tableRight - 50;
  page.drawRectangle({ x: 50, y: y - 5, width: tableWidth, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0,0,0), borderWidth: 1 });
  
  const progLabel = `${program || ''} ${yearOrSem || ''}`;
  const progLabelW = boldFont.widthOfTextAtSize(progLabel, 10);
  page.drawText(progLabel, { x: 50 + (tableWidth - progLabelW) / 2, y, size: 10, font: boldFont });
  
  // Routine Rows
  y -= 22;
  const tableTopY = headerY + 17;
  
  routine.forEach((item, i) => {
    const rowY = y;
    page.drawRectangle({ x: 50, y: y - 5, width: tableRight - 50, height: 25, borderColor: rgb(0,0,0), borderWidth: 1 });
    
    page.drawText(item.exam_date || '', { x: col2X, y, size: 10, font: boldFont });
    
    const subjectContent = `${item.subjects?.name || ''} (${item.subjects?.code || ''})`;
    page.drawText(subjectContent, { x: col3X, y, size: 10, font });
    
    // Vertical separator
    page.drawLine({ start: { x: col3X - 5, y: rowY + 20 }, end: { x: col3X - 5, y: rowY - 5 }, thickness: 1 });

    y -= 25;
  });

  // Vertical lines for the whole table (closing)
  page.drawLine({ start: { x: col2X - 5, y: tableTopY }, end: { x: col2X - 5, y: y + 20 }, thickness: 1 });

  y -= 15;

  // ── 6. Mandatory Rules / Penalty Section
  const rules = [
    '• Examinations are mandatory, and failing to attend them shall penalize students the sum of Rs.200/- per subject.',
    '• Late comers (more than 15 minutes) shall be denied entry for exams.',
    '• Unadmitted students are denied the exams.',
    '• Exam scores are one of the strong foundations for scholarship.'
  ];

  rules.forEach((rule) => {
    page.drawText(rule, { x: 50, y, size: 9, font });
    y -= 15;
  });

  y -= 50;

  // ── 7. Signature
  const sigText = 'Exam Coordinator';
  const sigW = font.widthOfTextAtSize(sigText, 11);
  const sigX = PAGE_W - sigW - 60;
  
  page.drawText('…………………', { x: sigX - 10, y: y + 15, size: 11, font });
  page.drawText(sigText, { x: sigX, y, size: 11, font: boldFont });

  return await pdfDoc.save();
}

// One page per program, containing all students across all rooms sorted by roll number.
export async function createMarksSlipPDF(roomResults: { roomName: string, students: Student[] }[], examType: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;

  // Combine all students from all rooms
  const allStudents = roomResults.flatMap(r => r.students);
  // Group by program
  const programs = Array.from(new Set(allStudents.map(s => s.program)));

  for (const program of programs) {
    const programStudents = allStudents.filter(s => s.program === program);
    
    // Sort by roll number
    programStudents.sort((a, b) => {
      const numA = parseInt(a.roll.replace(/\\D/g, ''), 10);
      const numB = parseInt(b.roll.replace(/\\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      }
      return a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' });
    });

    const drawMainHeader = (p: any) => {
      let hy = PAGE_H - 50;
      
      const title1 = "Gupteshwor Mahadev Multiple Campus";
      const w1 = boldFont.widthOfTextAtSize(title1, 16);
      p.drawText(title1, { x: (PAGE_W - w1) / 2, y: hy, size: 16, font: boldFont });
      hy -= 16;
      
      const title2 = "Chhorepatan 17, Pokhara";
      const w2 = font.widthOfTextAtSize(title2, 11);
      p.drawText(title2, { x: (PAGE_W - w2) / 2, y: hy, size: 11, font: font });
      hy -= 16;
      
      const title3 = "Department of Examination";
      const w3 = boldFont.widthOfTextAtSize(title3, 14);
      p.drawText(title3, { x: (PAGE_W - w3) / 2, y: hy, size: 14, font: boldFont });
      hy -= 20;

      const subTitle = `Marks Entry Foil  |  Class: ${program}`;
      const sw = boldFont.widthOfTextAtSize(subTitle, 12);
      p.drawText(subTitle, { x: (PAGE_W - sw) / 2, y: hy, size: 12, font: boldFont });
      hy -= 16;
      
      const ew = boldFont.widthOfTextAtSize(examType, 11);
      p.drawText(examType, { x: (PAGE_W - ew) / 2, y: hy, size: 11, font: boldFont });
      hy -= 20;

      p.drawText('Roll No', { x: 50, y: hy, size: 10, font: boldFont });
      p.drawText('Student Name', { x: 150, y: hy, size: 10, font: boldFont });
      p.drawText('Theory Marks', { x: 350, y: hy, size: 10, font: boldFont });
      p.drawText('Practical Marks', { x: 450, y: hy, size: 10, font: boldFont });
      hy -= 5;
      p.drawLine({ start: { x: 50, y: hy }, end: { x: 550, y: hy }, thickness: 1 });
      hy -= 20;
      return hy;
    };

    const drawSubsequentHeader = (p: any) => {
      let hy = PAGE_H - 50;
      
      p.drawText('Roll No', { x: 50, y: hy, size: 10, font: boldFont });
      p.drawText('Student Name', { x: 150, y: hy, size: 10, font: boldFont });
      p.drawText('Theory Marks', { x: 350, y: hy, size: 10, font: boldFont });
      p.drawText('Practical Marks', { x: 450, y: hy, size: 10, font: boldFont });
      hy -= 5;
      p.drawLine({ start: { x: 50, y: hy }, end: { x: 550, y: hy }, thickness: 1 });
      hy -= 20;
      return hy;
    };

    // Each program starts on a fresh page
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = drawMainHeader(page);

    programStudents.forEach(s => {
      if (y < 60) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = drawSubsequentHeader(page);
      }
      page.drawText(s.roll, { x: 50, y, size: 10, font });
      page.drawText(s.name.length > 30 ? s.name.substring(0, 28) + '..' : s.name, { x: 150, y, size: 10, font });
      page.drawRectangle({ x: 350, y: y - 5, width: 80, height: 20, borderWidth: 1, borderColor: rgb(0, 0, 0) });
      page.drawRectangle({ x: 450, y: y - 5, width: 80, height: 20, borderWidth: 1, borderColor: rgb(0, 0, 0) });
      y -= 30;
    });
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);
  return await pdfDoc.save();
}

// ─── DESK LABELS / SEAT PLAN VISUAL ───────────────────────────────────────────
// One page per room. Layout reflects actual students.length per bench.
export async function createDeskLabelsPDF(roomResults: { roomName: string, benches: Bench[] }[]) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4
  const PAGE_W = 842;
  const PAGE_H = 595;

  for (const { roomName, benches } of roomResults) {
    const windowBenches = benches.filter(b => b.side === 'Window');
    const doorBenches = benches.filter(b => b.side === 'Door');
    const numRows = Math.max(windowBenches.length, doorBenches.length);

    if (numRows === 0) continue;

    // One page per room
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    const roomText = `Room: ${roomName}`;
    const roomTextWidth = boldFont.widthOfTextAtSize(roomText, 16);
    page.drawText(roomText, {
      x: (PAGE_W - roomTextWidth) / 2,
      y: PAGE_H - 25,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });

    const campusWidth = font.widthOfTextAtSize(CAMPUS_NAME, 8);
    page.drawText(CAMPUS_NAME, {
      x: (PAGE_W - campusWidth) / 2,
      y: PAGE_H - 40,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    const headerSpace = 65;
    const bottomMargin = 20;
    const benchGap = 4;
    const availableHeight = PAGE_H - headerSpace - bottomMargin;
    const colWidth = 370;
    const leftColX = 30;
    const rightColX = PAGE_W / 2 + 15;

    page.drawText('WINDOW SIDE', { x: leftColX + colWidth / 2 - 40, y: PAGE_H - 52, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.7) });
    page.drawText('DOOR SIDE', { x: rightColX + colWidth / 2 - 35, y: PAGE_H - 52, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.7) });

    const benchHeight = (availableHeight / numRows) - benchGap;

    page.drawLine({
      start: { x: PAGE_W / 2, y: PAGE_H - headerSpace + 5 },
      end: { x: PAGE_W / 2, y: bottomMargin },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9)
    });

    let yPos = PAGE_H - headerSpace;

    for (let i = 0; i < numRows; i++) {
      const wb = windowBenches[i];
      const db = doorBenches[i];

      if (wb) drawBenchBox(page, wb, leftColX, yPos, colWidth, benchHeight, font, boldFont);
      if (db) drawBenchBox(page, db, rightColX, yPos, colWidth, benchHeight, font, boldFont);

      yPos -= (benchHeight + benchGap);
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);
  return await pdfDoc.save();
}

function drawBenchBox(
  page: any,
  bench: Bench,
  x: number,
  y: number,
  totalWidth: number,
  totalHeight: number,
  font: any,
  boldFont: any
) {
  const spots = bench.students.length;
  if (spots === 0) return;

  const scale = Math.min(1, totalHeight / 50);
  const rollSize = Math.max(6, 9 * scale);
  const nameSize = Math.max(5, 7 * scale);
  const programSize = Math.max(4, 6 * scale);

  // Outer bench box
  page.drawRectangle({
    x,
    y: y - totalHeight,
    width: totalWidth,
    height: totalHeight,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
    color: rgb(0.99, 0.99, 1),
  });

  // Bench number label
  page.drawText(`B${bench.benchNo}`, {
    x: x + 4,
    y: y - (totalHeight / 2) + 2,
    size: Math.max(6, 8 * scale),
    font: boldFont,
    color: rgb(0.6, 0.6, 0.6)
  });

  const labelWidth = 24 * scale;
  const innerPadding = 2 * scale;
  const innerAreaWidth = totalWidth - labelWidth - innerPadding * 2;
  const innerBoxWidth = (innerAreaWidth - (spots - 1) * 3) / spots;
  const innerBoxHeight = totalHeight - (6 * scale);
  let innerX = x + labelWidth;

  for (let j = 0; j < spots; j++) {
    const student = bench.students[j];

    page.drawRectangle({
      x: innerX,
      y: y - totalHeight + (3 * scale),
      width: innerBoxWidth,
      height: innerBoxHeight,
      borderColor: student ? rgb(0.2, 0.4, 0.8) : rgb(0.92, 0.92, 0.92),
      borderWidth: 0.5,
      color: student ? rgb(0.95, 0.97, 1) : rgb(0.98, 0.98, 0.98),
    });

    if (student) {
      page.drawText(student.roll, {
        x: innerX + 4,
        y: y - (totalHeight * 0.45) + (2 * scale),
        size: rollSize,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.3)
      });

      if (totalHeight > 25) {
        const displayName = student.name.length > 18 ? student.name.substring(0, 16) + '..' : student.name;
        page.drawText(displayName, {
          x: innerX + 4,
          y: y - (totalHeight * 0.70) + (2 * scale),
          size: nameSize,
          font,
          color: rgb(0.2, 0.2, 0.2)
        });
      }

      if (totalHeight > 35) {
        const programLabel = student.program.replace('Semester', 'Sem').replace('Year', 'Yr');
        page.drawText(programLabel, {
          x: innerX + 4,
          y: y - (totalHeight * 0.85) + (2 * scale),
          size: programSize,
          font,
          color: rgb(0.3, 0.5, 0.8)
        });
      }
    } else {
      page.drawText('—', {
        x: innerX + innerBoxWidth / 2 - 2,
        y: y - (totalHeight / 2) - 4,
        size: 10 * scale,
        font,
        color: rgb(0.85, 0.85, 0.85)
      });
    }

    // Move to next student slot
    innerX += innerBoxWidth + 3;
  }
}

// ─── ROOM DISTRIBUTION (CENTER MAP) ───────────────────────────────────────────
// One page per room. Shows program/roll-range summary for each room.
export async function createDistributionPDF(roomResults: { roomName: string, students: Student[] }[]) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;

  const drawHeader = (page: any, startY: number) => {
    let y = startY;
    const campusText = 'Gupteshwor Mahadev Multiple Campus';
    const addressText = 'Chhorepatan 17, Pokhara';
    const deptText = 'Department of Examination';
    
    const cWidth = boldFont.widthOfTextAtSize(campusText, 14);
    const aWidth = font.widthOfTextAtSize(addressText, 10);
    const dWidth = boldFont.widthOfTextAtSize(deptText, 12);

    page.drawText(campusText, { x: (PAGE_W - cWidth) / 2, y, size: 14, font: boldFont });
    y -= 16;
    page.drawText(addressText, { x: (PAGE_W - aWidth) / 2, y, size: 10, font });
    y -= 16;
    page.drawText(deptText, { x: (PAGE_W - dWidth) / 2, y, size: 12, font: boldFont });
    y -= 25;
    return y;
  };

  // First page: summary of all rooms
  let summaryPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let sy = PAGE_H - 50;
  sy = drawHeader(summaryPage, sy);

  summaryPage.drawText('Center Map / Room Distribution', { x: 190, y: sy, size: 12, font: boldFont });
  sy -= 25;

  // Global Mapping
  const allStudents = roomResults.flatMap(r => r.students);
  const globalPrograms = Array.from(new Set(allStudents.map(s => s.program)));
  
  summaryPage.drawText('General Mapping:', { x: 50, y: sy, size: 11, font: boldFont, color: rgb(0, 0, 0.5) });
  sy -= 18;
  
  for (const prog of globalPrograms) {
    const pStudents = allStudents.filter(s => s.program === prog);
    const rolls = pStudents.map(s => s.roll).sort();
    const range = rolls.length > 1 ? `${rolls[0]} to ${rolls[rolls.length - 1]}` : rolls[0];
    summaryPage.drawText(`• ${prog}:  ${range}   (Total: ${pStudents.length})`, { x: 60, y: sy, size: 10, font });
    sy -= 16;
  }
  
  sy -= 15;

  // Room Wise Table
  summaryPage.drawText('Room', { x: 50, y: sy, size: 10, font: boldFont });
  summaryPage.drawText('Program / Class', { x: 130, y: sy, size: 10, font: boldFont });
  summaryPage.drawText('Roll Range', { x: 300, y: sy, size: 10, font: boldFont });
  summaryPage.drawText('Total', { x: 490, y: sy, size: 10, font: boldFont });
  sy -= 5;
  summaryPage.drawLine({ start: { x: 50, y: sy }, end: { x: 550, y: sy }, thickness: 1 });
  sy -= 18;

  let grandTotal = 0;

  for (const { roomName, students } of roomResults) {
    if (students.length === 0) continue;

    const programs = Array.from(new Set(students.map(s => s.program)));

    for (const program of programs) {
      if (sy < 60) {
        summaryPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
        sy = PAGE_H - 50;
      }

      const progStudents = students.filter(s => s.program === program);
      const rolls = progStudents.map(s => s.roll).sort();
      const range = rolls.length > 1 ? `${rolls[0]}  –  ${rolls[rolls.length - 1]}` : rolls[0];

      summaryPage.drawText(roomName, { x: 50, y: sy, size: 10, font });
      summaryPage.drawText(program.length > 25 ? program.substring(0, 23) + '..' : program, { x: 130, y: sy, size: 10, font });
      summaryPage.drawText(range, { x: 300, y: sy, size: 10, font });
      summaryPage.drawText(progStudents.length.toString(), { x: 490, y: sy, size: 10, font: boldFont });

      sy -= 18;
      grandTotal += progStudents.length;
    }

    // Separator line between rooms
    summaryPage.drawLine({ start: { x: 50, y: sy + 5 }, end: { x: 550, y: sy + 5 }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
    sy -= 4;
  }

  sy -= 10;
  summaryPage.drawLine({ start: { x: 50, y: sy }, end: { x: 550, y: sy }, thickness: 1 });
  sy -= 18;
  summaryPage.drawText(`Grand Total Students: ${grandTotal}`, { x: 360, y: sy, size: 11, font: boldFont });

  // Subsequent pages: one per room with full student list
  for (const { roomName, students } of roomResults) {
    if (students.length === 0) continue;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 50;

    y = drawHeader(page, y);
    page.drawText(`Room: ${roomName}  –  Student List`, { x: 200, y, size: 12, font: boldFont });
    y -= 30;

    // Group and sort students by program
    const sortedStudents = [...students].sort((a, b) => {
      if (a.program !== b.program) return a.program.localeCompare(b.program);
      return a.roll.localeCompare(b.roll);
    });

    page.drawText('S.N.', { x: 50, y, size: 10, font: boldFont });
    page.drawText('Roll No', { x: 100, y, size: 10, font: boldFont });
    page.drawText('Name', { x: 200, y, size: 10, font: boldFont });
    page.drawText('Program', { x: 400, y, size: 10, font: boldFont });
    y -= 5;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });
    y -= 18;

    let currentProgram = '';

    sortedStudents.forEach((s, i) => {
      if (y < 60) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 50;
        page.drawText(`Room: ${roomName} (continued)`, { x: 200, y, size: 11, font: boldFont });
        y -= 25;
      }
      
      // Visual separator for different programs
      if (currentProgram !== s.program) {
        if (currentProgram !== '') {
           y -= 5;
           page.drawLine({ start: { x: 80, y: y + 10 }, end: { x: 520, y: y + 10 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        }
        currentProgram = s.program;
      }

      page.drawText(`${i + 1}`, { x: 50, y, size: 9, font });
      page.drawText(s.roll, { x: 100, y, size: 9, font });
      page.drawText(s.name.length > 28 ? s.name.substring(0, 26) + '..' : s.name, { x: 200, y, size: 9, font });
      page.drawText(s.program.length > 20 ? s.program.substring(0, 18) + '..' : s.program, { x: 400, y, size: 9, font });
      y -= 18;
    });



    page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: 550, y: y + 5 }, thickness: 0.5 });
    page.drawText(`Total in ${roomName}: ${students.length}`, { x: 380, y: y - 10, size: 10, font: boldFont });
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);
  return await pdfDoc.save();
}

/**
 * Consolidates multiple programs into a single Master Routine Matrix.
 * Rows = Programs
 * Cols = Unique Dates
 */
export async function createMasterRoutinePDF(
  sessionName: string,
  examsInGroup: any[], // Each exam has its own subjects/routine
  groupExamSubjects: Record<string, any[]> // Map of examId -> RoutineItem[] 
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Helper: Correct chronological sort for YYYY/MM/DD
  const sortDates = (dates: string[]) => {
    return [...dates].sort((a, b) => {
      const partsA = a.split('/').map(Number);
      const partsB = b.split('/').map(Number);
      for (let i = 0; i < 3; i++) {
        if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
      }
      return 0;
    });
  };

  // Helper: Wrap text into multiple lines
  const wrapText = (text: string, maxWidth: number, font: any, fontSize: number) => {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // LANDSCAPE Orientation
  const PAGE_W = 842;
  const PAGE_H = 595;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const today = new Date();
  const publishDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');

  let y = PAGE_H - 30;

  const sessionLabel = `Notice Regarding ${sessionName}`;

  const campusTitle = 'Gupteshwor Mahadev Multiple Campus';
  const campusW = boldFont.widthOfTextAtSize(campusTitle, 17);
  page.drawText(campusTitle, { x: (PAGE_W - campusW) / 2, y, size: 17, font: boldFont });
  y -= 18;

  const addrTitle = 'Chhorepatan, Pokhara -17';
  const addrW = font.widthOfTextAtSize(addrTitle, 11);
  page.drawText(addrTitle, { x: (PAGE_W - addrW) / 2, y, size: 11, font });
  y -= 22;

  const deptTitle = 'Department of Examination';
  const deptW = boldFont.widthOfTextAtSize(deptTitle, 14);
  page.drawText(deptTitle, { x: (PAGE_W - deptW) / 2, y, size: 14, font: boldFont });
  page.drawLine({ start: { x: (PAGE_W - deptW) / 2, y: y - 2 }, end: { x: (PAGE_W + deptW) / 2, y: y - 2 }, thickness: 1 });
  y -= 30;

  // Date and Notice Lines
  page.drawText(`Date: ${publishDate}`, { x: PAGE_W - 140, y: y + 25, size: 11, font });
  
  page.drawText('Notice!', { x: 50, y, size: 12, font: boldFont });
  page.drawText('Notice!!!', { x: PAGE_W - 110, y, size: 12, font: boldFont });
  y -= 22;

  const subjectHeader = `Subject: About Internal Assessment`;
  const subjectW = boldFont.widthOfTextAtSize(subjectHeader, 12);
  page.drawText(subjectHeader, { x: (PAGE_W - subjectW) / 2, y, size: 12, font: boldFont });
  y -= 25;

  // 3. Body Text
  page.drawText('Dear Students,', { x: 50, y, size: 11, font: boldFont });
  y -= 18;

  const progNames = Array.from(new Set(examsInGroup.map(ex => `${ex.program} ${ex.year_or_semester}`))).join(', ');
  const fullBodyText = `This is to notify all students of ${progNames} that the ${sessionName} will be conducted as per the schedule provided below. All students are advised to prepare diligently for these assessments.`;
  
  const wrappedBody = wrapText(fullBodyText, PAGE_W - 100, font, 11);
  wrappedBody.forEach(line => {
    page.drawText(line, { x: 50, y, size: 11, font });
    y -= 14;
  });
  y -= 20;

  // 2. Build Matrix Data
  const rawDates = Array.from(new Set(
    Object.values(groupExamSubjects).flat().map(i => i.exam_date).filter(d => !!d)
  ));
  const allDatesSorted = sortDates(rawDates);

  if (allDatesSorted.length === 0) {
    page.drawText('No dates scheduled yet.', { x: 50, y, size: 12, font });
    return await pdfDoc.save();
  }

  // ── TABLE CONFIG ──
  const tableX = 40;
  const tableRight = PAGE_W - 40;
  const programColWidth = 130;
  const padding = 6;
  const maxDatesPerTable = 7; // Increased for Landscape
  
  // Split dates into chunks
  const dateChunks = [];
  for (let i = 0; i < allDatesSorted.length; i += maxDatesPerTable) {
    dateChunks.push(allDatesSorted.slice(i, i + maxDatesPerTable));
  }

  // Loop through chunks and render tables
  for (const chunk of dateChunks) {
    const dateColWidth = (tableRight - tableX - programColWidth) / chunk.length;
    
    // Check if we need a new page before starting a new table
    const tableHeaderHeight = 30;
    const estimatedRowHeight = 40; 
    const totalTableHeight = tableHeaderHeight + (examsInGroup.length * estimatedRowHeight);

    if (y - totalTableHeight < 50) {
      const newPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 40;
      // Re-draw basic header on new page (Simplified)
      newPage.drawText(`${sessionLabel} (Continued)`, { x: 40, y, size: 12, font: boldFont });
      y -= 30;
    }

    const currentDrawPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

    // Table Header (Exam Time)
    const tableTopY = y;
    const examTimeStr = `Exam Time: ${examsInGroup[0]?.exam_time || '11:00 AM to 2:00 PM'}`;
    currentDrawPage.drawRectangle({ x: tableX, y: y - 24, width: tableRight - tableX, height: 24, color: rgb(1, 1, 1), borderColor: rgb(0,0,0), borderWidth: 1 });
    const timeW = boldFont.widthOfTextAtSize(examTimeStr, 10);
    currentDrawPage.drawText(examTimeStr, { x: tableX + programColWidth + (tableRight - tableX - programColWidth - timeW) / 2, y: y - 16, size: 10, font: boldFont });
    y -= 24;

    // Date Header
    currentDrawPage.drawRectangle({ x: tableX, y: y - 24, width: tableRight - tableX, height: 24, color: rgb(1, 1, 1), borderColor: rgb(0,0,0), borderWidth: 1 });
    currentDrawPage.drawText('Date', { x: tableX + padding + 20, y: y - 16, size: 10, font: boldFont });
    currentDrawPage.drawLine({ start: { x: tableX + programColWidth, y: y }, end: { x: tableX + programColWidth, y: y - 24 }, thickness: 1 });

    chunk.forEach((date, i) => {
      const x = tableX + programColWidth + (i * dateColWidth);
      const dateW = boldFont.widthOfTextAtSize(date, 9);
      currentDrawPage.drawText(date, { x: x + (dateColWidth - dateW) / 2, y: y - 16, size: 9, font: boldFont });
      if (i < chunk.length - 1) {
        currentDrawPage.drawLine({ start: { x: x + dateColWidth, y: y }, end: { x: x + dateColWidth, y: y - 24 }, thickness: 1 });
      }
    });
    y -= 24;

    // Programs Sub-header row
    currentDrawPage.drawRectangle({ x: tableX, y: y - 24, width: tableRight - tableX, height: 24, color: rgb(1, 1, 1), borderColor: rgb(0,0,0), borderWidth: 1 });
    const progText = 'Programs';
    const progW = boldFont.widthOfTextAtSize(progText, 10);
    currentDrawPage.drawText(progText, { x: (tableX + tableRight - progW) / 2, y: y - 16, size: 10, font: boldFont });
    y -= 24;

    // Table Rows (Exams)
    examsInGroup.forEach((exam) => {
      const routine = groupExamSubjects[exam.id] || [];
      const progLabel = `${exam.program} ${exam.year_or_semester}`;
      
      // Calculate max height for this row based on subject wrapping
      let rowMaxLines = 1;
      const cellContents: string[][] = [];
      chunk.forEach(date => {
        const sub = routine.find(r => r.exam_date === date);
        const txt = sub?.subjects?.name || '';
        const wrapped = wrapText(txt, dateColWidth - (padding * 2), font, 8);
        cellContents.push(wrapped);
        if (wrapped.length > rowMaxLines) rowMaxLines = wrapped.length;
      });

      const rowHeight = Math.max(26, rowMaxLines * 10 + 8);
      
      // Draw Row
      currentDrawPage.drawRectangle({ x: tableX, y: y - rowHeight, width: tableRight - tableX, height: rowHeight, borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.5 });
      
      // Column 1: Program
      const wrappedProg = wrapText(progLabel, programColWidth - (padding * 2), boldFont, 9);
      wrappedProg.forEach((line, lineIdx) => {
        currentDrawPage.drawText(line, { x: tableX + padding, y: y - 14 - (lineIdx * 10), size: 9, font: boldFont });
      });
      currentDrawPage.drawLine({ start: { x: tableX + programColWidth, y: y }, end: { x: tableX + programColWidth, y: y - rowHeight }, thickness: 1 });

      // Columns: Subjects
      chunk.forEach((date, colIdx) => {
        const x = tableX + programColWidth + (colIdx * dateColWidth);
        const lines = cellContents[colIdx];
        
        lines.forEach((line, lineIdx) => {
          currentDrawPage.drawText(line, { x: x + padding, y: y - 14 - (lineIdx * 10), size: 8, font });
        });

        // Vertical line
        if (colIdx < chunk.length - 1) {
          currentDrawPage.drawLine({ start: { x: x + dateColWidth, y: y }, end: { x: x + dateColWidth, y: y - rowHeight }, thickness: 0.5 });
        }
      });

      y -= rowHeight;
    });

    y -= 25; // Gap between tables
  }

  // 3. Rules & Signature
  if (y < 120) {
    const lastPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 100;
  }
  
  const finalPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

  const rules = [
    '• Concerned faculties shall conduct the assessment of their own subjects.',
    '• This examination will play a crucial role to send the internal evaluation marks to TU examination Board for Final assessment.',
    '• So, all the assessment are mandatory, failing to which may invalidate students to sit for the Board Examinations',
    '• Only the enrolled students are eligible to sit for the examinations.'
  ];
  rules.forEach(r => {
    finalPage.drawText(r, { x: 50, y, size: 9, font });
    y -= 12;
  });

  const sigText = 'Exam Coordinator';
  const sigX = PAGE_W - 180;
  y -= 25;
  finalPage.drawText('........................', { x: sigX, y: y + 15, size: 11, font });
  finalPage.drawText(sigText, { x: sigX + 10, y, size: 11, font: boldFont });

  return await pdfDoc.save();
}
