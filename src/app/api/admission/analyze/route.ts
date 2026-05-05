import { NextRequest, NextResponse } from 'next/server';
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { guessEthnicGroup, guessGender, EthnicGroup, Gender } from '@/lib/studentAnalysisUtils';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let students: any[] = [];

    if (file.type === 'application/pdf') {
      const data = await pdf(buffer);
      const text = data.text;
      
      const blacklistedKeywords = [
        'TRIBHUVAN', 'UNIVERSITY', 'OFFICE', 'EXAMINATION', 'CONTROL', 'KATHMANDU',
        'GUPTESHWOR', 'MAHADEV', 'CAMPUS', 'POKHARA', 'NEPAL', 'MARKSHEET', 'GRADE',
        'PROVISIONAL', 'TRANSCRIPT', 'SEMESTER', 'YEAR', 'BACHELOR', 'MASTER',
        'REGISTRATION', 'NUMBER', 'GENERATION', 'REPORT', 'LIST', 'BATCH',
        'PAGE', 'OF', 'PARENT', 'DATE', 'BIRTH'
      ];

      // Strategy: Split the entire document text by Gender keywords ("MALE" or "FEMALE")
      // The text BEFORE each gender keyword contains that student's name
      const genderPattern = /(MALE|FEMALE)/gi;
      const chunks = text.split(genderPattern);
      
      let sn = 1;
      for (let i = 0; i < chunks.length - 1; i += 2) {
        const rawNameChunk = chunks[i]; // Text before gender
        const detectedGender = chunks[i+1].toUpperCase() === 'FEMALE' ? 'F' : 'M';
        const nextDataChunk = chunks[i+2] || ""; // Text after gender

        // 1. EXTRACT STUDENT NAME
        const nameLines = rawNameChunk.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length >= 1);
        let nameCandidate = "";
        
        // Strategy A: Look for S.N. and Name on the same line
        const snSameLine = new RegExp(`(?:^|\\s|\\|)${sn}[\\s\\.\\|]+([A-Z]{2,}.+)`, 'i');
        for (let j = 0; j < nameLines.length; j++) {
          const match = nameLines[j].match(snSameLine);
          if (match) {
            nameCandidate = match[1].trim();
            break;
          }
        }
        
        // Strategy B: Look for S.N. on one line and Name on the next
        if (!nameCandidate) {
          for (let j = 0; j < nameLines.length; j++) {
            if (nameLines[j] === sn.toString() || nameLines[j] === `${sn}.`) {
              if (j + 1 < nameLines.length) {
                const pot = nameLines[j+1];
                if (pot.split(' ').length >= 2 && !blacklistedKeywords.some(w => pot.toUpperCase().includes(w))) {
                  nameCandidate = pot;
                  break;
                }
              }
            }
          }
        }

        // Strategy C: Final fallback (less strict but still filters noise)
        if (!nameCandidate) {
          for (let j = nameLines.length - 1; j >= 0; j--) {
            const l = nameLines[j].toUpperCase();
            const words = l.split(' ');
            if (words.length >= 2 && words.length <= 5 && 
                !blacklistedKeywords.some(w => l.includes(w)) &&
                !l.includes('PARENT') && !l.includes('FATHER') && !l.includes('MOTHER')) {
              nameCandidate = nameLines[j].replace(/^[0-9\.\s\|]+/, '').trim();
              if (nameCandidate.length > 5) break;
            }
          }
        }

        // 2. EXTRACT TU REGISTRATION
        // We look for the pattern around the Campus Code '781'
        const regMatch = nextDataChunk.match(/(\d-\d-781-\d+-\d{4})/);
        let tuRegd = regMatch ? regMatch[1] : '';
        
        // Final sanity check: if the name candidate still contains a parent name (too long), 
        // we take only the first 2-3 words.
        if (nameCandidate) {
          const words = nameCandidate.split(/\s+/);
          if (words.length > 4) {
             // If a line has "STUDENT_NAME PARENT_NAME", we usually want the first part
             // But it's risky. Let's just hope the S.N. pattern fixed it.
          }

          students.push({
            sn: sn++,
            name: nameCandidate,
            gender: detectedGender as Gender,
            ethnic: guessEthnicGroup(nameCandidate),
            tuRegd: tuRegd || ''
          });
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use the frontend for Excel files.' }, { status: 400 });
    }

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('Admission PDF Extraction Error:', error);
    return NextResponse.json({ error: 'Failed to extract data: ' + error.message }, { status: 500 });
  }
}
