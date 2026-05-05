import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamMetadata, Student, Subject, EthnicGroup } from './boardExamStore';

// --- Excel Ledger ---
export async function generateLedgerExcel(metadata: ExamMetadata, subjects: Subject[], students: Student[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Mark Ledger', { views: [{ state: 'frozen', ySplit: 6 }] });

  // Add Headers
  sheet.mergeCells('A1:N1');
  const title1 = sheet.getCell('A1');
  title1.value = "Gupteshwor Mahadev Multiple Campus";
  title1.font = { name: 'Arial', size: 14, bold: true };
  title1.alignment = { horizontal: 'center' };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

  sheet.mergeCells('A2:N2');
  const title2 = sheet.getCell('A2');
  title2.value = "Pokhara-17, Chhorepatan";
  title2.font = { name: 'Arial', size: 11 };
  title2.alignment = { horizontal: 'center' };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

  sheet.mergeCells('A3:N3');
  const title3 = sheet.getCell('A3');
  title3.value = "Annual Examination Mark Ledger";
  title3.font = { name: 'Arial', size: 12, bold: true };
  title3.alignment = { horizontal: 'center' };
  title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

  sheet.mergeCells('A4:G4');
  sheet.getCell('A4').value = `Date Of Examination: ${metadata.examDate}`;
  sheet.mergeCells('H4:N4');
  sheet.getCell('H4').value = `Date Of Result Published: ${metadata.resultPublishedDate}`;
  
  sheet.mergeCells('A5:N5');
  sheet.getCell('A5').value = `Exam Year ${metadata.examYear} ${metadata.program} ${metadata.part} Year Admission Batch (${metadata.enrollmentYear})`;

  // Column Headers (row 6)
  const headerRow = sheet.getRow(6);
  headerRow.height = 45; // taller for multi-line
  
  const columns = [
    { header: 'S.N.', key: 'sn', width: 5 },
    { header: 'Full Name', key: 'name', width: 28 },
    { header: 'Symbol No.', key: 'rollNo', width: 12 },
    { header: 'TU Regd.', key: 'tuRegd', width: 18 },
    { header: 'Ethnic', key: 'ethnic', width: 12 },
    { header: 'Gender', key: 'gender', width: 8 },
  ];

  subjects.forEach(sub => {
    columns.push({ header: `${sub.code}\n${sub.name}\n(100)`, key: sub.code, width: 12 });
  });

  columns.push({ header: 'Total\n(500)', key: 'total', width: 8 });
  columns.push({ header: 'Percent', key: 'percent', width: 10 });
  columns.push({ header: 'Remarks', key: 'remarks', width: 18 });

  sheet.columns = columns;

  // Style header row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Data rows
  students.forEach(student => {
    const rowData: any = {
      sn: student.sn,
      name: student.name,
      rollNo: student.rollNo,
      tuRegd: student.tuRegd,
      ethnic: student.ethnic,
      gender: student.gender,
      total: student.total,
      percent: student.percent,
      remarks: student.result
    };
    subjects.forEach(sub => {
      rowData[sub.code] = student.marks[sub.code];
    });

    const row = sheet.addRow(rowData);
    
    // Default styling for the row
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
    });
  });

  sheet.autoFilter = {
    from: 'A6',
    to: { row: 6, column: columns.length }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as any);
}

// --- PDF Ledger ---
export async function generateLedgerPdf(metadata: ExamMetadata, subjects: Subject[], students: Student[]): Promise<Buffer> {
  const doc = new jsPDF('l', 'pt', 'a4') as any;
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Gupteshwor Mahadev Multiple Campus", pageWidth / 2, 35, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Pokhara-17, Chhorepatan", pageWidth / 2, 48, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("Annual Examination Mark Ledger", pageWidth / 2, 65, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setLineWidth(0.5);
  doc.line(40, 75, pageWidth - 40, 75);
  
  doc.text(`Date Of Examination: ${metadata.examDate}`, 40, 88);
  doc.text(`Date Of Result Published: ${metadata.resultPublishedDate}`, pageWidth - 40, 88, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Exam Year ${metadata.examYear} ${metadata.program} ${metadata.part} Admission Batch (${metadata.enrollmentYear})`, pageWidth / 2, 105, { align: 'center' });

  // Table Columns
  const tableHead = [
    ['S.N.', 'Full Name', 'Ethnic *', 'Sex', 'Roll No', 'TU Regd', ...subjects.map(s => s.code), 'Total', '%', 'Result']
  ];

  const tableBody = students.map(st => {
    const genderInitial = st.gender?.toString().trim().toUpperCase().startsWith('F') ? 'F' : 
                         st.gender?.toString().trim().toUpperCase().startsWith('M') ? 'M' : 
                         st.gender || '';
    return [
      st.sn, 
      st.name, 
      st.ethnic, 
      genderInitial, 
      st.rollNo, 
      st.tuRegd,
      ...subjects.map(s => st.marks[s.code]),
      st.total, 
      st.percent.toFixed(1), 
      st.result
    ];
  });

  autoTable(doc, {
    startY: 120,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 45 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 60 },
      5: { cellWidth: 100 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const student = students[data.row.index];
        const isPassed = student.result === 'Passed';
        
        // Row background based on result
        if (isPassed) {
          data.cell.styles.fillColor = [232, 252, 232]; // Light green
        } else {
          data.cell.styles.fillColor = [255, 235, 235]; // Light pink/red
        }

        // Highlight marks < 35
        const markColStart = 6;
        const markColEnd = 6 + subjects.length;
        if (data.column.index >= markColStart && data.column.index < markColEnd) {
          const val = data.cell.raw;
          if (val === 'AB') {
            data.cell.styles.fillColor = [220, 220, 220]; // Grey for absent
          } else if (typeof val === 'number' && val < 35) {
            data.cell.styles.fillColor = [255, 255, 200]; // Yellowish highlight
            data.cell.styles.textColor = [200, 0, 0]; // Red text
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Bold Total and Result
        if (data.column.index >= markColEnd) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === markColEnd + 2) { // Result column
             data.cell.styles.textColor = isPassed ? [0, 128, 0] : [200, 0, 0];
          }
        }
      }
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 20);
    }
  });

  // Add Subject Mapping Page immediately after the main table
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Subject Reference Table", 40, finalY + 30);

  autoTable(doc, {
    startY: finalY + 40,
    margin: { left: 40 },
    tableWidth: 400, // Keep it compact
    head: [['Code', 'Full Subject Name']],
    body: subjects.map(s => [s.code, s.name]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, halign: 'left', textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    }
  });

  const pdfBytes = doc.output('arraybuffer');
  return Buffer.from(pdfBytes);
}

// --- Report PDF ---
export async function generateResultReportPdf(metadata: ExamMetadata, subjects: Subject[], students: Student[]): Promise<Buffer> {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  // Header
  // Logo handling - in serverless, we usually fetch or use base64
  // For now, we skip logo if fs is not available, or it should be passed in
  // doc.addImage(logoBase64, 'PNG', 40, 30, 55, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Affiliated to Tribhuvan University", pageWidth / 2 + 15, 35, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("Gupteshwor Mahadev Multiple Campus", pageWidth / 2 + 15, 55, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Pokhara-17, Chhorepatan, Kaski", pageWidth / 2 + 15, 70, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Students Details", pageWidth / 2, 95, { align: 'center' });
  // Proper underline for 'Students Details'
  const detailWidth = doc.getTextWidth("Students Details");
  doc.line(pageWidth / 2 - (detailWidth / 2) - 5, 98, pageWidth / 2 + (detailWidth / 2) + 5, 98);

  // Info Grid
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Program: ${metadata.program}`, 60, 125);
  doc.text(`Year/Semester: ${metadata.part}`, pageWidth - 60, 125, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Result Published Date: ${metadata.resultPublishedDate}`, 60, 142);
  doc.text(`Exam Date: ${metadata.examDate}`, pageWidth - 60, 142, { align: 'right' });
  
  doc.text(`Enrollment Year: ${metadata.enrollmentYear}`, 60, 157);
  doc.text(`Exam Year: ${metadata.examYear}`, pageWidth - 60, 157, { align: 'right' });

  // Stats Logic
  const getStats = (filterFn: (s: Student) => boolean) => {
    let m_dalit = 0, m_edj = 0, m_janajati = 0, m_other = 0;
    let f_dalit = 0, f_edj = 0, f_janajati = 0, f_other = 0;

    students.filter(filterFn).forEach(s => {
      const g = s.gender?.toString().toUpperCase() || '';
      const isM = g.startsWith('M');
      const isF = g.startsWith('F');
      const eth = s.ethnic;

      if (isM) {
        if (eth === 'Dalits') m_dalit++;
        else if (eth === 'EDJ') m_edj++;
        else if (eth === 'Janajati') m_janajati++;
        else m_other++; // Madeshi and Others go to 'Other'
      } else if (isF) {
        if (eth === 'Dalits') f_dalit++;
        else if (eth === 'EDJ') f_edj++;
        else if (eth === 'Janajati') f_janajati++;
        else f_other++;
      }
    });

    const m_total = m_dalit + m_edj + m_janajati + m_other;
    const f_total = f_dalit + f_edj + f_janajati + f_other;
    return [
      m_dalit || '-', m_edj || '-', m_janajati || '-', m_other || '-', m_total,
      f_dalit || '-', f_edj || '-', f_janajati || '-', f_other || '-', f_total,
      m_total + f_total
    ];
  };

  const rows = [
    ['Admission No.', ...getStats(() => true), ''],
    ['Exam Appear No.', ...getStats(s => !Object.values(s.marks).includes('AB')), ''],
    ['Pass Student\'s No.', ...getStats(s => s.result === 'Passed'), '']
  ];

  // Dropout calculations (placeholder logic based on image)
  const totalStudents = students.length;
  const appeared = students.filter(s => !Object.values(s.marks).includes('AB')).length;
  const dropoutCount = totalStudents - appeared;
  const dropoutText = `Male: -\nFemale: -\nABS: ${dropoutCount}\nTotal: ${dropoutCount}`;
  rows[0][12] = dropoutText;

  // Table 1: Particulars
  autoTable(doc, {
    startY: 190,
    margin: { left: 40, right: 40 },
    head: [
      [
        { content: 'Particulars', rowSpan: 2, styles: { valign: 'middle', fontSize: 10, halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } }, 
        { content: 'Male', colSpan: 5, styles: { fontSize: 10, lineWidth: 0.5, lineColor: [0, 0, 0] } }, 
        { content: 'Female', colSpan: 5, styles: { fontSize: 10, lineWidth: 0.5, lineColor: [0, 0, 0] } }, 
        { content: 'All Total', rowSpan: 2, styles: { valign: 'middle', fontSize: 10, halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } }, 
        { content: 'Dropout', rowSpan: 2, styles: { valign: 'middle', fontSize: 10, halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } }
      ],
      // Use empty strings to avoid horizontal overlap with vertical text
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 10, halign: 'center', cellPadding: 3, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 100 },
      5: { fillColor: [230, 230, 230], fontStyle: 'bold' },
      10: { fillColor: [230, 230, 230], fontStyle: 'bold' },
      11: { fontStyle: 'bold' },
      12: { halign: 'left', fontSize: 9 }
    },
    didParseCell: (data) => {
      if (data.row.index === 1 && data.section === 'head') {
        data.cell.styles.minCellHeight = 65;
      }
    },
    didDrawCell: (data) => {
      if (data.row.index === 1 && data.section === 'head' && data.column.index >= 1 && data.column.index <= 10) {
        // Original headers in order
        const headers = ['Dalit', 'EDJ', 'Janajati', 'Other', 'Male Total', 'Dalit', 'EDJ', 'Janajati', 'Other', 'Female Total'];
        const text = headers[data.column.index - 1];
        const doc = data.doc;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        // Center text in the narrow cell
        const x = data.cell.x + data.cell.width / 2 + 3;
        const y = data.cell.y + data.cell.height - 5;
        
        doc.text(text, x, y, { angle: 90 });
        return false;
      }
    }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY;
  
  // Pass %
  const totalAppeared = appeared;
  const totalPassed = students.filter(s => s.result === 'Passed').length;
  const passPct = totalAppeared > 0 ? ((totalPassed / totalAppeared) * 100).toFixed(2) : '0.00';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Pass % = ${passPct}`, 40, finalY1 + 20);
  const passWidth = doc.getTextWidth(`Pass % = ${passPct}`);
  doc.line(40, finalY1 + 22, 40 + passWidth, finalY1 + 22);

  // Table 2: Best Students & Remarks
  const getDivision = (pct: number) => {
    if (pct >= 80) return "Distinction";
    if (pct >= 60) return "First Division";
    if (pct >= 45) return "Second Division";
    if (pct >= 32) return "Third Division";
    return "Fail";
  };

  const passedStudents = students.filter(s => s.result === 'Passed').sort((a, b) => b.total - a.total);
  
  const bestStudentsData: any[][] = [];
  const ordinalPositions = ["First", "Second", "Third"];
  let distinctScoreCount = 0;
  let lastScore = -1;

  for (let i = 0; i < passedStudents.length; i++) {
    const s = passedStudents[i];
    if (s.total !== lastScore) {
      distinctScoreCount++;
      lastScore = s.total;
    }
    if (distinctScoreCount > 3) break;

    const majorLabel = s.major?.toLowerCase().includes('english') ? 'Eng' : 
                      s.major?.toLowerCase().includes('nepali') ? 'Nep' : '-';

    bestStudentsData.push([
      ordinalPositions[distinctScoreCount - 1] || `${distinctScoreCount}th`,
      s.name,
      majorLabel,
      s.total,
      s.percent.toFixed(2),
      getDivision(s.percent)
    ]);
  }

  // If no passed students
  if (bestStudentsData.length === 0) {
    bestStudentsData.push(['-', '-', '-', '-', '-', '-']);
  }

  const stats = { dist: 0, first: 0, second: 0, third: 0, fail: 0 };
  students.forEach(s => {
    if (s.result === 'Failed' || s.result === 'Fail & Partly Absent') {
      stats.fail++;
    } else {
      const div = getDivision(s.percent);
      if (div === "Distinction") stats.dist++;
      else if (div === "First Division") stats.first++;
      else if (div === "Second Division") stats.second++;
      else if (div === "Third Division") stats.third++;
    }
  });

  const remarksData = [
    `Dist.: ${stats.dist}`,
    `First Division: ${stats.first}`,
    `Second Division: ${stats.second}`,
    `Third Division: ${stats.third}`,
    `Fail: ${stats.fail}`
  ];

  // Combine Best Students and Remarks side-by-side or stacked
  // To match the side-by-side look:
  const combinedBody = bestStudentsData.map((row, i) => [...row, remarksData[i] || '']);
  // If remarks has more rows than best students
  autoTable(doc, {
    startY: finalY1 + 35,
    margin: { left: 40 },
    tableWidth: 350,
    head: [
      [{ content: 'Description of The Best Students', colSpan: 6, styles: { halign: 'center', fillColor: [255, 255, 255], fontStyle: 'bold' } }],
      ['Position', 'Name', 'Major', 'Marks', '%', 'Division']
    ],
    body: bestStudentsData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 40, halign: 'center' },
      5: { cellWidth: 70, halign: 'center' }
    }
  });

  const finalY2 = (doc as any).lastAutoTable.finalY;

  // Table 3: Subject Wise Result
  const subjectRows = subjects.map(sub => {
    let app = 0, pass = 0;
    students.forEach(s => {
      const mark = s.marks[sub.code];
      // Only count if the student actually has this subject and was not absent (AB)
      if (mark !== undefined && mark !== 'AB') {
        app++;
        if (typeof mark === 'number' && mark >= 35) pass++;
      }
    });
    return [sub.code, sub.name, app, pass, app > 0 ? ((pass/app)*100).toFixed(0) : '0'];
  });

  autoTable(doc, {
    startY: finalY2 + 30,
    margin: { left: 40, right: 40 },
    head: [[{ content: 'Subject Wise Result', colSpan: 5, styles: { halign: 'center' } }]],
    body: [['Subject Code', 'Subject Name', 'Exam Appear No.', 'Pass No.', 'Pass %'], ...subjectRows],
    theme: 'grid',
    styles: { fontSize: 10, halign: 'center', cellPadding: 3, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'left', cellWidth: 200 } },
    didParseCell: (data) => {
      if (data.row.index === 0 && data.section === 'body') data.cell.styles.fontStyle = 'bold';
    }
  });

  const finalY3 = (doc as any).lastAutoTable.finalY;

  // Footer Stats
  const partialAbs = students.filter(s => s.result === 'Fail & Partly Absent').length;
  autoTable(doc, {
    startY: finalY3 + 20,
    margin: { left: 40, right: 40 },
    body: [[`Partial Students No: -`, `Partial ABS No: ${partialAbs}`, `Partial Students Pass No: -`]],
    theme: 'grid',
    styles: { fontSize: 10, halign: 'center', cellPadding: 5, textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0, 0, 0] },
  });

  // Signatures
  const finalY4 = (doc as any).lastAutoTable.finalY + 60;
  doc.setFontSize(11);
  doc.text("____________________", 60, finalY4);
  doc.text("Written By", 60, finalY4 + 15);

  doc.text("____________________", pageWidth - 180, finalY4);
  doc.text("Verified By", pageWidth - 180, finalY4 + 15);
  doc.text("Program Coordinator", pageWidth - 180, finalY4 + 30);

  const pdfBytes = doc.output('arraybuffer');
  return Buffer.from(pdfBytes);
}
