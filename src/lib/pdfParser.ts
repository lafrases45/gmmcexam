const pdf = require('pdf-parse/lib/pdf-parse.js');
import { Student, Subject } from './boardExamStore';

export async function parsePdfBuffer(buffer: Buffer): Promise<{ students: Student[], subjects: Subject[] }> {
  const data = await pdf(buffer);
  const text = data.text;
  
  // Split the text by 'NAME :' to ensure we get every student even if page breaks (\f) are missing
  const chunks = text.split(/NAME\s*:/i);

  const students: Student[] = [];
  const subjectsMap: Map<string, string> = new Map();

  let snCounter = 1;

  // The first chunk is header/garbage, so we start from index 1
  for (let i = 1; i < chunks.length; i++) {
    const pageText = chunks[i];
    if (!pageText.trim()) continue;

    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 10) continue;

    // 1. Name is the first line
    const name = lines[0];

    // 2. Find Roll No and Regd No
    let rollNo = '';
    let tuRegd = '';
    const rollIndex = lines.findIndex(l => l.toUpperCase().includes('ROLL NO:'));
    if (rollIndex !== -1 && rollIndex + 2 < lines.length) {
      tuRegd = lines[rollIndex + 1];
      rollNo = lines[rollIndex + 2];
    }

    if (!name || !rollNo) continue;

    // 3. Find Subjects and Marks
    const marks: Record<string, number | "AB"> = {};
    
    // Iterate through lines to find subjects
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      
        // Match Subject line (e.g. "MGT.205:Business Communication" or "Eng 422: Expanding Horizons")
        const subjectMatch = line.match(/^([A-Z0-9\.\s]+)\s*:\s*(.+)$/i);
        
        if (subjectMatch && j + 1 < lines.length) {
          const code = subjectMatch[1].trim();
          const subjectName = subjectMatch[2].trim();
          
          // Next line contains the marks (e.g. "1003553", "20816", "802828")
          const markLine = lines[j + 1];
          
          // Pattern: [FullMarks][PassMarks][ObtainedMarks]
          // Common TU patterns: 100/35, 80/28, 50/18, 20/8, 75/27, 25/9
          const markPatterns = [
            { full: "100", pass: "35" },
            { full: "80", pass: "28" },
            { full: "50", pass: "18" },
            { full: "20", pass: "8" },
            { full: "75", pass: "27" },
            { full: "25", pass: "10" },
            { full: "25", pass: "9" }
          ];

          let foundPattern = false;
          for (const p of markPatterns) {
            const prefix = p.full + p.pass;
            if (markLine.startsWith(prefix)) {
              if (!subjectsMap.has(code)) {
                subjectsMap.set(code, subjectName);
              }

              let rawMark = markLine.substring(prefix.length).trim();
              
              if (rawMark.includes('A') || rawMark.includes('-') || rawMark === '') {
                marks[code] = "AB";
              } else {
                // Remove trailing F or status letters
                const cleanMark = rawMark.replace(/[A-Z]/gi, '').trim();
                const parsedMark = parseInt(cleanMark, 10);
                marks[code] = isNaN(parsedMark) ? "AB" : parsedMark;
              }
              foundPattern = true;
              break;
            }
          }

          // Fallback for marks that might be separated or unusual
          if (!foundPattern && /^\d+$/.test(markLine)) {
             // If it's just a number and we haven't matched, try to at least add the subject
             if (!subjectsMap.has(code)) {
               subjectsMap.set(code, subjectName);
             }
             marks[code] = parseInt(markLine, 10) || 0;
          }
        }
    }

    // 4. Find Total Marks and Result
    let total = 0;
    let resultRaw = '';
    
    const totalIndex = lines.findIndex(l => l.toUpperCase().includes('TOTAL MARKS'));
    if (totalIndex !== -1 && totalIndex + 3 < lines.length) {
      // Structure:
      // TOTAL MARKS
      // RESULT
      // Passed / Failed / Fail and Partly Absent
      // 273
      resultRaw = lines[totalIndex + 2];
      total = parseInt(lines[totalIndex + 3], 10) || 0;
    } else {
      // Fallback calculation
      total = Object.values(marks).reduce((acc: number, val) => acc + (val === "AB" ? 0 : val), 0);
    }

    // Normalize Result
    let result: Student['result'] = "Failed";
    if (resultRaw.toLowerCase().includes('pass')) {
      result = "Passed";
    } else if (resultRaw.toLowerCase().includes('partly') || Object.values(marks).includes("AB")) {
      result = "Fail & Partly Absent";
    } else if (resultRaw.toLowerCase().includes('fail')) {
      result = "Failed";
    } else {
      let hasAbs = false;
      let hasFail = false;
      for (const val of Object.values(marks)) {
        if (val === "AB") hasAbs = true;
        else if ((val as number) < 35) hasFail = true;
      }
      if (hasAbs) result = "Fail & Partly Absent";
      else if (hasFail) result = "Failed";
      else result = "Passed";
    }

    // Calculate percent based on 5 subjects
    const numSubjects = Object.keys(marks).length || 5;
    const fullMarks = numSubjects * 100;
    const percent = parseFloat(((total / fullMarks) * 100).toFixed(2));

    // 5. Guess Ethnic Group and Gender
    const guessEthnicGroup = (fullName: string): string => {
      const nameParts = fullName.trim().toUpperCase().split(/\s+/);
      const surname = nameParts[nameParts.length - 1];
      const lastTwo = nameParts.length >= 2 ? `${nameParts[nameParts.length - 2]} ${nameParts[nameParts.length - 1]}` : "";
      
      // Normalize by removing dots and spaces for comparison
      const normalizedSurname = surname.replace(/\./g, "").trim();
      const normalizedLastTwo = lastTwo.replace(/\./g, "").replace(/\s+/g, "").trim();

      const categories: Record<string, string[]> = {
        "EDJ": ["TAMANG", "CHAMAR", "LAMA"],
        "Janajati": ["GURUNG", "MAGAR", "RAI", "LIMBU", "SHERPA", "NEWAR", "SHRESTHA", "MAHARJAN", "SHAKYA", "BAJRACHARYA", "THAKALI", "THARU", "GHARTI", "PUN", "BHUJEL"],
        "Dalits": ["BK", "PARIYAR", "NEPALI", "SUNAR", "KAMI", "DAMAI", "SARKI", "GAHATRAJ"],
        "Madeshi": ["GUPTA", "JHA", "YADAV", "MAHATO", "SAH", "SINGH", "THAKUR", "PRASAD", "MANDAL", "CHAUDHARY"],
        "Others": [
          "THAPA", "PAUDEL", "POUDEL", "ADHIKARI", "ARYAL", "BASTOLA", "BHANDARI", "BHATTA", "BHATTARAI", "DAHAL", "DEVKOȚA", "GAUTAM", "GHIMIRE", "JOSHI", "KOIRALA", "LAMSAL", "NEUPANE", "PANT", "POKHREL", "POKHAREL", "REGMI", "RIJAL", "SHARMA", "SUBEDI", "TIWARI", "UPADHYAYA", "WAGLE",
          "KC", "BASNET", "BISTA", "BOHARA", "CHAND", "CHHETRI", "HAMAL", "KARKI", "KHATRI", "KHADKA", "KUNWAR", "MAHAT", "RANA", "RAWAL", "ROKAYA", "SHAH", "SHAHI", "THAKURI"
        ]
      };

      for (const [group, names] of Object.entries(categories)) {
        if (names.includes(normalizedSurname) || names.includes(normalizedLastTwo)) return group;
      }
      return "Others";
    };

    const guessGender = (fullName: string): string => {
      const firstName = fullName.trim().toUpperCase().split(/\s+/)[0];
      const femaleIndicators = [
        "KUMARI", "DEVI", "MAYA", "LALITA", "SITA", "GITA", "RITA", "ANITA", "SUNITA", 
        "BINITA", "PRATIKSHYA", "SUSHMA", "POOJA", "REKHA", "AKRITI", "SONY", "SONI", 
        "ANJALI", "ANU", "SABINA", "BINA", "ALINA", "ALISHA", "ANISHA", "AAYUSHA", "AASHIKA", "ASMITA", "BISHNU", "DIKSHYA", "MONIKA"
      ];
      
      // 1. Direct match with common female names or middle names
      if (femaleIndicators.some(ind => firstName === ind || fullName.toUpperCase().includes(" " + ind))) return "F";
      
      // 2. Names ending in 'I' are almost always female in Nepal
      if (firstName.endsWith("I")) return "F";
      
      // 3. Names ending in 'A' are often female, but we exclude common male exceptions
      const maleANames = ["SUMAN", "ROSAN", "ROSHAN", "ROHAN", "JEEVAN", "KIRAN", "SURYA", "KRISHNA", "RAMA", "BISHAL"];
      if (firstName.endsWith("A") && !maleANames.includes(firstName)) return "F";

      return "M"; // Default to M for remaining names
    };

    students.push({
      sn: snCounter++,
      name,
      rollNo,
      tuRegd,
      ethnic: guessEthnicGroup(name) as any,
      gender: guessGender(name) as any,
      marks,
      total,
      percent: isNaN(percent) ? 0 : percent,
      result
    });
  }

  const subjects = Array.from(subjectsMap.entries()).map(([code, name]) => ({ code, name }));

  return { students, subjects };
}
